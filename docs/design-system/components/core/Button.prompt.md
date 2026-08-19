한 줄: 몰두봇의 모든 클릭 동작에 쓰는 28px 버튼 — 라벨은 마침표 없는 명사구/동사원형.

```jsx
<Button variant="primary" icon="pencil">답장 초안 만들기</Button>
<Button icon="mail-opened">후속 메일 열기</Button>
<Button variant="ghost">나중에</Button>
<Button variant="ok" icon="send">승인</Button>
```

- `primary`(채워진 파랑)는 한 화면에 하나. 나머지는 `secondary`(헤어라인) 또는 `ghost`(텍스트).
- `ok`는 승인 게이트의 승인 버튼에만. 거부는 `secondary`.
- 준비 중 기능은 `disabled`로 두고 버튼 오른쪽에 모노 라벨("준비 중")을 따로 놓습니다 — 버튼 위에 겹치지 않습니다.
