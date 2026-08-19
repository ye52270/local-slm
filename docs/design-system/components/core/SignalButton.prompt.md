한 줄: 메일·일정·할 일·알림·예약 신호를 입력창 옆에 띄우는 32px 원형 버튼 — 클릭은 프롬프트 삽입(종은 알림 패널).

```jsx
<SignalButton kind="mail" count={1} urgent title="새 메일 1건" />
<SignalButton kind="bell" count={6} title="알림 6건" />
<SignalButton kind="timer" title="예약 작업" />
```

- 건수가 0이면 아예 렌더하지 않습니다.
- 빨강 뱃지는 화면에 하나까지. 나머지는 무채색.
