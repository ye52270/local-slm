/* 몰두봇 — 메일 요약 화면.
   원칙: 메타는 짧게, 요약이 주인공, 원문은 접어둔다. 헤더 덤프와 URL은 절대 본문에 넣지 않는다. */

const MAIL = {
  from: "배수민", fromTeam: "AX Solution서비스4팀",
  subject: "반응 일별 다이제스트 — 2026년 8월 15일 토요일",
  at: "08-14 14:06", to: 3,
  points: [
    "8월 14일자 반응 지표 일별 집계가 첨부돼 있습니다.",
    "전일 대비 큰 변동은 없고, 별도 조치를 요청하지 않았습니다.",
    "수신자 3명 모두 참조이며 회신 요청은 없습니다.",
  ],
  excerpt: "안녕하세요. 8월 14일 기준 반응 일별 다이제스트를 공유드립니다. 상세 수치는 첨부 파일을 참고 부탁드립니다.",
};

function MailSummaryScreen() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <div className="ask"><span className="who"><i className="ti ti-user" /></span>
        <span className="q">현재 메일 요약해줘</span></div>
      <div className="hero">
        <div className="kick" style={{ color: "var(--acc)" }}><i className="ti ti-mail" />메일 요약</div>
        <div className="mtitle">{MAIL.subject}</div>
        <div className="mmeta">
          <span><i className="ti ti-user" />{MAIL.from} · {MAIL.fromTeam}</span>
          <span><i className="ti ti-users" />받는 사람 {MAIL.to}명</span>
          <span className="mono">{MAIL.at}</span>
        </div>
        <ul className="points">
          {MAIL.points.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
        <div className="acts">
          <button className="btn primary"><i className="ti ti-pencil" />답장 초안</button>
          <button className="btn"><i className="ti ti-mail-opened" />원문 열기</button>
          <button className="btn ghost">나중에</button>
        </div>
      </div>
      <button className="trace" onClick={() => setOpen(o => !o)}>
        <i className={"ti " + (open ? "ti-chevron-down" : "ti-chevron-right")} />원문 발췌
      </button>
      {open && <div className="excerpt">{MAIL.excerpt}</div>}
    </>
  );
}

Object.assign(window, { MailSummaryScreen, MAIL });
