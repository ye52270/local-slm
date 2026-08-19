// 오브 도트 얼굴 — Controls/DotMatrixDisplay.cs의 스프라이트를 그대로 옮긴 것.
// 패널 168px, 21열 × 16행, pitch 8, 도트 반지름 pitch*0.33.
// 꺼진 도트 #313437 (alpha .72, 반지름 42%), 켜진 도트는 1.65배 글로우(alpha .16)를 덧그림.
const ORB_COLS = 21;
const ORB_ROWS = 16;
const ORB_DOT_OFF = "#313437";

const ORB_SPRITES = {
  mail: { color: "#FF6B5E", rows: ["XXXXXXXXXXX", "X.........X", "XX.......XX", "X.XX...XX.X", "X...XXX...X", "X.........X", "XXXXXXXXXXX"] },
  cal: { color: "#7DA2FF", rows: ["..X...X....", ".XXXXXXXXX.", ".X.......X.", ".XXXXXXXXX.", ".X.X.X.X.X.", ".X.......X.", ".X.X.X.X.X.", ".X.......X.", ".XXXXXXXXX."] },
  check: { color: "#46C878", rows: [".........X.", "........XX.", ".......XX..", ".X....XX...", ".XX..XX....", "..XXXX.....", "...XX......"] },
  clock: { color: "#5FB6FF", rows: ["XXXXXXXXX", ".X.....X.", ".X.....X.", "..X...X..", "...X.X...", "...X.X...", "..X...X..", ".X.....X.", ".X.....X.", "XXXXXXXXX"] },
  bell: { color: "#FFB84D", rows: ["..XX...XX..", ".XXX...XXX.", "...XXXXX...", "..X.....X..", ".X.......X.", ".X.......X.", ".X.......X.", ".X.......X.", "..X.....X..", "...XXXXX...", "..X.....X.."] },
  heart: { color: "#FF6B8A", rows: [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."] },
  ouch: { color: "#F6C89A", rows: ["..X.........X..", "...X.......X...", "....X.....X....", "...X.......X...", "..X.........X..", "...............", ".....XXXXX....."] },
};

// 눈은 스프라이트가 아니라 계산으로 그립니다(DrawEyes) — 눈꺼풀 비율과 동공 확장이 인자입니다.
const ORB_EYES = {
  idle: { color: "#63E04B", lid: 0 },
  grin: { color: "#63E04B", lid: 0 },
  look: { color: "#F6C89A", lid: 0, dilated: true },
  wink: { color: "#FFD23E", lid: 0, wink: true },
  sleepy: { color: "#63E04B", lid: 0.5, drop: 1 },
  sorry: { color: "#F6C89A", lid: 0.45, drop: 1 },
};

const orbButtonStyle = {
  borderRadius: "50%", position: "relative", padding: 3, border: 0, cursor: "pointer",
  boxShadow: "var(--shadow-orb)",
  background: "linear-gradient(160deg,rgba(255,255,255,.55),rgba(255,255,255,.06) 45%,rgba(91,141,239,.5))",
};
const orbLedStyle = { position: "absolute", inset: 3, borderRadius: "50%", overflow: "hidden", background: "var(--led-panel)" };
const orbGlossStyle = {
  position: "absolute", inset: 0, borderRadius: "50%", pointerEvents: "none",
  background: "radial-gradient(circle at 32% 22%,rgba(255,255,255,.13),rgba(255,255,255,0) 40%)",
};

export function OrbLed({ face = "idle", busy = false, size = 80, onClick, title = "몰두봇" }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext("2d");
    const P = cv.width / ORB_COLS;
    const r = P * 0.33;
    const ox = (cv.width - ORB_COLS * P) / 2 + P / 2;
    const oy = (cv.height - ORB_ROWS * P) / 2 + P / 2;
    const panelR = cv.width / 2 - 2;
    const inside = (cx, cy) => {
      const dx = cx - cv.width / 2, dy = cy - cv.height / 2;
      return Math.sqrt(dx * dx + dy * dy) <= panelR - r - 0.5;
    };
    const dot = (col, row, color) => {
      const cx = ox + col * P, cy = oy + row * P;
      if (!inside(cx, cy)) return;
      g.beginPath(); g.arc(cx, cy, r * 1.65, 0, 6.284);
      g.fillStyle = color; g.globalAlpha = 0.16; g.fill(); g.globalAlpha = 1;
      g.beginPath(); g.arc(cx, cy, r, 0, 6.284); g.fillStyle = color; g.fill();
    };

    g.clearRect(0, 0, cv.width, cv.height);
    for (let row = 0; row < ORB_ROWS; row++) {
      for (let col = 0; col < ORB_COLS; col++) {
        const cx = ox + col * P, cy = oy + row * P;
        if (!inside(cx, cy)) continue;
        g.beginPath(); g.arc(cx, cy, r * 0.42, 0, 6.284);
        g.fillStyle = ORB_DOT_OFF; g.globalAlpha = 0.72; g.fill(); g.globalAlpha = 1;
      }
    }

    const sprite = ORB_SPRITES[face];
    if (sprite) {
      const w = Math.max(...sprite.rows.map((s) => s.length));
      const xo = Math.round((ORB_COLS - w) / 2), yo = Math.round((ORB_ROWS - sprite.rows.length) / 2);
      sprite.rows.forEach((line, row) => {
        for (let col = 0; col < line.length; col++) if (line[col] === "X") dot(xo + col, yo + row, sprite.color);
      });
      return;
    }

    const eye = ORB_EYES[face] || ORB_EYES.idle;
    const w = eye.dilated ? 6 : 5, h = 5;
    const top = Math.round((ORB_ROWS - h) / 2) + (eye.drop || 0);
    const hidden = Math.round(h * (eye.lid || 0));
    const lefts = [Math.round(ORB_COLS / 2) - 3 - w, Math.round(ORB_COLS / 2) + 2];
    lefts.forEach((left, i) => {
      if (eye.wink && i === 0) {
        // 감은 눈 = ^ 모양
        [[0, 3], [1, 2], [2, 1], [3, 2], [4, 3]].forEach(([dx, dy]) => dot(left + dx, top + dy, eye.color));
        return;
      }
      for (let row = hidden; row < h; row++) {
        for (let col = 0; col < w; col++) {
          const edge = (row === hidden || row === h - 1) && (col === 0 || col === w - 1);
          if (edge) continue;
          dot(left + col, top + row, eye.color);
        }
      }
      // 눈꺼풀이 내려온 표정에는 덮인 선을 한 줄 그려 '반쯤 감김'이 보이게
      if (hidden > 0) for (let col = 0; col < w; col++) dot(left + col, top + hidden - 1, eye.color);
    });
  }, [face]);

  const s = { ...orbButtonStyle, width: size, height: size };
  if (busy) { s.background = "var(--iris-ring)"; s.animation = "orbSpin 3.4s linear infinite"; }
  return (
    <button type="button" style={s} onClick={onClick} title={title} aria-label={title}>
      <style>{"@keyframes orbSpin{to{transform:rotate(360deg)}}"}</style>
      <span style={orbLedStyle}><canvas ref={ref} width="168" height="168" style={{ display: "block", width: "100%", height: "100%" }} /></span>
      <span style={orbGlossStyle} />
    </button>
  );
}
