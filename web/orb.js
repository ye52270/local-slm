/* 오브 도트 얼굴 — docs/design-system/components/brand/OrbLed.jsx (= WPF Controls/DotMatrixDisplay.cs) 를 React 없이 옮긴 것.
   패널 168px, 21열 × 16행, pitch 8, 도트 반지름 pitch*0.33. 꺼진 도트 #313437(α.72, 42%), 켜진 도트는 1.65배 글로우(α.16).
   표정 6종(눈: idle grin look wink sleepy sorry) + 신호 7종(스프라이트: mail cal check clock bell heart ouch). 새 표정을 만들지 않는다. */
(function (global) {
  'use strict';
  const COLS = 21, ROWS = 16, DOT_OFF = '#313437';
  const SPRITES = {
    mail: { color: '#FF6B5E', rows: ['XXXXXXXXXXX', 'X.........X', 'XX.......XX', 'X.XX...XX.X', 'X...XXX...X', 'X.........X', 'XXXXXXXXXXX'] },
    cal: { color: '#7DA2FF', rows: ['..X...X....', '.XXXXXXXXX.', '.X.......X.', '.XXXXXXXXX.', '.X.X.X.X.X.', '.X.......X.', '.X.X.X.X.X.', '.X.......X.', '.XXXXXXXXX.'] },
    check: { color: '#46C878', rows: ['.........X.', '........XX.', '.......XX..', '.X....XX...', '.XX..XX....', '..XXXX.....', '...XX......'] },
    clock: { color: '#5FB6FF', rows: ['XXXXXXXXX', '.X.....X.', '.X.....X.', '..X...X..', '...X.X...', '...X.X...', '..X...X..', '.X.....X.', '.X.....X.', 'XXXXXXXXX'] },
    bell: { color: '#FFB84D', rows: ['..XX...XX..', '.XXX...XXX.', '...XXXXX...', '..X.....X..', '.X.......X.', '.X.......X.', '.X.......X.', '.X.......X.', '..X.....X..', '...XXXXX...', '..X.....X..'] },
    heart: { color: '#FF6B8A', rows: ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'] },
    ouch: { color: '#F6C89A', rows: ['..X.........X..', '...X.......X...', '....X.....X....', '...X.......X...', '..X.........X..', '...............', '.....XXXXX.....'] },
  };
  const EYES = {
    idle: { color: '#63E04B', lid: 0 },
    grin: { color: '#63E04B', lid: 0 },
    look: { color: '#F6C89A', lid: 0, dilated: true },
    wink: { color: '#FFD23E', lid: 0, wink: true },
    sleepy: { color: '#63E04B', lid: 0.5, drop: 1 },
    sorry: { color: '#F6C89A', lid: 0.45, drop: 1 },
  };

  function draw(cv, face) {
    const g = cv.getContext('2d');
    const P = cv.width / COLS, r = P * 0.33;
    const ox = (cv.width - COLS * P) / 2 + P / 2, oy = (cv.height - ROWS * P) / 2 + P / 2;
    const panelR = cv.width / 2 - 2;
    const inside = (cx, cy) => { const dx = cx - cv.width / 2, dy = cy - cv.height / 2; return Math.sqrt(dx * dx + dy * dy) <= panelR - r - 0.5; };
    const dot = (col, row, color) => {
      const cx = ox + col * P, cy = oy + row * P;
      if (!inside(cx, cy)) return;
      g.beginPath(); g.arc(cx, cy, r * 1.65, 0, 6.284); g.fillStyle = color; g.globalAlpha = 0.16; g.fill(); g.globalAlpha = 1;
      g.beginPath(); g.arc(cx, cy, r, 0, 6.284); g.fillStyle = color; g.fill();
    };
    g.clearRect(0, 0, cv.width, cv.height);
    for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
      const cx = ox + col * P, cy = oy + row * P;
      if (!inside(cx, cy)) continue;
      g.beginPath(); g.arc(cx, cy, r * 0.42, 0, 6.284); g.fillStyle = DOT_OFF; g.globalAlpha = 0.72; g.fill(); g.globalAlpha = 1;
    }
    const sp = SPRITES[face];
    if (sp) {
      const w = Math.max(...sp.rows.map((s) => s.length));
      const xo = Math.round((COLS - w) / 2), yo = Math.round((ROWS - sp.rows.length) / 2);
      sp.rows.forEach((line, row) => { for (let col = 0; col < line.length; col++) if (line[col] === 'X') dot(xo + col, yo + row, sp.color); });
      return;
    }
    const eye = EYES[face] || EYES.idle;
    const w = eye.dilated ? 6 : 5, h = 5;
    const top = Math.round((ROWS - h) / 2) + (eye.drop || 0);
    const hidden = Math.round(h * (eye.lid || 0));
    const lefts = [Math.round(COLS / 2) - 3 - w, Math.round(COLS / 2) + 2];
    lefts.forEach((left, i) => {
      if (eye.wink && i === 0) { [[0, 3], [1, 2], [2, 1], [3, 2], [4, 3]].forEach(([dx, dy]) => dot(left + dx, top + dy, eye.color)); return; }
      for (let row = hidden; row < h; row++) for (let col = 0; col < w; col++) {
        const edge = (row === hidden || row === h - 1) && (col === 0 || col === w - 1);
        if (!edge) dot(left + col, top + row, eye.color);
      }
      if (hidden > 0) for (let col = 0; col < w; col++) dot(left + col, top + hidden - 1, eye.color);
    });
  }

  /** 오브 인스턴스: el 은 <button class="orb"> (안에 .led>canvas 와 .gloss 가 있어야 한다) */
  function Orb(el) {
    const cv = el.querySelector('canvas');
    let face = 'idle', busy = false, timer = null;
    const api = {
      set(f, b) { face = f || face; busy = !!b; el.classList.toggle('busy', busy); el.title = TITLES[face] || '몰두봇'; draw(cv, face); return api; },
      /** 잠깐 보여줬다가 되돌린다 (새 메일 글리프, 완료 표정 등) */
      flash(f, ms, back) { clearTimeout(timer); api.set(f, busy); timer = setTimeout(() => api.set(back || 'idle', busy), ms || 2500); return api; },
      get face() { return face; }, get busy() { return busy; },
    };
    api.set('idle', false);
    return api;
  }
  const TITLES = { idle: '몰두봇 열기 / 접기', grin: '정리 끝', clock: '작업 중', mail: '새 메일', sorry: '연결 없음', wink: '몰두봇', bell: '알림', check: '완료' };

  global.MolduOrb = { draw, Orb, SPRITES, EYES };
})(window);
