#!/usr/bin/env python3
"""클래식 Outlook for Mac에서 AppleScript로 메일을 읽어 JSON으로 덤프한다.

사용법:
    python3 fetch_outlook.py --limit 20 --out data/inbox.json
    python3 fetch_outlook.py --folder "보낸 편지함" --limit 5
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

# AppleScript는 필드 사이에 이 구분자를 넣어 한 덩어리 문자열로 돌려준다.
# 본문에 절대 등장하지 않을 만한 시퀀스를 쓴다.
FIELD_SEP = "␟"   # SYMBOL FOR UNIT SEPARATOR
RECORD_SEP = "␞"  # SYMBOL FOR RECORD SEPARATOR

APPLESCRIPT = '''
on run argv
    set folderName to item 1 of argv
    set maxCount to (item 2 of argv) as integer
    set FS to (ASCII character 31)
    set RS to (ASCII character 30)
    tell application "Microsoft Outlook"
        if folderName is "inbox" then
            set theFolder to inbox
        else
            set theFolder to missing value
            repeat with f in mail folders
                try
                    if (name of f) is folderName and (count of messages of f) > 0 then
                        set theFolder to f
                        exit repeat
                    end if
                end try
            end repeat
            if theFolder is missing value then error "folder not found: " & folderName
        end if
        set msgs to messages of theFolder
        set n to count of msgs
        if n > maxCount then set n to maxCount
        set out to ""
        repeat with i from 1 to n
            set m to item i of msgs
            set sndr to sender of m
            set sName to ""
            set sAddr to ""
            try
                set sName to name of sndr
            end try
            try
                set sAddr to address of sndr
            end try
            set body to ""
            try
                set body to plain text content of m
            end try
            set out to out & (id of m) & FS & (subject of m) & FS & sName & FS & sAddr & FS & ((time received of m) as string) & FS & (is read of m) & FS & (todo flag of m) & FS & body & RS
        end repeat
        return out
    end tell
end run
'''


def clean_body(text: str) -> str:
    """서명/인용문/과도한 공백을 잘라 SLM에 넘길 본문을 가볍게 만든다."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # 인용된 원본 메일은 잘라낸다 (한/영 Outlook 구분선)
    for marker in ("\n-----Original Message-----", "\n-----원본 메시지-----",
                   "\nFrom: ", "\n보낸 사람: ", "\n> "):
        idx = text.find(marker)
        if idx > 200:  # 너무 앞에서 자르면 본문이 날아가므로 최소 길이 확보
            text = text[:idx]
    text = re.sub(r"<https?://[^>]+>", "", text)   # Outlook이 붙이는 <url> 중복 제거
    text = re.sub(r"https?://[^\s<>\"')\]]+", "[링크]", text)  # 링크는 요약 대상이 아님(토큰 절약)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


SELECTED_SCRIPT = '''
tell application "Microsoft Outlook"
    set FS to (ASCII character 31)
    set sel to selection
    if class of sel is list then
        if (count of sel) is 0 then return ""
        set m to item 1 of sel
    else
        set m to sel
    end if
    try
        set sndr to sender of m
        set sName to name of sndr
        set sAddr to address of sndr
    on error
        set sName to ""
        set sAddr to ""
    end try
    set body to ""
    try
        set body to plain text content of m
    end try
    return (id of m) & FS & (subject of m) & FS & sName & FS & sAddr & FS & ((time received of m) as string) & FS & body
end tell
'''


def fetch_selected():
    """Outlook 에서 지금 선택한 메일 1통 (패널 '이 메일 요약' 연동용). 없으면 None."""
    proc = subprocess.run(["osascript", "-"], input=SELECTED_SCRIPT, capture_output=True, text=True, timeout=30)
    if proc.returncode != 0 or not proc.stdout.strip():
        return None
    parts = proc.stdout.rstrip("\n").split("\x1f")
    if len(parts) < 6:
        return None
    mid, subject, s_name, s_addr, received, body = parts[:6]
    return {"id": mid.strip(), "subject": subject.strip(), "sender_name": s_name.strip(), "sender_addr": s_addr.strip(),
            "received": received.strip(), "body": clean_body(body)}


def fetch(folder: str, limit: int) -> list[dict]:
    proc = subprocess.run(
        ["osascript", "-", folder, str(limit)],
        input=APPLESCRIPT, capture_output=True, text=True, timeout=300,
    )
    if proc.returncode != 0:
        sys.exit(f"AppleScript 실패:\n{proc.stderr}")

    mails = []
    for rec in proc.stdout.split("\x1e"):
        if not rec.strip():
            continue
        parts = rec.split("\x1f")
        if len(parts) < 8:
            continue
        mid, subject, s_name, s_addr, received, is_read, flag, body = parts[:8]
        mails.append({
            "id": int(mid),
            "subject": subject.strip(),
            "sender_name": s_name.strip(),
            "sender_addr": s_addr.strip(),
            "received": received.strip(),
            "is_read": is_read.strip() == "true",
            "flagged": flag.strip() != "not flagged",
            "body": clean_body(body),
        })
    return mails


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--folder", default="inbox", help='"inbox" 또는 폴더 이름 (예: "보낸 편지함")')
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument("--out", default="data/inbox.json")
    ap.add_argument("--selected", action="store_true", help="선택한 메일 1통만 --out 으로 (없으면 null)")
    args = ap.parse_args()

    if args.selected:
        m = fetch_selected()
        out = Path(args.out); out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(m, ensure_ascii=False), encoding="utf-8")
        print("선택 메일:", m["subject"] if m else "없음")
        return

    mails = fetch(args.folder, args.limit)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(mails, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(mails)}통 저장 → {out}")
    for m in mails:
        print(f"  [{m['received']}] {m['sender_name']} — {m['subject'][:50]} ({len(m['body'])}자)")


if __name__ == "__main__":
    main()
