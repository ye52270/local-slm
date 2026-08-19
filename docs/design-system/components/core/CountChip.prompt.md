한 줄: "오늘 업무" 헤더 오른쪽에 붙는 건수 칩 — 기본은 무채색, 지연 하나만 urgent.

```jsx
<CountChip label="일정" count={1} />
<CountChip label="할 일" count={2} />
<CountChip label="후속" count={6} />
<CountChip label="지연" count={8} urgent />
```

칩 네 개를 각각 다른 색으로 칠하지 않습니다 — 무채색 + 지연 하나만 색을 갖습니다.
