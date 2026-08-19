/* 몰두봇 로컬 메일 파이프라인 (브라우저용, 의존성 없음)
   - 웹 패널(web/index.html)과 새 Outlook 추가 기능(addin/taskpane.html)이 같은 코드를 쓴다.
   - PowerShell/Python 구현과 규칙이 같다. 규칙을 바꾸면 PROMPT_VERSION 을 올린다(캐시 무효화).
   - 흐름: 원문 정리(배너·인용 제거) → 예산 안으로 관련 문장 추리기 → JSON 스키마 강제 호출 → 후처리 검증 → 근거 문장 찾기 */
(function (global) {
  'use strict';

  const PROMPT_VERSION = 'v9';

  const DEFAULTS = {
    base: '',                 // '' = 같은 출처(llama-server --path 로 서빙할 때). 아니면 'http://127.0.0.1:8080'
    maxBodyChars: 900,
    maxTokens: 180,
    temperature: 0.1,
    today: null,              // 'YYYY-MM-DD', null 이면 오늘
  };

  // ------------------------------------------------------------ 텍스트 정리 --

  const BANNER_RE = /(보안\s*경고|외부\s*(에서|로부터)?\s*(발송|수신|유입)|외부\s*메일|열람\s*시\s*주의|악성\s*코드|피싱|스미싱|랜섬웨어|발신자[^\n]{0,20}(확인|주소)|링크[^\n]{0,20}(확인|주의|클릭|주소)|첨부[^\n]{0,25}(주의|확인|확장자)|주의\s*하시기|반드시\s*확인|^\s*[①②③④⑤]|CAUTION|EXTERNAL|This (email|message) (originated|was sent) from outside|Do not click)/i;
  const SEP_RE = /\n[ \t]*(-{3,}[ \t]*(원본\s*메시지|Original\s*Message|Forwarded\s*message|전달된\s*메시지)[^\n]*|_{8,}|-{16,}|>\s)/i;
  const HDR_RE = /\n[ \t]*(From|Sent|To|Cc|Subject|Date|보낸\s*사람|보낸\s*날짜|받는\s*사람|참조(인)?|발신(인|자)?|수신(인|자)?|보낸이|받는이|날짜|일시|일자|제목)\s*:/i;
  const WROTE_RE = /\n(On .+wrote:|\d{4}[.년].+(님이|wrote)[^\n]*:)\s*\n/;
  const KEY_RE = /(\d{1,2}\s*월\s*\d{1,2}\s*일|\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2}|\d{1,2}[/.]\d{1,2}|\d{1,2}\s*:\s*\d{2}|까지|기한|마감|기간|일정|회신|답변|회답|제출|등록|신청|참석|확인\s*(바랍|부탁|요청)|요청|부탁|필요합니다|해야|하시기 바랍|바랍니다|주시기|주세요|안내드립|공지|변경|만료|유효|삭제|비밀번호|승인|결재|납부|결제|deadline|due|by\s+\d|please|required|must|action|reply|submit|confirm|expire|urgent|ASAP)/i;

  function cleanBody(text) {
    if (!text) return '';
    let t = String(text).replace(/\r\n?/g, '\n');
    // 앞머리 15줄 안의 외부메일/보안 배너 줄 제거
    const lines = t.split('\n');
    const keep = [];
    for (let i = 0; i < lines.length; i++) {
      if (i < 15 && BANNER_RE.test(lines[i])) continue;
      keep.push(lines[i]);
    }
    t = keep.join('\n').replace(/^[\n ]+/, '');
    // 회신/전달 체인: 구분선 · 인용 헤더 줄 · "…wrote:" 중 가장 앞에 나오는 지점(150자 이후)에서 자른다
    let cut = -1;
    const firstAfter = (re) => {
      const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
      let m;
      while ((m = r.exec(t)) !== null) { if (m.index > 150) return m.index; }
      return -1;
    };
    for (const re of [SEP_RE, HDR_RE, WROTE_RE]) {
      const idx = firstAfter(re);
      if (idx > 0 && (cut < 0 || idx < cut)) cut = idx;
    }
    if (cut > 0) t = t.slice(0, cut);
    t = t.replace(/<https?:\/\/[^>]+>/g, '');
    // 링크는 요약 대상이 아니다(mail-summary.md). 토큰만 먹으므로 자리표시로 바꾼다.
    t = t.replace(/https?:\/\/[^\s<>"')\]]+/g, '[링크]');
    t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
    return t.trim();
  }

  function selectRelevant(text, budget) {
    if (text.length <= budget) return text;
    const head = text.slice(0, Math.min(500, text.length));
    const rest = text.slice(head.length);
    const picked = [];
    let used = head.length;
    for (let ln of rest.split('\n')) {
      ln = ln.trim();
      if (!ln || !KEY_RE.test(ln)) continue;
      if (ln.length > 300) ln = ln.slice(0, 300);
      if (used + ln.length + 1 > budget) break;
      picked.push(ln); used += ln.length + 1;
    }
    if (!picked.length) return text.slice(0, budget) + '\n…(이하 생략)';
    return head.trimEnd() + '\n…(중략)\n' + picked.join('\n');
  }

  // ------------------------------------------------------------- 메타 정리 --

  const KOR_DATE = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일(?:\s*\S*요일)?\s*(오전|오후)?\s*(\d{1,2})?(?::(\d{2}))?/;
  function parseReceived(s) {
    if (!s) return null;
    if (s instanceof Date) return s;
    let m = KOR_DATE.exec(s);
    if (m) {
      let h = m[5] ? parseInt(m[5], 10) : 0;
      if (m[4] === '오후' && h < 12) h += 12;
      if (m[4] === '오전' && h === 12) h = 0;
      return new Date(+m[1], +m[2] - 1, +m[3], h, m[6] ? +m[6] : 0);
    }
    m = /(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(s);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '';
  const shortWhen = (d) => d ? `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '';

  // "홍길동(HONG GILDONG)/데이터플랫폼팀/ACME" → {name:'홍길동', team:'데이터플랫폼팀'}
  function splitSender(name, addr) {
    let n = (name || '').trim(), team = '';
    if (!n || /^(outlook|noreply|no-reply|no_reply|mailer-daemon)$/i.test(n) || n === addr) {
      n = addr ? addr.split('@')[0] : n;
    }
    const parts = n.split('/').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) { n = parts[0]; team = parts[1]; }
    n = n.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (!n) n = addr || '(발신자 없음)';
    return { name: n, team };
  }

  // ------------------------------------------------------------- 프롬프트 --

  function systemPrompt(today) {
    return `이메일 비서. 메일을 읽고 JSON으로만, 한국어로 답한다. 오늘: ${today}
- summary: 핵심 한 문장(50자 이내), 인사말 제외.
- action_items: 수신자가 직접 해야 할 행동만, 각 30자 이내, 최대 3개. 없으면 [].
- deadline: 본문에 명시된 기한만 YYYY-MM-DD, 없으면 null. 수신일시는 기한이 아니다. 연도 없으면 수신일 기준.
- priority: 조치 필요+보안/계정/마감=high, 확인만=medium, 광고/잡담/만료된 인증코드=low.
- category: action_required/notice/verification/personal/newsletter/other
- 보안 경고문·면책 문구·서명·인사말은 무시하고 실제 업무 내용만 본다.
- 본문에 없는 내용은 만들지 않는다.`;
  }

  const SCHEMA = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      action_items: { type: 'array', items: { type: 'string' } },
      deadline: { type: ['string', 'null'] },
      priority: { type: 'string', enum: ['high', 'medium', 'low'] },
      category: { type: 'string', enum: ['action_required', 'notice', 'verification', 'personal', 'newsletter', 'other'] },
    },
    required: ['summary', 'action_items', 'deadline', 'priority', 'category'],
  };

  const DRAFT_SCHEMA = {
    type: 'object',
    properties: { body: { type: 'string' } },
    required: ['body'],
  };

  function userPrompt(mail, body) {
    const s = splitSender(mail.senderName, mail.senderAddr);
    return `[메일]\n발신자: ${s.name}${s.team ? ' (' + s.team + ')' : ''} <${mail.senderAddr || ''}>\n수신일시: ${iso(parseReceived(mail.received))}\n제목: ${mail.subject || ''}\n\n본문:\n${body}`;
  }

  // ---------------------------------------------------------------- 호출 --

  async function chat(opts, messages, schema, maxTokens) {
    const res = await fetch((opts.base || '') + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.assign(opts.model ? { model: opts.model } : {}, {
        messages,
        temperature: opts.temperature,
        max_tokens: maxTokens,
        chat_template_kwargs: { enable_thinking: false },
        response_format: { type: 'json_schema', json_schema: { name: 'mail', schema } },
      })),
    });
    if (!res.ok) throw new Error('llama-server ' + res.status + ': ' + (await res.text()).slice(0, 200));
    const r = await res.json();
    const t = r.timings || {}, u = r.usage || {};
    return {
      content: r.choices[0].message.content,
      promptTokens: u.prompt_tokens, tokens: u.completion_tokens,
      promptMs: Math.round(t.prompt_ms || 0), genMs: Math.round(t.predicted_ms || 0),
    };
  }

  /** 서버 상태. 라우터 모드(--models-dir)면 models[] 에 선택 가능한 모델 이름이 들어온다. */
  async function health(base) {
    try {
      const r = await fetch((base || '') + '/health');
      if (!r.ok) return null;
      const h = await r.json();
      const p = await fetch((base || '') + '/props').then((x) => x.json()).catch(() => ({}));
      const out = { ok: h.status === 'ok', router: p.role === 'router', model: (p.model_path || '').split(/[\\/]/).pop(), models: [] };
      if (out.router || !out.model || out.model === 'none') {
        const m = await fetch((base || '') + '/models').then((x) => x.json()).catch(() => null);
        const list = m ? (m.data || m.models || []) : [];
        out.models = list.map((x) => ({ id: x.id || x.name, loaded: !!(x.status && x.status.value === 'loaded') }));
        if (out.router) out.model = (out.models.find((x) => x.loaded) || {}).id || '';
      } else {
        out.models = [{ id: out.model, loaded: true }];
      }
      return out;
    } catch (e) { return null; }
  }

  // -------------------------------------------------------------- 후처리 --

  function normalizeDeadline(dl, body, recv) {
    if (!dl) return null;
    dl = String(dl).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dl)) {
      const m = /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/.exec(dl);
      if (!m) return null;
      dl = `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
    }
    const dd = new Date(dl + 'T00:00:00');
    if (isNaN(dd)) return null;
    // 수신일보다 앞선 기한 = 인용된 옛 메일에서 끌려온 것
    if (recv && dd < new Date(recv.getFullYear(), recv.getMonth(), recv.getDate() - 1)) return null;
    // 본문에 근거가 없는 기한(수신일시 헤더를 베낀 경우)은 버림
    const mo = dd.getMonth() + 1, da = dd.getDate();
    const ground = new RegExp(`(${mo}\\s*월\\s*${da}\\s*일|${mo}[.\\-/]${da}(?!\\d)|${pad(mo)}[.\\-/]${pad(da)}|${da}\\s*일\\s*(까지|이내|오후|오전|\\()|오늘|금일|내일|명일|모레|이번\\s*주|금주|다음\\s*주|차주|주말|월요일|화요일|수요일|목요일|금요일|토요일|일요일|까지|이내|유효|만료|마감|기한|within|by |due|deadline|expire|EOD|ASAP)`, 'i');
    if (!ground.test(body)) return null;
    return dl;
  }

  // 코드 쪽 기한 추출: 본문에서 날짜/시간 표현을 찾고, 같은 문장에 "까지·기한·마감·만료·이내·until/by/due" 가 있으면 기한 후보로 본다.
  // (몰두봇 AGENTS.md 원칙: 사실은 코드가 추출하고 규칙이 판단, SLM 은 문장화·보조. SLM 이 낸 기한은 이 후보와 대조한다)
  const DUE_WORD = /(까지|기한|마감|만료|이내|안에|전까지|until|by\b|due|deadline|no later than|expire)/i;
  const REL_DAY = { 오늘: 0, 금일: 0, 내일: 1, 명일: 1, 모레: 2, 내일모레: 2 };
  function findDeadlines(text, recv) {
    const base = recv || new Date();
    const out = [];
    // 점수: 날짜 바로 뒤(12자 안)에 기한 표현이 오면 +2, "부터/시작/접수" 가 오면 -2 (시작일은 기한이 아니다)
    const push = (y, m, d, sent, after) => {
      const dt = new Date(y, m - 1, d); if (isNaN(dt)) return;
      const tail = (after || '').slice(0, 14);
      let score = 0;
      if (DUE_WORD.test(tail)) score += 2;
      if (/^\s*[)(월화수목금토일\s]*(부터|시작|접수|발송)/.test(tail)) score -= 2;
      out.push({ date: iso(dt), evidence: sent.trim(), score });
    };
    for (const sent of splitSentences(text)) {
      if (!DUE_WORD.test(sent)) continue;
      let m, re;
      re = /(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})일?/g;             // 2026-08-20 · 2026.8.20 · 2026년 8월 20일
      while ((m = re.exec(sent))) push(+m[1], +m[2], +m[3], sent, sent.slice(m.index + m[0].length));
      re = /(?<!\d)(\d{1,2})\s*월\s*(\d{1,2})\s*일/g;                          // 8월 20일 (연도 없음 → 수신일 기준, 지났으면 다음 해)
      while ((m = re.exec(sent))) { let y = base.getFullYear(); const dt = new Date(y, +m[1] - 1, +m[2]); if (dt < new Date(base.getFullYear(), base.getMonth(), base.getDate() - 30)) y++; push(y, +m[1], +m[2], sent, sent.slice(m.index + m[0].length)); }
      re = /(?<![\d.])(\d{1,2})\/(\d{1,2})(?![\d/])/g;                            // 8/20
      while ((m = re.exec(sent))) push(base.getFullYear(), +m[1], +m[2], sent, sent.slice(m.index + m[0].length));
      for (const k of Object.keys(REL_DAY)) { const i = sent.indexOf(k); if (i >= 0) { const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + REL_DAY[k]); push(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), sent, sent.slice(i + k.length)); } }
      m = /(\d{1,2})\s*일\s*(간|이내|안에)/.exec(sent);                          // 3일간 유효 · 5일 이내
      if (m && !/월/.test(sent.slice(Math.max(0, m.index - 3), m.index))) { const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + (+m[1])); push(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), sent, sent.slice(m.index + m[0].length)); }
    }
    // 수신일 이전 후보는 버리고(인용부 잔재), 가장 이른 것을 앞에
    const floor = new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1);
    return out.filter((c) => new Date(c.date + 'T00:00:00') >= floor).sort((a, b) => (b.score - a.score) || (a.date < b.date ? -1 : 1));
  }

  function splitSentences(text) {
    return text.split(/(?<=[.!?。]|다\.|요\.|음\.)\s+|\n+/).map((s) => s.trim()).filter((s) => s.length >= 6);
  }
  function bigrams(s) {
    const t = s.replace(/[\s\p{P}]/gu, ''); const out = new Set();
    for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
    return out;
  }
  // 슬롯 문장의 근거가 되는 원문 문장 하나를 고른다 (2-gram 겹침 최대)
  function findEvidence(body, claim) {
    if (!claim) return '';
    const cb = bigrams(claim); if (!cb.size) return '';
    let best = '', bestScore = 0;
    for (const s of splitSentences(body)) {
      const sb = bigrams(s); let hit = 0;
      for (const g of cb) if (sb.has(g)) hit++;
      const score = hit / cb.size;
      if (score > bestScore) { bestScore = score; best = s; }
    }
    return bestScore >= 0.25 ? best : '';
  }

  // -------------------------------------------------------- 규칙 트리아지 --
  // 모델을 부르기 전에 규칙으로 걸러낼 수 있는 메일: 광고·소식지·인증코드·자동발송 알림.
  // (VDI 리소스 절약 + 소형 모델이 광고에서 할 일을 과하게 뽑는 문제 차단. 실제 업무 메일만 모델로 간다.)
  const AD_RE = /(\(광고\)|\[광고\]|^광고|뉴스레터|newsletter|소식지|웹진|매거진|다이제스트|digest|회원님|구독|unsubscribe|수신거부|facebook|linkedin|instagram|youtube|프로모션|promotion|이벤트\s*안내|할인|쿠폰)/i;
  const VERIFY_RE = /(인증\s*(코드|번호)|확인\s*코드|verification code|verify your|one[- ]time (code|password)|OTP|2단계 인증|two-factor|보안 코드|security code)/i;
  const AUTO_RE = /(mailer-daemon|postmaster|delivery (status|failure)|undeliverable|배달 못함|자동\s*회신|automatic reply|out of office|부재중|meeting (accepted|declined|tentative)|수락됨:|거절됨:|임시로 수락됨:)/i;
  function triage(mail) {
    const subj = mail.subject || '', from = `${mail.senderName || ''} <${mail.senderAddr || ''}>`, head = (mail.body || '').slice(0, 1500);
    if (AUTO_RE.test(subj) || AUTO_RE.test(from)) return { skip: true, category: 'other', summary: '자동 발송 알림입니다', reason: '자동발송' };
    if (AD_RE.test(subj) || AD_RE.test(from)) return { skip: true, category: 'newsletter', summary: '광고·소식지입니다', reason: '광고/소식지' };
    if (VERIFY_RE.test(subj) || (VERIFY_RE.test(head) && /(?<!\d)\d{4,8}(?!\d)/.test(head) && head.length < 800)) return { skip: true, category: 'verification', summary: '인증 코드 메일입니다', reason: '인증코드' };
    if (/수신거부|unsubscribe|구독\s*취소/i.test(mail.body || '')) return { skip: true, category: 'newsletter', summary: '광고·소식지입니다', reason: '광고/소식지' };
    return { skip: false };
  }
  function ruleSlots(mail, t) {
    return { summary: t.summary, actionItems: [], deadline: null, deadlineSource: '', deadlineEvidence: '', priority: 'low', category: t.category,
      timing: { totalMs: 0, promptTokens: 0, tokens: 0, promptMs: 0, genMs: 0, rule: t.reason }, cleanedBody: cleanBody(mail.body), promptText: '', model: 'rule', promptVersion: PROMPT_VERSION, byRule: true };
  }

  // --------------------------------------------------------------- 추출 --

  /** mail: {id, subject, senderName, senderAddr, received, body}
   *  반환: {summary, actionItems:[{text, evidence}], deadline, deadlineEvidence, priority, category, timing, cleanedBody, promptText} */
  async function extract(mail, options) {
    const opts = Object.assign({}, DEFAULTS, options || {});
    if (!opts.noTriage) { const t = triage(mail); if (t.skip) return ruleSlots(mail, t); }
    const today = opts.today || iso(new Date());
    const cleaned = cleanBody(mail.body);
    const body = selectRelevant(cleaned, opts.maxBodyChars);
    const messages = [
      { role: 'system', content: systemPrompt(today) },
      { role: 'user', content: userPrompt(mail, body) },
    ];
    const r = await chat(opts, messages, SCHEMA, opts.maxTokens);
    let d;
    try { d = JSON.parse(r.content); } catch (e) {
      d = { summary: String(r.content || '').slice(0, 120), action_items: [], deadline: null, priority: 'low', category: 'other' };
    }
    const seen = new Set(), items = [];
    for (let it of (d.action_items || [])) {
      it = String(it).trim();
      if (!it || /^(deadline|priority|category|summary|other)\s*:/i.test(it)) continue;
      if (!seen.has(it)) { seen.add(it); items.push(it); }
      if (items.length >= 3) break;
    }
    const recv = parseReceived(mail.received);
    // 기한: 코드 후보가 있으면 코드가 결정(SLM 값이 후보 중 하나면 그것, 아니면 가장 이른 후보). 없으면 SLM 값을 근거 검증 후 사용.
    const cands = findDeadlines(cleaned, recv);
    let deadline = normalizeDeadline(d.deadline, cleaned, recv);
    let deadlineSource = deadline ? 'slm' : '';
    if (cands.length) {
      const hit = cands.find((c) => c.date === deadline);
      deadline = hit ? hit.date : cands[0].date;
      deadlineSource = hit ? 'code+slm' : 'code';
    }
    // 광고·소식지·자동발송 안전망: 소형 모델이 "페이지 방문" 같은 문구를 할 일로 잡는 것을 막는다(추천·리포트에서 제외됨)
    let category = d.category || 'other';
    // 모델이 '인증'이라 했지만 인증 신호가 없으면(예: 만족도 조사) 되돌린다 — 인증은 리포트에서 빠지므로 오분류가 비싸다
    if (category === 'verification' && !VERIFY_RE.test(mail.subject || '') && !VERIFY_RE.test(cleaned.slice(0, 1500))) category = items.length ? 'action_required' : 'notice';
    // (noreply 류는 사내 시스템 알림도 많아 제외하지 않는다 — 광고 표지·SNS·구독 신호만 본다)
    const adSig = /(\(광고\)|\[광고\]|광고|뉴스레터|newsletter|소식지|웹진|매거진|다이제스트|digest|회원님|구독|unsubscribe|수신거부|facebook|linkedin|instagram|youtube)/i;
    if (!deadline && (adSig.test(mail.subject || '') || adSig.test(mail.senderAddr || '') || adSig.test(mail.senderName || '') || /수신거부|unsubscribe|구독\s*취소/i.test(cleaned))) {
      if (category !== 'verification') category = 'newsletter';
    }
    return {
      summary: String(d.summary || '').trim(),
      actionItems: items.map((t) => ({ text: t, evidence: findEvidence(cleaned, t) })),
      deadline,
      deadlineSource,
      deadlineEvidence: deadline ? ((cands.find((c) => c.date === deadline) || {}).evidence || findEvidence(cleaned, deadline.slice(5).replace('-', '월 ') + '일 까지 기한')) : '',
      priority: category === 'newsletter' ? 'low' : (d.priority || 'low'),
      category,
      timing: { promptTokens: r.promptTokens, tokens: r.tokens, promptMs: r.promptMs, genMs: r.genMs, totalMs: r.promptMs + r.genMs },
      cleanedBody: cleaned,
      promptText: messages[1].content,
      model: opts.model || '',
      promptVersion: PROMPT_VERSION,
    };
  }

  /** 답장 초안. 사용자가 보낼 글이므로 사용자 입장의 정중한 업무 문체. 발송은 하지 않는다(승인 게이트는 화면 쪽). */
  async function draftReply(mail, slots, options) {
    const opts = Object.assign({}, DEFAULTS, options || {});
    const s = splitSender(mail.senderName, mail.senderAddr);
    const cleaned = slots && slots.cleanedBody ? slots.cleanedBody : cleanBody(mail.body);
    const body = selectRelevant(cleaned, Math.min(opts.maxBodyChars, 700));
    const points = slots && slots.actionItems ? slots.actionItems.map((a) => a.text).join(' / ') : '';
    const messages = [
      { role: 'system', content: `너는 사용자를 대신해 업무 메일 답장 초안을 쓴다. 한국어, 정중한 업무체("~드립니다/~하겠습니다"), 5문장 이내, 인사 한 줄 → 본론 → 맺음. 상대 이름은 "${s.name}님". 서명·제목·머리말은 넣지 않는다. 본문에 없는 약속(날짜·금액)을 만들지 않는다. JSON {"body": "..."} 로만 답한다.` },
      { role: 'user', content: `[받은 메일]\n제목: ${mail.subject}\n보낸 사람: ${s.name}\n본문:\n${body}\n\n[내가 할 일로 정리된 것]\n${points || '(없음 — 확인했다는 회신)'}\n\n위 메일에 대한 답장 초안을 작성해라. 할 일이 있으면 "확인 후 진행/회신하겠다"는 취지로, 없으면 "확인했다"는 짧은 회신으로.` },
    ];
    const r = await chat(opts, messages, DRAFT_SCHEMA, 260);
    let d; try { d = JSON.parse(r.content); } catch (e) { d = { body: r.content }; }
    const subj = /^(re|회신)\s*:/i.test(mail.subject || '') ? mail.subject : 'RE: ' + (mail.subject || '');
    return { subject: subj, body: String(d.body || '').trim(), timing: { totalMs: r.promptMs + r.genMs, tokens: r.tokens } };
  }

  // ---------------------------------------------------------------- 캐시 --

  const cache = {
    key(mail, model) { return `slm|${model}|${PROMPT_VERSION}|${mail.id}`; },
    get(mail, model) {
      try { const v = localStorage.getItem(this.key(mail, model)); return v ? JSON.parse(v) : null; } catch (e) { return null; }
    },
    set(mail, model, slots) {
      try { localStorage.setItem(this.key(mail, model), JSON.stringify(slots)); } catch (e) {}
    },
    clear() {
      try { Object.keys(localStorage).filter((k) => k.startsWith('slm|')).forEach((k) => localStorage.removeItem(k)); } catch (e) {}
    },
  };

  global.MailPipeline = {
    PROMPT_VERSION, DEFAULTS, SCHEMA,
    cleanBody, selectRelevant, parseReceived, iso, shortWhen, splitSender,
    systemPrompt, userPrompt, extract, draftReply, health, findEvidence, findDeadlines, triage, ruleSlots, cache,
  };
})(typeof window !== 'undefined' ? window : globalThis);
