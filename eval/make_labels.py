#!/usr/bin/env python3
"""라벨 템플릿 만들기 — inbox.json(내보낸 메일)에서 사람이 채울 정답 파일을 만든다.

    python3 eval/make_labels.py web/data/inbox.json eval/labels.json

라벨 파일의 각 항목에서 사람이 채우는 칸(정답):
  action_items : 수신자가 실제로 해야 하는 일. 없으면 []  (문장은 자유롭게, 채점은 겹침 기준)
  deadline     : 본문에 명시된 기한 YYYY-MM-DD, 없으면 null
  category     : action_required / notice / verification / personal / newsletter / other
  priority     : high / medium / low  (선택)
  note         : 메모(선택)
이미 라벨이 있는 파일을 두 번째 인자로 주면 기존 라벨은 보존하고 새 메일만 추가한다.
"""
import json
import sys
from pathlib import Path


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "web/data/inbox.json")
    dst = Path(sys.argv[2] if len(sys.argv) > 2 else "eval/labels.json")
    mails = json.loads(src.read_text(encoding="utf-8"))
    existing = {}
    if dst.exists():
        for it in json.loads(dst.read_text(encoding="utf-8")).get("items", []):
            existing[str(it["id"])] = it
    items = []
    for m in mails:
        mid = str(m.get("id"))
        if mid in existing:
            items.append(existing[mid])
            continue
        items.append({
            "id": mid,
            "subject": m.get("subject", ""),
            "sender": m.get("sender_name", ""),
            "received": m.get("received", ""),
            "body_preview": (m.get("body", "") or "")[:300],
            "action_items": [],
            "deadline": None,
            "category": "",
            "priority": "",
            "note": "",
        })
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps({"schema": "moldubot-mail-labels-v1", "items": items}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(items)}건 → {dst}  (기존 라벨 {len(existing)}건 유지)")


if __name__ == "__main__":
    main()
