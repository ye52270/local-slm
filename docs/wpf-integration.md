# win-agent(몰두봇 WPF) 와의 접점 — 무엇을 어디에 붙이고, 무엇을 결정해야 하나

2026-08-18 밤. `~/Desktop/win-agent` 를 훑은 결과와 `local-slm` 결과를 맞춰 본 것. 내일 결정할 항목은 **§3** 에 모았다.

## 1. 지금 win-agent 가 하는 것 (확인된 사실)

- 로컬 SLM: `Services/LocalSlmAssistantService.cs` 가 `llama-server.exe` 를 자식 프로세스로 띄우고 loopback HTTP(임시 포트 + 실행마다 API 키)로 호출. `-c 8192 -b 512 -ub 128 -ctk/-ctv q8_0 --reasoning-budget 256`.
  활성 모델 `kanana-2-1.3b-instruct-Q8_0`(`models/active-model.txt`), 허용 목록은 그것과 `Qwen_Qwen3.5-4B-Q4_K_M` 둘(`LocalSlmStrictRuntimeProfile.cs`).
  **프롬프트 토큰 상한 248/256, 출력 256** — 매우 빡빡함.
- 메일 요약: `skills/mail-summary/SKILL.md` + `MailSummaryShadowSlmRequestFactory.cs` 가 `response_format: json_schema(strict)` 로 `[factId, 한국어 한 문장]` 배열만 받는다.
  즉 **사실(FP1 fact pack)은 코드가 뽑고 SLM 은 문장만** 쓴다. `AGENTS.md` §43-52 원칙: SLM 은 추출·판단·일정 계산 금지, 코드가 재검증, 불일치면 결정적 폴백. **백그라운드 사전 생성 금지.**
- 결과: 1.3B 직접 문장화는 11/11 거부, 결정적 3줄 폴백은 11/11 통과(`artifacts/kanana-local-slm-staging/INSTALL-KANANA.txt`). 전처리 평가(`artifacts/preprocess-eval`)는 must-keep recall 0.83.
- 브리핑: `Services/DailyBriefingComposer.cs` 가 일정/할 일/플래그 메일을 결정적으로 정렬(지연 → 오늘 → 다음). 메일 본문에서 뽑은 할 일은 아직 없음.
- 오브: `EmotionController` 가 단일 소유. Idle/Curious/Thinking(모래시계)/Happy(하트 4초)/Alert(메일·달력·체크 8초)/Sorry/Sleeping. 링 10fps, Thinking 때만 회전. 말풍선 6초.
- 외부 패키지 0개(`AGENTS.md`), WebView2 없음·계획 없음.

## 2. local-slm 결과를 어디에 붙이나 (코드 변경 없이 결정 가능한 것)

| local-slm 산출물 | win-agent 접점 | 메모 |
|---|---|---|
| 슬롯 스키마 `{summary, action_items[], deadline, priority, category}` | `MailSummaryShadowSlmRequestFactory.CreateResponseFormat` (유일한 response_format 생성 지점) + `MailSummaryShadowSlmCompletionParser` | 지금 배열 스키마 자리에 객체 스키마를 넣고 파서·검증 확장 |
| 정리 규칙(배너·인용 절단·링크 자리표시·예산 필터) `direction.md §3` | 전처리 캐스케이드(`docs/PREPROCESSING_EVALUATION.md`, `H0-product-context-preprocessor`) 앞단 | 이 규칙만으로 실메일 입력 토큰 950 → 300~500 |
| 코드 기한 추출 `pipeline.js findDeadlines` (날짜/상대일 + 까지·마감·만료 문맥 점수, 시작일 감점) | `Models/DeterministicMailActionPlan` (`DueAt/DueDate/TemporalExpression/EvidenceSentence`) | AGENTS 원칙과 같은 방향: 기한은 코드가 결정, SLM 값은 대조 |
| 근거 문장(2-gram 겹침) | `EvidenceSentence` | 카드의 "근거 ·" 줄 |
| 오늘/이번 주 리포트 조합 규칙 (`app.js reportData`) | `DailyBriefingComposer` 옆에 "메일 할 일" 소스 추가 | 모델 호출 없음, 정렬 규칙만 |
| 오브 상태 매핑 | 이미 `EmotionController` 에 동일 의미가 있음 | 웹 패널이 그 의미를 그대로 따름(Thinking→Happy 4초, Alert 8초) |
| 새 Outlook 추가 기능(`web/addin`) | 없음(새 표면) | Office.js + localhost, Graph 불필요. WPF 와 독립 |

## 3. 내일 결정할 것 (제가 임의로 정하지 않은 충돌)

1. **SLM 의 역할 범위** — AGENTS 는 "문장화만". local-slm 은 2B/4B 가 `action_items/priority/category` 를 스키마 강제로 채우고 코드가 기한·근거를 검증하는 방식이 실메일에서 쓸 만했다(2B 7~20초, 4B 더 정확). 두 가지 길:
   - (a) 원칙 유지: 코드가 할 일 문장 후보를 규칙으로 뽑고 SLM 은 다듬기만 → 정확하지만 규칙 유지비가 큼, 회신형 업무 메일에서 회수율 낮음
   - (b) 원칙 완화(메일 요약 경로만): 스키마 강제 + 코드 검증(기한 근거·중복·광고 안전망)을 "코드 재검증"으로 인정 → 이 저장소의 방식. 근거 표시와 승인 게이트가 안전장치
   추천: **(b) 를 메일 요약 스킬에 한정해 채택**하고 평가 세트(30통 라벨)로 수치 확인 후 확정.
2. **백그라운드 사전 생성 금지 vs Watch 사전 요약** — VDI 통당 8~20초라 실시간은 불가. 사전 요약을 금지하면 "메일 요약" 은 항상 대기 화면이 된다. 추천: **도착 알림 시점에만**(OutlookMailMonitor 틱) 새 메일 1통을 요약해 캐시(무한 백그라운드가 아니라 이벤트 1회) — 원칙의 취지(VDI 부하·프라이버시)와 양립.
3. **모델·토큰 상한** — 1.3B + 256 토큰으로는 슬롯 채우기가 안 된다(이 저장소에서 1.3B 는 6/6 실패). 2026-08-19 VDI 실메일 30통 눈 비교에서 **4B 가 2B 보다 확실히 나았다**(사용자 판단). 추천: 메일 요약 경로는 **Qwen3.5-4B Q4_K_M(허용 목록에 이미 있음), 입력 ~600 토큰, 출력 180**, 통당 20~30초는 도착 이벤트 시 뒤에서 1통씩 요약해 흡수. 2B 는 속도 우선 옵션.
4. **WPF 화면 연결 방식** — WebView2 는 새 패키지라 원칙 위반. 추천: 웹 패널은 **참조 구현/데모**로 두고, WPF 는 `PanelWindow.MailSummary` 카드에 슬롯 필드(할 일·기한·근거)를 추가하는 C# 이식(HANDOFF 7단계 구조와 동일). 파이프라인 규칙은 `direction.md §3` 10줄.
5. **감시 주기** — `OutlookMailMonitor` 최소 60초. 웹 패널의 `-Panel -Watch` 는 30초 내보내기 + 20초 폴링. 제품에서는 모니터 틱을 그대로 쓰면 됨.

## 4. 내일 아침 확인 순서 (VDI)

1. `win-agent` 폴더(또는 zip 을 푼 폴더)에서 `Run-Demo.cmd -Panel -Watch -Latest 10`
2. 브라우저: 오브(우하단) 얼굴 → 요약 중 무지개 링 → 끝나면 하트 4초. 상단 `Qwen 2B | Qwen 4B` 토글, `오늘 리포트` 칩, 하단 컴포저에 `이번 주` 입력.
3. 자기 자신에게 메일 1통 발송 → 30초 내보내기 + 20초 폴링 → 오브 메일 글리프 8초 + 말풍선 "새 메일 1통" → 요약 후 "할 일 N건 정리됨".
4. 오브 클릭(또는 ⌥Space) → 알약으로 접힘/펼침.
5. 아이콘이 안 보이면(폰트 동봉됨) 브라우저 캐시 새로고침(Ctrl+F5).

## 5. 이식 결과 (2026-08-19, win-agent `feature/mail-slots`)

§3 의 결정은 다음처럼 **플래그(기본 꺼짐)** 로 반영해 A~E 를 모두 이식했다. 상세는 win-agent `docs/MAIL_SLOTS.md`.

| 단계 | 커밋 | 내용 |
|---|---|---|
| A 순수 로직 | `e907826` | `Services/MailSlots/*` (전처리·트리아지·코드 기한·프롬프트/스키마 v9·응답 검증·리포트 조합), WinOrb.Core 링크, `tools/WinOrb.MailSlotEval` 38개 단정 PASS |
| B 카드 슬롯 | `c62c616` | JSON 스키마 요청(`MailSlotRequestFactory`), `MailSlotService`(캐시 `mail-slots.json`, 대기열 1개), 메일 요약 카드에 할 일·근거·기한·완료 행, 설정 `메일 슬롯` / `도착 시 요약` |
| C 브리핑·리포트 | `272dac9` | `오늘 업무` 에 "메일 할 일" 섹션, `오늘 리포트`/`이번 주 리포트`/`오늘 마무리` (결정적 마크다운, 모델 호출 없음) |
| D 도착 요약 | `e301c7f` | 알림 이벤트 1회 요약 + 캐시(설정 켜짐 시), `CaptureMailByIdAsync`(EntryID), llama-server `--poll 0` |
| E 팔레트 | `98d9bdb` | 슬래시 팔레트 항목, `메일 검색 <키워드>`, `메일 슬롯 상태` |
| 문서 | `2685364` | `docs/MAIL_SLOTS.md` |

- 결정 반영: §3-1 은 (b) 를 메일 슬롯 경로에 한정, §3-2 는 "도착 이벤트 1회" 만(무한 백그라운드 없음), §3-3 은 입력 700/출력 180 토큰, §3-4 는 WebView2 없이 C# 이식.
- 빌드: Mac 크로스 빌드 `dotnet build -c Release -r win-x64 -p:EnableWindowsTargeting=true` 0 오류, `scripts/publish-win-from-mac.sh` → `artifacts/releases/1.1.0/WinOrbPoc-win11-x64.zip`.
- **미검증**: WPF 화면·Outlook COM 경로는 Mac 에서 실행할 수 없어 VDI 실행 확인이 남아 있다(순서는 `docs/MAIL_SLOTS.md` 마지막 절).
