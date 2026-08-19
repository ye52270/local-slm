# local-slm — 로컬 SLM 메일 브리핑 PoC

클래식 Outlook for Mac의 받은 편지함을 읽어, 로컬 GGUF 모델(llama.cpp)로
**발신자 / 요약 / 할 일 / 기한 / 우선순위**를 뽑아 터미널에 표로 보여준다.
메일 내용은 이 머신 밖으로 나가지 않는다.

## 구성

```
fetch_outlook.py   AppleScript로 Outlook 메일 → data/inbox.json
summarize.py       llama-server 자동 기동 → JSON 스키마 강제 추출 → SQLite 캐시 → 터미널 표
bin/llama/         llama.cpp b10472 macOS arm64 프리빌드 (llama-server, Metal)
models/            Qwen3.5-4B-Q4_K_M (기본), kanana-2-1.3b · kanana-2-3b (Q8_0, 비교용)
data/              inbox.json(메일 덤프), cache.sqlite(추출 결과), llama-server.log
```

흐름: Outlook → (AppleScript) → JSON → 정리(인용/서명 제거) → llama-server
`/v1/chat/completions` + `response_format: json_schema` → 슬롯 JSON
(`summary, action_items, deadline, priority, category`) → 후처리(날짜 검증) → 정렬 → 표.

발신자·수신일은 Outlook 메타데이터를 그대로 쓰고, 나머지 슬롯만 SLM이 채운다.
llama.cpp의 GBNF 문법 강제 덕분에 모델이 스키마를 벗어난 JSON을 낼 수 없다.

## 브리핑 패널 · 새 Outlook 추가 기능

콘솔 표 대신 디자인 시스템(`docs/design-system`) 기반 화면으로 보려면:

```bash
python3 summarize.py --panel --fetch     # Outlook → web/data/inbox.json → llama-server(--path web) → 브라우저
```

`web/` 는 llama-server 가 정적으로 서빙하는 순수 HTML/JS 다(별도 백엔드 없음). 요약은 브라우저 안의 `web/pipeline.js` 가
같은 서버의 `/v1/chat/completions` 로 수행한다. 새 Outlook 지원은 `web/addin/`(Office.js 추가 기능, 같은 pipeline.js).
방향과 규칙 요약: [docs/direction.md](docs/direction.md). 몰두봇 WPF(`~/Desktop/win-agent`)와의 접점·결정 사항: [docs/wpf-integration.md](docs/wpf-integration.md).

## 평가

`eval/README.md` — 라벨 30통으로 2B/4B 슬롯 정확도(할 일 F1·기한·분류) 채점.

## 실행

```bash
python3 summarize.py --fetch            # Outlook에서 새로 읽고 요약 (기본 20통, Qwen)
python3 summarize.py                    # 저장된 data/inbox.json으로 요약 (캐시 있으면 즉시)
python3 summarize.py --model kanana3b   # Kanana 3B로 비교 (kanana = 1.3B)
python3 summarize.py --no-cache --limit 5
python3 summarize.py --json             # 표 대신 JSON
python3 fetch_outlook.py --folder "보낸 편지함" --limit 10 --out data/sent.json
```

의존성: macOS Python 3.9+ 표준 라이브러리만. Outlook은 **클래식 모드**여야 한다
(새 Outlook은 AppleScript 미지원).

## 결과 메모 (2026-08-18, M2 Pro 16GB)

- Qwen3.5-4B Q4_K_M: 통당 2~5초, 19통 52초. 할 일·기한 추출 정확도 양호.
- Kanana-2 1.3B Q8_0: 통당 1~2.5초로 빠르지만 수신일을 기한으로 오인, 핵심 할 일 누락 잦음.
- Qwen3.5는 thinking을 끄지 않으면(`enable_thinking: false`) 스키마 강제가 풀려 빈 응답이 나온다.

## 알려진 한계 / 다음 단계

- temperature 0.1에서도 같은 메일이 실행마다 priority가 흔들릴 수 있음 → 0으로 내리거나 few-shot 예시 추가.
- 기한 없는 "즉시" 조치는 deadline null로 나오므로 별도 배지 필요.
- 실시간 감시(새 메일 도착 시 자동 요약), 메뉴바 알림, 회신 초안 생성은 미구현.

## Windows / VDI 데모 패키지

`windows/` 폴더(= `local-slm-win-demo.zip`)에 Python 없이 PowerShell + Outlook COM + llama.cpp CPU 빌드로
동작하는 버전이 있다. 사용법은 [windows/README-win.md](windows/README-win.md) 참고.
CPU 전용 실측(M2 Pro CPU 4스레드): Qwen 4B ≈ 10초/통, Kanana 3B ≈ 7초/통, Kanana 1.3B ≈ 3.5초/통.
