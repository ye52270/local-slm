# 평가 세트 — 슬롯 정확도를 숫자로

목적: "SLM 이 어디까지 맡아도 되나"(AGENTS 원칙 vs 스키마 강제) 와 "VDI 기본 모델(2B/4B)" 을 감이 아니라 수치로 정한다.
사람이 하는 일은 **라벨 30통** 뿐, 나머지는 자동.

## 순서 (VDI 또는 Mac)

1. 메일 내보내기 — VDI: `Run-Demo.cmd -Export -Latest 30` (→ `web\data\inbox.json`) / Mac: `python3 fetch_outlook.py --limit 30 --out web/data/inbox.json`
2. 라벨 템플릿 — `python3 eval/make_labels.py web/data/inbox.json eval/labels.json`
   (Python 이 없는 VDI 면 Mac 에서 만들어 파일만 옮겨도 된다. 라벨은 어디서 채워도 됨)
3. `eval/labels.json` 을 열어 각 메일의 정답을 채운다: `action_items`(실제 해야 할 일, 없으면 `[]`), `deadline`(YYYY-MM-DD 또는 null), `category`, `priority`(선택).
   **category 를 채운 항목만 채점 대상**이다.
4. 패널(`-Panel`)에서 모델을 고르고 30통이 다 요약된 뒤 상단 **결과 내보내기** → `results-Qwen2B-날짜.json`. 모델을 바꿔 한 번 더 → `results-Qwen4B-….json`
5. 채점 — `python3 eval/score.py eval/labels.json results-Qwen2B-*.json results-Qwen4B-*.json`

## 읽는 법

| 열 | 뜻 |
|---|---|
| 할일F1 / 재현 / 정밀 | 정답 할 일을 얼마나 찾았나(재현) · 지어낸 할 일이 얼마나 적나(정밀). 2-gram 겹침 ≥ 0.35 면 같은 항목 |
| 유무 | "할 일이 있다/없다" 판정 정확도 — 브리핑·리포트 정렬에 직접 영향 |
| 기한 / 놓침 / 지어냄 | 날짜 일치율, 놓친 수, 없는 기한을 만든 수 (지어냄이 0 이어야 신뢰할 수 있다) |
| 분류 | category 일치율 (광고·인증 제외 필터에 영향) |
| 평균s | 통당 시간 |

메일별 상세는 `results-….score.json` 의 `per_mail`.

샘플(5통, Mac 4B): 재현 1.0 · 정밀 0.44 · 기한 1.0 · 분류 0.8 — 4B 는 놓치지 않지만 할 일을 과하게 만든다(정밀 낮음). 30통에서 2B 와 비교하면 결정 근거가 된다.
