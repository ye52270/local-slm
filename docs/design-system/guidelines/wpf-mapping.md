# WPF 구현 대응표 (WinOrbPoc)

이 디자인 시스템은 HTML/CSS로 쓰여 있지만 제품은 WPF입니다. 아래는 토큰·아이콘·효과를 XAML로 옮기는 표입니다.
값의 출처는 `App.xaml`과 `Windows/PanelWindow.xaml`이고, 새로 제안하는 것은 **(신규)** 로 표시했습니다.

## 1. 색 — App.xaml 리소스

| 디자인 토큰 | XAML 리소스 | 값 |
|---|---|---|
| `--wpf-shell-gradient` | `PanelBackgroundBrush` (LinearGradient 0,0→0,1) | `#202530` → `#191D27` |
| `--wpf-shell-border` | `PanelBorderBrush` | `#536078` |
| `--wpf-text` | `PrimaryTextBrush` | `#FAFBFE` |
| `--wpf-text-2` | `SecondaryTextBrush` | `#CDD6E4` |
| `--wpf-plate` / `--wpf-plate-deep` | PanelWindow 내 Border Background | `#1C1D21` / `#18191E` |
| `--wpf-plate-border` | 같은 Border BorderBrush | `#3B465A` |
| `--wpf-card` / `--wpf-card-soft` | 항목 카드 / 하단 카드 | `#242A36` / `#20232B` |
| `--wpf-card-border` | 하단 카드 BorderBrush | `#53617B` |
| `--wpf-chip` / `--wpf-chip-border` | 카운트 칩 | `#273249` / `#526A94` |
| `--wpf-composer` | 입력바 Border | `#2E394D` |
| `--wpf-caret` | TextBox CaretBrush | `#E9F56B` |
| `--wpf-btn` … | `PanelButtonStyle` | bg `#263044`, border `#44516B`, hover `#35415A`/`#7386AE`, press `#151B28`, disabled Opacity `0.55` |
| `--wpf-btn-primary` | `PrimaryPanelButtonStyle` | bg `#2D5BA1`, border `#4A89FF` |
| — | `TextButtonStyle` | 투명 배경/테두리 + `SecondaryTextBrush` |
| `--wpf-scroll-thumb` | `DarkVerticalThumbStyle` | `#586176` → hover `#77839C` → drag `#8FB0FF` |
| `--urgent` **(신규)** | `UrgentBrush` | `#FF4D4A` — '즉시 조치 1건' 뱃지 전용 |
| `--badge-neutral-bg` **(신규)** | `NeutralBadgeBrush` | `#FFFFFF` 18% — 그 외 모든 카운트 뱃지 |

> **권고**: 지금 XAML 곳곳에 하드코딩된 `#242A36` `#273249` 같은 값을 `App.xaml`의 `SolidColorBrush`로 올리세요.
> 라이트 테마를 넣을 때 `ResourceDictionary` 두 개를 갈아끼우는 것만으로 끝납니다.

## 2. 지오메트리

| 대상 | 값 | 비고 |
|---|---|---|
| 창 | `Width=560`, `MaxHeight=512` | 콘텐츠 판 482, 하단 카드 448 |
| 바깥 셸 | `CornerRadius=40` | 제품의 서명 실루엣 |
| 안쪽 판 | `18,18,0,0` / `0,18,0,0` | 위쪽만 둥글게 |
| 항목 카드 | `8` | 큰 카드 `14` |
| 칩 | `9` | Padding `8,1,3,1` |
| 버튼 | `10` | Padding `12,9` (작은 것 `9,6`) |
| 입력바 | `28` | Padding `15,0,12,0` |
| 오브 | LED 패널 168px, 21×16 도트, pitch 8 | 림 = 외곽 반지름의 7%, Opacity 0.9 |

WPF는 `0.5px` 테두리를 그릴 수 없습니다. HTML 쪽 헤어라인(0.5px)은 **1px + 더 낮은 명도**(`#3B465A`)로 대응하세요.

## 3. 아이콘 — 문자 글리프를 걷어내기

현재 `PanelWindow.xaml.cs`의 `OutlookItemGlyph()`가 아이콘 자리에 문자를 넣습니다:
일정 `"일"`, 할 일 `"✓"`, 플래그 메일 `"!"`, 기타 `"O"`. 크기·정렬·색을 맞추기 어렵고 화면이 투박해 보입니다.

**Windows 11 내장 Segoe Fluent Icons를 쓰면 설치·라이선스 부담 없이 해결됩니다.**

```xml
<TextBlock FontFamily="Segoe Fluent Icons" FontSize="14"
           Foreground="{StaticResource SecondaryTextBrush}" Text="&#xE715;" />
```

| 용도 | 지금 | Segoe Fluent 이름 | 코드 | 킷의 Tabler |
|---|---|---|---|---|
| 메일 | `!` / `O` | Mail | `E715` | `ti-mail` |
| 메일 열기 | — | OpenLocal | `E8DA` | `ti-mail-opened` |
| 초안 작성 | — | Edit | `E70F` | `ti-pencil` |
| 발송 | — | Send | `E724` | `ti-send` |
| 일정 | `일` | Calendar | `E787` | `ti-calendar-event` |
| 시각 · 예약 | — | Recent | `E823` | `ti-clock` |
| 알림 | — | Ringer | `EA8F` | `ti-bell` |
| 할 일 · 완료 | `✓` | CheckMark | `E73E` | `ti-checkbox` |
| 승인(방패) | — | Shield | `EA18` | `ti-shield-check` |
| 주의 | — | Warning | `E7BA` | `ti-alert-triangle` |
| 추천 액션(플래그) | — | Flag | `E7C1` | `ti-flag-2` |
| 에이전트 | — | Lightbulb | `EA80` | `ti-sparkles` |
| 음성 입력 | — | Microphone | `E720` | `ti-microphone` |
| 펼치기 · 접기 | — | ChevronRight / ChevronDown | `E76C` / `E70D` | `ti-chevron-*` |
| 닫기 | `X` | ChromeClose | `E8BB` | `ti-x` |
| 파일 | — | Document | `E8A5` | `ti-file` |
| 설정 | — | Settings | `E713` | `ti-settings` |
| 사람 | — | Contact | `E77B` | `ti-user` |
| 첨부 | — | Attach | `E723` | `ti-paperclip` |
| 새 창으로 열기 | — | OpenInNewWindow | `E8A7` | `ti-external-link` |

> 코드포인트는 Microsoft의 Segoe Fluent Icons 목록에서 최종 확인하세요(이름은 안정적이고, 일부 코드는 빌드에 따라 다를 수 있습니다).
> Segoe Fluent가 없는 Windows 10 환경까지 지원해야 하면 `Segoe MDL2 Assets`로 폴백하세요 — 위 코드 대부분이 동일합니다.

규칙: 아이콘 크기는 13~17px, 색은 항상 텍스트 색(또는 신호 틴트)을 따라갑니다. 이모지는 쓰지 않습니다.

## 4. 효과

| 효과 | HTML | WPF |
|---|---|---|
| 떠 있는 창 | `box-shadow` | 투명 창에서는 회색 띠가 생깁니다. `WindowChrome` + 안쪽 1px 하이라이트 Border를 쓰세요 |
| 아크릴 · Mica | `backdrop-filter` | `DwmSetWindowAttribute(DWMWA_SYSTEMBACKDROP_TYPE)` 또는 WinUI `DesktopAcrylicBackdrop`. VDI에서는 비용이 커서 라이트 테마를 권합니다 |
| 도트 텍스처 | `radial-gradient` 6px | `DrawingBrush` + `TileMode=Tile`, `Viewport=0,0,6,6` |
| 무지개 림 | `conic-gradient` | 이미 `EmotionRing.cs`가 비트맵으로 그리고 있습니다 — 그대로 두세요 |
| 숨쉬기 | `@keyframes` opacity 0.5↔1 / 2.2s | `DoubleAnimation` + `AutoReverse`, `Duration=0:0:1.1` |
| 접근성 | `prefers-reduced-transparency` | `SystemParameters.ClientAreaAnimation` · 투명도 설정 확인 후 불투명 배경으로 대체 |

## 5. 라이트 테마를 넣는다면

1. `App.xaml`의 브러시를 `Themes/Dark.xaml` · `Themes/Light.xaml`로 분리
2. 라이트 값은 `tokens/colors.css`의 `--day-*` 참고 (page `#F2F3F5`, card `#FFFFFF`, border `#1C1D21` 10%, accent `#3F6FD8`)
3. **LED 패널(`#0B0C0F`)과 오브 얼굴 색은 그대로 둡니다** — 밝은 배경에서도 얼굴이 읽혀야 합니다
4. 라이트에서는 실제 드롭섀도를 씁니다: `0 20px 48px -18px rgba(20,24,35,.45)`
