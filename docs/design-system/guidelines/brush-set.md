# 최종 브러시 세트 (디자인 결정)

Codex의 OKLab 분석 결과 "외관을 보존하는 최대 통합"은 57개였습니다. 그 아래로 내려가려면 색이 바뀝니다.
**바꾸기로 결정합니다.** 이유는 아래 숫자에 있습니다.

- 초록 4개: `#46C878` `#5AE0B9` `#65E4A3` `#86E0BA`
- 파랑 5개: `#68ABFF` `#7DA2FF` `#8FB0FF` `#9DB4FF` `#A9C1FF`
- 노랑 4개: `#E8E07A` `#E9F56B` `#F5BE5B` `#FFB55B`
- 빨강 5개: `#FF4D4A` `#FF6B5E` `#FF7C84` `#FF7E70` `#FF8B7E`

역할이 넷·다섯 개로 나뉜 게 아니라, 같은 역할이 서로 다른 값으로 흩어진 것입니다.
화면에서 무엇이 급한지 안 보이는 원인이기도 합니다. 아래가 최종 세트입니다 — **37개**.

## 표면 (8)

| 이름 | 값 | 흡수 |
|---|---|---|
| `PanelBackgroundBrush` | gradient `#202530` → `#191D27` | 그대로 |
| `SurfaceDeepBrush` | `#151B28` | 입력·대시보드·오브 내부·눌림 |
| `SurfacePlateBrush` | `#1C1D21` | 패널 판, 불투명 오버레이 |
| `SurfaceItemBrush` | `#20232B` | 항목·요약·브리핑 섹션 |
| `SurfaceCardBrush` | `#242A36` | 카드·아이콘 배경 |
| `SurfaceControlBrush` | `#263044` | 버튼·칩 |
| `SurfaceComposerBrush` | `#2E394D` | 입력바 |
| `SurfaceHoverBrush` | `#35415A` | 호버·선택 |

## 테두리 (5)

| 이름 | 값 | 흡수 |
|---|---|---|
| `BorderDefaultBrush` | `#3B465A` | 판·항목·요약·대시보드 |
| `BorderControlBrush` | `#44516B` | 버튼·런처 도트·오브(`#454854`) |
| `BorderChipBrush` | `#526A94` | 칩·선택 항목(`#5B76AA`) |
| `BorderStrongBrush` | `#53617B` | 패널·카드·오버레이·스크롤 thumb |
| `BorderFocusBrush` | `#7386AE` | 포커스·호버 테두리·스크롤 hover(`#77839C`) |

## 텍스트 (5)

| 이름 | 값 | 흡수 |
|---|---|---|
| `PrimaryTextBrush` | `#FAFBFE` | 제목·강조·헤딩(`#F1F4FA` `#F5F7FF`) |
| `SecondaryTextBrush` | `#CDD6E4` | 본문·칩 텍스트(`#D2DAE8` `#E4E9F2`) |
| `TextMetaBrush` | `#B9C3D3` | 메타·설명·시각(`#C0C8D6` `#ABBDDC`) |
| `TextFaintBrush` | `#9EAEC6` | 가장 흐린 라벨 |
| `TextOnAccentBrush` | `#FFFFFF` | 채워진 버튼 위 |

텍스트를 5단계로 유지합니다. 3단계로 줄이면 브리핑 메타데이터가 본문과 붙습니다 — Codex 지적이 맞습니다.

## 액션 (4)

| 이름 | 값 | 흡수 |
|---|---|---|
| `AccentDefaultBrush` | `#4A89FF` | 주 동작·인용선·강조 테두리(`#497ED7`) |
| `AccentPressBrush` | `#2D5BA1` | 채워진 버튼 배경 |
| `AccentHoverBrush` | `#8FB0FF` | 호버·링크·스크롤 드래그(`#87AEFF` `#9DB4FF` `#A9C1FF`) |
| `AccentTintBrush` | `#305B8DEF` | 강조 표면(`#405B8DEF`) |

## 도메인 신호 (3)

칩·좌측 바·오브 신호에서 **무엇에 관한 것인지**를 나타냅니다. 급한 정도가 아닙니다.

| 이름 | 값 | 쓰임 |
|---|---|---|
| `DomainCalendarBrush` | `#7DA2FF` | 일정 (메일은 `AccentDefaultBrush`를 씁니다 — 파랑 두 개를 나란히 두지 않습니다) |
| `DomainTaskBrush` | `#86E0BA` | 할 일 |
| `DomainFollowUpBrush` | `#E8E07A` | 후속 |

## 상태 (5)

**급한 정도**입니다. 도메인 색과 섞지 않습니다.

| 이름 | 값 | 규칙 |
|---|---|---|
| `StateOkBrush` | `#46C878` | 완료·연결됨 (`#5AE0B9` `#65E4A3` 흡수) |
| `StateWarnBrush` | `#F5BE5B` | 승인 대기·주의 (`#FFB55B` 흡수) |
| `StateUrgentBrush` | `#FF4D4A` | **즉시 조치 1건 전용.** 한 화면에 하나까지 |
| `StateOverdueBrush` | `#FF8B7E` | 지연 텍스트·바 (`#FF6B5E` `#FF7C84` `#FF7E70` 흡수) |
| `AttentionBrush` | `#E9F56B` | 입력 캐럿·시간 신호. 제품의 시그니처 노랑 |

## 틴트 · 특수 (7)

| 이름 | 값 |
|---|---|
| `TintOkBrush` | `#2246C878` |
| `TintWarnBrush` | `#22F5BE5B` |
| `TintUrgentBrush` | `#22FF4D4A` |
| `TintNeutralBrush` | `#2EFFFFFF` |
| `SurfaceOverlayBrush` | `#F51B1F2A` |
| `TransparentBrush` | `Transparent` |
| `OrbPanelBrush` | `#0B0C0F` (오브 LED 패널 — 테마 무관, 고정) |

## 바뀌는 것 (승인함)

- 상태 초록 4 → 2, 파랑 5 → 3, 노랑 4 → 3, 빨강 5 → 2
- 메일 신호가 `#68ABFF` → `#4A89FF`로 액션 파랑과 같아집니다. 일정만 별도 파랑을 갖습니다
- 지연 표시가 전부 `#FF8B7E` 하나로, 긴급 빨강 `#FF4D4A`는 **한 화면에 한 번만** 나타납니다
- `#5AE0B9`(라이브)와 `#65E4A3`(연결됨)이 `#46C878`로 합쳐집니다

## 바꾸지 않는 것

- 오브의 LED 도트 색과 감정 링 팔레트 (`DotMatrixDisplay.cs`, `EmotionRing.cs`) — 테마 대상이 아닙니다
- 표면·테두리 값 (위 표대로 유지, 미세 조정만)
- 텍스트 5단계
