# local-slm Windows 데모 (VDI / CPU 전용)

클래식 Outlook(데스크탑)에서 메일을 읽어 로컬 SLM(GGUF)으로
**발신자 / 요약 / 할 일 / 기한 / 우선순위** 를 콘솔에 표시한다.
Python 불필요 — PowerShell 5.1 + 동봉된 llama-server.exe 만으로 동작한다.
메일 내용은 127.0.0.1 로만 오가며 PC 밖으로 나가지 않는다.

## 폴더

```
Summarize-Mail.ps1   본체 (Outlook COM → llama-server JSON 스키마 추출 → 콘솔 표)
Run-Demo.cmd         더블클릭/명령줄 실행용 래퍼 (실행 정책 우회, 창 유지)
bin\                 llama.cpp b10472 win-cpu-x64 (llama-server.exe + DLL, AVX2/AVX512 자동 선택)
models\              *.gguf 를 여기에 넣는다 (기본: 이름순 첫 파일 사용)
```

## 준비

1. `models\` 에 GGUF 모델을 복사한다. VDI 에 이미 있는 `Qwen3.5-4B-Q4_K_M.gguf` 를 그대로 쓰면 된다.
   (12GB RAM 기준: 4B Q4 ≈ 2.8GB + 컨텍스트 4K ≈ 0.5GB → 넉넉함)
2. **클래식 Outlook** 이 실행 중이어야 한다. "새 Outlook"(New Outlook) 은 COM 을 지원하지 않는다.
   Outlook 상단 토글이 켜져 있으면 끄고 클래식으로 돌아간다.
3. 처음 실행 시 SmartScreen 이 llama-server.exe 를 막으면 "추가 정보 → 실행" 을 선택한다.

## 실행

명령 프롬프트 또는 PowerShell 에서:

```
Run-Demo.cmd                       받은 편지함 최근 3통
Run-Demo.cmd -Selected             Outlook 에서 지금 선택해 둔 메일(여러 개 가능)
Run-Demo.cmd -Subject "약관"        제목에 '약관' 이 들어간 최근 메일
Run-Demo.cmd -Latest 5 -KeepServer 끝나도 서버 유지 → 다음 실행은 모델 로드 없이 바로
Run-Demo.cmd -Watch                **감시 모드**: 서버를 띄운 채 새 메일이 오면 자동 요약·캐시 (Ctrl+C 종료)
                                   → 다른 창에서 -Selected / -Latest 하면 캐시된 건 0초에 표시
Run-Demo.cmd -Model kanana-2-3b-instruct-Q8_0.gguf   다른 모델 지정 (models\ 안 파일명)
Run-Demo.cmd -Json                 표 대신 JSON
Run-Demo.cmd -Threads 4            CPU 스레드 수 지정 (기본: 물리 코어 - 1)
Run-Demo.cmd -MaxTokens 200 -MaxBodyChars 1500   더 짧게·빠르게
Run-Demo.cmd -LowMem               메모리 우선(--no-repack, KV q8) — x86 에서 속도 2배 느려짐, 메모리 부족할 때만
Run-Demo.cmd -NoCache              캐시 무시하고 다시 추출
Run-Demo.cmd -Panel                받은 편지함 20통 내보내기 → 서버(라우터·web\ 정적 포함) → 브라우저 브리핑 패널 열기
Run-Demo.cmd -Panel -Watch         위 + 5분마다 다시 내보내기 → 새 메일만 요약, 오브·말풍선으로 알림 (아침에 켜 두는 용도)
                                   -Panel/-Watch 는 절약 모드 자동: 낮은 우선순위·코어-1·유휴 5분 후 모델 내림. -WatchInterval 600 으로 더 느리게
                                   광고·소식지·인증코드·자동발송은 모델을 부르지 않고 규칙으로 분류한다(화면에 "규칙 분류" 표시)
Run-Demo.cmd -Export               web\data\inbox.json 으로 내보내기만
```

PowerShell 에서 직접: `powershell -ExecutionPolicy Bypass -File .\Summarize-Mail.ps1 -Selected`

## 속도·메모리 (CPU 전용) — 실측과 권장 설정

M2 Pro CPU 4스레드(GPU 끔) 실측. VDI(x86 vCPU) 는 대략 이 값의 3~4배로 나왔다 (4B 기준 35초/통).

| 모델 | Mac CPU 4t 메일당 | 예상 VDI | 메모리 | 슬롯 품질 |
|---|---|---|---|---|
| Qwen3.5-4B Q4_K_M | 5~14초 | 20~40초 | ~3.5GB(+repack 시 더) | 기한·우선순위 가장 정확 |
| **Qwen3.5-2B Q4_K_M** | **2.4~6.6초** | **10~20초** | ~3.1GB | 할 일·기한 4B 에 근접, 분류/우선순위는 거침 |
| Kanana-2 3B Q4_K_M | 3~10초 | 15~30초 | ~2.5GB | 한국어 요약 좋음, 영어 메일은 영어로 답하기도 |
| Kanana-2 1.3B Q8_0 | 2~4초 | 8~15초 | ~3GB | **못 씀** — 기한을 오늘로, 할 일 못 뽑음 |

권장: **속도가 중요하면 Qwen3.5-2B**, 정확도가 중요하면 4B. `models\` 에 둘 다 두고 `-Model` 로 고른다.

**실시간처럼 쓰는 법** — 통당 10초 이상은 CPU 소형 모델의 물리적 한계라 플래그로는 안 줄어든다.
대신 `-Watch` 로 서버를 띄워 두면 새 메일이 오는 즉시 백그라운드에서 요약해 `cache.json` 에 저장하고,
사용자가 `-Selected` 로 볼 때는 캐시에서 0초에 꺼낸다. 데모라면 시연 전에 `-Watch` 창 하나 띄워 두면 된다.

시간을 결정하는 것은 (1) 입력 토큰 수 — 한국어는 글자 1~1.5개당 1토큰이라 본문 2000자면 1500토큰, CPU 에서 이게 시간의 절반 이상,
(2) 출력 토큰 수, (3) 모델 크기. 그래서 스크립트는:
- 본문이 `-MaxBodyChars`(기본 1200자) 를 넘으면 통째로 넣지 않고 **앞부분 500자 + 기한/요청/행동 관련 문장만** 추려 넣는다
  (날짜·"까지"·회신·제출·요청·비밀번호… 키워드 필터). 더 빠르게: `-MaxBodyChars 1000`.
- 출력은 `-MaxTokens`(기본 250), 요약 한 문장·할 일 최대 3개로 제한. 더 빠르게: `-MaxTokens 200`.
- 시스템 프롬프트(~260토큰)는 서버가 떠 있는 동안 KV 캐시로 재사용된다 → `-KeepServer`/`-Watch` 가 유리.

메모리: llama.cpp CPU 백엔드는 기동 시 가중치를 repack 하며 복사본을 만든다. Mac 에서는 이걸 끄면(`--no-repack`) 메모리가 40% 줄고
속도 손실이 10% 였지만, **x86 VDI 에서는 프롬프트 처리가 2배 느려지고 메모리는 6% 밖에 안 줄었다**(35초 → 68초).
그래서 기본은 repack 켬이고, 정말 메모리가 모자랄 때만 `-LowMem`. 12GB VDI 에서 84~90% 는 대부분 Outlook·브라우저·VDI 에이전트 등
기본 점유라 모델 쪽에서 더 줄이려면 2B 로 가는 게 답이다.

`llama-server.log` 의 `load_backend` 줄에 `haswell`(AVX2) 이상이 떠야 정상. `x64`/`sse42` 면 하이퍼바이저가 AVX2 를 막고 있어 느릴 수밖에 없다.

## 브리핑 패널 (web\)

몰두봇 데스크톱 상주 패널 구조 그대로: **오브**(오른쪽 80px LED 도트 얼굴 — 대기·작업 중(무지개 링)·새 메일·정리 끝·연결 없음) +
**런처 560**(상태줄 → 스트림 → 하단 컴포저) + **알림 말풍선**. 오브 클릭 또는 ⌥Space 로 접힘(알약)/펼침.
컴포저는 명령 팔레트다(포커스하면 명령 후보 + 메일 즉시 검색, ↑↓↵, `/` 로 포커스): `오늘 리포트` `이번 주` `오늘 마무리` `<검색어>` `4B로` `접기` `다시`.
모델 작업은 대기열 칩("요약 중 · 대기 N · 약 Ns")으로 보이고, 행에 마우스를 올리면 `완료`/`나중에` 빠른 동작. 17:30 이후 오늘 마무리 알림. 신호 뱃지 = 할 일 수(지연 있으면 빨강).

`-Panel` 은 서버를 **라우터 모드**(`--models-dir models --models-max 1`)로 띄운다 — `models\` 의 gguf 가 전부 상단 토글에 나오고,
고르면 요청의 `model` 필드로 서버가 모델을 교체한다(한 번에 하나만 메모리에, 교체 시 로드 시간만큼 대기). 결과 캐시는 모델별.
화면 상단의 "오늘 리포트 / 이번 주 리포트" 칩은 메일별 슬롯을 모델 호출 없이 조합한 리포트(지금 해야 할 일 → 다가오는 기한 → 확인만)이고
"작업 로그"(접힘)에 메일별 요약 시간·토큰이 남는다.
`-Panel` 을 쓰면 `http://127.0.0.1:8080/` 에 디자인 시스템 기반 화면이 뜬다 — 오늘 업무(추천 1건·할 일·기한) → 메일 요약(요점·근거) →
답장 초안(승인 카드 → 메일 앱에서 열기). 요약은 브라우저 안의 `web\pipeline.js` 가 같은 서버로 수행하며 결과는 브라우저 localStorage 에 캐시된다.
새 Outlook 에서는 `web\addin\`(Office.js 추가 기능)이 같은 파이프라인으로 열린 메일을 요약한다 — `web\addin\README.md` 참조.

## 리소스 기록 (VDI 부하 확인)

```
Monitor.cmd                                            별도 창에서 켜 둠 — 10초마다 resource-log.csv 에 숫자만 기록
powershell -ExecutionPolicy Bypass -File Report-Resources.ps1 resource-log.csv   요약: CPU/메모리 평균·최대, 모델 상주 시간 비율, 작업 중/유휴 CPU, 시간대별
```
기록되는 것: 시스템 CPU%, 메모리 사용량, llama-server(라우터+자식) 메모리·CPU, Edge·Outlook 메모리. 메일 내용은 없다.

## 동작 원리

Outlook COM 으로 발신자·제목·수신일·본문을 꺼낸다 (인용문/서명/중복 URL 은 잘라냄).
그 원문을 통째로 프롬프트에 넣고 llama-server 에 `response_format: json_schema` 로 요청하면
llama.cpp 가 스키마를 문법으로 강제해 모델이 `summary, action_items, deadline, priority, category`
다섯 슬롯을 채운다. 발신자·수신일은 모델을 거치지 않고 Outlook 값을 그대로 쓴다.
후처리로 날짜 형식 검증, 중복/필드명 누출 제거를 한 뒤 "할 일 있음 → 기한 → 우선순위" 순으로 정렬한다.

## 문제 해결

- `Outlook COM 개체를 만들 수 없습니다` → 클래식 Outlook 이 설치·실행 중인지 확인. 관리자 권한 PowerShell 과
  일반 권한 Outlook 이 섞이면 COM 이 안 붙으므로 같은 권한으로 실행한다.
- 본문 접근 시 Outlook 보안 경고("프로그램이 전자 메일에 액세스하려고 합니다") 가 뜨면 "허용" 을 선택한다.
  (Object Model Guard — 백신이 정상 등록된 PC 에서는 보통 뜨지 않음)
- `llama-server 기동 시간 초과` → `llama-server.err.log` 확인. 모델 경로/메모리 부족이 대부분.
- 한글이 깨지면 명령 프롬프트 글꼴을 "맑은 고딕" 또는 "D2Coding" 으로 바꾼다 (`chcp 65001` 은 래퍼가 처리).
- 응답이 비어 있으면(모두 "-") 모델의 thinking 이 켜진 것 — 스크립트가 `enable_thinking:false` 를 보내지만
  다른 템플릿의 모델이면 `--reasoning-budget 0` 이 통하는지 확인.

## 주의

이 패키지는 macOS 에서 작성됐고 Windows 실기 테스트는 아직 거치지 않았다. Outlook COM 속성 접근이나
콘솔 출력 부분에서 사소한 오류가 나면 `Summarize-Mail.ps1` 의 해당 줄만 고치면 된다 (구조는 단순함).
