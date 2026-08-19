/* 몰두봇 desktop panel UI kit — screens for the resident floating launcher.
   Structure mirrors moldubot3: statusline / stream / composer, right side = artifact panel.
   Copy is taken from the running app and docs/design/06-ui-spec.md. */

// 오브 얼굴 — DotMatrixDisplay.cs와 같은 21×16 도트 그리드, pitch 8, 도트 반지름 pitch*0.33.
const ORB_COLS = 21, ORB_ROWS = 16;
const SPRITES = {
  idle: { c: "#63E04B", rows: ["", "", "", "", "....XXXX.....XXXX....", "...XXXXXX...XXXXXX...", "...XXXXXX...XXXXXX...", "...XXXXXX...XXXXXX...", "....XXXX.....XXXX...."] },
  wink: { c: "#FFD23E", rows: ["", "", "", ".......X.............", "....XXX.X....XXXX....", "...XX....X..XXXXXX...", "....XXX.X...XXXXXX...", ".......X....XXXXXX...", ".............XXXX...."] },
  mail: { c: "#FF6B5E", rows: ["", "", "", "....XXXXXXXXXXXXX....", "....X...........X....", "....XX.........XX....", "....X.XX.....XX.X....", "....X...XX.XX...X....", "....X.....X.....X....", "....X...........X....", "....XXXXXXXXXXXXX...."] },
  bell: { c: "#FFB84D", rows: ["", "", "....XX...XX....", "...XXX...XXX...", ".....XXXXX.....", "....X.....X....", "...X.......X...", "...X.......X...", "...X.......X...", "...X.......X...", "....X.....X....", ".....XXXXX.....", "....X.....X...."].map(r=>r?"...".slice(0,3)+r:r) },
  clock: { c: "#E9F56B", rows: ["", "", "......XXXXXXXXX......", "......X.......X......", ".......X.....X.......", "........X...X........", ".........XXX.........", "........X...X........", ".......X.....X.......", "......X..XXX..X......", "......X.XXXXX.X......", "......XXXXXXXXX......"] },
};

function Orb({ face = "idle", busy = false, onClick, title }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const g = cv.getContext("2d");
    const P = cv.width / ORB_COLS, r = P * 0.33;
    const ox = (cv.width - ORB_COLS * P) / 2 + P / 2, oy = (cv.height - ORB_ROWS * P) / 2 + P / 2;
    const panelR = cv.width / 2 - 2;
    const sp = SPRITES[face] || SPRITES.idle;
    g.clearRect(0, 0, cv.width, cv.height);
    for (let row = 0; row < ORB_ROWS; row++) {
      for (let col = 0; col < ORB_COLS; col++) {
        const cx = ox + col * P, cy = oy + row * P;
        const dx = cx - cv.width / 2, dy = cy - cv.height / 2;
        if (Math.sqrt(dx * dx + dy * dy) > panelR - r - 0.5) continue;
        const on = sp.rows[row] && sp.rows[row][col] === "X";
        if (on) {
          g.beginPath(); g.arc(cx, cy, r * 1.65, 0, 6.284); g.fillStyle = sp.c; g.globalAlpha = 0.16; g.fill(); g.globalAlpha = 1;
          g.beginPath(); g.arc(cx, cy, r, 0, 6.284); g.fillStyle = sp.c; g.fill();
        } else {
          g.beginPath(); g.arc(cx, cy, r * 0.42, 0, 6.284); g.fillStyle = "#313437"; g.globalAlpha = 0.72; g.fill(); g.globalAlpha = 1;
        }
      }
    }
  }, [face]);
  return (
    <button className={"orb" + (busy ? " busy" : "")} onClick={onClick} title={title} aria-label={title}>
      <span className="led"><canvas ref={ref} width="168" height="168" /></span>
      <span className="gloss" />
    </button>
  );
}


function Toast({ onClose }) {
  return (
    <div className="bubble" style={{ width: 320 }}>
      <span className="tail" />
      <div className="bubble-body" style={{ borderRadius: 17 }}>
        <span className="bubble-icon round"><i className="ti ti-mail" /></span>
        <span className="bubble-txt">
          <span className="bubble-t">답장이 필요한 메일</span>
          <span className="bubble-m">박제영 · 배포 확인 건 · 오전 10:41</span>
        </span>
        <button className="bubble-x" onClick={onClose} aria-label="닫기"><i className="ti ti-x" /></button>
      </div>
    </div>
  );
}

function Peek({ onClose }) {
  return (
    <div className="bubble" style={{ width: 300 }}>
      <span className="tail" />
      <div className="bubble-body" style={{ borderRadius: 16 }}>
        <span className="bubble-icon">W</span>
        <span className="bubble-txt">
          <span className="bubble-t">업무일지_문서.docx</span>
          <span className="bubble-m" style={{ color: "#A9C1FF" }}>클릭해서 요약 보기</span>
        </span>
        <button className="bubble-x" onClick={onClose} aria-label="닫기"><i className="ti ti-x" /></button>
      </div>
    </div>
  );
}

function StatusLine({ when = "8월 15일 토요일" }) {
  return (
    <div className="statusline">
      <span className="live" />
      <span className="model">Local SLM · Qwen3.5-4B-Q4_K_M · 16K</span>
      <span className="when">{when}</span>
    </div>
  );
}

function Composer({ focus, onClearFocus, onSubmit, signals = true }) {
  const [v, setV] = React.useState("");
  const ph = focus ? `『${focus}』에 대해 물어보기…` : "확인하거나 실행할 업무를 입력하세요...";
  return (
    <form className="composer" onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onSubmit && onSubmit(v); setV(""); } }}>
      <i className="ti ti-sparkles spark" />
      {focus && (
        <span className="focustag"><i className="ti ti-pin" /><span className="t">{focus}</span>
          <button type="button" onClick={onClearFocus} aria-label="포커스 해제"><i className="ti ti-x" /></button>
        </span>
      )}
      <span className="field"><input value={v} onChange={(e) => setV(e.target.value)} placeholder={ph} /></span>
      {signals && (
        <span className="sigs">
          <button type="button" className="sig" style={{ color: "var(--sig-mail)", background: "var(--sig-mail-bg)" }} title="새 메일 1건">
            <i className="ti ti-mail" /><span className="sig-badge urgent">1</span>
          </button>
          <button type="button" className="sig" style={{ color: "var(--sig-bell)", background: "var(--sig-bell-bg)" }} title="알림 6건">
            <i className="ti ti-bell" /><span className="sig-badge neutral">6</span>
          </button>
        </span>
      )}
      <span className="kbd">⌥Space</span>
      <button type="button" className="mic" title="음성 입력"><i className="ti ti-microphone" /></button>
    </form>
  );
}

function Counts({ onOverdue }) {
  return (
    <div className="counts">
      <button className="cnt">일정 <b>1</b></button>
      <button className="cnt">할 일 <b>2</b></button>
      <button className="cnt">후속 <b>6</b></button>
      <button className="cnt urgent" onClick={onOverdue}>지연 <b>8</b></button>
    </div>
  );
}

function Hero({ dots, onDraft }) {
  return (
    <div className={"hero" + (dots ? " dots" : "")}>
      <div className="kick"><i className="ti ti-flag-2" />추천 액션<span className="num">· 지연 8-12</span></div>
      <h2>재발송 : [월보] 2026-07 월간운영 보고</h2>
      <div className="src">원본 · 플래그 메일</div>
      <div className="acts">
        <button className="btn primary" onClick={onDraft}><i className="ti ti-pencil" />답장 초안 만들기</button>
        <button className="btn"><i className="ti ti-mail-opened" />후속 메일 열기</button>
        <button className="btn ghost">나중에</button>
        <span className="soon" style={{ marginLeft: "auto" }}>준비 중</span>
      </div>
    </div>
  );
}

function BriefingScreen({ onDraft, onOverdue }) {
  return (
    <>
      <div className="head"><h1>오늘 업무</h1><Counts onOverdue={onOverdue} /></div>
      <Hero onDraft={onDraft} />
      <div>
        <div className="sect">다른 항목 추천<span className="line" /><span className="n">1</span></div>
        <div className="row">
          <div className="txt">
            <div className="t">[보안운영] 내부 구성원 간 개인정보 메일 차단 관련 진행 상황 확인</div>
            <div className="m">지연 메일 확인 · 원본 · 플래그 메일</div>
          </div>
          <button className="btn">메일 열기</button>
        </div>
      </div>
      <div className="cols">
        <div>
          <div className="colhd"><span>오늘 일정</span><span className="n">1</span></div>
          <div className="item"><span className="accent" />
            <div className="txt"><div className="t">금호생명 암보험 인출</div><div className="m">10:00–10:00</div></div>
            <span className="time">10:00</span>
          </div>
        </div>
        <div>
          <div className="colhd"><span>할 일</span><span className="n">2</span></div>
          <div className="item todo"><span className="accent" />
            <div className="txt"><div className="t">SSO Oracle 암호 변경</div><div className="m">Outlook 작업 <span className="late">지연 2-24</span></div></div>
          </div>
          <div className="item todo"><span className="accent" />
            <div className="txt"><div className="t">그룹메일 주소 생성</div><div className="m">Outlook 작업</div></div>
          </div>
        </div>
      </div>
    </>
  );
}

const MAILS = [
  { i: "박", n: "박제영", t: "회신 필요", s: "배포 확인 건", p: "배포는 아직 완료되지 않았습니다. 현재 인증 오류를 확인 중이며…", tag: "reply" },
  { i: "윤", n: "윤중식", t: "지연 27일", s: "[월보] 2026-07 월간운영 보고 회신 요청", p: "월간운영 보고 관련하여 확인 부탁드립니다.", tag: "late" },
  { i: "배", n: "배수민", t: null, s: "FW: [D-1 Remind] AI Asset 등록", p: "등록 마감이 하루 남았습니다.", tag: null },
];

function ConversationScreen({ onDraft, sent }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <div className="ask"><span className="who"><i className="ti ti-user" /></span>
        <span className="q">월간운영 보고 어떻게 됐어?</span></div>
      {sent && (
        <div className="row" style={{ borderColor: "var(--ok)" }}>
          <i className="ti ti-check" style={{ color: "var(--ok)", fontSize: 15 }} />
          <div className="txt"><div className="t">메일 발송됨</div><div className="m">윤중식 · [월보] 2026-07 재발송 · 오전 10:52</div></div>
        </div>
      )}
      <div className="answer">
        재발송 요청 이후 <b>27일째 회신이 없습니다</b>. 관련 메일 3건을 시간순으로 엮어 보면 인증 오류 확인 단계에서 멈춰 있고,
        이후 진행을 확인한 기록이 없습니다. 병목은 <b>박제영</b>의 배포 확인 회신입니다.
      </div>
      <div>
        <div className="sect">관련 메일<span className="line" /><span className="n">3</span></div>
        {MAILS.map((m) => (
          <div className="mailrow" key={m.s} style={{ marginBottom: 6 }}>
            <span className="av">{m.i}</span>
            <span className="txt">
              <span className="t"><span className="s">{m.s}</span>{m.t && <span className={"tag " + (m.tag === "late" ? "late" : "reply")}>{m.t}</span>}</span>
              <span className="p">{m.n} · {m.p}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="chips">
        <button className="chip first" onClick={onDraft}><i className="ti ti-pencil" />독촉 메일 초안 만들기</button>
        <button className="chip">병목 단계 자세히 보기</button>
        <button className="chip">회신 기한 일정 등록</button>
      </div>
      <div>
        <button className="trace" onClick={() => setOpen(!open)}>
          <i className={"ti ti-chevron-" + (open ? "down" : "right")} />작업 과정 3단계 · 메일 검색 → 분석 → 종합
        </button>
        {open && (
          <div className="steps">
            <div className="step done"><span className="dot" />메일 검색 — 첨부·동의어 확장으로 12건 조회<span className="ag">mail</span></div>
            <div className="step done"><span className="dot" />타임라인 분석 — 미결 3건 식별<span className="ag">insight</span></div>
            <div className="step done"><span className="dot" />종합 — 병목 판단 + 다음 액션 제안<span className="ag">supervisor</span></div>
          </div>
        )}
      </div>
    </>
  );
}

function ApprovalScreen({ onApprove, onReject }) {
  return (
    <>
      <div className="ask"><span className="who"><i className="ti ti-user" /></span>
        <span className="q">이 내용으로 윤중식 님께 보내줘</span></div>
      <div className="answer">초안을 준비했습니다. 발송 전에 확인해 주세요.</div>
      <div className="approval">
        <div className="ahead"><i className="ti ti-shield-check" />메일 발송 — 승인이 필요해요</div>
        <div className="target">윤중식 · [월보] 2026-07 월간운영 보고 재발송</div>
        <div className="prev">{"안녕하세요, 윤중식님.\n\n7월 월간운영 보고 관련 회신을 기다리고 있어 다시 보내드립니다.\n인증 오류 확인이 완료되면 알려주시면 이후 절차를 이어가겠습니다.\n\n감사합니다."}</div>
        <div className="ameta"><i className="ti ti-alert-triangle" />외부 전송 없음 · 발송 후 되돌릴 수 없음</div>
        <div className="aacts">
          <button className="btn" onClick={onReject}>거부</button>
          <button className="btn ok" onClick={onApprove}><i className="ti ti-send" />승인</button>
        </div>
      </div>
    </>
  );
}

function DraftArtifact({ onClose, onSend }) {
  return (
    <aside className="artifact">
      <div className="ahd"><i className="ti ti-mail-plus" />답장 초안
        <button className="x" onClick={onClose} aria-label="닫기"><i className="ti ti-x" /></button>
      </div>
      <div className="abody">
        <div className="fld"><label>TO</label><div className="v">윤중식 (YOON Joongshik)</div></div>
        <div className="fld"><label>SUBJECT</label><div className="v">[월보] 2026-07 월간운영 보고 재발송</div></div>
        <div className="fld"><label>BODY</label>
          <textarea defaultValue={"안녕하세요, 윤중식님.\n\n7월 월간운영 보고 관련 회신을 기다리고 있어 다시 보내드립니다.\n인증 오류 확인이 완료되면 알려주시면 이후 절차를 이어가겠습니다.\n\n감사합니다."} />
        </div>
        <div className="hint"><i className="ti ti-sparkles" />자동 생성된 초안입니다</div>
      </div>
      <div className="afoot">
        <button className="btn" onClick={onClose}>닫기</button>
        <button className="btn primary" onClick={onSend}><i className="ti ti-send" />발송 승인 요청</button>
      </div>
    </aside>
  );
}


const SKILLS = [
  ["daily-briefing", "Outlook Classic의 오늘 일정과 오늘까지 해야 할 일을 종합한다.", "매일 08:45"],
  ["weekly-planning", "Outlook Classic의 이번 주 일정과 미완료 할 일을 함께 정리한다.", "매주 월 09:00"],
  ["mail-summary", "Outlook Classic에서 열거나 선택한 현재 메일의 본문을 요약한다.", null],
  ["mail-follow-up", "현재 Outlook 메일에서 요청·기한·후속 행동을 근거와 함께 확인한다.", null],
  ["groupware-notices", "사용자가 연결한 HISK 그룹웨어 공지 화면에서 중요한 공지를 요약한다.", null],
  ["groupware-notice-detail", "연결된 HISK 공지 목록에서 사용자가 지정한 순번의 공지 하나를 열고 상세 본문을 요약한다.", null],
];

function SkillsScreen() {
  return (
    <>
      <div className="head"><h1>스킬</h1>
        <div className="counts"><span className="cnt" style={{cursor:"default"}}>등록 <b>6</b></span></div>
      </div>
      <div className="hero" style={{ background: "var(--acc-bg)", border: "1px solid var(--acc-bd)" }}>
        <div className="kick" style={{ color: "var(--acc)" }}><i className="ti ti-wand" />스킬 제안<span className="num">· 3회 반복</span></div>
        <h2>주간 보고 메일 정리를 스킬로 만들까요?</h2>
        <div className="src">지난 3주 동안 같은 형태로 반복했습니다 · 등록은 승인이 필요합니다</div>
        <div className="acts">
          <button className="btn primary"><i className="ti ti-plus" />스킬로 등록</button>
          <button className="btn">내용 보기</button>
          <button className="btn ghost">안 만들기</button>
        </div>
      </div>
      <div>
        <div className="sect">등록된 스킬<span className="line" /><span className="n">6</span></div>
        {SKILLS.map(([name, desc, sched]) => (
          <div className="item" key={name} style={{ alignItems: "flex-start" }}>
            <span className="accent" style={{ background: sched ? "var(--ok)" : "var(--pf)" }} />
            <div className="txt">
              <div className="t" style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, letterSpacing: ".03em" }}>{name}.md</div>
              <div className="m" style={{ whiteSpace: "normal" }}>{desc}</div>
            </div>
            {sched ? <span className="time" style={{ color: "var(--ok)" }}>{sched}</span> : null}
          </div>
        ))}
      </div>
      <div className="chips">
        <button className="chip accent-first" style={{ color: "var(--acc)", background: "var(--acc-bg)", borderColor: "var(--acc-bd)" }}><i className="ti ti-plus" />대화로 새 스킬 만들기</button>
        <button className="chip">예약 목록 보기</button>
      </div>
    </>
  );
}

function WindowAnalysisScreen() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <div className="ask"><span className="who"><i className="ti ti-arrow-down-to-arc" /></span>
        <span className="q">업무일지_문서.docx 창을 오브에 놓음</span></div>
      <div className="answer">
        협의사항에서 <b>할 일 3건</b>을 찾았습니다. 기한이 적힌 것은 2건이고, 나머지 1건은 담당자만 있습니다.
      </div>
      <div style={{ borderLeft: "3px solid var(--acc-bd)", paddingLeft: 10, fontSize: 12, color: "var(--pm)", lineHeight: 1.6 }}>
        “계정 정책 개정안은 8/22까지 정보보호팀 검토를 받고, 그룹메일 주소 생성은 배포 전까지 완료한다.”
      </div>
      <div>
        <div className="sect">추출한 할 일<span className="line" /><span className="n">3</span></div>
        <div className="item todo"><span className="accent" /><div className="txt"><div className="t">계정 정책 개정안 정보보호팀 검토</div><div className="m">문서 · 협의사항 2항</div></div><span className="time">8-22</span></div>
        <div className="item todo"><span className="accent" /><div className="txt"><div className="t">그룹메일 주소 생성</div><div className="m">문서 · 협의사항 3항</div></div><span className="time">배포 전</span></div>
        <div className="item todo"><span className="accent" style={{ background: "var(--pf)" }} /><div className="txt"><div className="t">운영 이관 담당자 지정</div><div className="m">문서 · 협의사항 5항 <span className="late">기한 없음</span></div></div></div>
      </div>
      <div className="chips">
        <button className="chip" style={{ color: "var(--acc)", background: "var(--acc-bg)", borderColor: "var(--acc-bd)" }}><i className="ti ti-plus" />할 일 3건 등록하기</button>
        <button className="chip">기한 없는 1건 확인</button>
        <button className="chip">문서 원본 열기</button>
      </div>
      <div>
        <button className="trace" onClick={() => setOpen(!open)}>
          <i className={"ti ti-chevron-" + (open ? "down" : "right")} />작업 과정 3단계 · 창 캡처 → 문자 인식 → 액션아이템 추출
        </button>
        {open && (
          <div className="steps">
            <div className="step done"><span className="dot" />창 캡처 — 활성 창 1장<span className="ag">window</span></div>
            <div className="step done"><span className="dot" />문자 인식 — Windows OCR<span className="ag">file</span></div>
            <div className="step done"><span className="dot" />액션아이템 추출 — 기한 2건 확인<span className="ag">supervisor</span></div>
          </div>
        )}
      </div>
    </>
  );
}

function Launcher({ view, mode, onOrb, focus, setFocus, go, sent }) {
  const wide = view === "focus";
  if (view === "bar") {
    return <div className="launcher bar-only"><Composer onSubmit={() => go("chat")} /></div>;
  }
  return (
    <div className={"launcher" + (wide ? " wide" : "")}>
      <StatusLine />
      <div className="body">
        <div className="stream">
          {view === "brief" && <BriefingScreen onDraft={() => { setFocus("[월보] 2026-07 월간운영 보고"); go("focus"); }} onOverdue={() => go("chat")} />}
          {view === "chat" && <ConversationScreen sent={sent} onDraft={() => { setFocus("[월보] 2026-07 월간운영 보고"); go("focus"); }} />}
          {view === "focus" && <ConversationScreen sent={sent} onDraft={() => {}} />}
          {view === "approve" && <ApprovalScreen onApprove={() => { setFocus(null); go("chat", true); }} onReject={() => { setFocus(null); go("chat"); }} />}
          {view === "skills" && <SkillsScreen />}
          {view === "window" && <WindowAnalysisScreen />}
          {view === "plan" && <PlanScreen onRun={() => go("run")} onCancel={() => go("brief")} onPerm={() => go("perm")} />}
          {view === "run" && <RunningScreen onDone={() => go("result")} />}
          {view === "result" && <ResultScreen onPlan={() => go("plan")} />}
          {view === "perm" && <PermissionScreen onBack={() => go("plan")} />}
          {view === "mail" && <MailSummaryScreen />}
        </div>
        {wide && <DraftArtifact onClose={() => { setFocus(null); go("chat"); }} onSend={() => go("approve")} />}
      </div>
      <Composer focus={focus} onClearFocus={() => setFocus(null)} onSubmit={() => go("chat")} signals={view !== "approve"} />
    </div>
  );
}

function KitApp() {
  const [mode, setMode] = React.useState("light");
  const [view, setView] = React.useState("brief");
  const [focus, setFocus] = React.useState(null);
  const [sent, setSent] = React.useState(false);
  const go = (v, wasSent) => { if (wasSent) setSent(true); setView(v); };
  const busy = view === "approve" || view === "window" || view === "run";
  const face = busy ? "clock" : view === "notify" ? "bell" : view === "bar" || view === "perm" ? "idle" : "wink";
  return (
    <div className="kit" data-mode={mode} data-theme={mode === "light" ? "day" : undefined}>
      <div className="kit-bar">
        <span className="kit-lbl">몰두봇 · 데스크톱 상주 패널</span>
        <div className="seg">
          {[["light", "라이트"], ["dark", "다크"]].map(([k, l]) => (
            <button key={k} className={mode === k ? "on" : ""} onClick={() => setMode(k)}>{l}</button>
          ))}
        </div>
        <div className="seg">
          {[["bar", "접힘"], ["brief", "오늘 업무"], ["chat", "진행 보고"], ["focus", "초안 작성"], ["approve", "승인"], ["window", "창 분석"], ["skills", "스킬"], ["notify", "알림"], ["plan", "계획 확인"], ["run", "실행 중"], ["result", "결과"], ["perm", "권한"], ["mail", "메일 요약"]].map(([k, l]) => (
            <button key={k} className={view === k ? "on" : ""} onClick={() => { setView(k); setFocus(k === "focus" ? "[월보] 2026-07 월간운영 보고" : null); }}>{l}</button>
          ))}
        </div>
      </div>
      <div className="stage" data-mode={mode}>
        <div className="dock">
          {view === "notify" ? (
            <Toast onClose={() => setView("brief")} />
          ) : view === "window" ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
              <Peek onClose={() => setView("brief")} />
              <Launcher view={view} mode={mode} focus={focus} setFocus={setFocus} go={go} sent={sent} />
            </div>
          ) : (
            <Launcher view={view} mode={mode} focus={focus} setFocus={setFocus} go={go} sent={sent} />
          )}
          <Orb face={face} busy={busy} title="몰두봇 열기 / 접기" onClick={() => setView(view === "bar" ? "brief" : "bar")} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Orb, Toast, Peek, SkillsScreen, WindowAnalysisScreen, StatusLine, Composer, Counts, Hero, BriefingScreen, ConversationScreen, ApprovalScreen, DraftArtifact, Launcher, KitApp });
