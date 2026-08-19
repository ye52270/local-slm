한 줄: 답변 아래 접혀 있는 실행 기록 — 펼치면 단계와 담당 에이전트가 보입니다.

```jsx
<AgentTrace steps={[
  { label: "메일 검색 — 첨부·동의어 확장으로 12건 조회", agent: "mail", done: true },
  { label: "타임라인 분석 — 미결 3건 식별", agent: "insight", done: true },
  { label: "종합 — 병목 판단 + 다음 액션 제안", agent: "supervisor", done: true },
]} />
```

**실행과 1:1이어야 합니다.** 하지 않은 단계를 그리면 안 됩니다(가짜 성공 금지).
