한 줄: 런처 오른쪽에 열리는 작업물 패널(초안·파일·메일·창 분석)의 공통 껍데기.

```jsx
<PanelShell title="답장 초안" icon="mail-plus" onClose={close}
  footer={<><Button onClick={close}>닫기</Button><Button variant="primary" icon="send">발송 승인 요청</Button></>}>
  …필드들…
</PanelShell>
```

- 패널이 열리면 런처 폭이 520 → 840으로 늘고 좌(대화)/우(작업물)로 갈립니다.
- 패널 안에 QA 입력을 두지 않습니다. 질문은 항상 아래 메인 입력창으로 — 포커스 태그가 자동으로 붙습니다.
