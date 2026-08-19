/* 몰두봇 — 파일·브라우저 제어 화면 4종 (계획 / 실행 / 결과·되돌리기 / 권한).
   승인 모델: 위험한 동작(덮어쓰기·삭제·발송·외부 사이트)만 멈추고 물어봅니다.
   컴포넌트·색·아이콘은 기존 패널 규칙 그대로. 새 색은 쓰지 않습니다. */

const PLAN = [
  { t: "바탕화면 › 월간보고 폴더에서 파일 3개 찾기", k: "읽기", risk: false, ico: "ti-folder" },
  { t: "표 3개를 합쳐 요약본 만들기", k: "새 파일", risk: false, ico: "ti-table" },
  { t: "사내 위키에서 지난달 수치 확인", k: "브라우저", risk: false, ico: "ti-world" },
  { t: "기존 요약본_2026-07.xlsx 덮어쓰기", k: "덮어쓰기", risk: true, ico: "ti-file-text" },
  { t: "윤중식 님께 메일로 첨부해 발송", k: "발송", risk: true, ico: "ti-send" },
];

function RiskTag({ on }) {
  return on
    ? <span className="tag late"><i className="ti ti-shield-check" style={{ fontSize: 11, marginRight: 3 }} />승인 필요</span>
    : <span className="scope">자동</span>;
}

function PlanScreen({ onRun, onCancel, onPerm }) {
  return (
    <>
      <div className="ask"><span className="who"><i className="ti ti-user" /></span>
        <span className="q">월간보고 자료 정리해서 윤중식 님께 보내줘</span></div>
      <div className="answer">이렇게 하겠습니다. 승인이 필요한 단계는 실행 중에 물어봅니다.</div>
      <div className="hero dots">
        <div className="kick" style={{ color: "var(--acc)" }}><i className="ti ti-list-check" />실행 계획<span className="num">· 5단계</span></div>
        <div className="plist">
          {PLAN.map((s, i) => (
            <div className="pstep" key={i}>
              <span className="num">{i + 1}</span>
              <i className={"ti " + s.ico} style={{ fontSize: 14, color: "var(--pf)", flex: "none" }} />
              <span className="t">{s.t}</span>
              <RiskTag on={s.risk} />
            </div>
          ))}
        </div>
        <div className="src">파일 3개 · 사이트 1곳 · 승인 필요 2건 · 예상 40초</div>
        <div className="acts">
          <button className="btn primary" onClick={onRun}><i className="ti ti-player-play" />실행</button>
          <button className="btn" onClick={onPerm}><i className="ti ti-lock" />권한 확인</button>
          <button className="btn ghost" onClick={onCancel}>취소</button>
        </div>
      </div>
      <button className="trace"><i className="ti ti-chevron-right" />단계 편집</button>
    </>
  );
}

function RunningScreen({ onDone }) {
  const [at, setAt] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [held, setHeld] = React.useState(false);
  React.useEffect(() => {
    if (paused || held) return;
    if (at >= PLAN.length) { const d = setTimeout(onDone, 700); return () => clearTimeout(d); }
    if (PLAN[at].risk) { setHeld(true); return; }
    const t = setTimeout(() => setAt(a => a + 1), 1100);
    return () => clearTimeout(t);
  }, [at, paused, held]);
  const pct = Math.round((Math.min(at, PLAN.length) / PLAN.length) * 100);
  const cur = PLAN[Math.min(at, PLAN.length - 1)];
  return (
    <>
      <div className="head"><h1>실행 중</h1>
        <div className="counts">
          <span className="cnt" style={{ cursor: "default" }}>단계 <b>{Math.min(at + 1, PLAN.length)}/{PLAN.length}</b></span>
        </div>
      </div>
      <div className="hero">
        <div className="kick" style={{ color: held ? "var(--warn)" : "var(--acc)" }}>
          <i className={"ti " + (held ? "ti-shield-check" : paused ? "ti-player-pause" : "ti-loader-2")} />
          {held ? "승인을 기다리는 중" : paused ? "일시 정지됨" : "몰두봇이 작업하고 있습니다"}
        </div>
        <div className="plist">
          {PLAN.map((s, i) => (
            <div className={"pstep" + (i < at ? " done" : i === at ? " now" : "")} key={i}>
              <span className="num">{i < at ? "✓" : i + 1}</span>
              <i className={"ti " + s.ico} style={{ fontSize: 14, color: "var(--pf)", flex: "none" }} />
              <span className="t">{s.t}</span>
              {i === at && !held && <span className="scope">진행 중</span>}
              {i > at && s.risk && <RiskTag on />}
            </div>
          ))}
        </div>
        <div className="prog"><i style={{ width: pct + "%" }} /></div>
        <div className="acts">
          <button className="btn" onClick={() => setPaused(p => !p)} disabled={held}>
            <i className={"ti " + (paused ? "ti-player-play" : "ti-player-pause")} />{paused ? "이어서" : "일시 정지"}
          </button>
          <button className="btn ghost" onClick={onDone}><i className="ti ti-player-stop" />중단</button>
          <span className="soon" style={{ marginLeft: "auto" }}>{cur.k}</span>
        </div>
      </div>
      {held && (
        <div className="approval">
          <div className="ahead"><i className="ti ti-alert-triangle" />{PLAN[at].k} — 승인이 필요해요</div>
          <div className="target">{PLAN[at].t}</div>
          <div className="ameta"><i className="ti ti-arrow-back-up" />
            {PLAN[at].k === "발송" ? "발송 후 되돌릴 수 없음" : "이전 파일은 30일간 보관 · 되돌릴 수 있음"}</div>
          <div className="aacts">
            <button className="btn" onClick={() => { setHeld(false); setAt(a => a + 2 > PLAN.length ? PLAN.length : a + 1); }}>건너뛰기</button>
            <button className="btn ok" onClick={() => { setHeld(false); setAt(a => a + 1); }}><i className="ti ti-check" />승인</button>
          </div>
        </div>
      )}
    </>
  );
}

const CHANGES = [
  { t: "요약본_2026-07.xlsx", m: "덮어씀 · 이전 파일 보관됨", u: true, ico: "ti-file-text" },
  { t: "월간보고_초안.docx", m: "새로 만듦 · 바탕화면 › 월간보고", u: true, ico: "ti-file-plus" },
  { t: "사내 위키 — 7월 운영지표", m: "읽음 · 변경 없음", u: null, ico: "ti-world" },
  { t: "윤중식 · [월보] 2026-07 월간운영 보고", m: "발송됨 · 16:52", u: false, ico: "ti-send" },
];

function ResultScreen({ onPlan }) {
  const [undone, setUndone] = React.useState([]);
  const undo = i => setUndone(u => u.includes(i) ? u : [...u, i]);
  return (
    <>
      <div className="head"><h1>작업 완료</h1>
        <div className="counts"><span className="cnt" style={{ cursor: "default" }}>바뀜 <b>3</b></span></div>
      </div>
      <div className="answer">5단계를 마쳤습니다. 파일 2개를 바꾸고 메일 1건을 보냈습니다.</div>
      <div>
        <div className="sect">바뀐 것<span className="line" /><span className="n">4</span></div>
        {CHANGES.map((c, i) => (
          <div className="row" key={i} style={{ marginBottom: 6, opacity: undone.includes(i) ? .5 : 1 }}>
            <i className={"ti " + c.ico} style={{ fontSize: 15, color: "var(--pf)", flex: "none" }} />
            <div className="txt"><div className="t">{c.t}</div><div className="m">{undone.includes(i) ? "되돌림" : c.m}</div></div>
            {c.u && !undone.includes(i) && <button className="btn" onClick={() => undo(i)}><i className="ti ti-arrow-back-up" />되돌리기</button>}
            {c.u === false && <span className="scope">되돌릴 수 없음</span>}
            {c.u === null && <span className="scope">읽기</span>}
          </div>
        ))}
      </div>
      <div className="acts" style={{ marginTop: 0 }}>
        <button className="btn" onClick={() => setUndone([0, 1])}><i className="ti ti-arrow-back-up" />전체 되돌리기</button>
        <button className="btn ghost" onClick={onPlan}>같은 작업 다시</button>
        <span className="soon" style={{ marginLeft: "auto" }}>Outlook 근거 · 16:52</span>
      </div>
    </>
  );
}

const PLACES = [
  ["폴더", [["바탕화면 › 월간보고", "읽기 · 쓰기", true], ["문서", "읽기", true], ["다운로드", "차단됨", false]]],
  ["사이트", [["사내 위키", "읽기", true], ["그룹웨어", "읽기", true], ["그 외 사이트", "열 때마다 승인", false]]],
];
const ACTIONS = [
  ["파일 읽기", 0], ["새 파일 만들기", 0], ["기존 파일 덮어쓰기", 1], ["파일 삭제", 1],
  ["메일 발송", 1], ["외부 사이트 열기", 1], ["결제 · 구매", 2],
];
const LEVELS = ["항상 허용", "승인 필요", "차단"];

function PermissionScreen({ onBack }) {
  const [places, setPlaces] = React.useState(() => PLACES.map(([, rows]) => rows.map(r => r[2])));
  const [acts, setActs] = React.useState(() => ACTIONS.map(a => a[1]));
  return (
    <>
      <div className="head"><h1>권한</h1>
        <div className="counts">
          {onBack && <button className="cnt" onClick={onBack}><i className="ti ti-arrow-left" style={{ fontSize: 12, marginRight: 4 }} />돌아가기</button>}
          <span className="cnt" style={{ cursor: "default" }}>승인 필요 <b>{acts.filter(a => a === 1).length}</b></span>
        </div>
      </div>
      <div className="answer" style={{ fontSize: 13, color: "var(--pm)" }}>몰두봇이 건드려도 되는 곳과, 물어봐야 하는 동작을 정합니다.</div>
      {PLACES.map(([label, rows], gi) => (
        <div key={label}>
          <div className="sect">{label}<span className="line" /></div>
          {rows.map(([t, m], i) => (
            <div className="row" key={t} style={{ marginBottom: 6 }}>
              <i className={"ti " + (gi ? "ti-world" : "ti-folder")} style={{ fontSize: 15, color: "var(--pf)", flex: "none" }} />
              <div className="txt"><div className="t">{t}</div><div className="m">{m}</div></div>
              <button className={"sw" + (places[gi][i] ? " on" : "")} aria-label={t}
                onClick={() => setPlaces(p => p.map((g, j) => j === gi ? g.map((v, k) => k === i ? !v : v) : g))}><b /></button>
            </div>
          ))}
        </div>
      ))}
      <div>
        <div className="sect">동작<span className="line" /></div>
        {ACTIONS.map(([t], i) => (
          <div className="row" key={t} style={{ marginBottom: 6 }}>
            <div className="txt"><div className="t">{t}</div></div>
            <div className="tri">
              {LEVELS.map((l, li) => (
                <button key={l} className={acts[i] === li ? "on" : ""}
                  onClick={() => setActs(a => a.map((v, j) => j === i ? li : v))}>{l}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="ameta" style={{ fontSize: 11, color: "var(--pf)", display: "flex", gap: 6, alignItems: "center" }}>
        <i className="ti ti-shield-check" />승인 필요 항목은 실행 중에 한 번씩 물어봅니다
      </div>
    </>
  );
}

Object.assign(window, { PlanScreen, RunningScreen, ResultScreen, PermissionScreen, RiskTag, PLAN, CHANGES });
