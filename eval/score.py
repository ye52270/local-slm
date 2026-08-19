#!/usr/bin/env python3
"""채점 — 패널의 "결과 내보내기" JSON 을 라벨과 비교해 모델별 슬롯 정확도를 낸다.

    python3 eval/score.py eval/labels.json results-Qwen2B-2026-08-19.json [results-Qwen4B-....json ...]

지표
  할 일  : 정답 항목마다 예측 항목과 2-gram 겹침 ≥ 0.35 면 맞춘 것으로 본다 → 회수율/정밀도/F1, "할 일 있음/없음" 판정 정확도
  기한   : 정답과 예측이 같은 날이면 정답. 정답 없음/예측 없음 짝도 정답. (놓침 / 지어냄 / 날짜 틀림 을 따로 센다)
  분류   : category 일치율.  우선순위: 라벨이 있을 때만.
  속도   : 결과 파일의 timing 평균
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path


def bigrams(s: str) -> set:
    t = re.sub(r"[\s\W_]+", "", s or "")
    return {t[i:i + 2] for i in range(len(t) - 1)}


def overlap(a: str, b: str) -> float:
    A, B = bigrams(a), bigrams(b)
    if not A or not B:
        return 0.0
    return len(A & B) / min(len(A), len(B))


def score(labels: dict, results: dict) -> dict:
    lab = {str(it["id"]): it for it in labels["items"] if it.get("category") or it.get("action_items") or it.get("deadline") is not None and it.get("category") != ""}
    # 라벨이 채워진 항목만(category 가 비어 있으면 미라벨로 본다)
    lab = {k: v for k, v in lab.items() if v.get("category")}
    rows = {str(r["id"]): r for r in results["rows"] if r.get("result")}
    ids = [i for i in lab if i in rows]
    if not ids:
        return {"n": 0}

    tp = fp = fn = 0
    has_ok = 0
    dl = Counter()
    cat_ok = pr_ok = pr_n = 0
    ms = []
    per = []
    for i in ids:
        L, R = lab[i], rows[i]["result"]
        gold = [a for a in L.get("action_items", []) if a and a.strip()]
        pred = R.get("action_items", []) or []
        matched = set()
        for g in gold:
            j = next((k for k, p in enumerate(pred) if k not in matched and overlap(g, p) >= 0.35), None)
            if j is None:
                fn += 1
            else:
                tp += 1; matched.add(j)
        fp += len(pred) - len(matched)
        has_ok += int(bool(gold) == bool(pred))
        gd, pd = L.get("deadline") or None, R.get("deadline") or None
        if gd == pd:
            dl["ok"] += 1
        elif gd and not pd:
            dl["missed"] += 1
        elif pd and not gd:
            dl["invented"] += 1
        else:
            dl["wrong_date"] += 1
        cat_ok += int((L.get("category") or "") == (R.get("category") or ""))
        if L.get("priority"):
            pr_n += 1; pr_ok += int(L["priority"] == R.get("priority"))
        t = (R.get("timing") or {}).get("totalMs")
        if t:
            ms.append(t)
        per.append({"id": i, "subject": lab[i].get("subject", "")[:40], "gold_actions": len(gold), "pred_actions": len(pred),
                    "deadline": f"{gd} → {pd}", "category": f"{L.get('category')} → {R.get('category')}"})

    n = len(ids)
    prec = tp / (tp + fp) if tp + fp else 1.0
    rec = tp / (tp + fn) if tp + fn else 1.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    return {
        "n": n, "model": results.get("model"), "prompt_version": results.get("prompt_version"),
        "action_precision": round(prec, 3), "action_recall": round(rec, 3), "action_f1": round(f1, 3),
        "has_action_acc": round(has_ok / n, 3),
        "deadline_acc": round(dl["ok"] / n, 3), "deadline_missed": dl["missed"], "deadline_invented": dl["invented"], "deadline_wrong": dl["wrong_date"],
        "category_acc": round(cat_ok / n, 3),
        "priority_acc": round(pr_ok / pr_n, 3) if pr_n else None,
        "avg_sec": round(sum(ms) / len(ms) / 1000, 1) if ms else None,
        "per_mail": per,
    }


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    labels = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    print(f"{'모델':<28}{'n':>4}{'할일F1':>8}{'재현':>7}{'정밀':>7}{'유무':>7}{'기한':>7}{'놓침':>5}{'지어냄':>6}{'분류':>7}{'평균s':>7}")
    for f in sys.argv[2:]:
        res = json.loads(Path(f).read_text(encoding="utf-8"))
        s = score(labels, res)
        if not s["n"]:
            print(f"{f}: 라벨과 겹치는 메일이 없습니다 (labels 의 category 를 채웠는지 확인)")
            continue
        print(f"{str(s['model'])[:27]:<28}{s['n']:>4}{s['action_f1']:>8}{s['action_recall']:>7}{s['action_precision']:>7}{s['has_action_acc']:>7}{s['deadline_acc']:>7}{s['deadline_missed']:>5}{s['deadline_invented']:>6}{s['category_acc']:>7}{str(s['avg_sec']):>7}")
        out = Path(f).with_suffix(".score.json")
        out.write_text(json.dumps(s, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"   → 메일별 상세: {out}")


if __name__ == "__main__":
    main()
