/* 몰두봇 메일 브리핑 패널 — 로컬 SLM(llama-server) 만으로 동작하는 정적 화면.
   화면 규칙: docs/design-system (readme · guidelines/mail-summary.md · ui_kits/desktop-panel)
   - 오늘 업무: 카운트 칩(무채색, 임박 하나만 urgent) → 추천 액션 1건 → 다른 항목
   - 메일 요약: 제목 → 메타 한 줄 → 요점 3개 이내(근거 문장 함께) → 버튼 3개 → 원문 발췌(접힘)
   - 쓰기 동작(답장)은 승인 카드를 지난 뒤 메일 앱에서 직접 보낸다. 여기서 발송하지 않는다. */
(function () {
  'use strict';
  const P = window.MailPipeline;
  const $ = (id) => document.getElementById(id);
  const qs = new URLSearchParams(location.search);
  const BASE = qs.get('base') || '';
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const state = {
    mode: localStorage.getItem('slm-mode') || 'light',
    source: 'inbox',
    model: '',
    online: false,
    mails: [],
    slots: {},        // id → 결과
    pending: {},      // id → true (요약 중)
    view: 'brief',
    current: null,    // 요약 화면 메일 id
    snooze: new Set(JSON.parse(localStorage.getItem('slm-snooze') || '[]')),
    draft: null,      // {mailId, subject, body, busy}
    showFull: false,
    showExcerpt: false,
    moreOpen: false,
    today: P.iso(new Date()),
    models: [],       // 서버가 제공하는 모델 목록 (라우터 모드면 여러 개)
    router: false,
    log: [],          // {subject, model, ms, ptok, tok, at}
    logOpen: false,
    period: 'today',  // 리포트 기간: today | week
    collapsed: false, // 런처 접힘(알약)
    query: '',        // 컴포저 검색어(포커스 태그)
    knownIds: null,   // 자동 새로고침 비교용
    done: JSON.parse(localStorage.getItem('slm-done') || '{}'),   // id → 완료 시각(ISO)
    queue: [],        // 모델 작업 대기열 {key, kind, mailId, label}
    queueRunning: null,
    palette: { open: false, sel: 0, items: [] },
    settings: Object.assign({ wrapTime: '17:30', notify: true, weekly: true, defaultReport: 'today' }, JSON.parse(localStorage.getItem('slm-settings') || '{}')),
    notices: JSON.parse(localStorage.getItem('slm-notices') || '[]'),   // {at, icon, title, msg, go, read}
    selected: null,   // Outlook 에서 지금 선택한 메일 (selected.json)
    selectedDismissed: '',
  };
  function saveSettings() { localStorage.setItem('slm-settings', JSON.stringify(state.settings)); }
  function saveNotices() { localStorage.setItem('slm-notices', JSON.stringify(state.notices.slice(0, 50))); }
  function saveDone() { localStorage.setItem('slm-done', JSON.stringify(state.done)); }
  const isDone = (id) => !!state.done[id];
  const orb = window.MolduOrb ? window.MolduOrb.Orb($('orb')) : null;
  let orbDoneTimer = null;
  function orbState() {
    // 오브 상태: 연결 없음 → sorry / 요약·초안 작업 중 → clock+무지개 링 / 그 외 → idle (완료·새 메일은 flash 로 잠깐)
    if (!orb) return;
    if (!state.online) return orb.set('sorry', false);
    const working = Object.keys(state.pending).length > 0 || (state.draft && state.draft.busy) || !!state.queueRunning;
    if (working) return orb.set('clock', true);
    // WPF EmotionController 와 같은 의미: Thinking(작업 중) → Happy(완료, 4초 transient) → Idle. Alert(새 메일) 는 8초.
    if (orb.busy) { orb.set('heart', false); clearTimeout(orbDoneTimer); orbDoneTimer = setTimeout(() => orb.set('idle', false), 4000); return; }
    if (!['heart', 'mail'].includes(orb.face)) orb.set('idle', false);
  }
  let toastTimer = null;
  function toast(icon, title, msg, ms, go) {
    state.notices.unshift({ at: Date.now(), icon, title, msg, go: go || 'brief', read: false }); state.notices = state.notices.slice(0, 50); saveNotices();
    if (state.settings.notify === false) { renderBell(); return; }
    $('toastIcon').className = 'ti ti-' + icon; $('toastTitle').textContent = title; $('toastMsg').textContent = msg;
    $('toastBody').dataset.go = go || 'brief';
    $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, ms || 6000);
    renderBell();
  }
  function renderBell() {
    const n = state.notices.filter((x) => !x.read).length; const b = $('sigBellBadge'); if (!b) return;
    b.hidden = n === 0; b.textContent = n; b.className = 'sig-badge neutral';
  }
  state.model = localStorage.getItem('slm-model') || '';

  // ------------------------------------------------------------- 유틸 --
  const KO_DAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  function todayLabel() { const d = new Date(); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${KO_DAYS[d.getDay()]}`; }
  function daysLeft(dl) {
    if (!dl) return null;
    const a = new Date(dl + 'T00:00:00'), b = new Date(state.today + 'T00:00:00');
    return Math.round((a - b) / 86400000);
  }
  function dTag(dl) { const n = daysLeft(dl); if (n == null) return ''; return n < 0 ? `D+${-n}` : `D-${n}`; }
  function sender(m) { return P.splitSender(m.senderName, m.senderAddr); }
  function fmtSec(ms) { return (ms / 1000).toFixed(1) + 's'; }
  function normalize(raw, i) {
    return {
      id: String(raw.id != null ? raw.id : raw.EntryID != null ? raw.EntryID : i),
      subject: raw.subject || raw.Subject || '(제목 없음)',
      senderName: raw.sender_name || raw.SenderName || raw.senderName || '',
      senderAddr: raw.sender_addr || raw.SenderAddr || raw.senderAddr || '',
      received: raw.received || raw.Received || '',
      body: raw.body || raw.Body || '',
    };
  }
  function excerptOf(text, n) {
    const ss = text.split(/(?<=[.!?。]|다\.|요\.)\s+|\n+/).map((s) => s.trim()).filter(Boolean);
    return ss.slice(0, n).join(' ');
  }
  function saveSnooze() { localStorage.setItem('slm-snooze', JSON.stringify([...state.snooze])); }

  // 정렬: 할 일 있음 → 기한 → 우선순위. 나중에 처리한 것은 맨 뒤.
  function ordered() {
    const pr = { high: 0, medium: 1, low: 2 };
    return state.mails.slice().sort((a, b) => {
      const sa = state.slots[a.id], sb = state.slots[b.id];
      const za = (isDone(a.id) ? 2 : 0) + (state.snooze.has(a.id) ? 1 : 0), zb = (isDone(b.id) ? 2 : 0) + (state.snooze.has(b.id) ? 1 : 0);
      if (za !== zb) return za - zb;
      const ha = sa && sa.actionItems.length ? 0 : 1, hb = sb && sb.actionItems.length ? 0 : 1;
      if (ha !== hb) return ha - hb;
      const da = sa && sa.deadline ? sa.deadline : '9999', db = sb && sb.deadline ? sb.deadline : '9999';
      if (da !== db) return da < db ? -1 : 1;
      const pa = sa ? pr[sa.priority] ?? 3 : 4, pb = sb ? pr[sb.priority] ?? 3 : 4;
      return pa - pb;
    });
  }
  // 추천 1건: 할 일이 있고 인증/소식지가 아닌 메일 중 — 다가오는 기한 → 기한 없음(우선순위·최신) → 지난 기한 순
  function recommended() {
    const cands = ordered().filter((m) => {
      const s = state.slots[m.id];
      return s && s.actionItems.length && !state.snooze.has(m.id) && !isDone(m.id) && !['verification', 'newsletter'].includes(s.category);
    });
    const up = cands.filter((m) => { const n = daysLeft(state.slots[m.id].deadline); return n != null && n >= 0; })
      .sort((a, b) => daysLeft(state.slots[a.id].deadline) - daysLeft(state.slots[b.id].deadline));
    if (up.length) return up[0];
    const none = cands.filter((m) => !state.slots[m.id].deadline)
      .sort((a, b) => (P.parseReceived(b.received) || 0) - (P.parseReceived(a.received) || 0));
    if (none.length) return none[0];
    return cands[0] || null;
  }

  // ------------------------------------------------------------- 렌더 --
  function renderStatus() {
    $('modelLine').textContent = state.online ? `Local SLM · ${state.model || 'llama-server'}` : 'Local SLM · 연결 없음';
    $('live').classList.toggle('off', !state.online);
    $('whenLine').textContent = todayLabel();
    const done = state.log.filter((l) => l.model === state.model);
    const avg = done.length ? (done.reduce((a, l) => a + l.ms, 0) / done.length / 1000).toFixed(1) + 's' : '';
    const ruled = state.mails.filter((m) => state.slots[m.id] && state.slots[m.id].byRule).length;
    $('srvInfo').textContent = state.online
      ? `${BASE || location.origin} · ${state.model}${done.length ? ` · 요약 ${done.length}통 · 평균 ${avg}` : ''}${ruled ? ` · 규칙 ${ruled}통` : ''}`
      : `${BASE || location.origin} · llama-server 응답 없음`;
    renderModelSeg();
  }

  function renderModelSeg() {
    const seg = $('modelSeg'); if (!seg) return;
    const list = state.models.length ? state.models : (state.model ? [{ id: state.model }] : []);
    seg.innerHTML = list.map((m) => `<button type="button" data-model-btn="${esc(m.id)}" class="${m.id === state.model ? 'on' : ''}" title="${state.router ? '요청 시 이 모델로 전환 (교체에 수 초)' : '서버에 올라간 모델'}">${esc(shortModel(m.id))}</button>`).join('');
    seg.style.display = list.length ? '' : 'none';
  }
  function shortModel(id) { const m = /(\d+(?:\.\d+)?B)/i.exec(id || ''); const fam = /kanana/i.test(id) ? 'Kanana' : /qwen/i.test(id) ? 'Qwen' : (id || '').slice(0, 8); return m ? `${fam} ${m[1].toUpperCase()}` : id; }

  function render() {
    renderStatus();
    $('launcher').classList.toggle('bar-only', state.collapsed);
    // 신호 뱃지 = 할 일 수. 지연이 있으면 urgent(빨강 하나 규칙: 헤더 지연 칩과 같은 의미)
    const act = state.mails.filter((m) => state.slots[m.id] && state.slots[m.id].actionItems.length && !state.snooze.has(m.id) && state.slots[m.id].category !== 'newsletter');
    const late = act.filter((m) => { const n = daysLeft(state.slots[m.id].deadline); return n != null && n < 0; });
    const badge = $('sigMailBadge'); badge.textContent = act.length; badge.className = 'sig-badge ' + (late.length ? 'urgent' : 'neutral'); $('sigMail').title = `할 일 ${act.length}건${late.length ? ` · 지연 ${late.length}` : ''}`;
    const ft = $('focustag'); ft.hidden = !state.query; if (state.query) $('focusText').textContent = state.query;
    const st = $('seltag'); const selOn = state.selected && state.selected.id !== state.selectedDismissed;
    st.hidden = !selOn; if (selOn) $('selText').textContent = state.selected.subject;
    orbState(); renderQueue(); renderBell();
    if (state.collapsed) return;
    const stream = $('stream');
    stream.innerHTML = '';
    if (state.view === 'summary' && state.current) renderSummary(stream);
    else if (state.view === 'report') renderReport(stream);
    else if (state.view === 'settings') renderSettings(stream);
    else if (state.view === 'notices') renderNotices(stream);
    else renderBrief(stream);
    renderArtifact();
  }

  function renderBrief(stream) {
    const q = state.query.trim().toLowerCase();
    const list = ordered().filter((m) => !q || `${m.subject} ${m.senderName} ${m.senderAddr} ${(state.slots[m.id] || {}).summary || ''}`.toLowerCase().includes(q));
    const done = list.filter((m) => state.slots[m.id]);
    const live = done.filter((m) => !state.snooze.has(m.id) && !isDone(m.id));
    const withAction = live.filter((m) => state.slots[m.id].actionItems.length && state.slots[m.id].category !== 'newsletter');
    const soon = live.filter((m) => { const n = daysLeft(state.slots[m.id].deadline); return n != null && n >= 0 && n <= 3; });
    const late = live.filter((m) => { const n = daysLeft(state.slots[m.id].deadline); return n != null && n < 0 && state.slots[m.id].actionItems.length; });
    const pendingN = list.length - done.length;

    // 헤더 + 카운트 (무채색, 임박 하나만 urgent)
    const head = el('div', 'head', `<h1>오늘 업무</h1>`);
    const counts = el('div', 'counts');
    counts.appendChild(el('button', 'cnt', `메일 <b>${list.length}</b>`));
    counts.appendChild(el('button', 'cnt', `할 일 <b>${withAction.length}</b>`));
    counts.appendChild(el('button', 'cnt', `임박 <b>${soon.length}</b>`));
    counts.appendChild(el('button', 'cnt' + (late.length ? ' urgent' : ''), `지연 <b>${late.length}</b>`));
    head.appendChild(counts);
    stream.appendChild(head);
    const chips = el('div', 'chips views');
    const [wh, wm] = (state.settings.wrapTime || '17:30').split(':').map(Number);
    const nowM = new Date().getHours() * 60 + new Date().getMinutes();
    const nearWrap = nowM >= wh * 60 + wm - 90;   // 마무리 90분 전부터 마무리 칩 강조
    const dr = state.settings.defaultReport || 'today';
    chips.innerHTML = `<button class="chip ${!nearWrap && dr === 'today' ? 'first' : ''}" data-act="report" data-period="today"><i class="ti ti-report"></i>오늘 리포트</button><button class="chip ${!nearWrap && dr === 'week' ? 'first' : ''}" data-act="report" data-period="week"><i class="ti ti-calendar-week"></i>이번 주 리포트</button><button class="chip ${nearWrap ? 'first' : ''}" data-act="report" data-period="wrap"><i class="ti ti-moon"></i>오늘 마무리</button>`;
    const doneToday = Object.entries(state.done).filter(([, at]) => String(at).slice(0, 10) === state.today).length;
    if (doneToday) chips.insertAdjacentHTML('beforeend', `<span class="doneline" style="margin-left:auto"><i class="ti ti-check"></i>오늘 완료 <b>${doneToday}</b></span>`);
    stream.appendChild(chips);

    if (!list.length) {
      const e = el('div', 'empty', q ? `“${esc(state.query)}” 에 맞는 메일이 없습니다<div class="chips"><button class="chip first" data-act="clear-query">검색 지우기</button></div>` : `표시할 메일이 없습니다<div class="chips"><button class="chip first" data-act="reload">받은 편지함 다시 읽기</button><button class="chip" data-act="sample">샘플로 보기</button></div>`);
      stream.appendChild(e);
      return;
    }

    // 추천 액션 1건
    const rec = recommended();
    if (rec) {
      const s = state.slots[rec.id], sn = sender(rec);
      const first = s.actionItems[0];
      const nd = daysLeft(s.deadline);
      const dl = s.deadline ? `<span class="num">· ${nd < 0 ? '지연 ' : ''}${dTag(s.deadline)} ${s.deadline.slice(5).replace('-', '/')}</span>` : `<span class="num">· ${/회신|답변|답장|reply/i.test(first.text) ? '회신 필요' : '할 일'}</span>`;
      const hero = el('div', 'hero');
      hero.innerHTML = `
        <div class="kick"><i class="ti ti-flag-2"></i>추천 액션${dl}</div>
        <h2>${esc(first.text)}</h2>
        <div class="src">${esc(sn.name)}${sn.team ? ' · ' + esc(sn.team) : ''} · ${esc(rec.subject)}</div>
        ${first.evidence ? `<div class="src">근거 · “${esc(first.evidence)}”</div>` : ''}
        <div class="acts">
          <button class="btn primary" data-act="draft" data-id="${esc(rec.id)}"><i class="ti ti-pencil"></i>답장 초안</button>
          <button class="btn" data-act="open" data-id="${esc(rec.id)}"><i class="ti ti-mail-opened"></i>메일 요약</button>
          <button class="btn ghost" data-act="done" data-id="${esc(rec.id)}"><i class="ti ti-check"></i>완료</button>
          <button class="btn ghost" data-act="snooze" data-id="${esc(rec.id)}">나중에</button>
        </div>`;
      stream.appendChild(hero);
    } else if (pendingN) {
      const hero = el('div', 'hero');
      hero.innerHTML = `<div class="kick" style="color:var(--acc)"><i class="ti ti-loader-2"></i>요약 중</div><h2 class="breathe">${pendingN}통을 읽고 있습니다</h2><div class="src">할 일과 기한을 뽑는 대로 위에 표시됩니다</div>`;
      stream.appendChild(hero);
    }

    // 다른 항목
    const others = list.filter((m) => !rec || m.id !== rec.id);
    const wrap = el('div');
    wrap.appendChild(el('div', 'sect', `${q ? '검색 · “' + esc(state.query) + '”' : '다른 항목'}<span class="line"></span><span class="n">${others.length}</span>`));
    const LIMIT = 6;
    const show = state.moreOpen ? others : others.slice(0, LIMIT);
    for (const m of show) wrap.appendChild(rowFor(m));
    if (!state.moreOpen && others.length > LIMIT) {
      const more = el('button', 'more', `+${others.length - LIMIT}건 더`);
      more.dataset.act = 'more';
      wrap.appendChild(more);
    }
    stream.appendChild(wrap);
    renderLog(stream);
  }

  // 작업 과정 공개(기본 접힘) — 실행과 1:1. 메일별 요약 시간·토큰
  function renderLog(stream) {
    const qn = state.queue.length + (state.queueRunning ? 1 : 0);
    if (!state.log.length && !qn) return;
    const tr = el('button', 'trace', `<i class="ti ${state.logOpen ? 'ti-chevron-down' : 'ti-chevron-right'}"></i>작업 로그 <span class="n">${state.log.length}</span>${qn ? ` · 대기열 <span class="n">${qn}</span>` : ''}`);
    tr.dataset.act = 'log';
    stream.appendChild(tr);
    if (!state.logOpen) return;
    const steps = el('div', 'steps');
    if (state.queueRunning) steps.appendChild(el('div', 'step', `<span class="dot" style="background:var(--acc)"></span><span class="t">${esc(state.queueRunning.label)}</span><span class="ag">${state.queueRunning.kind === 'draft' ? '초안' : '요약'} · 진행 중</span>`));
    for (const t of state.queue.slice(0, 10)) steps.appendChild(el('div', 'step', `<span class="dot"></span><span class="t">${esc(t.label)}</span><span class="ag">${t.kind === 'draft' ? '초안' : '요약'} · 대기</span>`));
    for (const l of state.log.slice().reverse().slice(0, 30)) {
      steps.appendChild(el('div', 'step done', `<span class="dot"></span><span class="t">${esc(l.subject)}</span><span class="ag">${shortModel(l.model)} · ${(l.ms / 1000).toFixed(1)}s · ${l.ptok}/${l.tok}tok</span>`));
    }
    stream.appendChild(steps);
  }

  // ------------------------------------------------------------ 리포트 --
  // 메일별 슬롯을 결정적으로 조합한다(모델 호출 없음). 근거·출처는 각 항목에서 메일 요약으로 이어진다.
  function reportData(period) {
    const horizon = period === 'week' ? 7 : 0;
    const rows = ordered().filter((m) => state.slots[m.id] && !state.snooze.has(m.id) && !isDone(m.id));
    // 광고·소식지·인증코드 메일은 리포트에서 뺀다(건수만 표시). 인증은 지나면 의미가 없고 자동 발송이 대부분이다.
    const skip = rows.filter((m) => ['newsletter', 'verification'].includes(state.slots[m.id].category));
    const live = rows.filter((m) => !['newsletter', 'verification'].includes(state.slots[m.id].category));
    const now = [], due = [], info = [];
    for (const m of live) {
      const s = state.slots[m.id]; const n = daysLeft(s.deadline);
      const hasAct = s.actionItems.length > 0;
      if (hasAct && n != null && n <= 0) now.push(m);                                 // 지연·오늘
      else if (hasAct && n != null && n <= horizon) now.push(m);                      // 기간 안 기한 (week)
      else if (hasAct && n == null && s.priority === 'high') now.push(m);             // 기한 없는 급한 할 일
      else if (hasAct && n != null && n <= 7) due.push(m);                            // 다가오는 기한
      else if (hasAct) due.push(m);                                                    // 기한 없는 할 일
      else info.push(m);                                                                // 확인만
    }
    return { now, due, info, skip };
  }
  function itemRow(m, cls) {
    const s = state.slots[m.id] || { actionItems: [], summary: '', deadline: null }, sn = sender(m);
    const first = s.actionItems.length ? s.actionItems[0].text : s.summary;
    const n = daysLeft(s.deadline);
    const tag = s.deadline ? `<span class="${n < 0 ? 'late' : 'mono'}">${n < 0 ? '지연 ' : ''}${dTag(s.deadline)} ${s.deadline.slice(5).replace('-', '/')}</span>` : '';
    const row = el('div', 'item ' + cls + (isDone(m.id) ? ' done' : '')); row.dataset.act = 'open'; row.dataset.id = m.id;
    row.innerHTML = `<span class="accent"></span><div class="txt"><div class="t">${esc(first)}</div><div class="m">${esc(sn.name)}${sn.team ? ' · ' + esc(sn.team) : ''} · <span class="mono">${P.shortWhen(P.parseReceived(m.received))}</span> · ${esc(m.subject)}</div></div>${tag ? `<span class="time">${tag}</span>` : ''}<span class="quick"><button data-act="done" data-id="${esc(m.id)}">${isDone(m.id) ? '완료 취소' : '완료'}</button></span>`;
    return row;
  }
  function renderReport(stream) {
    if (state.period === 'wrap') return renderWrap(stream);
    const period = state.period, r = reportData(period);
    const label = period === 'week' ? '이번 주 리포트' : '오늘 리포트';
    const back = el('button', 'back', `<i class="ti ti-chevron-left"></i>오늘 업무`); back.dataset.act = 'back'; stream.appendChild(back);
    stream.appendChild(el('div', 'ask', `<span class="who"><i class="ti ti-user"></i></span><span class="q">${label}</span>`));
    // 결론 먼저
    let lead;
    if (!r.now.length && !r.due.length) lead = `${period === 'week' ? '이번 주' : '오늘'} 조치할 것이 없습니다.` + (r.info.length ? ` 확인만 하면 되는 메일 <b>${r.info.length}건</b>입니다.` : '');
    else {
      const top = r.now[0] || r.due[0]; const ts = state.slots[top.id]; const tsn = sender(top);
      const nd = daysLeft(ts.deadline);
      lead = `${period === 'week' ? '이번 주' : '오늘'} 조치할 것 <b>${r.now.length}건</b>, 다가오는 기한 <b>${r.due.length}건</b>, 확인만 하면 되는 것 ${r.info.length}건입니다. 가장 급한 것은 <b>${esc(ts.actionItems.length ? ts.actionItems[0].text : top.subject)}</b>(${esc(tsn.name)}${ts.deadline ? ' · ' + (nd < 0 ? '지연 ' : '') + dTag(ts.deadline) : ''})입니다.`;
    }
    const wrap = el('div', 'report');
    wrap.appendChild(el('div', 'answer', lead));
    const sect = (title, arr, cls) => {
      if (!arr.length) return;
      const box = el('div');
      box.appendChild(el('div', 'sect', `${title}<span class="line"></span><span class="n">${arr.length}</span>`));
      for (const m of arr) box.appendChild(itemRow(m, cls + (daysLeft(state.slots[m.id].deadline) < 0 ? ' late' : '')));
      wrap.appendChild(box);
    };
    sect(period === 'week' ? '이번 주 해야 할 일' : '지금 해야 할 일', r.now, 'todo');
    sect('다가오는 기한 · 할 일', r.due, 'due');
    sect('확인만 하면 되는 것', r.info, 'info');
    if (r.skip.length) wrap.appendChild(el('div', 'foot-note', `광고·소식지·인증 메일 ${r.skip.length}건은 제외했습니다`));
    const acts = el('div', 'acts');
    acts.innerHTML = `<button class="btn" data-act="copy-report"><i class="ti ti-copy"></i>리포트 복사</button><button class="btn ghost" data-act="report" data-period="${period === 'week' ? 'today' : 'week'}">${period === 'week' ? '오늘 리포트' : '이번 주 리포트'}</button>`;
    wrap.appendChild(acts);
    stream.appendChild(wrap);
  }
  // 오늘 마무리 — 오늘 처리한 것 · 남은 것(지연·오늘) · 내일 기한 · 이번 주 남은 것
  function renderWrap(stream) {
    const back = el('button', 'back', `<i class="ti ti-chevron-left"></i>오늘 업무`); back.dataset.act = 'back'; stream.appendChild(back);
    stream.appendChild(el('div', 'ask', `<span class="who"><i class="ti ti-user"></i></span><span class="q">오늘 마무리</span>`));
    const doneToday = state.mails.filter((m) => state.slots[m.id] && state.done[m.id] && String(state.done[m.id]).slice(0, 10) === state.today);
    const r = reportData('today');
    const tomorrow = r.due.filter((m) => daysLeft(state.slots[m.id].deadline) === 1);
    const week = r.due.filter((m) => { const n = daysLeft(state.slots[m.id].deadline); return n != null && n >= 2 && n <= 7; });
    const open = r.due.filter((m) => !state.slots[m.id].deadline);          // 기한 없는 할 일
    const wrap = el('div', 'report');
    const left = r.now.length + tomorrow.length + week.length + open.length;
    let lead = `오늘 <b>${doneToday.length}건</b>을 처리했습니다.`;
    lead += left ? ` 남은 것 <b>${left}건</b>` : ' 남은 것은 없습니다.';
    if (r.now.length) lead += ` (지연·오늘 ${r.now.length})`;
    if (tomorrow.length) lead += `, 내일 기한 <b>${tomorrow.length}건</b>`;
    if (left) lead += '입니다.';
    const first = r.now[0] || tomorrow[0] || open[0] || week[0];
    if (first) { const ts = state.slots[first.id]; lead += ` 내일 아침 첫 일은 <b>${esc(ts.actionItems.length ? ts.actionItems[0].text : first.subject)}</b>(${esc(sender(first).name)})입니다.`; }
    wrap.appendChild(el('div', 'wrap-hero', lead));
    const sect = (title, arr, cls) => { if (!arr.length) return; const box = el('div'); box.appendChild(el('div', 'sect', `${title}<span class="line"></span><span class="n">${arr.length}</span>`)); for (const m of arr) box.appendChild(itemRow(m, cls)); wrap.appendChild(box); };
    if (doneToday.length) { const box = el('div'); box.appendChild(el('div', 'sect', `오늘 처리한 것<span class="line"></span><span class="n">${doneToday.length}</span>`)); for (const m of doneToday.slice(0, 5)) { const it = itemRow(m, 'info done'); box.appendChild(it); } wrap.appendChild(box); }
    sect('남은 것 · 지연·오늘', r.now, 'todo');
    sect('내일 기한', tomorrow, 'due');
    sect('이번 주 남은 것', week, 'due');
    sect('기한 없는 할 일', open, 'info');
    const acts = el('div', 'acts');
    acts.innerHTML = `<button class="btn" data-act="copy-report"><i class="ti ti-copy"></i>리포트 복사</button><button class="btn ghost" data-act="report" data-period="today">오늘 리포트</button>`;
    wrap.appendChild(acts);
    stream.appendChild(wrap);
  }
  function reportText() {
    if (state.period === 'wrap') {
      const doneToday = state.mails.filter((m) => state.slots[m.id] && state.done[m.id] && String(state.done[m.id]).slice(0, 10) === state.today);
      const r = reportData('today'); const lines = [`[오늘 마무리] ${state.today}`, `처리 ${doneToday.length}건 · 남은 것 ${r.now.length}건`];
      for (const m of r.now) { const s = state.slots[m.id]; lines.push(`- ${s.actionItems.length ? s.actionItems[0].text : s.summary}${s.deadline ? ` [${dTag(s.deadline)}]` : ''} — ${sender(m).name} · ${m.subject}`); }
      return lines.join('\n');
    }
    const r = reportData(state.period), lines = [];
    lines.push(`[${state.period === 'week' ? '이번 주' : '오늘'} 리포트] ${state.today} · 로컬 SLM ${shortModel(state.model)}`);
    const put = (title, arr) => { if (!arr.length) return; lines.push('', `■ ${title} (${arr.length})`); for (const m of arr) { const s = state.slots[m.id], sn = sender(m); lines.push(`- ${s.actionItems.length ? s.actionItems[0].text : s.summary}${s.deadline ? ` [${dTag(s.deadline)} ${s.deadline}]` : ''} — ${sn.name} · ${m.subject}`); } };
    put(state.period === 'week' ? '이번 주 해야 할 일' : '지금 해야 할 일', r.now); put('다가오는 기한 · 할 일', r.due); put('확인만 하면 되는 것', r.info);
    if (r.skip.length) lines.push('', `(광고·소식지·인증 메일 ${r.skip.length}건 제외)`);
    return lines.join('\n');
  }

  function rowFor(m) {
    const s = state.slots[m.id], sn = sender(m);
    const when = P.shortWhen(P.parseReceived(m.received));
    const row = el('div', 'row' + (s ? '' : ' pending') + (isDone(m.id) ? ' done' : ''));
    row.dataset.act = 'open'; row.dataset.id = m.id;
    let meta, tags = '';
    if (s) {
      meta = `${esc(sn.name)} · <span class="mono">${when}</span> · ${esc(s.summary || '')}`;
      if (isDone(m.id)) tags += `<span class="tag" style="color:var(--pf);border-color:var(--rule)">완료</span>`;
      else if (state.snooze.has(m.id)) tags += `<span class="tag" style="color:var(--pf);border-color:var(--rule)">나중에</span>`;
      else {
        if (s.actionItems.length) tags += `<span class="tag reply">할 일 ${s.actionItems.length}</span>`;
        if (s.deadline) tags += `<span class="tag" style="color:var(--pm);border-color:var(--rule);font-family:var(--font-mono)">${dTag(s.deadline)}</span>`;
      }
    } else {
      meta = `${esc(sn.name)} · <span class="mono">${when}</span> · <span class="${state.pending[m.id] ? 'breathe' : ''}">${state.pending[m.id] ? '요약 중…' : '대기'}</span>`;
    }
    const quick = s ? `<span class="quick"><button data-act="done" data-id="${esc(m.id)}" title="완료로 표시">${isDone(m.id) ? '완료 취소' : '완료'}</button><button data-act="snooze" data-id="${esc(m.id)}">${state.snooze.has(m.id) ? '나중에 취소' : '나중에'}</button></span>` : '';
    row.innerHTML = `<div class="txt"><div class="t">${esc(m.subject)}</div><div class="m">${meta}</div></div><div class="tagwrap">${tags}${quick}</div>`;
    return row;
  }

  function renderSummary(stream) {
    const m = state.mails.find((x) => x.id === state.current);
    if (!m) { state.view = 'brief'; return renderBrief(stream); }
    const s = state.slots[m.id], sn = sender(m);
    const back = el('button', 'back', `<i class="ti ti-chevron-left"></i>오늘 업무`);
    back.dataset.act = 'back';
    stream.appendChild(back);

    const card = el('div', 'hero');
    if (!s) {
      card.innerHTML = `<div class="kick" style="color:var(--acc)"><i class="ti ti-mail"></i>메일 요약</div>
        <div class="mtitle">${esc(m.subject)}</div>
        <div class="mmeta"><span><i class="ti ti-user"></i>${esc(sn.name)}${sn.team ? ' · ' + esc(sn.team) : ''}</span><span class="mono">${P.shortWhen(P.parseReceived(m.received))}</span></div>
        <ul class="points"><li class="breathe">요약 중입니다</li></ul>`;
      stream.appendChild(card);
      return;
    }
    // 요점: 조치가 있으면 먼저(최대 2) → 핵심 한 문장. 3개 이내.
    const points = [];
    for (const a of s.actionItems.slice(0, 2)) points.push({ t: a.text, ev: a.evidence });
    if (s.summary) points.push({ t: s.summary, ev: '' });
    if (!points.length) points.push({ t: '조치 요청이 없는 공지입니다', ev: '' });
    const n = daysLeft(s.deadline);
    const dueCls = n == null ? '' : n <= 0 ? 'urgent' : n <= 3 ? 'warn' : '';
    const due = s.deadline ? `<span class="due ${dueCls}" title="${s.deadlineEvidence ? esc(s.deadlineEvidence) : ''}"><i class="ti ti-clock"></i>기한 <span class="mono">${s.deadline.slice(5)}</span> · <span class="mono">${dTag(s.deadline)}</span>${s.deadlineSource === 'slm' ? ' <span class="mono" title="코드 추출 후보가 없어 모델 값(근거 검증 통과)을 썼습니다">·모델</span>' : ''}</span>` : '';
    card.innerHTML = `
      <div class="kick" style="color:var(--acc)"><i class="ti ti-mail"></i>메일 요약</div>
      <div class="mtitle">${esc(m.subject)}</div>
      <div class="mmeta">
        <span><i class="ti ti-user"></i>${esc(sn.name)}${sn.team ? ' · ' + esc(sn.team) : ''}</span>
        <span class="mono">${P.shortWhen(P.parseReceived(m.received))}</span>
        ${due}
      </div>
      <ul class="points">${points.map((p) => `<li>${esc(p.t)}${p.ev ? `<span class="ev" title="${esc(p.ev)}">“${esc(p.ev)}”</span>` : ''}</li>`).join('')}</ul>
      <div class="acts">
        <button class="btn primary" data-act="draft" data-id="${esc(m.id)}"><i class="ti ti-pencil"></i>답장 초안</button>
        <button class="btn" data-act="full" data-id="${esc(m.id)}"><i class="ti ti-mail-opened"></i>원문 열기</button>
        <button class="btn ghost" data-act="done" data-id="${esc(m.id)}"><i class="ti ti-check"></i>${isDone(m.id) ? '완료 취소' : '완료'}</button>
        <button class="btn ghost" data-act="snooze" data-id="${esc(m.id)}">${state.snooze.has(m.id) ? '나중에 취소' : '나중에'}</button>
        <span class="timing" style="margin-left:auto">${s.byRule ? `규칙 분류(${esc(s.timing.rule)}) · 모델 미호출` : s.timing && s.timing.totalMs ? `${fmtSec(s.timing.totalMs)} · 입력 ${s.timing.promptTokens} · 출력 ${s.timing.tokens}` : 'cached'}</span>
      </div>`;
    stream.appendChild(card);

    const tr = el('button', 'trace', `<i class="ti ${state.showExcerpt ? 'ti-chevron-down' : 'ti-chevron-right'}"></i>원문 발췌`);
    tr.dataset.act = 'excerpt';
    stream.appendChild(tr);
    if (state.showFull) stream.appendChild(el('div', 'excerpt full', esc(s.cleanedBody)));
    else if (state.showExcerpt) stream.appendChild(el('div', 'excerpt', esc(excerptOf(s.cleanedBody, 3))));

    if (state.draft && state.draft.mailId === m.id && !state.draft.busy) {
      const ap = el('div', 'approval');
      ap.innerHTML = `
        <div class="ahead"><i class="ti ti-shield-check"></i>발송 전 확인</div>
        <div class="target">받는 사람 · ${esc(sn.name)} &lt;${esc(m.senderAddr)}&gt;</div>
        <div class="prev">${esc(state.draft.body)}</div>
        <div class="ameta"><i class="ti ti-alert-triangle"></i>발송은 메일 앱에서 직접 합니다 · 보낸 뒤에는 되돌릴 수 없음</div>
        <div class="aacts"><button class="btn ghost" data-act="draft-close">거부</button><button class="btn primary" data-act="mailto"><i class="ti ti-send"></i>메일 앱에서 열기</button></div>`;
      stream.appendChild(ap);
    }
  }

  // ---- 설정(최소): 모델 · 마무리 시각 · 알림 · 기본 리포트 · 캐시
  function renderSettings(stream) {
    const back = el('button', 'back', `<i class="ti ti-chevron-left"></i>오늘 업무`); back.dataset.act = 'back'; stream.appendChild(back);
    stream.appendChild(el('div', 'head', `<h1>설정</h1>`));
    const box = el('div', 'settings');
    const models = state.models.length ? state.models : (state.model ? [{ id: state.model }] : []);
    box.innerHTML = `
      <div class="fld"><label>MODEL</label><div class="opts">${models.map((m) => `<button class="opt ${m.id === state.model ? 'on' : ''}" data-set="model" data-v="${esc(m.id)}">${esc(shortModel(m.id))}</button>`).join('') || '<span class="note">서버 연결 없음</span>'}</div><div class="note">4B 가 정확하고, 2B 는 2배 빠릅니다. 결과 캐시는 모델별로 따로 둡니다.</div></div>
      <div class="fld"><label>오늘 마무리 알림</label><input type="time" id="setWrap" value="${esc(state.settings.wrapTime)}"><span class="note" style="margin-left:8px">이 시각 이후 한 번, 남은 것·내일 기한을 말풍선으로</span></div>
      <div class="fld"><label>알림</label><div class="opts"><button class="opt ${state.settings.notify !== false ? 'on' : ''}" data-set="notify" data-v="1">말풍선 켬</button><button class="opt ${state.settings.notify === false ? 'on' : ''}" data-set="notify" data-v="0">끔 (알림함에만 쌓임)</button></div></div>
      <div class="fld"><label>주간 리포트</label><div class="opts"><button class="opt ${state.settings.weekly !== false ? 'on' : ''}" data-set="weekly" data-v="1">월요일 아침 알림</button><button class="opt ${state.settings.weekly === false ? 'on' : ''}" data-set="weekly" data-v="0">끔</button></div></div>
      <div class="fld"><label>기본 리포트 칩</label><div class="opts"><button class="opt ${state.settings.defaultReport === 'today' ? 'on' : ''}" data-set="defaultReport" data-v="today">오늘</button><button class="opt ${state.settings.defaultReport === 'week' ? 'on' : ''}" data-set="defaultReport" data-v="week">이번 주</button></div></div>
      <div class="fld"><label>데이터</label><div class="opts"><button class="opt" data-set="clear-cache">요약 캐시 비우기</button><button class="opt" data-set="clear-done">완료·나중에 초기화</button><button class="opt" data-set="clear-notices">알림 이력 비우기</button></div><div class="note">전부 이 브라우저 안에만 저장됩니다(메일은 PC 밖으로 나가지 않음).</div></div>
      <div class="fld"><label>서버</label><div class="note">${esc(BASE || location.origin)} · ${state.router ? '라우터 모드(모델 전환 가능)' : '단일 모델'} · 요약 ${state.log.length}통 · 평균 ${(avgMs() / 1000).toFixed(1)}s</div></div>`;
    stream.appendChild(box);
    box.querySelector('#setWrap').addEventListener('change', (e) => { state.settings.wrapTime = e.target.value || '17:30'; saveSettings(); });
  }
  function renderNotices(stream) {
    const back = el('button', 'back', `<i class="ti ti-chevron-left"></i>오늘 업무`); back.dataset.act = 'back'; stream.appendChild(back);
    stream.appendChild(el('div', 'head', `<h1>알림</h1><div class="counts"><span class="cnt" style="cursor:default">전체 <b>${state.notices.length}</b></span></div>`));
    if (!state.notices.length) { stream.appendChild(el('div', 'empty', '아직 알림이 없습니다. 새 메일이 정리되거나 마무리 시각이 되면 여기에 쌓입니다.')); return; }
    const wrap = el('div', 'stack');
    for (const [i, n] of state.notices.entries()) {
      const d = new Date(n.at);
      const row = el('div', 'notice' + (n.read ? '' : ' unread')); row.dataset.act = 'notice'; row.dataset.i = i;
      row.innerHTML = `<span class="ic"><i class="ti ti-${esc(n.icon)}"></i></span><div class="txt"><div class="t">${esc(n.title)}</div><div class="m">${esc(n.msg)}</div></div><span class="when">${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}</span>`;
      wrap.appendChild(row);
    }
    stream.appendChild(wrap);
    state.notices.forEach((n) => { n.read = true; }); saveNotices();
  }
  const pad2 = (n) => String(n).padStart(2, '0');

  function renderArtifact() {
    const art = $('artifact'), launcher = $('launcher');
    if (!state.draft) { art.hidden = true; launcher.classList.remove('wide'); return; }
    const m = state.mails.find((x) => x.id === state.draft.mailId), sn = sender(m);
    art.hidden = false; launcher.classList.add('wide');
    art.innerHTML = `
      <div class="ahd"><i class="ti ti-pencil"></i>답장 초안<button class="x" data-act="draft-close" aria-label="닫기"><i class="ti ti-x"></i></button></div>
      <div class="abody">
        <div class="fld"><label>TO</label><div class="v">${esc(sn.name)} &lt;${esc(m.senderAddr)}&gt;</div></div>
        <div class="fld"><label>SUBJECT</label><div class="v">${esc(state.draft.subject)}</div></div>
        <div class="fld"><label>BODY</label>${state.draft.busy ? `<div class="v breathe">초안을 쓰고 있습니다</div>` : `<textarea id="draftBody">${esc(state.draft.body)}</textarea>`}</div>
        <div class="hint"><i class="ti ti-shield-check"></i>보내기 전에 아래 승인 카드에서 확인합니다</div>
      </div>
      <div class="afoot">
        <button class="btn ghost" data-act="draft-close">닫기</button>
        <button class="btn" data-act="copy" ${state.draft.busy ? 'disabled' : ''}><i class="ti ti-copy"></i>복사</button>
        <button class="btn primary" data-act="mailto" ${state.draft.busy ? 'disabled' : ''}><i class="ti ti-send"></i>메일 앱에서 열기</button>
      </div>`;
    const ta = art.querySelector('#draftBody');
    if (ta) ta.addEventListener('input', () => { state.draft.body = ta.value; const prev = document.querySelector('.approval .prev'); if (prev) prev.textContent = ta.value; });
  }

  // ------------------------------------------------------------- 동작 --
  async function loadMails() {
    const url = state.source === 'sample' ? 'data/sample.json' : 'data/inbox.json';
    try {
      const r = await fetch(url + '?t=' + Date.now());
      if (!r.ok) throw new Error(r.status);
      const raw = await r.json();
      state.mails = raw.map(normalize);
    } catch (e) {
      state.mails = [];
    }
    state.slots = {}; state.pending = {}; state.knownIds = new Set(state.mails.map((m) => m.id));
    render();
    await extractAll();
  }

  // ---- 대기열: 모델이 필요한 일(요약·초안)은 전부 한 줄로 서서 하나씩 처리한다 (VDI 에서 동시 호출 금지, 진행 상황은 UI 로 정직하게)
  function avgMs() { const d = state.log.filter((l) => l.model === state.model); return d.length ? d.reduce((a, l) => a + l.ms, 0) / d.length : 15000; }
  function queueAdd(task, front) {
    if (state.queue.some((t) => t.key === task.key) || (state.queueRunning && state.queueRunning.key === task.key)) return false;
    if (front) state.queue.unshift(task); else state.queue.push(task);
    return true;
  }
  function queueClear(kind) { state.queue = state.queue.filter((t) => t.kind !== kind); }
  function renderQueue() {
    const chip = $('queueChip'); if (!chip) return;
    const n = state.queue.length + (state.queueRunning ? 1 : 0);
    chip.hidden = n === 0;
    if (n) {
      const eta = Math.round((state.queue.length * avgMs() + (state.queueRunning ? avgMs() / 2 : 0)) / 1000);
      $('queueText').textContent = state.queueRunning ? `${state.queueRunning.kind === 'draft' ? '초안' : '요약'} 중 · 대기 ${state.queue.length} · 약 ${eta}s` : `대기 ${n}`;
    }
  }
  let pumping = false;
  async function pumpQueue() {
    if (pumping) return; pumping = true;
    try {
      while (state.queue.length) {
        if (!state.online) { const h = await P.health(BASE); state.online = !!(h && h.ok); if (!state.online) break; }
        const t = state.queue.shift(); state.queueRunning = t; renderQueue(); orbState();
        try { await t.run(); } catch (e) { console.warn('queue task failed', t.key, e); }
        state.queueRunning = null; renderQueue(); render();
      }
    } finally { pumping = false; renderQueue(); orbState(); }
  }
  // 요약 작업 등록: 캐시에 있으면 즉시, 없으면 대기열. force 면 캐시 무시(다시 요약).
  function extractAll(force, only) {
    if (force) queueClear('summary');
    const list = only ? only : ordered();
    for (const m of list) {
      if (state.pending[m.id]) continue;
      if (!force && state.slots[m.id]) continue;
      if (!force) { const c = P.cache.get(m, state.model); if (c) { state.slots[m.id] = c; continue; } }
      const model = state.model;
      queueAdd({ key: `summary|${model}|${m.id}`, kind: 'summary', mailId: m.id, label: m.subject, run: async () => {
        if (state.model !== model) return;               // 그 사이 모델이 바뀜 → 새 루프가 다시 등록
        state.pending[m.id] = true; render();
        try {
          const s = await P.extract(m, { base: BASE, model, today: state.today });
          state.slots[m.id] = s; P.cache.set(m, model, s);
          if (!s.byRule) state.log.push({ subject: m.subject, model, ms: s.timing.totalMs || 0, ptok: s.timing.promptTokens || 0, tok: s.timing.tokens || 0, at: Date.now() });
        } catch (e) {
          state.slots[m.id] = { summary: '요약하지 못했습니다 · ' + e.message, actionItems: [], deadline: null, priority: 'low', category: 'other', cleanedBody: P.cleanBody(m.body), timing: {} };
        }
        delete state.pending[m.id];
      } });
    }
    render(); renderQueue();
    pumpQueue();
  }

  // 자동 새로고침: -Panel -Watch(또는 --panel --watch) 가 주기적으로 다시 내보낸 inbox.json 에서 새 메일만 골라 요약한다
  async function pollInbox() {
    if (state.source !== 'inbox') return;
    try {
      const r = await fetch('data/inbox.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const raw = (await r.json()).map(normalize);
      if (!state.knownIds) { state.knownIds = new Set(state.mails.map((m) => m.id)); }
      const fresh = raw.filter((m) => !state.knownIds.has(m.id));
      if (!fresh.length) return;
      fresh.forEach((m) => state.knownIds.add(m.id));
      state.mails = raw.concat(state.mails.filter((m) => !raw.some((x) => x.id === m.id)));
      if (orb) orb.flash('mail', 8000, 'idle');
      toast('mail', `새 메일 ${fresh.length}통`, fresh[0].subject, 6000);
      render();
      extractAll(false, fresh);   // 새 메일만 대기열에
      // 요약이 끝나면 할 일 알림 (대기열이 비는 시점에 확인)
      const waitDone = setInterval(() => {
        if (fresh.some((m) => state.pending[m.id] || state.queue.some((t) => t.mailId === m.id))) return;
        clearInterval(waitDone);
        const withAct = fresh.filter((m) => state.slots[m.id] && state.slots[m.id].actionItems.length && !['newsletter', 'verification'].includes(state.slots[m.id].category));
        if (withAct.length) { toast('flag-2', `할 일 ${withAct.length}건 정리됨`, state.slots[withAct[0].id].actionItems[0].text, 6000); if (orb) orb.flash('bell', 4000, 'idle'); }
      }, 2000);
    } catch (e) { /* 파일이 없거나 쓰는 중이면 다음 주기에 */ }
  }

  // 답장 초안: 사용자가 직접 요청한 일이라 대기열 맨 앞에 선다
  function startDraft(id) {
    const m = state.mails.find((x) => x.id === id); if (!m) return;
    state.view = 'summary'; state.current = id;
    state.draft = { mailId: id, subject: '', body: '', busy: true }; render(); orbState();
    queueAdd({ key: `draft|${id}`, kind: 'draft', mailId: id, label: m.subject, run: async () => {
      try {
        const d = await P.draftReply(m, state.slots[id], { base: BASE, model: state.model });
        if (state.draft && state.draft.mailId === id) state.draft = { mailId: id, subject: d.subject, body: d.body, busy: false };
      } catch (e) {
        if (state.draft && state.draft.mailId === id) state.draft = { mailId: id, subject: 'RE: ' + m.subject, body: '(초안을 만들지 못했습니다 · ' + e.message + ')', busy: false };
      }
    } }, true);
    renderQueue(); pumpQueue();
  }

  function openMailto() {
    const m = state.mails.find((x) => x.id === state.draft.mailId);
    const href = `mailto:${encodeURIComponent(m.senderAddr)}?subject=${encodeURIComponent(state.draft.subject)}&body=${encodeURIComponent(state.draft.body)}`;
    window.open(href, '_self');
  }

  document.addEventListener('click', async (ev) => {
    const so = ev.target.closest('[data-set]');
    if (so) {
      const k = so.dataset.set, v = so.dataset.v;
      if (k === 'model') { if (v !== state.model) { state.model = v; localStorage.setItem('slm-model', v); state.slots = {}; extractAll(); } }
      else if (k === 'notify' || k === 'weekly') { state.settings[k] = v === '1'; saveSettings(); }
      else if (k === 'defaultReport') { state.settings.defaultReport = v; saveSettings(); }
      else if (k === 'clear-cache') { P.cache.clear(); state.slots = {}; extractAll(); toast('trash', '요약 캐시 비움', '필요한 것만 다시 요약합니다'); }
      else if (k === 'clear-done') { state.done = {}; saveDone(); state.snooze = new Set(); saveSnooze(); }
      else if (k === 'clear-notices') { state.notices = []; saveNotices(); }
      render(); return;
    }
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act, id = b.dataset.id;
    switch (act) {
      case 'open': state.view = 'summary'; state.current = id; state.showFull = false; state.showExcerpt = false; break;
      case 'back': state.view = 'brief'; state.draft = null; break;
      case 'more': state.moreOpen = true; break;
      case 'excerpt': state.showExcerpt = !state.showExcerpt; state.showFull = false; break;
      case 'full': state.showFull = !state.showFull; state.showExcerpt = false; break;
      case 'snooze': if (state.snooze.has(id)) state.snooze.delete(id); else state.snooze.add(id); saveSnooze(); if (state.view === 'brief') state.draft = null; break;
      case 'draft': await startDraft(id); return;
      case 'draft-close': state.draft = null; break;
      case 'copy': try { await navigator.clipboard.writeText(state.draft.body); b.innerHTML = '<i class="ti ti-check"></i>복사됨'; } catch (e) {} return;
      case 'mailto': openMailto(); return;
      case 'clear-query': state.query = ''; break;
      case 'settings': state.view = 'settings'; break;
      case 'notices': state.view = 'notices'; break;
      case 'notice': { const n = state.notices[+b.dataset.i]; if (n) { n.read = true; saveNotices(); if (n.go === 'wrap') { state.view = 'report'; state.period = 'wrap'; } else if (n.go === 'week') { state.view = 'report'; state.period = 'week'; } else state.view = 'brief'; } break; }
      case 'done': if (isDone(id)) delete state.done[id]; else { state.done[id] = new Date().toISOString(); if (orb) orb.flash('check', 1500, 'idle'); } saveDone(); break;
      case 'report': state.view = 'report'; state.period = b.dataset.period || 'today'; state.draft = null; break;
      case 'log': state.logOpen = !state.logOpen; break;
      case 'copy-report': try { await navigator.clipboard.writeText(reportText()); b.innerHTML = '<i class="ti ti-check"></i>복사됨'; } catch (e) {} return;
      case 'reload': state.source = 'inbox'; syncSeg(); await loadMails(); return;
      case 'sample': state.source = 'sample'; syncSeg(); await loadMails(); return;
    }
    render();
  });

  function syncSeg() {
    document.querySelectorAll('[data-src-btn]').forEach((x) => x.classList.toggle('on', x.dataset.srcBtn === state.source));
    document.querySelectorAll('[data-mode-btn]').forEach((x) => x.classList.toggle('on', x.dataset.modeBtn === state.mode));
    $('kit').dataset.mode = state.mode; $('stage').dataset.mode = state.mode;
    document.documentElement.dataset.theme = state.mode === 'light' ? 'day' : '';
  }
  document.querySelectorAll('[data-mode-btn]').forEach((x) => x.addEventListener('click', () => { state.mode = x.dataset.modeBtn; localStorage.setItem('slm-mode', state.mode); syncSeg(); }));
  document.querySelectorAll('[data-src-btn]').forEach((x) => x.addEventListener('click', async () => { state.source = x.dataset.srcBtn; syncSeg(); await loadMails(); }));
  $('btnRefresh').addEventListener('click', async () => { state.slots = {}; render(); await extractAll(true); });
  $('btnExport').addEventListener('click', () => {
    // 평가용: eval/score.py 가 읽는 형식. 본문은 넣지 않는다(라벨 파일에 필요하면 inbox.json 을 옆에 둔다)
    const rows = state.mails.map((m) => ({ id: m.id, subject: m.subject, sender: m.senderName, received: m.received, result: state.slots[m.id] ? {
      summary: state.slots[m.id].summary, action_items: state.slots[m.id].actionItems.map((a) => a.text), deadline: state.slots[m.id].deadline,
      deadline_source: state.slots[m.id].deadlineSource, priority: state.slots[m.id].priority, category: state.slots[m.id].category, timing: state.slots[m.id].timing } : null }));
    const blob = new Blob([JSON.stringify({ model: state.model, prompt_version: P.PROMPT_VERSION, today: state.today, exported: new Date().toISOString(), rows }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `results-${shortModel(state.model).replace(/\s+/g, '')}-${state.today}.json`; a.click(); URL.revokeObjectURL(a.href);
  });
  $('modelSeg').addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-model-btn]'); if (!b || b.dataset.modelBtn === state.model) return;
    state.model = b.dataset.modelBtn; localStorage.setItem('slm-model', state.model);
    state.slots = {}; state.pending = {}; render();
    await extractAll();   // 캐시는 모델별이라 없는 것만 새로 요약 (라우터가 모델을 교체)
  });

  // ---- 명령 팔레트(⌘K 스타일): 타이핑하면 명령 후보 + 캐시된 메일 즉시 검색. 자유 질문은 받지 않는다.
  function commandList() {
    const cmds = [];
    if (state.selected && state.selected.id !== state.selectedDismissed) {
      const sid = state.selected.id;
      cmds.push({ id: 'sel-sum', label: '이 메일 요약', hint: state.selected.subject.slice(0, 40), icon: 'ti-pin', run: () => { state.view = 'summary'; state.current = sid; } });
      cmds.push({ id: 'sel-draft', label: '이 메일 답장 초안', hint: '대기열 맨 앞 · 승인 후 발송', icon: 'ti-pencil', run: () => { startDraft(sid); } });
    }
    cmds.push(
      { id: 'report-today', label: '오늘 리포트', hint: '지금 해야 할 일 · 다가오는 기한', icon: 'ti-report', run: () => { state.view = 'report'; state.period = 'today'; } },
      { id: 'report-week', label: '이번 주 리포트', hint: '이번 주 해야 할 일', icon: 'ti-calendar-week', run: () => { state.view = 'report'; state.period = 'week'; } },
      { id: 'report-wrap', label: '오늘 마무리', hint: '처리한 것 · 남은 것 · 내일 기한', icon: 'ti-moon', run: () => { state.view = 'report'; state.period = 'wrap'; } },
      { id: 'brief', label: '오늘 업무', hint: '처음 화면', icon: 'ti-home', run: () => { state.view = 'brief'; state.query = ''; } },
      { id: 'refresh', label: '다시 요약', hint: '캐시 무시 · 시간이 걸립니다', icon: 'ti-refresh', run: () => { state.slots = {}; extractAll(true); } },
      { id: 'export', label: '결과 내보내기', hint: 'JSON 저장 (평가용)', icon: 'ti-download', run: () => { $('btnExport').click(); } },
      { id: 'collapse', label: '접기', hint: '알약으로', icon: 'ti-minus', run: () => { state.collapsed = true; } },
      { id: 'notices', label: '알림', hint: '지난 알림 보기', icon: 'ti-bell', run: () => { state.view = 'notices'; } },
      { id: 'settings', label: '설정', hint: '모델 · 마무리 시각 · 알림 · 캐시', icon: 'ti-settings', run: () => { state.view = 'settings'; } },
    );
    for (const m of state.models) if (m.id !== state.model) cmds.push({ id: 'model|' + m.id, label: `${shortModel(m.id)}로 전환`, hint: '요약 모델 바꾸기 (교체 시간 몇 초)', icon: 'ti-cpu', run: () => { state.model = m.id; localStorage.setItem('slm-model', state.model); state.slots = {}; extractAll(); } });
    return cmds;
  }
  function searchMails(q) {
    const ql = q.toLowerCase(); if (!ql) return [];
    const hits = [];
    for (const m of state.mails) {
      const s = state.slots[m.id] || {};
      const hay = [m.subject, m.senderName, s.summary || '', ...(s.actionItems || []).map((a) => a.text)];
      const idx = hay.findIndex((h) => (h || '').toLowerCase().includes(ql));
      if (idx >= 0) hits.push({ mail: m, where: idx === 0 ? '' : idx === 1 ? '' : hay[idx] });
      if (hits.length >= 6) break;
    }
    return hits;
  }
  const hl = (text, q) => { const t = esc(text); if (!q) return t; const i = t.toLowerCase().indexOf(esc(q).toLowerCase()); return i < 0 ? t : t.slice(0, i) + '<mark>' + t.slice(i, i + q.length) + '</mark>' + t.slice(i + q.length); };
  function renderPalette() {
    const pal = $('palette'); const q = $('cmd').value.trim();
    if (!state.palette.open) { pal.hidden = true; return; }
    const cmds = commandList().filter((c) => !q || c.label.toLowerCase().includes(q.toLowerCase()) || (c.hint || '').includes(q)).slice(0, q ? 5 : (state.selected && state.selected.id !== state.selectedDismissed ? 5 : 4));
    const mails = q.length >= 1 ? searchMails(q) : [];
    const items = [...cmds.map((c) => ({ type: 'cmd', c })), ...mails.map((h) => ({ type: 'mail', h }))];
    if (q && !cmds.length) items.push({ type: 'search', q });
    state.palette.items = items; if (state.palette.sel >= items.length) state.palette.sel = 0;
    let html = '';
    if (cmds.length) html += `<div class="psec">명령</div>` + cmds.map((c, i) => `<div class="pitem ${state.palette.sel === i ? 'sel' : ''}" data-pi="${i}"><i class="ti ${c.icon}"></i><span class="t">${hl(c.label, q)}</span><span class="m">${esc(c.hint)}</span>${i === state.palette.sel ? '<span class="k">↵</span>' : ''}</div>`).join('');
    if (mails.length) html += `<div class="psec">메일 · 즉시</div>` + mails.map((h, j) => { const i = cmds.length + j; const s = state.slots[h.mail.id]; return `<div class="pitem ${state.palette.sel === i ? 'sel' : ''}" data-pi="${i}"><i class="ti ti-mail"></i><span class="t">${hl(h.mail.subject, q)}</span><span class="m">${esc(sender(h.mail).name)}${s && s.actionItems.length ? ' · 할 일 ' + s.actionItems.length : ''}${s && s.deadline ? ' · ' + dTag(s.deadline) : ''}</span></div>`; }).join('');
    if (q && !cmds.length) html += `<div class="pitem ${state.palette.sel === items.length - 1 ? 'sel' : ''}" data-pi="${items.length - 1}"><i class="ti ti-search"></i><span class="t">“${esc(q)}” 로 목록 걸러 보기</span><span class="k">↵</span></div>`;
    if (!items.length) html = `<div class="pempty">할 수 있는 일: 오늘 리포트 · 이번 주 · 오늘 마무리 · 메일 검색 · 모델 전환</div>`;
    pal.innerHTML = html; pal.hidden = false;
  }
  function paletteRun(i) {
    const it = state.palette.items[i]; if (!it) return;
    $('cmd').value = ''; state.palette.open = false; renderPalette();
    if (it.type === 'cmd') { it.c.run(); state.collapsed = state.collapsed && it.c.id === 'collapse'; render(); return; }
    if (it.type === 'mail') { state.view = 'summary'; state.current = it.h.mail.id; state.showFull = false; state.showExcerpt = false; state.collapsed = false; render(); return; }
    if (it.type === 'search') { state.query = it.q; state.view = 'brief'; state.collapsed = false; render(); }
  }
  $('cmd').addEventListener('focus', () => { state.palette.open = true; state.palette.sel = 0; renderPalette(); });
  $('cmd').addEventListener('input', () => { state.palette.open = true; state.palette.sel = 0; renderPalette(); });
  $('cmd').addEventListener('blur', () => { setTimeout(() => { state.palette.open = false; renderPalette(); }, 150); });
  $('cmd').addEventListener('keydown', (e) => {
    if (!state.palette.open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); state.palette.sel = Math.min(state.palette.items.length - 1, state.palette.sel + 1); renderPalette(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); state.palette.sel = Math.max(0, state.palette.sel - 1); renderPalette(); }
    else if (e.key === 'Escape') { e.preventDefault(); if ($('cmd').value) { $('cmd').value = ''; renderPalette(); } else { $('cmd').blur(); } }
  });
  $('palette').addEventListener('mousedown', (e) => { const it = e.target.closest('[data-pi]'); if (it) { e.preventDefault(); paletteRun(+it.dataset.pi); } });

  // 컴포저: 되는 명령만. 자연어 해석은 하지 않는다(소형 모델로 흔들리는 길은 열지 않는다)
  function runCommand(text) {
    const t = text.trim(); if (!t) return;
    const lower = t.toLowerCase();
    if (/^(오늘|투데이)(\s*리포트)?$|^리포트$/.test(t)) { state.view = 'report'; state.period = 'today'; }
    else if (/^(이번\s*주|주간)(\s*리포트)?$/.test(t)) { state.view = 'report'; state.period = 'week'; }
    else if (/^(오늘\s*)?마무리$|^퇴근$/.test(t)) { state.view = 'report'; state.period = 'wrap'; }
    else if (/^(설정|세팅|settings?)$/i.test(t)) { state.view = 'settings'; }
    else if (/^(알림|알림함)$/.test(t)) { state.view = 'notices'; }
    else if (/^(오늘\s*업무|처음|홈)$/.test(t)) { state.view = 'brief'; state.query = ''; }
    else if (/^(접기|닫기)$/.test(t)) { state.collapsed = true; }
    else if (/^(다시|새로고침|다시\s*요약)$/.test(t)) { state.slots = {}; render(); extractAll(true); return; }
    else if (/^(내보내기|결과\s*내보내기|export)$/i.test(t)) { $('btnExport').click(); toast('download', '결과 내보냄', '브라우저 다운로드 폴더를 확인하세요', 5000); return; }
    else if (/^(\d+(?:\.\d+)?b)(?:로|으로)?$/i.test(t)) {
      const want = /^(\d+(?:\.\d+)?b)/i.exec(t)[1].toUpperCase();
      const hit = state.models.find((m) => m.id.toUpperCase().includes(want));
      if (hit) { state.model = hit.id; localStorage.setItem('slm-model', state.model); state.slots = {}; render(); extractAll(); return; }
      toast('alert-triangle', '그 모델이 없습니다', state.models.map((m) => shortModel(m.id)).join(' · ') || 'models 폴더를 확인하세요'); return;
    }
    else { state.query = t.replace(/^(메일\s*)?(검색|요약)\s*/,'').trim() || t; state.view = 'brief'; state.collapsed = false; }
    render();
  }
  $('composer').addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (state.palette.open && state.palette.items.length) { paletteRun(state.palette.sel); return; }
    const i = $('cmd'); runCommand(i.value); i.value = ''; state.palette.open = false; renderPalette();
  });
  $('focusClear').addEventListener('click', () => { state.query = ''; render(); });
  $('orb').addEventListener('click', () => { state.collapsed = !state.collapsed; render(); if (!state.collapsed) $('cmd').focus(); });
  $('sigMail').addEventListener('click', () => { state.collapsed = false; state.view = 'report'; state.period = state.settings.defaultReport || 'today'; render(); });
  $('sigBell').addEventListener('click', () => { state.collapsed = false; state.view = 'notices'; render(); });
  $('selClear').addEventListener('click', () => { state.selectedDismissed = state.selected ? state.selected.id : ''; render(); });
  $('seltag').addEventListener('click', (e) => { if (e.target.closest('#selClear') || !state.selected) return; state.collapsed = false; state.view = 'summary'; state.current = state.selected.id; render(); });
  $('queueChip').addEventListener('click', () => { state.collapsed = false; state.view = 'brief'; state.logOpen = true; render(); });
  $('toastClose').addEventListener('click', () => { $('toast').hidden = true; });
  $('toastBody').addEventListener('click', (e) => { if (e.target.closest('#toastClose')) return; $('toast').hidden = true; state.collapsed = false; const go = $('toastBody').dataset.go; if (go === 'wrap') { state.view = 'report'; state.period = 'wrap'; } else if (go === 'week') { state.view = 'report'; state.period = 'week'; } else state.view = 'brief'; if (state.notices[0]) { state.notices[0].read = true; saveNotices(); } render(); });
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.code === 'Space') { e.preventDefault(); state.collapsed = !state.collapsed; render(); if (!state.collapsed) $('cmd').focus(); return; }
    const typing = ['INPUT', 'TEXTAREA'].includes((e.target || {}).tagName);
    if (e.key === '/' && !typing) { e.preventDefault(); state.collapsed = false; render(); $('cmd').focus(); return; }
    if (e.key === 'Escape' && !typing) { if (state.draft) state.draft = null; else if (state.view !== 'brief') state.view = 'brief'; else if (state.query) state.query = ''; render(); }
  });

  // ---- 리듬: 부르지 않아도 오는 것 (첫 실행 정리 알림 · 17:30 오늘 마무리)
  function rhythmTick() {
    const now = new Date(); const key = state.today;
    const idle = !state.queue.length && !state.queueRunning;
    if (idle && localStorage.getItem('slm-greeted') !== key && state.mails.length && state.mails.every((m) => state.slots[m.id])) {
      localStorage.setItem('slm-greeted', key);
      const acts = state.mails.filter((m) => state.slots[m.id].actionItems.length && !['newsletter', 'verification'].includes(state.slots[m.id].category) && !isDone(m.id)).length;
      toast('bell', `메일 ${state.mails.length}통 정리됨`, acts ? `할 일 ${acts}건 · 오늘 업무에서 확인` : '오늘 조치할 것이 없습니다', 8000);
      if (orb) orb.flash('bell', 4000, 'idle');
    }
    const [wh, wm] = (state.settings.wrapTime || '17:30').split(':').map(Number);
    if (now.getHours() * 60 + now.getMinutes() >= wh * 60 + wm && localStorage.getItem('slm-wrap') !== key) {
      localStorage.setItem('slm-wrap', key);
      const r = reportData('today');
      toast('moon', '오늘 마무리 리포트가 준비됐습니다', r.now.length ? `남은 것 ${r.now.length}건 · 클릭해서 확인` : '남은 것이 없습니다. 내일 기한을 확인하세요', 10000, 'wrap');
      if (orb) orb.flash('bell', 4000, 'idle');
    }
    if (state.settings.weekly !== false && now.getDay() === 1 && now.getHours() >= 9) {
      const wk = `${now.getFullYear()}-W${Math.ceil(((now - new Date(now.getFullYear(), 0, 1)) / 864e5 + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7)}`;
      if (localStorage.getItem('slm-weekly') !== wk && idle && state.mails.length) {
        localStorage.setItem('slm-weekly', wk);
        const r = reportData('week');
        toast('calendar-week', '이번 주 리포트', `해야 할 일 ${r.now.length}건 · 다가오는 기한 ${r.due.length}건`, 10000, 'week');
        if (orb) orb.flash('cal', 4000, 'idle');
      }
    }
  }
  // Outlook 에서 선택한 메일 (selected.json, -Panel -Watch 가 5초마다 갱신)
  async function pollSelected() {
    if (state.source !== 'inbox') return;
    try {
      const r = await fetch('data/selected.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const raw = await r.json();
      if (!raw) { state.selected = null; render(); return; }
      const m = normalize(raw, 0);
      if (state.selected && state.selected.id === m.id) return;
      state.selected = m; state.selectedDismissed = '';
      if (!state.mails.some((x) => x.id === m.id)) { state.mails.unshift(m); state.knownIds && state.knownIds.add(m.id); }
      // 선택한 메일은 사용자가 지금 보고 있는 것 → 대기열 맨 앞
      if (!state.slots[m.id]) { const c = P.cache.get(m, state.model); if (c) state.slots[m.id] = c; else { const model = state.model; queueAdd({ key: `summary|${model}|${m.id}`, kind: 'summary', mailId: m.id, label: m.subject, run: async () => { state.pending[m.id] = true; render(); try { const s = await P.extract(m, { base: BASE, model, today: state.today }); state.slots[m.id] = s; P.cache.set(m, model, s); if (!s.byRule) state.log.push({ subject: m.subject, model, ms: s.timing.totalMs || 0, ptok: s.timing.promptTokens || 0, tok: s.timing.tokens || 0, at: Date.now() }); } catch (e) {} delete state.pending[m.id]; } }, true); pumpQueue(); } }
      render();
    } catch (e) {}
  }

  (async function init() {
    syncSeg();
    const h = await P.health(BASE);
    state.online = !!(h && h.ok); state.router = !!(h && h.router); state.models = h ? h.models : [];
    // 선택 모델: 저장값이 목록에 있으면 유지, 없으면 2B 우선 → 로드된 것 → 첫 번째
    const ids = state.models.map((x) => x.id);
    // 기본 모델: 4B(정확도, Watch 사전 요약과 함께 쓰면 대기 없음) → 2B → 로드된 것 → 첫 번째
    if (!ids.includes(state.model)) state.model = ids.find((x) => /4B/i.test(x)) || ids.find((x) => /2B/i.test(x)) || (h && h.model) || ids[0] || '';
    renderStatus();
    await loadMails();
    setInterval(async () => { const h2 = await P.health(BASE); const on = !!(h2 && h2.ok); if (on !== state.online) { state.online = on; if (h2 && h2.models.length) state.models = h2.models; renderStatus(); orbState(); } }, 15000);
    setInterval(pollInbox, 60000);   // 리소스 절약: 1분 폴링 (내보내기 주기는 -WatchInterval, 기본 5분)
    setInterval(rhythmTick, 30000); setTimeout(rhythmTick, 5000);
    setInterval(pollSelected, 5000); setTimeout(pollSelected, 1500);
  })();
})();
