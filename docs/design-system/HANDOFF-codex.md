# Codex 핸드오프

이 디자인 시스템을 WinOrbPoc(WPF) 코드에 반영시키기 위한 준비물과 프롬프트입니다.

## 0. 준비 (5분)

1. 이 프로젝트를 통째로 내려받습니다.
2. `win-agent` 저장소 안에 `docs/design-system/` 으로 넣고 커밋합니다. Codex가 파일을 읽을 수 있어야 합니다.
3. 아래 프롬프트를 그대로 붙여넣습니다. **한 번에 하나씩** — 4개로 쪼개 두었습니다.

---

## 1단계 — 색을 리소스로 올리기 (가장 먼저, 가장 안전)

```
docs/design-system/ 을 먼저 읽어라. readme.md 와 guidelines/wpf-mapping.md 가 기준 문서다.

작업: App.xaml 을 리팩터링해 색을 전부 명명된 리소스로 올린다.

1. Themes/Dark.xaml 을 만들고 wpf-mapping.md "1. 색" 표의 브러시를 전부 정의한다.
   이름은 표에 적힌 것을 그대로 쓴다(PanelBackgroundBrush, PanelBorderBrush, PrimaryTextBrush,
   SecondaryTextBrush + 표에 있는 신규 브러시).
2. App.xaml 은 MergedDictionaries 로 Themes/Dark.xaml 을 불러오게만 한다.
3. Windows/*.xaml 과 *.xaml.cs 에 하드코딩된 색 리터럴(#242A36, #273249, #263044, #E9F56B …)을
   전부 StaticResource 참조로 바꾼다. 코드비하인드에서 Brush("#...") 로 만드는 것도 포함한다.

제약:
- 색 값 자체는 절대 바꾸지 마라. 이름만 붙인다. 렌더 결과가 픽셀 단위로 같아야 한다.
- 레이아웃, 로직, 서비스 코드는 건드리지 않는다.
- 다크 외 테마는 이번 단계에서 만들지 않는다.

끝나면 바뀐 파일 목록과, 리소스로 승격한 색의 개수를 보고해라.
```

## 1.5단계 — 색 통합 (1단계에서 브러시가 40개를 넘으면 반드시)

```
Themes/Dark.xaml 의 브러시가 너무 많다. 중복을 걷어내 유지 가능한 수로 줄인다.

1. 정의된 브러시를 전부 나열하고, 색 거리가 가까운 것들(육안으로 구분이 안 되는 수준)을 묶어라.
2. 각 묶음에서 대표 하나만 남긴다. 대표는 docs/design-system/tokens/colors.css 의 --wpf-* 에
   같은 값이 있으면 그것을 쓰고, 없으면 가장 많이 쓰인 값을 쓴다.
3. 남는 브러시는 역할 이름을 갖게 한다: Surface/Shell/Plate/Card/Item, Text/Primary/Secondary/Faint,
   Border/Default/Strong, Accent/Default/Hover/Press, State/Ok/Warn/Urgent.
   PanelBackgroundBrush 등 기존 이름은 유지하고 별칭으로 연결해도 된다.
4. 목표는 30개 안쪽이다. 그보다 많이 남으면 왜 필요한지 각각 한 줄로 설명해라.

제약:
- 통합으로 색이 바뀌는 자리는 반드시 목록으로 보고해라. 눈에 띄게 달라지는 곳이 있으면 통합하지 말고 남겨라.
- 레이아웃·로직은 건드리지 않는다.
```

## 2단계 — 문자 글리프를 아이콘으로 교체


```
docs/design-system/guidelines/wpf-mapping.md 의 "3. 아이콘" 표를 적용한다.

1. PanelWindow.xaml.cs 의 OutlookItemGlyph() 가 반환하는 "일" "✓" "!" "O" 를 없앤다.
2. FontFamily="Segoe Fluent Icons" 를 쓰는 IconGlyph 스타일(또는 UserControl)을 하나 만들고,
   표의 코드포인트를 x:Static 상수로 정의한다(예: IconCodes.Mail = "\uE715").
3. 표에 있는 자리(메일·일정·할 일·알림·승인·주의·추천 액션·음성·펼치기·닫기 등)를 전부 교체한다.
4. 아이콘 크기는 13~17px, 색은 부모 Foreground 를 상속하게 한다. 이모지는 쓰지 않는다.

주의:
- 코드포인트는 Microsoft 공식 Segoe Fluent Icons 목록으로 검증하고, 표와 다르면 표를 고쳐라.
- Windows 10 을 지원해야 하면 Segoe MDL2 Assets 폴백을 함께 둔다.
- 표에 없는 자리에 새 아이콘을 임의로 넣지 마라. 필요하면 무엇이 필요한지 보고만 해라.
```

## 3단계 — 오늘 업무 패널 정리 (UI 개선의 핵심)

```
docs/design-system/ui_kits/desktop-panel/ 을 브라우저로 열어 "오늘 업무" 화면을 보고,
같은 결과가 되도록 Windows/PanelWindow.xaml 과 PanelWindow.DailyBriefing.cs 를 고친다.

고쳐야 할 것 (readme.md "남은 것" 이 아니라 아래 5개가 이번 범위다):
1. 겹침 제거 — "준비 중" 라벨이 버튼 위에 겹쳐 있다. 액션 행 오른쪽 끝의 별도 TextBlock 으로 분리하고,
   해당 버튼은 IsEnabled=False 로 둔다.
2. 버튼 통일 — 액션 버튼 높이 28, CornerRadius 10, Padding 12,9 로 맞추고 한 행에 왼쪽 정렬한다.
   주 동작 1개만 PrimaryPanelButtonStyle, 나머지는 PanelButtonStyle, 마지막은 TextButtonStyle.
3. 잘림 제거 — 아래 목록이 중간에서 잘린다. 항목 높이를 줄이고, 넘치면 잘리는 대신
   "+N건 더" 버튼으로 접어라. 창 높이(MaxHeight 512)는 바꾸지 않는다.
4. 카운트 칩 — 일정/할 일/후속/지연 네 개를 각각 다른 색으로 칠하지 말고 전부 무채색으로 하고,
   지연 하나만 UrgentBrush 계열로 둔다(wpf-mapping.md 의 뱃지 규칙).
5. 날짜 위치 — "8월 15일 토요일"을 제목 아래가 아니라 상단 상태줄 오른쪽 끝으로 옮겨 한 줄을 번다.

제약:
- 데이터 소스, Outlook 연동, 문구는 그대로 둔다. 문구를 새로 쓰지 마라.
- 숫자·시간·건수는 등폭으로 정렬되게 한다.
- 킷과 픽셀 단위로 같을 필요는 없다. 위 5개가 해결되고 값이 wpf-mapping.md 와 맞으면 된다.
```

## 4단계 — 라이트 테마 (선택)

```
Themes/Light.xaml 을 추가한다. 값은 docs/design-system/tokens/colors.css 의 --day-* 를 쓴다
(page #F2F3F5, card #FFFFFF, border #1C1D21 10%, accent #3F6FD8).

- 구조·레이아웃은 그대로. 브러시만 갈아끼운다.
- 오브의 LED 패널(#0B0C0F)과 도트 색은 라이트에서도 그대로 둔다. 얼굴이 읽혀야 한다.
- 라이트에서는 실제 그림자를 쓴다: 0 20 48 -18 rgba(20,24,35,.45) 에 해당하는 DropShadowEffect.
- 설정에서 다크/라이트/시스템 따라가기를 고를 수 있게 하고, 기본값은 다크로 둔다.
```

---

## 검수 체크리스트

1단계: 색 리터럴이 `Windows/` 아래에 남아 있지 않은가 (`grep -rn "#[0-9A-Fa-f]\{6\}" Windows/`)
2단계: `OutlookItemGlyph` 가 사라졌는가. 아이콘이 Windows 10에서도 뜨는가
3단계: 창을 열었을 때 목록이 잘리지 않는가. 빨간 요소가 화면에 하나뿐인가. 버튼 높이가 같은가
4단계: 라이트에서 오브 얼굴이 여전히 읽히는가

## Codex에게 주지 말아야 할 것

- "알아서 예쁘게 만들어줘" — 이 디자인 시스템은 값이 전부 정해져 있습니다. 재량을 주면 값이 흩어집니다.
- 없는 화면을 만들라는 지시 — 예약(시계) 패널은 아직 설계가 없습니다. 만들려면 먼저 화면을 그려야 합니다.

## 6단계 — 파일·브라우저 제어 화면 4종 (신규 기능)

명세: `docs/design-system/guidelines/control-screens.md`
시각 재현: `docs/design-system/ui_kits/desktop-panel/Control.jsx` (React, 참고용)

```
docs/design-system/guidelines/control-screens.md 를 읽고 제어 화면 4종을 구현한다.
UI 형태는 docs/design-system/ui_kits/desktop-panel/Control.jsx 를 참고하되,
React 코드를 그대로 옮기지 말고 WPF 관례로 다시 쓴다.

만들 것:
1. Windows/PanelWindow.Control.cs — 계획(plan) / 실행 중(run) / 결과(result) 화면
2. Windows/PanelWindow.Permissions.cs — 권한(perm) 화면
3. Models/ControlPlan.cs — 단계 모델. 최소 필드: Title, Kind, RequiresApproval, IconCode, Status
4. Services/PermissionStore.cs — 폴더·사이트 허용 목록과 동작별 정책을 JSON으로 저장/로드

지킬 것:
- 새 색을 만들지 마라. Themes/Dark.xaml 의 기존 브러시만 쓴다. 명세 표에 이름이 다 있다.
- StateUrgentBrush(빨강)는 이 화면들에서 쓰지 않는다. 승인·주의는 StateWarnBrush.
- 아이콘은 명세의 코드포인트를 IconCodes 에 추가하고 IconGlyphStyle 로 렌더한다. 이모지 금지.
- 승인 게이트는 새 창이 아니라 실행 화면 안의 인라인 카드다.
- 승인 대기 중에는 진행 타이머가 멈춘다. 자동 진행 금지.
- 패널 크기와 기존 레이아웃 규칙은 바꾸지 않는다.

이번 단계에서 하지 않을 것:
- 실제 파일 조작·브라우저 자동화는 붙이지 마라. 화면과 상태 전이만 만든다.
  실행은 더미 타이머로 단계를 넘긴다.
- 기존 화면(오늘 업무·브리핑·승인·창 분석)은 건드리지 않는다.

추가 대상:
5. Controls/IconCodes.cs — 명세의 아이콘 상수 추가
6. Windows/PanelWindow.SlashCommands.cs — 테스트용 /control-demo 진입점
7. Windows/PanelWindow.Icons.cs — /control-demo 아이콘 연결

상태 전이·모델·권한 저장·타이머 규칙은 명세의 "상태와 전이" "모델" "저장" 절을 그대로 따른다.

끝나면 만든 파일과, 새로 추가한 아이콘 코드포인트 목록을 보고해라.
```

### 그다음 (7단계, 별도)

실제 동작 연결. 파일 I/O·브라우저 자동화·되돌리기 저장소는 화면이 확정된 뒤에 붙입니다.
되돌리기는 "덮어쓰기 전 원본을 30일 보관" 방식이 명세 기준입니다.

## 7단계 — 메일 요약 화면

명세: `docs/design-system/guidelines/mail-summary.md`
시각 재현: `docs/design-system/ui_kits/desktop-panel/Summary.jsx`

```
docs/design-system/guidelines/mail-summary.md 를 읽고 메일 요약 화면을 고친다.
스타일뿐 아니라 출력 내용 구조가 문제다. 둘 다 고친다.

1. 요약 렌더링을 명세의 구조로 바꾼다.
   제목 → 메타 한 줄(보낸사람·팀 / 받는 사람 N명 / 시각) → 요점 3개 이내 → 버튼 3개 → 접힌 원문 발췌.
2. 원문 헤더 덤프를 제거한다. From:/Sent:/To:/Cc: 줄, 메일 주소, 구독취소 링크,
   서명·면책 문구는 요약 본문에 넣지 않는다. 파서 단계에서 잘라낸다.
3. 보낸 사람을 사람 이름으로 표시한다. "Outlook" 같은 앱 이름이 잡히면
   원문 From: 에서 표시 이름을 추출한다.
4. 요약 프롬프트에 명세 "프롬프트 쪽에서 고칠 것" 네 줄을 반영한다.
5. 버튼 3개(답장 초안 / 원문 열기 / 나중에)를 붙인다.
   답장 초안은 기존 초안 작성 화면으로 연결한다.

제약:
- 새 색을 쓰지 마라. 이 화면에 상태색(빨강·노랑)은 없다.
- 기존 브러시와 IconGlyphStyle 만 쓴다.
- 다른 화면은 건드리지 않는다.
```
