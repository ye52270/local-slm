# 새 Outlook 지원 — Office.js 추가 기능 (Graph API 없이)

새 Outlook(New Outlook for Windows/Mac, 웹)은 COM·AppleScript 가 없다. 대신 **Outlook 추가 기능(Office.js)** 은
클래식·새 Outlook·웹 모두에서 동작하고, 열려 있는 메일의 제목·발신자·본문을 **클라이언트 안에서** 읽을 수 있다.
그 내용을 같은 PC 의 llama-server 로 보내 요약하면 Graph API 도, 서버도, 인터넷도 필요 없다.

```
Outlook(새/클래식) ── Office.js ──▶ taskpane.html ──(같은 출처 fetch)──▶ llama-server /v1/chat/completions
                                     └ ../pipeline.js  (웹 패널과 동일한 정리·프롬프트·스키마·검증)
```

- `manifest.xml` — 리본에 "몰두봇 › 메일 요약" 버튼, 읽기 창 작업창(taskpane) 등록. `ReadWriteItem` 권한(회신 폼 열기용).
- `taskpane.html` — 현재 메일 읽기 → 요약 카드(요점 ≤3 + 근거 + 기한) → 답장 초안 → **발송 전 확인 카드** →
  `displayReplyForm()` 으로 회신 창을 초안 본문과 함께 연다. 발송 버튼은 사용자가 누른다(승인 게이트).
- 아이콘 `icon-*.png`.

## 왜 https 가 필요한가

추가 기능 페이지는 https 로 서빙되어야 한다(Office 요구사항). llama-server 는 SSL 을 지원하므로
같은 프로세스에서 정적 파일(`--path web`)과 API 를 https 로 함께 낼 수 있다:

```
llama-server -m models\Qwen3.5-2B-Q4_K_M.gguf --port 8443 --host 127.0.0.1 ^
  --path web --ssl-key-file certs\localhost-key.pem --ssl-cert-file certs\localhost.pem ^
  -c 2048 --jinja --reasoning-budget 0 --parallel 1
```

그러면 작업창은 `https://localhost:8443/addin/taskpane.html`, 브리핑 패널은 `https://localhost:8443/` 에서 열린다.
(포트를 바꾸면 `manifest.xml` 의 URL 도 같이 바꾼다.)

## 개발용 인증서 만들기 (한 번만)

- **Node 가 있으면**: `npx office-addin-dev-certs install` → `%USERPROFILE%\.office-addin-dev-certs\localhost.key / localhost.crt`
  (신뢰 저장소에 자동 등록). `--ssl-key-file localhost.key --ssl-cert-file localhost.crt`.
- **OpenSSL 이 있으면** (Git for Windows 에 포함):
  ```
  openssl req -x509 -newkey rsa:2048 -nodes -keyout localhost-key.pem -out localhost.pem -days 365 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
  ```
  만든 `localhost.pem` 을 더블클릭 → 인증서 설치 → **로컬 컴퓨터 → 신뢰할 수 있는 루트 인증 기관** 에 넣는다.
- Mac: 키체인 접근에서 인증서를 "항상 신뢰" 로.

## 사이드로드

새 Outlook: 메일 열기 → 리본 "앱" → "추가 기능 가져오기" → **내 추가 기능 → 사용자 지정 추가 기능 추가 → 파일에서** → `manifest.xml`.
클래식 Outlook / 웹: 파일 → 추가 기능 관리(웹 관리 화면) → 사용자 지정 추가 기능 → 파일에서 추가.

회사 테넌트가 사이드로드를 막아 두었으면 관리자 배포(중앙 배포)로 매니페스트를 올려야 한다 — 이 경우 SourceLocation 이
`https://localhost:8443` 이어도 되지만(각 PC 의 로컬 서버를 가리킴) 조직 정책 확인이 필요하다.

## 한계 · 주의

- 작업창은 **열려 있는 메일 한 통**만 다룬다. 받은 편지함 전체 브리핑은 브리핑 패널(/)이나 Watch 모드가 맡는다.
- Office.js 는 `https://appsforoffice.microsoft.com` 에서 로드된다(Outlook 이 이미 캐시하고 있음). 완전 오프라인 VDI 라면 이 파일을 로컬에 두고 경로를 바꾼다.
- 메일 본문은 외부 텍스트다. 요약·초안 생성은 자동이지만 **발송·삭제 등 쓰기 동작은 반드시 사용자 확인 뒤**에만 한다(프롬프트 인젝션 대비).
- 이 매니페스트/작업창은 Mac 의 일반 브라우저에서 렌더링과 llama-server 연동만 확인했고, **실제 Outlook 안에서의 사이드로드는 아직 검증 전**이다.
