# 몰두봇 Design System

부르기 전에 먼저 와 있는 멀티에이전트 업무 비서. 데스크톱에 상주하는 플로팅 런처 하나로
메일·일정·회의실·파일·웹을 다루는 다섯 개 도메인 에이전트가 지휘자(Supervisor) 아래 협업합니다.
이 저장소는 그 제품의 색·타입·표면·아이콘·화면 규칙을 모아둔 것입니다.

## 제품 맥락

- **만든 곳** — SK AX '야르' 팀 (팀장 박제영, 박세웅, 배수민). 사내 AI Solution 리그 출품작이며 실사용 중.
- **문제** — 업무 정보가 메일·일정·할 일·회의실·문서로 흩어져 있고, 무엇이 급한지 고르는 일 자체가 매일 비용이 됩니다.
  실행하는 에이전트를 도입하려면 성능보다 **신뢰**가 먼저라는 판단에서 출발했습니다.
- **환경 제약** — VDI·망분리. API가 안 열리는 곳에서는 화면 자체를 분석(VLM)하고, Outlook을 백오피스로 씁니다.
  온디바이스 sLLM(Qwen3.5-4B-Q4_K_M 등)과 외부 모델을 상황에 따라 나눠 씁니다.
- **UX 대원칙** (docs/design/06-ui-spec.md, 기획서 3-8)
  1. 항상 보이는 요소를 늘리지 않는다 — 기능이 늘어도 버튼·패널을 추가하지 않고 오브의 표정과 다음 입력 자리로 표현
  2. 사용자가 배우지 않아도 되게 한다 — 조작은 단축키·자연어 입력·창 끌어놓기 셋뿐
  3. 사람처럼 느껴지되 과하지 않게 — 작은 원 안의 도트 얼굴로 절제
  4. 통제감을 잃지 않게 — 근거를 함께 보여주고, 쓰기 동작은 전부 승인 게이트를 지난다

### 두 개의 구현

같은 제품에 구현이 둘 있습니다. **값이 충돌하면 WPF가 기준입니다** — VDI에서 실제로 돌고 있는 쪽이고, 사용자가 보낸 스크린샷도 여기서 나왔습니다.

| | WinOrbPoc (기준) | moldubot3 |
|---|---|---|
| 스택 | WPF / .NET (`win-agent`, `WinOrbPoc.sln`) | Electron + React + Vite |
| 폰트 | `Malgun Gothic, Segoe UI Variable Text, Segoe UI` | 시스템 산세리프 |
| 패널 폭 | **560** (최대 높이 512) | 520 (펼침 최대 680) |
| 셸 라운드 | **40** (안쪽 판 18) | 20 / 44 (위 20, 아래 알약) |
| 카드 · 칩 | **8 / 14 · 9** | 10–12 · 14–16 |
| 입력바 | **28**, `#2E394D` | 알약 44 |
| 표면 | 그라디언트 `#202530→#191D27`, 테두리 `#536078` | 글래스 + 블러 |
| 아이콘 | **없음** (텍스트 글리프) | Tabler webfont 3.30.0 |
| 오브 | `DotMatrixDisplay` 21×16 + `EmotionRing` | `OrbLed.tsx` canvas |

### 표면(제품 화면)

| 표면 | 상태 | 이 저장소에서 |
|---|---|---|
| 데스크톱 상주 패널 (WPF `PanelWindow`) | 실사용 | `ui_kits/desktop-panel/` (다크 = 실제 값) |
| 알림 말풍선 (`OrbNotificationWindow`) | 실사용 | `components/overlay/NotificationToast` |
| 창 끌어놓기 말풍선 (`ContextPromptWindow`) | 실사용 | `components/overlay/OrbPeek` |
| 상태 오브 (별도 창, 80px, LED 도트 얼굴 10종) | 실사용 | 킷에 포함 · `guidelines/color-led.card.html` |
| 텔레그램 브리지 (같은 엔진, 대화 중심 렌더) | 실사용 | 아직 없음 |
| 모바일 채널 (톡톡·SK 앱 탑재 계획) | 계획 | 없음 |

## 출처

읽은 것을 그대로 남겨둡니다. 이 문서를 보는 사람이 접근 권한이 있으리라 가정하지 않습니다.

- **로컬 코드베이스 `win-agent` (WinOrbPoc, WPF)** — 이 시스템의 1차 기준
  - `App.xaml` — PanelBackgroundBrush · PanelBorderBrush · PanelButtonStyle / PrimaryPanelButtonStyle / TextButtonStyle · 스크롤바
  - `Windows/PanelWindow.xaml` — 패널 560×512, 셸 40, 판 18, 카드 8/14, 칩 9, 입력바 28, 폰트 12~16
  - `Windows/OrbWindow.xaml`, `Windows/OrbNotificationWindow.xaml`, `Windows/ContextPromptWindow.xaml`
  - `Controls/DotMatrixDisplay.cs` — 오브 얼굴(168px, 21×16, pitch 8, 도트 r=pitch×0.33, 꺼진 도트 `#313437` α.72, 켜진 도트 1.65배 글로우 α.16)
  - `Controls/EmotionRing.cs` — 림(외곽 반지름의 7%, α.9)과 감정별 그라디언트 6종
  - `Controls/MarkdownDocumentBuilder.cs` — 답변 마크다운 렌더(인용 좌측선 `#4A89FF`, 코드 `#E9F56B` on `#263044`)
  - `Services/` 90여 개 — Outlook COM 연동, 승인 게이트, 스킬 레지스트리, 창 캡처·OCR, 로컬 sLLM
- **GitHub** — `https://github.com/ye52270/moldubot3.git` (`main`, 커밋 트리 `8e68fd22bc39`)
  - `desktop/src/styles/globals.css` (1,719줄) — 색·라운드·컴포넌트 스타일의 원본. 사본: `reference/moldubot3-globals.css`
  - `docs/design/06-ui-spec.md` — 런처 상태 전이, 컴포넌트 정의, 카피 규칙
  - `desktop/src/app/components/OrbLed.tsx` — 오브 도트 얼굴 팔레트
  - `desktop/index.html` — 아이콘 폰트 로드 방식
- **기획서** — `몰두봇_기획서.docx` (AI Solution 리그 지원서). 추출 텍스트: `scraps/planning-doc.txt`, 문서 내 이미지 22장: `scraps/doc-images/`
- **스크린샷** — 사용자 VDI 실행 화면 2장 (`uploads/`), 2026-08-15
- **동작 영상** — `https://youtu.be/YPie4KQj-i8`
- **주의** — `explorations/panel-redesign.html`(시안 3종)은 WPF 코드를 읽기 전에 그려서 폭이 520입니다. 실제는 560이며 UI 킷은 560으로 맞춰져 있습니다.

---

## CONTENT FUNDAMENTALS

몰두봇의 말투는 **비서의 말투**입니다. 유능하지만 앞서 나가지 않고, 한 일과 못 한 일을 그대로 말합니다.

- **평서형 종결 "~니다"** — "배포는 아직 완료되지 않았습니다", "27일째 회신이 없습니다".
  구어체 "~요"는 안내 문구에만 제한적으로 씁니다("발송 전에 확인해 주세요").
- **나는 없고 너도 없다** — 주어를 세우지 않습니다. "제가 초안을 만들어 드렸어요" ✕ → "초안을 준비했습니다" ○.
  사용자를 부를 때는 이름 없이 문장으로 처리합니다.
- **라벨은 명사구 또는 동사원형, 마침표 없음** — "답장 초안 만들기", "후속 메일 열기", "메일 열기", "완료 나중에".
  느낌표·물음표도 라벨에서는 쓰지 않습니다.
- **결과는 완료형 단문** — "메일 발송됨", "일정 등록됨". **"성공적으로 처리되었습니다" 류 금지.**
- **빈 화면을 사과하지 않는다** — "아직 없음", "데이터가 없습니다" ✕. 대신 할 수 있는 일을 제시합니다
  ("오늘 메일 요약 / 이번 주 일정 / 회의실 찾기").
- **되지 않는 길은 안내하지 않는다** — VDI 원격 화면의 메일은 스레드 답장이 불가하므로 "이 내용으로 메일 초안 만들기"만 제안합니다.
- **가짜 성공 금지** — 표시된 작업 과정은 실제 실행과 1:1이어야 합니다. 하지 않은 단계를 그리지 않습니다.
- **판단을 숨기지 않는다** — 나열이 아니라 결론을 먼저 냅니다. "관련 메일 3건" ✕ →
  "재발송 요청 이후 27일째 회신이 없습니다. 병목은 박제영의 배포 확인 회신입니다" ○.
- **숫자는 근거와 함께** — "지연 8"처럼 세는 값에는 옆에 원본 링크나 기간(8-12 = 8월 12일 건)을 붙입니다.
- **이모지는 UI에 쓰지 않습니다.** 아이콘은 Tabler 글리프로 대체합니다. (텔레그램 채널은 예외 — 메신저 관습을 따릅니다.)
- **영문 대문자 라벨은 모노로만** — `TO`, `SUBJECT`, `BODY`처럼 폼 라벨에 한정. 한글은 대문자 개념이 없으니 크기·색으로 위계를 만듭니다.

## VISUAL FOUNDATIONS

### 색
그래파이트 다크가 기본(톤 A `#1c1d21`), 웜 그레이(톤 B `#211f1b`)가 대안입니다 — 순수 블랙은 기각됐습니다.
**인터랙션 색은 파랑 하나**(`--accent #5b8def`), 그 외 색은 전부 의미가 고정돼 있습니다:
연결 끊김 `--down`, 승인 대기 `--warn`, 완료 `--ok`, 즉시 조치 1건 `--urgent #ff4d4a`.
카운트 뱃지는 무채색이 기본이고 빨강은 한 화면에 하나까지 — 상시 불안감을 만들지 않기 위한 규칙입니다.
라이트 테마는 이 저장소의 제안이며(아직 앱에 없음) 다크와 같은 구조에서 토큰만 교체합니다.

### 타입
웹폰트 없음. OS 산세리프(Segoe UI / 맑은 고딕 / Apple SD Gothic Neo)를 그대로 씁니다.
크기는 22(제목) · 16(입력) · 14(답변 본문) · 13.5(카드 제목) · 13(본문) · 12(메타) · 11(라벨) · 9.5(뱃지).
굵기는 400/500/600만 — 700 이상은 워드마크에서만. 자간은 큰 글자에만 -0.02em.
**숫자와 로마자 미세 라벨은 모노 + tabular-nums**(시간·건수·지연일·모델명), 한글은 절대 모노로 쓰지 않습니다.

### 표면과 깊이
깊이는 그림자가 아니라 **밝기 차이 + 0.5px 헤어라인**으로 만듭니다.
런처는 투명 창 위에 떠 있어 바깥 그림자가 회색 띠로 번지므로, 안쪽 1px 하이라이트(`inset 0 1px 1px rgba(255,255,255,.12)`)로
"위에서 빛을 받는" 느낌만 줍니다 — 오브 림과 같은 조명입니다. 라이트 테마에서는 실제 드롭섀도를 씁니다.
표면 중첩은 2단까지. 카드 안에 카드 안에 카드는 만들지 않습니다.

### 라운드
**WPF(기준)**: 바깥 셸 40 — 창 자체가 크게 둥글고, 그 안의 판이 위쪽만 18로 둥급니다. 항목 카드 8, 큰 카드 14, 칩 9, 입력바 28, 버튼 10.
**Electron**: 접힘은 완전 알약(44), 펼침은 `20 20 44 44` — 입력바 곡률을 유지한 채 위로 자랍니다. 카드 10–12, 칩 14–16.
어느 쪽이든 오브·아바타는 원, 미리보기 블록은 6입니다.

### 배경과 재질
사진·일러스트를 쓰지 않습니다. 재질은 세 개뿐입니다: 글래스 그라디언트(떠 있는 표면), 92% 불투명 판(본문 바탕, 가독성 우선),
6px 도트 필드(오브 LED에서 가져온 유일한 텍스처 — 강조 카드에만). 그라디언트는 글래스 표면과 오브 무지개 링에만 씁니다.

### 투명도와 블러
반투명은 **떠 있는 것에만**. 콘텐츠 바탕은 거의 불투명(92%)입니다 — 뒤 배경이 밝을 때 글자가 무너지기 때문입니다.
`prefers-reduced-transparency`에서는 글래스를 끄고 `--panel` 불투명으로 대체합니다. VDI 원격 세션에서는 블러 비용이 커서 라이트 테마를 권합니다.

### 동작
120ms(색·상태) / 180ms(펼침) / 260ms(폭 변경), `cubic-bezier(.2,.8,.2,1)`.
바운스·스프링 없음. 시간이 걸리는 작업은 **숨쉬기(2.2s ease-in-out 반복, opacity 0.5↔1)** 로 표현하고,
'듣는 중/작업 중'에는 런처 테두리 자체에 무지개 conic 링이 흐릅니다(2.5px, mask로 링만 남김).
`prefers-reduced-motion`에서는 애니메이션을 멈추고 정적 상태로 둡니다.

### 상태 표현
- **호버** — 배경 +4~6% 밝기, 텍스트는 muted → primary. 아이콘은 `scale(1.1)` + 밝기 1.15.
- **누름** — 색을 한 단계 어둡게. 크기 축소는 쓰지 않습니다.
- **포커스** — 파란 2px 링(`--ring-focus`). 외곽선은 지웁니다.
- **비활성** — opacity 0.45, 커서 기본. '준비 중' 기능은 비활성 버튼 + 오른쪽 끝 모노 라벨로 표시하고 버튼 위에 겹치지 않습니다.
- **선택/포커스 대상** — 입력창 왼쪽에 포커스 태그(파란 틴트 칩)로 붙습니다.

### 레이아웃 규칙
런처는 화면 우하단에 고정, **폭 560px, 최대 높이 512px**(넘치면 내부 스크롤 — Electron 구현은 520×680).
콘텐츠 판은 482px, 하단 큰 카드는 448px 폭입니다. 오브는 오른쪽에 88px 슬롯으로 붙습니다.
**입력창은 항상 맨 아래 고정**, 출력은 위로 자랍니다(카톡식). 작업물 패널이 열리면 폭이 840px로 늘고 좌(대화)/우(작업물)로 갈립니다.
타이핑하는 곳은 앱 전체에서 메인 입력창 하나 — 우측 패널에는 대화 입력을 두지 않습니다. 창 이동은 오브를 잡고 합니다.
스크롤바는 8px, thumb 14% 흰색.

### 이미지의 색감
제품 내 이미지가 없습니다. 필요하면 스크린샷(사용자 화면 캡처)이 유일한 이미지이며, 보정하지 않고 그대로 씁니다.

## ICONOGRAPHY

**현재 WPF 앱에는 아이콘 세트가 없습니다.** `OutlookItemGlyph()`가 "일"(일정) · "✓"(할 일) · "!"(플래그 메일) · "O"(기타)처럼
한글·기호 문자를 아이콘 자리에 넣고 있습니다. 화면이 투박해 보이는 원인 중 하나이며, 크기·정렬·색을 맞추기도 어렵습니다.
**권고 순서**: ① Windows 11 내장 **Segoe Fluent Icons**를 `FontIcon`으로 사용(설치·라이선스 부담 없음, WinUI 기본) →
② 그래도 부족하면 Tabler SVG를 `Path` 리소스로 넣기. 어느 쪽이든 글리프를 문자로 넣는 방식은 걷어내는 게 좋습니다.

이 디자인 시스템의 킷·카드는 **Tabler Icons 웹폰트 3.30.0**을 씁니다 — moldubot3(Electron)이 실제로 쓰는 세트이고,
WPF 화면을 HTML로 재현할 때의 대체입니다(치환 사실을 여기 명시해 둡니다).

- **Tabler Icons 웹폰트 3.30.0** — jsDelivr CDN에서 로드합니다.
  `tokens/fonts.css`가 `@import`로 가져오므로 `styles.css`만 링크하면 `<i class="ti ti-mail"></i>`로 바로 씁니다.
  선 굵기 2px, 24px 그리드. 표시 크기는 13~17px, 색은 항상 텍스트 색(또는 신호 틴트)을 상속합니다.
  자주 쓰는 글리프: `ti-sparkles`(에이전트), `ti-microphone`, `ti-mail` / `ti-mail-opened` / `ti-mail-plus`,
  `ti-calendar-event`, `ti-clock`, `ti-bell`, `ti-checkbox`, `ti-shield-check`(승인), `ti-send`, `ti-pencil`,
  `ti-flag-2`(추천 액션), `ti-chevron-right/down`, `ti-x`, `ti-loader-2`(회전), `ti-alert-triangle`, `ti-pin`(포커스).
- **오브의 도트 얼굴** — 아이콘 시스템의 일부입니다. 14×14 도트 그리드에 canvas로 그리며, 표정 10종(평상·기쁨·신남·윙크·졸림·미안)과
  신호 글리프(메일·종·일정·체크·해·비·눈·모래시계)가 같은 그리드를 씁니다. 색은 `guidelines/color-led.card.html` 참조.
- **파일 타입 아이콘** — Office 브랜드색을 직접 씁니다(word `#2b579a`, excel `#217346`, ppt `#c43e1c`, pdf `#e2574c`).
- **이모지 금지**(데스크톱 UI). 유니코드 기호는 `⌥Space` 같은 키 표기와 `·` 구분자, `–` 시간 범위에만 씁니다.
- **로고 없음** — 소스에 있는 마크는 회사 CI뿐이라 이 시스템에 포함하지 않았습니다. 로고 자리에는 이름을 타입으로 세웁니다
  (`guidelines/brand-wordmark.card.html`). 몰두봇 전용 마크가 있으면 보내주세요.

---

## Components

`window.<Namespace>`로 노출되는 재사용 단위. 각 디렉터리에 `.d.ts`(props)와 `.prompt.md`(사용법)가 함께 있습니다.

| 컴포넌트 | 그룹 | 무엇 |
|---|---|---|
| `Button` | core | 28px 액션 버튼. primary / secondary / ghost / ok |
| `Chip` | core | 추천 칩(followup). 첫 칩만 accent |
| `CountChip` | core | 브리핑 헤더 건수 칩. 지연 하나만 urgent |
| `Tag` | core | 결과 카드 우선순위 태그 — 회신 필요 / 지연 |
| `SignalButton` | core | 입력창 옆 신호 아이콘 + 뱃지(메일·일정·할 일·알림·예약) |
| `NotificationToast` | overlay | 오브 옆 알림 말풍선 320×84 (OrbNotificationWindow) |
| `OrbPeek` | overlay | 창 끌어놓기 말풍선 300×78 (ContextPromptWindow) |
| `MailResultCard` | panel | mail_list 결과 한 행 — 아바타 · 제목 · 미리보기 · 태그 |
| `ApprovalBox` | panel | 승인 게이트 카드. 대상 · 미리보기 · 되돌림 여부 · 승인/거부 |
| `AgentTrace` | panel | 작업 과정 공개(기본 접힘). 실행과 1:1 |
| `PanelShell` | panel | 우측 작업물 패널 껍데기(제목 · 본문 · 결정 버튼) |
| `OrbLed` | brand | 상태 오브. 14×14 LED 도트 얼굴 5종 + 무지개 림 |

## 파일 안내

| 경로 | 내용 |
|---|---|
| `styles.css` | 전역 진입점. `@import`만 있습니다. 소비하는 쪽은 이 파일 하나만 링크하면 됩니다 |
| `tokens/` | `fonts` `colors` `typography` `spacing` `surfaces` `motion` `semantic` `base` |
| `guidelines/*.card.html` | 파운데이션 카드 17장 (Colors / Type / Surfaces / Spacing / Brand) |
| `components/{core,panel,overlay,brand}/` | 컴포넌트 12종 + 그룹별 카드 |
| `guidelines/wpf-mapping.md` | **WPF 대응표** — 토큰→XAML 리소스, 아이콘→Segoe Fluent 글리프, 효과 구현법 |
| `ui_kits/desktop-panel/` | 데스크톱 상주 패널 UI 킷 — 화면 5종, 라이트/다크 토글 (`README.md` 참조) |
| `explorations/panel-redesign.html` | 방향 시안 3종 비교(계기판 / 유리 / 라이트). 결정: 라이트 기본 + 다크 토글 |
| `reference/moldubot3-globals.css` | 실제 앱 스타일시트 사본 — 값이 애매하면 여기가 정답입니다 |
| `scraps/` | 기획서 추출 텍스트, 문서 이미지, 작업 중 스크린샷 |
| `thumbnail.html` | 홈 타일 |

## 남은 것

- 예약(시계) 패널 — WPF에 아직 화면이 없습니다(`ReminderScheduler`는 있음). 만들 때 스킬 목록과 같은 구조를 쓰세요
- 소스에 있으나 아직 컴포넌트로 뽑지 않은 것: `BriefingCard` `DraftPanel` `FilePanel` `WindowPanel` `RoomPanel` `TodoPanel` `EventPanel` `JobsPanel` `NotificationsPanel` `SkillPanel` `SourcePills` `FileIcon` `Markdown`
- `templates/` — 소비 프로젝트가 복사해 시작할 수 있는 Design Component 템플릿(현재는 UI 킷만 있음)
- 텔레그램 채널 킷, 오브 표정 10종 전체 시트, 알림함·예약(시계) 패널, 스킬 목록·스킬 제안 화면
- 라이트 테마의 실제 앱 반영 여부 결정 (현재는 제안)
