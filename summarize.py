#!/usr/bin/env python3
"""로컬 SLM(GGUF)로 메일을 요약해 발신자 / 요약 / 할 일 / 기한 표를 터미널에 출력한다.

    python3 summarize.py                       # data/inbox.json, 기본 모델(qwen)
    python3 summarize.py --model kanana --limit 5
    python3 summarize.py --fetch               # Outlook에서 새로 읽어온 뒤 요약
    python3 summarize.py --no-cache            # 캐시 무시하고 다시 추출

표준 라이브러리만 사용한다 (Python 3.9+). llama-server는 필요하면 자동으로 띄운다.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import signal
import sqlite3
import subprocess
import sys
import textwrap
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODELS = {
    "qwen": ROOT / "models/Qwen_Qwen3.5-4B-Q4_K_M.gguf",
    "kanana": ROOT / "models/kanana-2-1.3b-instruct-Q8_0.gguf",
    "kanana3b": ROOT / "models/kanana-2-3b-instruct-Q8_0.gguf",
    "kanana3b_q4": ROOT / "models/kanana-2-3b-instruct-Q4_K_M.gguf",
    "qwen2b": ROOT / "models/Qwen3.5-2B-Q4_K_M.gguf",
}
LLAMA_SERVER = ROOT / "bin/llama/llama-server"
PORT = int(os.environ.get("SLM_PORT", "8080"))
BASE = f"http://127.0.0.1:{PORT}"
CACHE_DB = ROOT / "data/cache.sqlite"
PROMPT_VERSION = "v2"  # 프롬프트/스키마를 바꾸면 올려서 캐시를 무효화한다

SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string", "description": "메일 핵심 내용 1~2문장, 한국어"},
        "action_items": {"type": "array", "items": {"type": "string"},
                         "description": "수신자가 해야 할 일. 없으면 빈 배열"},
        "deadline": {"type": ["string", "null"],
                     "description": "기한이 명시돼 있으면 YYYY-MM-DD, 없으면 null"},
        "priority": {"type": "string", "enum": ["high", "medium", "low"]},
        "category": {"type": "string",
                     "enum": ["action_required", "notice", "verification", "personal", "newsletter", "other"]},
    },
    "required": ["summary", "action_items", "deadline", "priority", "category"],
}

SYSTEM_PROMPT = """당신은 사용자의 데스크탑 이메일 비서입니다. 메일 한 통을 읽고 아래 JSON 스키마에 맞춰 한국어로만 답합니다.
규칙:
- summary: 메일의 핵심을 1~2문장으로. 인사말·사과문은 빼고 사실만.
- action_items: 수신자(나)가 직접 해야 하는 행동만 짧은 문장으로. 단순 안내·광고면 빈 배열.
- deadline: 본문에 날짜/기한이 명시된 경우에만 YYYY-MM-DD 형식. "즉시"처럼 날짜가 없으면 null. 연도가 없으면 수신일 기준으로 추정.
- priority: 내가 직접 조치해야 하고 보안·계정·마감이 걸린 것은 high, 확인만 하면 되는 안내는 medium, 광고·뉴스레터·잡담·이미 만료됐을 인증코드는 low.
- category: action_required(해야 할 일 있음) / notice(공지) / verification(인증코드·확인메일) / personal(개인 대화) / newsletter(홍보·소식지) / other
- 본문에 없는 내용은 지어내지 마세요. 오늘 날짜는 {today} 입니다."""

USER_TEMPLATE = """[메일]
발신자: {sender_name} <{sender_addr}>
수신일시: {received}
제목: {subject}

본문:
{body}"""

MAX_BODY_CHARS = 3500  # 4B 모델 컨텍스트/속도 균형


# ---------------------------------------------------------------- server ----

class LlamaServer:
    """이미 떠 있는 서버가 같은 모델을 물고 있으면 재사용, 아니면 새로 띄운다."""

    def __init__(self, model_key: str, ctx: int = 8192, static_dir: Path = None, router: bool = False):
        self.model_path = MODELS[model_key]
        self.ctx = ctx
        self.static_dir = static_dir
        self.router = router  # --models-dir 라우터 모드: models/ 전체를 노출, 요청의 model 필드로 선택
        self.proc = None
        self.log = ROOT / "data/llama-server.log"

    def _health(self) -> bool:
        try:
            with urllib.request.urlopen(f"{BASE}/health", timeout=2) as r:
                return json.load(r).get("status") == "ok"
        except Exception:
            return False

    def _loaded_model(self) -> str:
        try:
            with urllib.request.urlopen(f"{BASE}/props", timeout=2) as r:
                return json.load(r).get("model_path", "") or ""
        except Exception:
            return ""

    def start(self):
        if self._health():
            loaded = self._loaded_model()
            if self.router and loaded in ("", "none"):
                print("· llama-server(라우터) 재사용")
                return
            if Path(loaded).name == self.model_path.name:
                print(f"· llama-server 재사용 ({self.model_path.name})")
                return
            print(f"· 다른 모델({Path(loaded).name})이 떠 있어 포트 {PORT}를 그대로 쓸 수 없습니다. "
                  f"기존 서버를 종료하거나 SLM_PORT를 바꿔 주세요.")
            sys.exit(1)

        if not LLAMA_SERVER.exists():
            sys.exit(f"llama-server를 찾을 수 없습니다: {LLAMA_SERVER}")
        if not self.model_path.exists():
            sys.exit(f"모델 파일이 없습니다: {self.model_path}")

        self.log.parent.mkdir(parents=True, exist_ok=True)
        model_args = (["--models-dir", str(ROOT / "models"), "--models-max", "1"] if self.router
                      else ["-m", str(self.model_path)])
        cmd = [str(LLAMA_SERVER)] + model_args + ["--port", str(PORT),
               "-c", str(self.ctx), "-ngl", "99", "--jinja", "--reasoning-budget", "0",
               "--parallel", "1", "--log-disable"]
        if self.static_dir and (self.static_dir / "index.html").exists():
            cmd += ["--path", str(self.static_dir)]
        print(f"· llama-server 기동 중 ({self.model_path.name}) …", end="", flush=True)
        self.proc = subprocess.Popen(cmd, stdout=open(self.log, "w"), stderr=subprocess.STDOUT,
                                     start_new_session=True)
        for _ in range(120):
            if self._health():
                print(" 준비 완료")
                return
            if self.proc.poll() is not None:
                print()
                sys.exit(f"llama-server가 종료됐습니다. 로그: {self.log}")
            time.sleep(0.5)
        self.stop()
        sys.exit("llama-server 기동 시간 초과")

    def stop(self):
        if self.proc and self.proc.poll() is None:
            os.killpg(os.getpgid(self.proc.pid), signal.SIGTERM)
            try:
                self.proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(os.getpgid(self.proc.pid), signal.SIGKILL)


def chat(messages: list, schema: dict, max_tokens: int = 400, temperature: float = 0.1) -> dict:
    payload = {
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "chat_template_kwargs": {"enable_thinking": False},
        "response_format": {"type": "json_schema", "json_schema": {"name": "mail", "schema": schema}},
    }
    req = urllib.request.Request(f"{BASE}/v1/chat/completions", data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=300) as r:
        res = json.load(r)
    content = res["choices"][0]["message"]["content"]
    usage = res.get("usage", {})
    timings = res.get("timings", {})
    return {"content": content, "usage": usage, "timings": timings}


# ----------------------------------------------------------------- cache ----

def cache_key(mail: dict, model_key: str) -> str:
    h = hashlib.sha1((mail["subject"] + mail["body"]).encode()).hexdigest()[:12]
    return f"{model_key}:{PROMPT_VERSION}:{mail['id']}:{h}"


def cache_open():
    CACHE_DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(CACHE_DB)
    con.execute("CREATE TABLE IF NOT EXISTS results (key TEXT PRIMARY KEY, json TEXT, created TEXT)")
    return con


# --------------------------------------------------------------- pipeline ----

KOR_DATE = re.compile(r"(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일")


def parse_received(s: str) -> str:
    """'2026년 8월 15일 토요일 오전 1:25:03' → '2026-08-15'. 실패하면 원문."""
    m = KOR_DATE.search(s)
    if m:
        y, mo, d = map(int, m.groups())
        return f"{y:04d}-{mo:02d}-{d:02d}"
    return s


def extract(mail: dict, today: str) -> dict:
    body = mail["body"][:MAX_BODY_CHARS]
    if len(mail["body"]) > MAX_BODY_CHARS:
        body += "\n…(이하 생략)"
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT.format(today=today)},
        {"role": "user", "content": USER_TEMPLATE.format(
            sender_name=mail["sender_name"], sender_addr=mail["sender_addr"],
            received=parse_received(mail["received"]), subject=mail["subject"], body=body)},
    ]
    r = chat(messages, SCHEMA)
    try:
        data = json.loads(r["content"])
    except json.JSONDecodeError:
        data = {"summary": r["content"][:200], "action_items": [], "deadline": None,
                "priority": "low", "category": "other", "_parse_error": True}
    # 모델이 형식을 어겨도 표가 깨지지 않게 후처리
    seen = set()
    items = []
    for it in data.get("action_items") or []:
        it = str(it).strip()
        # 소형 모델이 스키마 키 이름을 항목으로 흘리거나 같은 항목을 반복하는 경우 제거
        if not it or re.match(r"^(deadline|priority|category|summary|other)\s*:", it, re.I):
            continue
        if it not in seen:
            seen.add(it)
            items.append(it)
    data["action_items"] = items[:5]
    dl = data.get("deadline")
    if dl and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(dl)):
        m = KOR_DATE.search(str(dl))
        data["deadline"] = f"{m[1]}-{int(m[2]):02d}-{int(m[3]):02d}" if m else None
    data["_tokens"] = r["usage"].get("completion_tokens")
    data["_ms"] = round(r["timings"].get("predicted_ms", 0) + r["timings"].get("prompt_ms", 0))
    return data


# ---------------------------------------------------------------- output ----

C = {"reset": "\033[0m", "bold": "\033[1m", "dim": "\033[2m",
     "red": "\033[31m", "yellow": "\033[33m", "green": "\033[32m", "cyan": "\033[36m", "magenta": "\033[35m"}
if not sys.stdout.isatty():
    C = {k: "" for k in C}

PRIO_COLOR = {"high": "red", "medium": "yellow", "low": "dim"}
CAT_KO = {"action_required": "할일", "notice": "공지", "verification": "인증", "personal": "개인",
          "newsletter": "소식", "other": "기타"}


def render(rows: list, model_key: str, today: str):
    width = min(shutil.get_terminal_size((100, 20)).columns, 120)
    inner = width - 4
    print()
    print(f"{C['bold']}📬 메일 브리핑{C['reset']}  {C['dim']}({len(rows)}통 · 모델 {model_key} · 기준일 {today}){C['reset']}")
    print("═" * width)
    for i, (mail, r) in enumerate(rows, 1):
        pc = C[PRIO_COLOR.get(r["priority"], "dim")]
        received = parse_received(mail["received"])
        head = f"{C['bold']}{i:>2}. {mail['subject'][:inner - 12]}{C['reset']}"
        print(head)
        print(f"    {C['cyan']}보낸이{C['reset']}  {mail['sender_name']} <{mail['sender_addr']}>  {C['dim']}{received}{C['reset']}")
        print(f"    {C['cyan']}분류  {C['reset']}  {pc}{r['priority'].upper():<6}{C['reset']} {CAT_KO.get(r['category'], r['category'])}")
        for j, line in enumerate(textwrap.wrap(r["summary"], inner - 8) or ["-"]):
            print(f"    {C['cyan']}{'요약  ' if j == 0 else '      '}{C['reset']}  {line}")
        if r["action_items"]:
            for j, item in enumerate(r["action_items"]):
                lines = textwrap.wrap(item, inner - 10) or [""]
                print(f"    {C['cyan']}{'할 일 ' if j == 0 else '      '}{C['reset']}  {C['green']}☐{C['reset']} {lines[0]}")
                for l in lines[1:]:
                    print(f"              {l}")
        else:
            print(f"    {C['cyan']}할 일 {C['reset']}  {C['dim']}없음{C['reset']}")
        dl = r["deadline"]
        if dl:
            try:
                days = (dt.date.fromisoformat(dl) - dt.date.fromisoformat(today)).days
                tag = (f"{C['dim']}D+{-days} 지남{C['reset']}" if days < 0
                       else f"{C['red']}D-{days}{C['reset']}" if days <= 3
                       else f"{C['yellow']}D-{days}{C['reset']}")
            except ValueError:
                tag = ""
            print(f"    {C['cyan']}기한  {C['reset']}  {C['magenta']}{dl}{C['reset']} {tag}")
        meta = f"{r.get('_ms', 0)/1000:.1f}s · {r.get('_tokens') or '?'}tok"
        if r.get("_cached"):
            meta = "cached"
        print(f"    {C['dim']}{meta}{C['reset']}")
        print("─" * width)


def sort_key(item):
    mail, r = item
    prio = {"high": 0, "medium": 1, "low": 2}.get(r["priority"], 3)
    dl = r["deadline"] or "9999-99-99"
    has_action = 0 if r["action_items"] else 1
    return (has_action, dl, prio)


# ------------------------------------------------------------------ main ----

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", choices=list(MODELS), default="qwen")
    ap.add_argument("--input", default="data/inbox.json")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--fetch", action="store_true", help="먼저 Outlook에서 메일을 새로 읽어온다")
    ap.add_argument("--fetch-limit", type=int, default=20)
    ap.add_argument("--no-cache", action="store_true")
    ap.add_argument("--keep-server", action="store_true", help="끝나도 llama-server를 내리지 않는다")
    ap.add_argument("--json", action="store_true", help="표 대신 JSON 출력")
    ap.add_argument("--today", default=dt.date.today().isoformat())
    ap.add_argument("--panel", action="store_true",
                    help="메일을 web/data/inbox.json 으로 내보내고 llama-server(--path web)를 띄운 뒤 브라우저로 브리핑 패널을 연다")
    ap.add_argument("--watch", type=int, metavar="SEC", default=0,
                    help="--panel 과 함께: SEC 초마다 Outlook 을 다시 읽어 내보낸다(패널이 새 메일만 요약)")
    args = ap.parse_args()

    if args.panel:
        import shutil, webbrowser
        if args.fetch or not Path(args.input).exists():
            subprocess.run([sys.executable, str(ROOT / "fetch_outlook.py"),
                            "--limit", str(args.fetch_limit), "--out", args.input], check=True)
        dst = ROOT / "web/data/inbox.json"
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(args.input, dst)
        server = LlamaServer(args.model, static_dir=ROOT / "web", router=True)
        server.start()
        url = f"{BASE}/"
        print(f"· 브리핑 패널: {url}  (Ctrl+C 로 서버 종료)")
        webbrowser.open(url)
        try:
            while True:
                time.sleep(args.watch or 3600)
                if args.watch:
                    subprocess.run([sys.executable, str(ROOT / "fetch_outlook.py"),
                                    "--limit", str(args.fetch_limit), "--out", str(dst)], check=False,
                                   stdout=subprocess.DEVNULL)
                    print(f"\r· {dt.datetime.now():%H:%M:%S} 다시 내보냄", end="", flush=True)
        except KeyboardInterrupt:
            server.stop()
        return

    if args.fetch:
        subprocess.run([sys.executable, str(ROOT / "fetch_outlook.py"),
                        "--limit", str(args.fetch_limit), "--out", args.input], check=True)

    mails = json.loads(Path(args.input).read_text(encoding="utf-8"))
    if args.limit:
        mails = mails[:args.limit]
    if not mails:
        sys.exit("메일이 없습니다.")

    con = cache_open()
    server = LlamaServer(args.model)
    started = False

    rows = []
    t0 = time.time()
    try:
        for i, mail in enumerate(mails, 1):
            key = cache_key(mail, args.model)
            row = None
            if not args.no_cache:
                hit = con.execute("SELECT json FROM results WHERE key=?", (key,)).fetchone()
                if hit:
                    row = json.loads(hit[0])
                    row["_cached"] = True
            if row is None:
                if not started:
                    server.start()
                    started = True
                print(f"\r· 추출 중 {i}/{len(mails)}  {mail['subject'][:40]:<40}", end="", flush=True)
                row = extract(mail, args.today)
                con.execute("INSERT OR REPLACE INTO results VALUES (?,?,?)",
                            (key, json.dumps(row, ensure_ascii=False), dt.datetime.now().isoformat()))
                con.commit()
            rows.append((mail, row))
        print(f"\r· 완료 ({time.time() - t0:.1f}s){' ' * 50}")
    finally:
        if not args.keep_server:
            server.stop()

    rows.sort(key=sort_key)
    if args.json:
        print(json.dumps([{**{k: v for k, v in m.items() if k != "body"}, "result": r} for m, r in rows],
                         ensure_ascii=False, indent=2))
    else:
        render(rows, args.model, args.today)


if __name__ == "__main__":
    main()
