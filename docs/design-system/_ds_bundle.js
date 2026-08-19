/* @ds-bundle: {"format":4,"namespace":"DesignSystem_15a016","components":[{"name":"OrbLed","sourcePath":"components/brand/OrbLed.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"CountChip","sourcePath":"components/core/CountChip.jsx"},{"name":"SignalButton","sourcePath":"components/core/SignalButton.jsx"},{"name":"Tag","sourcePath":"components/core/Tag.jsx"},{"name":"NotificationToast","sourcePath":"components/overlay/NotificationToast.jsx"},{"name":"OrbPeek","sourcePath":"components/overlay/OrbPeek.jsx"},{"name":"AgentTrace","sourcePath":"components/panel/AgentTrace.jsx"},{"name":"ApprovalBox","sourcePath":"components/panel/ApprovalBox.jsx"},{"name":"MailResultCard","sourcePath":"components/panel/MailResultCard.jsx"},{"name":"PanelShell","sourcePath":"components/panel/PanelShell.jsx"}],"sourceHashes":{"components/brand/OrbLed.jsx":"0e50c0d0e0cc","components/core/Button.jsx":"cfaf18a520cc","components/core/Chip.jsx":"4c5f9e62e6b8","components/core/CountChip.jsx":"7f4cd3210263","components/core/SignalButton.jsx":"d8d3ca4454b5","components/core/Tag.jsx":"a5bd77a80b3f","components/overlay/NotificationToast.jsx":"ae32306acb8e","components/overlay/OrbPeek.jsx":"e80ea5845103","components/panel/AgentTrace.jsx":"4ce0ce402fd0","components/panel/ApprovalBox.jsx":"ec8bd0abc27d","components/panel/MailResultCard.jsx":"8f6a945d89f6","components/panel/PanelShell.jsx":"53fefa5c7afa","ui_kits/desktop-panel/Control.jsx":"1853e8cdaffa","ui_kits/desktop-panel/Panel.jsx":"186ea71d47a1","ui_kits/desktop-panel/Summary.jsx":"7e5645906653"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DesignSystem_15a016 = window.DesignSystem_15a016 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/brand/OrbLed.jsx
try { (() => {
// 오브 도트 얼굴 — Controls/DotMatrixDisplay.cs의 스프라이트를 그대로 옮긴 것.
// 패널 168px, 21열 × 16행, pitch 8, 도트 반지름 pitch*0.33.
// 꺼진 도트 #313437 (alpha .72, 반지름 42%), 켜진 도트는 1.65배 글로우(alpha .16)를 덧그림.
const ORB_COLS = 21;
const ORB_ROWS = 16;
const ORB_DOT_OFF = "#313437";
const ORB_SPRITES = {
  mail: {
    color: "#FF6B5E",
    rows: ["XXXXXXXXXXX", "X.........X", "XX.......XX", "X.XX...XX.X", "X...XXX...X", "X.........X", "XXXXXXXXXXX"]
  },
  cal: {
    color: "#7DA2FF",
    rows: ["..X...X....", ".XXXXXXXXX.", ".X.......X.", ".XXXXXXXXX.", ".X.X.X.X.X.", ".X.......X.", ".X.X.X.X.X.", ".X.......X.", ".XXXXXXXXX."]
  },
  check: {
    color: "#46C878",
    rows: [".........X.", "........XX.", ".......XX..", ".X....XX...", ".XX..XX....", "..XXXX.....", "...XX......"]
  },
  clock: {
    color: "#5FB6FF",
    rows: ["XXXXXXXXX", ".X.....X.", ".X.....X.", "..X...X..", "...X.X...", "...X.X...", "..X...X..", ".X.....X.", ".X.....X.", "XXXXXXXXX"]
  },
  bell: {
    color: "#FFB84D",
    rows: ["..XX...XX..", ".XXX...XXX.", "...XXXXX...", "..X.....X..", ".X.......X.", ".X.......X.", ".X.......X.", ".X.......X.", "..X.....X..", "...XXXXX...", "..X.....X.."]
  },
  heart: {
    color: "#FF6B8A",
    rows: [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."]
  },
  ouch: {
    color: "#F6C89A",
    rows: ["..X.........X..", "...X.......X...", "....X.....X....", "...X.......X...", "..X.........X..", "...............", ".....XXXXX....."]
  }
};

// 눈은 스프라이트가 아니라 계산으로 그립니다(DrawEyes) — 눈꺼풀 비율과 동공 확장이 인자입니다.
const ORB_EYES = {
  idle: {
    color: "#63E04B",
    lid: 0
  },
  grin: {
    color: "#63E04B",
    lid: 0
  },
  look: {
    color: "#F6C89A",
    lid: 0,
    dilated: true
  },
  wink: {
    color: "#FFD23E",
    lid: 0,
    wink: true
  },
  sleepy: {
    color: "#63E04B",
    lid: 0.5,
    drop: 1
  },
  sorry: {
    color: "#F6C89A",
    lid: 0.45,
    drop: 1
  }
};
const orbButtonStyle = {
  borderRadius: "50%",
  position: "relative",
  padding: 3,
  border: 0,
  cursor: "pointer",
  boxShadow: "var(--shadow-orb)",
  background: "linear-gradient(160deg,rgba(255,255,255,.55),rgba(255,255,255,.06) 45%,rgba(91,141,239,.5))"
};
const orbLedStyle = {
  position: "absolute",
  inset: 3,
  borderRadius: "50%",
  overflow: "hidden",
  background: "var(--led-panel)"
};
const orbGlossStyle = {
  position: "absolute",
  inset: 0,
  borderRadius: "50%",
  pointerEvents: "none",
  background: "radial-gradient(circle at 32% 22%,rgba(255,255,255,.13),rgba(255,255,255,0) 40%)"
};
function OrbLed({
  face = "idle",
  busy = false,
  size = 80,
  onClick,
  title = "몰두봇"
}) {
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
      const dx = cx - cv.width / 2,
        dy = cy - cv.height / 2;
      return Math.sqrt(dx * dx + dy * dy) <= panelR - r - 0.5;
    };
    const dot = (col, row, color) => {
      const cx = ox + col * P,
        cy = oy + row * P;
      if (!inside(cx, cy)) return;
      g.beginPath();
      g.arc(cx, cy, r * 1.65, 0, 6.284);
      g.fillStyle = color;
      g.globalAlpha = 0.16;
      g.fill();
      g.globalAlpha = 1;
      g.beginPath();
      g.arc(cx, cy, r, 0, 6.284);
      g.fillStyle = color;
      g.fill();
    };
    g.clearRect(0, 0, cv.width, cv.height);
    for (let row = 0; row < ORB_ROWS; row++) {
      for (let col = 0; col < ORB_COLS; col++) {
        const cx = ox + col * P,
          cy = oy + row * P;
        if (!inside(cx, cy)) continue;
        g.beginPath();
        g.arc(cx, cy, r * 0.42, 0, 6.284);
        g.fillStyle = ORB_DOT_OFF;
        g.globalAlpha = 0.72;
        g.fill();
        g.globalAlpha = 1;
      }
    }
    const sprite = ORB_SPRITES[face];
    if (sprite) {
      const w = Math.max(...sprite.rows.map(s => s.length));
      const xo = Math.round((ORB_COLS - w) / 2),
        yo = Math.round((ORB_ROWS - sprite.rows.length) / 2);
      sprite.rows.forEach((line, row) => {
        for (let col = 0; col < line.length; col++) if (line[col] === "X") dot(xo + col, yo + row, sprite.color);
      });
      return;
    }
    const eye = ORB_EYES[face] || ORB_EYES.idle;
    const w = eye.dilated ? 6 : 5,
      h = 5;
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
  const s = {
    ...orbButtonStyle,
    width: size,
    height: size
  };
  if (busy) {
    s.background = "var(--iris-ring)";
    s.animation = "orbSpin 3.4s linear infinite";
  }
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: s,
    onClick: onClick,
    title: title,
    "aria-label": title
  }, /*#__PURE__*/React.createElement("style", null, "@keyframes orbSpin{to{transform:rotate(360deg)}}"), /*#__PURE__*/React.createElement("span", {
    style: orbLedStyle
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: ref,
    width: "168",
    height: "168",
    style: {
      display: "block",
      width: "100%",
      height: "100%"
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: orbGlossStyle
  }));
}
Object.assign(__ds_scope, { OrbLed });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/OrbLed.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const buttonBase = {
  height: 28,
  padding: "0 12px",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: "var(--radius-chip-sm)",
  border: "0.5px solid var(--border-strong)",
  background: "var(--surface-item)",
  color: "var(--text-secondary)",
  fontSize: 12.5,
  fontFamily: "var(--font-ui)",
  whiteSpace: "nowrap",
  cursor: "pointer",
  transition: "var(--transition-control)"
};
const buttonVariants = {
  primary: {
    background: "var(--accent)",
    borderColor: "transparent",
    color: "#fff",
    fontWeight: 500
  },
  secondary: {},
  ghost: {
    background: "transparent",
    borderColor: "transparent",
    color: "var(--text-faint)",
    padding: "0 6px"
  },
  ok: {
    background: "var(--ok)",
    borderColor: "transparent",
    color: "#fff",
    fontWeight: 500
  }
};
const buttonSizes = {
  sm: {
    height: 24,
    fontSize: 11.5,
    padding: "0 9px"
  },
  md: {}
};
function Button({
  variant = "secondary",
  size = "md",
  icon,
  disabled,
  children,
  style,
  ...rest
}) {
  const s = {
    ...buttonBase,
    ...buttonVariants[variant],
    ...buttonSizes[size],
    ...(disabled ? {
      opacity: 0.45,
      cursor: "default"
    } : null),
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    style: s,
    disabled: disabled
  }, rest), icon ? /*#__PURE__*/React.createElement("i", {
    className: "ti ti-" + icon,
    style: {
      fontSize: 14
    },
    "aria-hidden": "true"
  }) : null, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const chipStyle = {
  height: 28,
  padding: "0 12px",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  borderRadius: "var(--radius-chip)",
  border: "0.5px solid var(--border-strong)",
  background: "var(--surface-item)",
  color: "var(--text-secondary)",
  fontSize: 12.5,
  fontFamily: "var(--font-ui)",
  whiteSpace: "nowrap",
  cursor: "pointer",
  transition: "var(--transition-control)"
};
const chipAccent = {
  color: "var(--accent)",
  background: "var(--accent-bg)",
  borderColor: "var(--accent)"
};
function Chip({
  accent,
  icon,
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    style: {
      ...chipStyle,
      ...(accent ? chipAccent : null),
      ...style
    }
  }, rest), icon ? /*#__PURE__*/React.createElement("i", {
    className: "ti ti-" + icon,
    style: {
      fontSize: 14
    },
    "aria-hidden": "true"
  }) : null, children);
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/core/CountChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const countChipStyle = {
  height: 24,
  padding: "0 9px",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  borderRadius: "var(--radius-chip-sm)",
  border: "0.5px solid var(--border-default)",
  background: "var(--surface-item)",
  color: "var(--text-secondary)",
  fontSize: 11.5,
  fontFamily: "var(--font-ui)",
  whiteSpace: "nowrap",
  cursor: "pointer"
};
const countChipUrgent = {
  color: "var(--tag-urgent-text)",
  background: "var(--tag-urgent-bg)",
  borderColor: "var(--tag-urgent-border)"
};
const countNumStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-primary)"
};
function CountChip({
  label,
  count,
  urgent,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    style: {
      ...countChipStyle,
      ...(urgent ? countChipUrgent : null),
      ...style
    }
  }, rest), label, /*#__PURE__*/React.createElement("b", {
    style: {
      ...countNumStyle,
      ...(urgent ? {
        color: "var(--tag-urgent-text)"
      } : null)
    }
  }, count));
}
Object.assign(__ds_scope, { CountChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/CountChip.jsx", error: String((e && e.message) || e) }); }

// components/core/SignalButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const signalTints = {
  cal: ["var(--sig-cal)", "var(--sig-cal-bg)", "calendar-event"],
  mail: ["var(--sig-mail)", "var(--sig-mail-bg)", "mail"],
  todo: ["var(--sig-todo)", "var(--sig-todo-bg)", "checkbox"],
  bell: ["var(--sig-bell)", "var(--sig-bell-bg)", "bell"],
  timer: ["var(--sig-timer)", "var(--sig-timer-bg)", "clock"]
};
const signalButtonStyle = {
  position: "relative",
  width: 32,
  height: 32,
  borderRadius: "50%",
  border: 0,
  padding: 0,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 17,
  cursor: "pointer",
  transition: "transform var(--dur-1) var(--ease-out)"
};
const signalBadgeStyle = {
  position: "absolute",
  top: -4,
  right: -5,
  minWidth: 15,
  height: 15,
  padding: "0 4px",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 9.5,
  fontWeight: 700,
  fontFamily: "var(--font-ui)"
};
const signalBadgeTones = {
  neutral: {
    background: "var(--badge-neutral-bg)",
    color: "var(--badge-neutral-text)",
    border: "1px solid var(--badge-neutral-border)"
  },
  urgent: {
    background: "var(--urgent)",
    color: "#fff",
    boxShadow: "0 0 0 2px var(--urgent-ring)"
  }
};
function SignalButton({
  kind = "mail",
  count,
  urgent,
  style,
  ...rest
}) {
  const [color, bg, icon] = signalTints[kind] || signalTints.mail;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    style: {
      ...signalButtonStyle,
      color,
      background: bg,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("i", {
    className: "ti ti-" + icon,
    "aria-hidden": "true"
  }), count ? /*#__PURE__*/React.createElement("span", {
    style: {
      ...signalBadgeStyle,
      ...signalBadgeTones[urgent ? "urgent" : "neutral"]
    }
  }, count) : null);
}
Object.assign(__ds_scope, { SignalButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/SignalButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Tag.jsx
try { (() => {
const tagBase = {
  fontSize: 10,
  padding: "1px 6px",
  borderRadius: "var(--radius-chip-sm)",
  border: "0.5px solid",
  whiteSpace: "nowrap",
  fontWeight: 500,
  fontFamily: "var(--font-ui)"
};
const tagTones = {
  follow: {
    color: "var(--tag-follow-text)",
    background: "var(--tag-follow-bg)",
    borderColor: "var(--tag-follow-border)"
  },
  urgent: {
    color: "var(--tag-urgent-text)",
    background: "var(--tag-urgent-bg)",
    borderColor: "var(--tag-urgent-border)"
  }
};
function Tag({
  tone = "follow",
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      ...tagBase,
      ...tagTones[tone],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Tag.jsx", error: String((e && e.message) || e) }); }

// components/overlay/NotificationToast.jsx
try { (() => {
// Windows/OrbNotificationWindow.xaml — 320×84, 오브 옆에 뜨는 알림 말풍선.
const toastWrapStyle = {
  display: "flex",
  alignItems: "center",
  width: 320,
  fontFamily: "var(--font-ui)"
};
const toastTailStyle = {
  width: 10,
  height: 16,
  flex: "none",
  background: "rgba(27,31,42,.96)",
  clipPath: "polygon(100% 0,0 50%,100% 100%)"
};
const toastBodyStyle = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 12px",
  borderRadius: 17,
  background: "rgba(27,31,42,.96)",
  border: "1px solid #53627D",
  cursor: "pointer"
};
const toastIconStyle = {
  width: 30,
  height: 30,
  flex: "none",
  borderRadius: 15,
  background: "#242B3A",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 15,
  color: "#8FB0FF"
};
const toastTitleStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: "#F5F7FF",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};
const toastMsgStyle = {
  fontSize: 12,
  color: "#C3CDDD",
  marginTop: 3,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};
const toastCloseStyle = {
  flex: "none",
  width: 24,
  height: 24,
  borderRadius: 12,
  border: 0,
  background: "transparent",
  color: "#8E9AB2",
  cursor: "pointer",
  fontSize: 13
};
function NotificationToast({
  icon = "mail",
  title,
  message,
  side = "left",
  onClick,
  onClose
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: toastWrapStyle
  }, side === "left" ? /*#__PURE__*/React.createElement("span", {
    style: toastTailStyle
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: toastBodyStyle,
    onClick: onClick
  }, /*#__PURE__*/React.createElement("span", {
    style: toastIconStyle
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-" + icon,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...toastTitleStyle,
      display: "block"
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      ...toastMsgStyle,
      display: "block"
    }
  }, message)), onClose ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: toastCloseStyle,
    onClick: e => {
      e.stopPropagation();
      onClose();
    },
    "aria-label": "\uB2EB\uAE30"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-x"
  })) : null), side === "right" ? /*#__PURE__*/React.createElement("span", {
    style: {
      ...toastTailStyle,
      clipPath: "polygon(0 0,100% 50%,0 100%)"
    }
  }) : null);
}
Object.assign(__ds_scope, { NotificationToast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/NotificationToast.jsx", error: String((e && e.message) || e) }); }

// components/overlay/OrbPeek.jsx
try { (() => {
// Windows/ContextPromptWindow.xaml — 300×78. 창을 오브에 끌어다 놓으면 뜨는 말풍선.
const peekWrapStyle = {
  display: "flex",
  alignItems: "center",
  width: 300,
  fontFamily: "var(--font-ui)"
};
const peekTailStyle = {
  width: 10,
  height: 16,
  flex: "none",
  background: "rgba(27,31,42,.96)",
  clipPath: "polygon(100% 0,0 50%,100% 100%)"
};
const peekBodyStyle = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 12px",
  borderRadius: 16,
  background: "rgba(27,31,42,.96)",
  border: "1px solid #53627D",
  cursor: "pointer"
};
const peekAppStyle = {
  width: 30,
  height: 30,
  flex: "none",
  borderRadius: 8,
  background: "#171B24",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  color: "#F5F7FF",
  fontWeight: 600
};
const peekTextStyle = {
  fontSize: 12,
  color: "#F5F7FF",
  maxWidth: 185,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};
const peekActionStyle = {
  fontSize: 12,
  color: "#A9C1FF",
  marginTop: 2
};
const peekCloseStyle = {
  flex: "none",
  width: 24,
  height: 24,
  borderRadius: 12,
  border: 0,
  background: "transparent",
  color: "#8E9AB2",
  cursor: "pointer",
  fontSize: 13
};
function OrbPeek({
  app = "W",
  label,
  action = "클릭해서 요약 보기",
  onClick,
  onClose
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: peekWrapStyle
  }, /*#__PURE__*/React.createElement("span", {
    style: peekTailStyle
  }), /*#__PURE__*/React.createElement("div", {
    style: peekBodyStyle,
    onClick: onClick
  }, /*#__PURE__*/React.createElement("span", {
    style: peekAppStyle
  }, app), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...peekTextStyle,
      display: "block"
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      ...peekActionStyle,
      display: "block"
    }
  }, action)), onClose ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: peekCloseStyle,
    onClick: e => {
      e.stopPropagation();
      onClose();
    },
    "aria-label": "\uB2EB\uAE30"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-x"
  })) : null));
}
Object.assign(__ds_scope, { OrbPeek });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/OrbPeek.jsx", error: String((e && e.message) || e) }); }

// components/panel/AgentTrace.jsx
try { (() => {
const traceToggleStyle = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  fontSize: 11.5,
  color: "var(--text-faint)",
  background: "none",
  border: 0,
  padding: 0,
  cursor: "pointer",
  whiteSpace: "nowrap",
  fontFamily: "var(--font-ui)"
};
const traceStepsStyle = {
  marginTop: 8,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  paddingLeft: 2
};
const traceStepStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 11.5,
  color: "var(--text-faint)",
  whiteSpace: "nowrap"
};
const traceDotStyle = {
  width: 5,
  height: 5,
  borderRadius: "50%",
  flex: "none",
  background: "var(--step-pending)"
};
const traceAgentStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  letterSpacing: ".04em",
  marginLeft: "auto",
  color: "var(--text-faint)"
};
function AgentTrace({
  steps = [],
  defaultOpen = false
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const flow = steps.map(s => s.label.split(" — ")[0]).join(" → ");
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: traceToggleStyle,
    onClick: () => setOpen(!open)
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-chevron-" + (open ? "down" : "right"),
    style: {
      fontSize: 13
    },
    "aria-hidden": "true"
  }), "\uC791\uC5C5 \uACFC\uC815 ", steps.length, "\uB2E8\uACC4 \xB7 ", flow), open ? /*#__PURE__*/React.createElement("div", {
    style: traceStepsStyle
  }, steps.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: traceStepStyle
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...traceDotStyle,
      ...(s.done ? {
        background: "var(--ok)"
      } : null)
    }
  }), s.label, s.agent ? /*#__PURE__*/React.createElement("span", {
    style: traceAgentStyle
  }, s.agent) : null))) : null);
}
Object.assign(__ds_scope, { AgentTrace });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/panel/AgentTrace.jsx", error: String((e && e.message) || e) }); }

// components/panel/ApprovalBox.jsx
try { (() => {
const approvalStyle = {
  borderRadius: "var(--radius-card)",
  padding: "11px 13px",
  fontFamily: "var(--font-ui)",
  background: "var(--warn-bg)",
  border: "0.5px solid var(--warn)",
  color: "var(--text-primary)"
};
const approvalHeadStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 500,
  color: "var(--warn)",
  marginBottom: 7
};
const approvalTargetStyle = {
  fontSize: 13,
  color: "var(--text-primary)"
};
const approvalPreviewStyle = {
  fontSize: 12,
  color: "var(--text-secondary)",
  background: "var(--surface-item)",
  border: "0.5px solid var(--border-default)",
  borderRadius: 6,
  padding: "7px 9px",
  margin: "7px 0",
  maxHeight: 88,
  overflowY: "auto",
  whiteSpace: "pre-wrap",
  lineHeight: 1.55
};
const approvalMetaStyle = {
  fontSize: 11,
  color: "var(--text-faint)",
  display: "flex",
  alignItems: "center",
  gap: 6,
  whiteSpace: "nowrap"
};
const approvalActionsStyle = {
  display: "flex",
  gap: 8,
  marginTop: 10,
  justifyContent: "flex-end"
};
const approvalBtn = {
  height: 28,
  padding: "0 12px",
  borderRadius: "var(--radius-chip-sm)",
  fontSize: 12.5,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "var(--font-ui)"
};
function ApprovalBox({
  verb = "메일 발송",
  target,
  preview,
  meta,
  onApprove,
  onReject
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: approvalStyle
  }, /*#__PURE__*/React.createElement("div", {
    style: approvalHeadStyle
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-shield-check",
    style: {
      fontSize: 13
    },
    "aria-hidden": "true"
  }), verb, " \u2014 \uC2B9\uC778\uC774 \uD544\uC694\uD574\uC694"), /*#__PURE__*/React.createElement("div", {
    style: approvalTargetStyle
  }, target), preview ? /*#__PURE__*/React.createElement("div", {
    style: approvalPreviewStyle
  }, preview) : null, meta ? /*#__PURE__*/React.createElement("div", {
    style: approvalMetaStyle
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-alert-triangle",
    style: {
      fontSize: 12
    },
    "aria-hidden": "true"
  }), meta) : null, /*#__PURE__*/React.createElement("div", {
    style: approvalActionsStyle
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onReject,
    style: {
      ...approvalBtn,
      border: "0.5px solid var(--border-strong)",
      background: "var(--surface-item)",
      color: "var(--text-secondary)"
    }
  }, "\uAC70\uBD80"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onApprove,
    style: {
      ...approvalBtn,
      border: 0,
      background: "var(--ok)",
      color: "#fff",
      fontWeight: 500
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-send",
    style: {
      fontSize: 14
    },
    "aria-hidden": "true"
  }), "\uC2B9\uC778")));
}
Object.assign(__ds_scope, { ApprovalBox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/panel/ApprovalBox.jsx", error: String((e && e.message) || e) }); }

// components/panel/MailResultCard.jsx
try { (() => {
const mailCardStyle = {
  display: "flex",
  gap: 10,
  padding: "9px 10px",
  alignItems: "flex-start",
  cursor: "pointer",
  borderRadius: "var(--radius-card-sm)",
  background: "var(--surface-item)",
  border: "0.5px solid var(--border-default)",
  fontFamily: "var(--font-ui)",
  width: "100%",
  textAlign: "left"
};
const mailAvatarStyle = {
  width: 26,
  height: 26,
  borderRadius: "50%",
  flex: "none",
  fontSize: 11.5,
  fontWeight: 600,
  background: "var(--accent-bg)",
  color: "var(--accent)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};
const mailTextStyle = {
  minWidth: 0,
  flex: 1,
  display: "flex",
  flexDirection: "column"
};
const mailSubjectStyle = {
  fontSize: 12.5,
  lineHeight: 1.35,
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
  color: "var(--text-primary)"
};
const mailSubjectClamp = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0
};
const mailPreviewStyle = {
  fontSize: 11.5,
  color: "var(--text-faint)",
  marginTop: 3,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};
function MailResultCard({
  sender,
  subject,
  preview,
  tag,
  onClick,
  style
}) {
  const initial = sender ? sender.trim().charAt(0) : "·";
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      ...mailCardStyle,
      ...style
    },
    onClick: onClick
  }, /*#__PURE__*/React.createElement("span", {
    style: mailAvatarStyle
  }, initial), /*#__PURE__*/React.createElement("span", {
    style: mailTextStyle
  }, /*#__PURE__*/React.createElement("span", {
    style: mailSubjectStyle
  }, /*#__PURE__*/React.createElement("span", {
    style: mailSubjectClamp
  }, subject), tag), /*#__PURE__*/React.createElement("span", {
    style: mailPreviewStyle
  }, sender, preview ? " · " + preview : "")));
}
Object.assign(__ds_scope, { MailResultCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/panel/MailResultCard.jsx", error: String((e && e.message) || e) }); }

// components/panel/PanelShell.jsx
try { (() => {
const panelShellStyle = {
  width: 320,
  flex: "none",
  display: "flex",
  flexDirection: "column",
  borderLeft: "0.5px solid var(--border-default)",
  background: "var(--surface-plate)",
  fontFamily: "var(--font-ui)",
  color: "var(--text-primary)"
};
const panelHeadStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "11px 13px",
  whiteSpace: "nowrap",
  borderBottom: "0.5px solid var(--border-default)",
  fontSize: 12.5,
  color: "var(--text-secondary)"
};
const panelCloseStyle = {
  marginLeft: "auto",
  background: "none",
  border: 0,
  color: "var(--text-faint)",
  cursor: "pointer",
  fontSize: 14,
  padding: 0
};
const panelBodyStyle = {
  padding: "12px 13px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  overflowY: "auto"
};
const panelFootStyle = {
  display: "flex",
  gap: 8,
  padding: "11px 13px",
  borderTop: "0.5px solid var(--border-default)",
  justifyContent: "flex-end"
};
function PanelShell({
  title,
  icon = "file",
  onClose,
  footer,
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      ...panelShellStyle,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: panelHeadStyle
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-" + icon,
    style: {
      fontSize: 15,
      color: "var(--accent)"
    },
    "aria-hidden": "true"
  }), title, onClose ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: panelCloseStyle,
    onClick: onClose,
    "aria-label": "\uB2EB\uAE30"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-x"
  })) : null), /*#__PURE__*/React.createElement("div", {
    style: panelBodyStyle
  }, children), footer ? /*#__PURE__*/React.createElement("div", {
    style: panelFootStyle
  }, footer) : null);
}
Object.assign(__ds_scope, { PanelShell });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/panel/PanelShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/desktop-panel/Control.jsx
try { (() => {
/* 몰두봇 — 파일·브라우저 제어 화면 4종 (계획 / 실행 / 결과·되돌리기 / 권한).
   승인 모델: 위험한 동작(덮어쓰기·삭제·발송·외부 사이트)만 멈추고 물어봅니다.
   컴포넌트·색·아이콘은 기존 패널 규칙 그대로. 새 색은 쓰지 않습니다. */

const PLAN = [{
  t: "바탕화면 › 월간보고 폴더에서 파일 3개 찾기",
  k: "읽기",
  risk: false,
  ico: "ti-folder"
}, {
  t: "표 3개를 합쳐 요약본 만들기",
  k: "새 파일",
  risk: false,
  ico: "ti-table"
}, {
  t: "사내 위키에서 지난달 수치 확인",
  k: "브라우저",
  risk: false,
  ico: "ti-world"
}, {
  t: "기존 요약본_2026-07.xlsx 덮어쓰기",
  k: "덮어쓰기",
  risk: true,
  ico: "ti-file-text"
}, {
  t: "윤중식 님께 메일로 첨부해 발송",
  k: "발송",
  risk: true,
  ico: "ti-send"
}];
function RiskTag({
  on
}) {
  return on ? /*#__PURE__*/React.createElement("span", {
    className: "tag late"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-shield-check",
    style: {
      fontSize: 11,
      marginRight: 3
    }
  }), "\uC2B9\uC778 \uD544\uC694") : /*#__PURE__*/React.createElement("span", {
    className: "scope"
  }, "\uC790\uB3D9");
}
function PlanScreen({
  onRun,
  onCancel,
  onPerm
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "ask"
  }, /*#__PURE__*/React.createElement("span", {
    className: "who"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-user"
  })), /*#__PURE__*/React.createElement("span", {
    className: "q"
  }, "\uC6D4\uAC04\uBCF4\uACE0 \uC790\uB8CC \uC815\uB9AC\uD574\uC11C \uC724\uC911\uC2DD \uB2D8\uAED8 \uBCF4\uB0B4\uC918")), /*#__PURE__*/React.createElement("div", {
    className: "answer"
  }, "\uC774\uB807\uAC8C \uD558\uACA0\uC2B5\uB2C8\uB2E4. \uC2B9\uC778\uC774 \uD544\uC694\uD55C \uB2E8\uACC4\uB294 \uC2E4\uD589 \uC911\uC5D0 \uBB3C\uC5B4\uBD05\uB2C8\uB2E4."), /*#__PURE__*/React.createElement("div", {
    className: "hero dots"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kick",
    style: {
      color: "var(--acc)"
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-list-check"
  }), "\uC2E4\uD589 \uACC4\uD68D", /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "\xB7 5\uB2E8\uACC4")), /*#__PURE__*/React.createElement("div", {
    className: "plist"
  }, PLAN.map((s, i) => /*#__PURE__*/React.createElement("div", {
    className: "pstep",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, i + 1), /*#__PURE__*/React.createElement("i", {
    className: "ti " + s.ico,
    style: {
      fontSize: 14,
      color: "var(--pf)",
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "t"
  }, s.t), /*#__PURE__*/React.createElement(RiskTag, {
    on: s.risk
  })))), /*#__PURE__*/React.createElement("div", {
    className: "src"
  }, "\uD30C\uC77C 3\uAC1C \xB7 \uC0AC\uC774\uD2B8 1\uACF3 \xB7 \uC2B9\uC778 \uD544\uC694 2\uAC74 \xB7 \uC608\uC0C1 40\uCD08"), /*#__PURE__*/React.createElement("div", {
    className: "acts"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: onRun
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-player-play"
  }), "\uC2E4\uD589"), /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: onPerm
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-lock"
  }), "\uAD8C\uD55C \uD655\uC778"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: onCancel
  }, "\uCDE8\uC18C"))), /*#__PURE__*/React.createElement("button", {
    className: "trace"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-chevron-right"
  }), "\uB2E8\uACC4 \uD3B8\uC9D1"));
}
function RunningScreen({
  onDone
}) {
  const [at, setAt] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [held, setHeld] = React.useState(false);
  React.useEffect(() => {
    if (paused || held) return;
    if (at >= PLAN.length) {
      const d = setTimeout(onDone, 700);
      return () => clearTimeout(d);
    }
    if (PLAN[at].risk) {
      setHeld(true);
      return;
    }
    const t = setTimeout(() => setAt(a => a + 1), 1100);
    return () => clearTimeout(t);
  }, [at, paused, held]);
  const pct = Math.round(Math.min(at, PLAN.length) / PLAN.length * 100);
  const cur = PLAN[Math.min(at, PLAN.length - 1)];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("h1", null, "\uC2E4\uD589 \uC911"), /*#__PURE__*/React.createElement("div", {
    className: "counts"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cnt",
    style: {
      cursor: "default"
    }
  }, "\uB2E8\uACC4 ", /*#__PURE__*/React.createElement("b", null, Math.min(at + 1, PLAN.length), "/", PLAN.length)))), /*#__PURE__*/React.createElement("div", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kick",
    style: {
      color: held ? "var(--warn)" : "var(--acc)"
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti " + (held ? "ti-shield-check" : paused ? "ti-player-pause" : "ti-loader-2")
  }), held ? "승인을 기다리는 중" : paused ? "일시 정지됨" : "몰두봇이 작업하고 있습니다"), /*#__PURE__*/React.createElement("div", {
    className: "plist"
  }, PLAN.map((s, i) => /*#__PURE__*/React.createElement("div", {
    className: "pstep" + (i < at ? " done" : i === at ? " now" : ""),
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, i < at ? "✓" : i + 1), /*#__PURE__*/React.createElement("i", {
    className: "ti " + s.ico,
    style: {
      fontSize: 14,
      color: "var(--pf)",
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "t"
  }, s.t), i === at && !held && /*#__PURE__*/React.createElement("span", {
    className: "scope"
  }, "\uC9C4\uD589 \uC911"), i > at && s.risk && /*#__PURE__*/React.createElement(RiskTag, {
    on: true
  })))), /*#__PURE__*/React.createElement("div", {
    className: "prog"
  }, /*#__PURE__*/React.createElement("i", {
    style: {
      width: pct + "%"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "acts"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => setPaused(p => !p),
    disabled: held
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti " + (paused ? "ti-player-play" : "ti-player-pause")
  }), paused ? "이어서" : "일시 정지"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: onDone
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-player-stop"
  }), "\uC911\uB2E8"), /*#__PURE__*/React.createElement("span", {
    className: "soon",
    style: {
      marginLeft: "auto"
    }
  }, cur.k))), held && /*#__PURE__*/React.createElement("div", {
    className: "approval"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ahead"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-alert-triangle"
  }), PLAN[at].k, " \u2014 \uC2B9\uC778\uC774 \uD544\uC694\uD574\uC694"), /*#__PURE__*/React.createElement("div", {
    className: "target"
  }, PLAN[at].t), /*#__PURE__*/React.createElement("div", {
    className: "ameta"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-arrow-back-up"
  }), PLAN[at].k === "발송" ? "발송 후 되돌릴 수 없음" : "이전 파일은 30일간 보관 · 되돌릴 수 있음"), /*#__PURE__*/React.createElement("div", {
    className: "aacts"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => {
      setHeld(false);
      setAt(a => a + 2 > PLAN.length ? PLAN.length : a + 1);
    }
  }, "\uAC74\uB108\uB6F0\uAE30"), /*#__PURE__*/React.createElement("button", {
    className: "btn ok",
    onClick: () => {
      setHeld(false);
      setAt(a => a + 1);
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-check"
  }), "\uC2B9\uC778"))));
}
const CHANGES = [{
  t: "요약본_2026-07.xlsx",
  m: "덮어씀 · 이전 파일 보관됨",
  u: true,
  ico: "ti-file-text"
}, {
  t: "월간보고_초안.docx",
  m: "새로 만듦 · 바탕화면 › 월간보고",
  u: true,
  ico: "ti-file-plus"
}, {
  t: "사내 위키 — 7월 운영지표",
  m: "읽음 · 변경 없음",
  u: null,
  ico: "ti-world"
}, {
  t: "윤중식 · [월보] 2026-07 월간운영 보고",
  m: "발송됨 · 16:52",
  u: false,
  ico: "ti-send"
}];
function ResultScreen({
  onPlan
}) {
  const [undone, setUndone] = React.useState([]);
  const undo = i => setUndone(u => u.includes(i) ? u : [...u, i]);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("h1", null, "\uC791\uC5C5 \uC644\uB8CC"), /*#__PURE__*/React.createElement("div", {
    className: "counts"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cnt",
    style: {
      cursor: "default"
    }
  }, "\uBC14\uB01C ", /*#__PURE__*/React.createElement("b", null, "3")))), /*#__PURE__*/React.createElement("div", {
    className: "answer"
  }, "5\uB2E8\uACC4\uB97C \uB9C8\uCCE4\uC2B5\uB2C8\uB2E4. \uD30C\uC77C 2\uAC1C\uB97C \uBC14\uAFB8\uACE0 \uBA54\uC77C 1\uAC74\uC744 \uBCF4\uB0C8\uC2B5\uB2C8\uB2E4."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, "\uBC14\uB010 \uAC83", /*#__PURE__*/React.createElement("span", {
    className: "line"
  }), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, "4")), CHANGES.map((c, i) => /*#__PURE__*/React.createElement("div", {
    className: "row",
    key: i,
    style: {
      marginBottom: 6,
      opacity: undone.includes(i) ? .5 : 1
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti " + c.ico,
    style: {
      fontSize: 15,
      color: "var(--pf)",
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, c.t), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, undone.includes(i) ? "되돌림" : c.m)), c.u && !undone.includes(i) && /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => undo(i)
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-arrow-back-up"
  }), "\uB418\uB3CC\uB9AC\uAE30"), c.u === false && /*#__PURE__*/React.createElement("span", {
    className: "scope"
  }, "\uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC74C"), c.u === null && /*#__PURE__*/React.createElement("span", {
    className: "scope"
  }, "\uC77D\uAE30")))), /*#__PURE__*/React.createElement("div", {
    className: "acts",
    style: {
      marginTop: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: () => setUndone([0, 1])
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-arrow-back-up"
  }), "\uC804\uCCB4 \uB418\uB3CC\uB9AC\uAE30"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost",
    onClick: onPlan
  }, "\uAC19\uC740 \uC791\uC5C5 \uB2E4\uC2DC"), /*#__PURE__*/React.createElement("span", {
    className: "soon",
    style: {
      marginLeft: "auto"
    }
  }, "Outlook \uADFC\uAC70 \xB7 16:52")));
}
const PLACES = [["폴더", [["바탕화면 › 월간보고", "읽기 · 쓰기", true], ["문서", "읽기", true], ["다운로드", "차단됨", false]]], ["사이트", [["사내 위키", "읽기", true], ["그룹웨어", "읽기", true], ["그 외 사이트", "열 때마다 승인", false]]]];
const ACTIONS = [["파일 읽기", 0], ["새 파일 만들기", 0], ["기존 파일 덮어쓰기", 1], ["파일 삭제", 1], ["메일 발송", 1], ["외부 사이트 열기", 1], ["결제 · 구매", 2]];
const LEVELS = ["항상 허용", "승인 필요", "차단"];
function PermissionScreen({
  onBack
}) {
  const [places, setPlaces] = React.useState(() => PLACES.map(([, rows]) => rows.map(r => r[2])));
  const [acts, setActs] = React.useState(() => ACTIONS.map(a => a[1]));
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("h1", null, "\uAD8C\uD55C"), /*#__PURE__*/React.createElement("div", {
    className: "counts"
  }, onBack && /*#__PURE__*/React.createElement("button", {
    className: "cnt",
    onClick: onBack
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-arrow-left",
    style: {
      fontSize: 12,
      marginRight: 4
    }
  }), "\uB3CC\uC544\uAC00\uAE30"), /*#__PURE__*/React.createElement("span", {
    className: "cnt",
    style: {
      cursor: "default"
    }
  }, "\uC2B9\uC778 \uD544\uC694 ", /*#__PURE__*/React.createElement("b", null, acts.filter(a => a === 1).length)))), /*#__PURE__*/React.createElement("div", {
    className: "answer",
    style: {
      fontSize: 13,
      color: "var(--pm)"
    }
  }, "\uBAB0\uB450\uBD07\uC774 \uAC74\uB4DC\uB824\uB3C4 \uB418\uB294 \uACF3\uACFC, \uBB3C\uC5B4\uBD10\uC57C \uD558\uB294 \uB3D9\uC791\uC744 \uC815\uD569\uB2C8\uB2E4."), PLACES.map(([label, rows], gi) => /*#__PURE__*/React.createElement("div", {
    key: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, label, /*#__PURE__*/React.createElement("span", {
    className: "line"
  })), rows.map(([t, m], i) => /*#__PURE__*/React.createElement("div", {
    className: "row",
    key: t,
    style: {
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti " + (gi ? "ti-world" : "ti-folder"),
    style: {
      fontSize: 15,
      color: "var(--pf)",
      flex: "none"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, t), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, m)), /*#__PURE__*/React.createElement("button", {
    className: "sw" + (places[gi][i] ? " on" : ""),
    "aria-label": t,
    onClick: () => setPlaces(p => p.map((g, j) => j === gi ? g.map((v, k) => k === i ? !v : v) : g))
  }, /*#__PURE__*/React.createElement("b", null)))))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, "\uB3D9\uC791", /*#__PURE__*/React.createElement("span", {
    className: "line"
  })), ACTIONS.map(([t], i) => /*#__PURE__*/React.createElement("div", {
    className: "row",
    key: t,
    style: {
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, t)), /*#__PURE__*/React.createElement("div", {
    className: "tri"
  }, LEVELS.map((l, li) => /*#__PURE__*/React.createElement("button", {
    key: l,
    className: acts[i] === li ? "on" : "",
    onClick: () => setActs(a => a.map((v, j) => j === i ? li : v))
  }, l)))))), /*#__PURE__*/React.createElement("div", {
    className: "ameta",
    style: {
      fontSize: 11,
      color: "var(--pf)",
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-shield-check"
  }), "\uC2B9\uC778 \uD544\uC694 \uD56D\uBAA9\uC740 \uC2E4\uD589 \uC911\uC5D0 \uD55C \uBC88\uC529 \uBB3C\uC5B4\uBD05\uB2C8\uB2E4"));
}
Object.assign(window, {
  PlanScreen,
  RunningScreen,
  ResultScreen,
  PermissionScreen,
  RiskTag,
  PLAN,
  CHANGES
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/desktop-panel/Control.jsx", error: String((e && e.message) || e) }); }

// ui_kits/desktop-panel/Panel.jsx
try { (() => {
/* 몰두봇 desktop panel UI kit — screens for the resident floating launcher.
   Structure mirrors moldubot3: statusline / stream / composer, right side = artifact panel.
   Copy is taken from the running app and docs/design/06-ui-spec.md. */

// 오브 얼굴 — DotMatrixDisplay.cs와 같은 21×16 도트 그리드, pitch 8, 도트 반지름 pitch*0.33.
const ORB_COLS = 21,
  ORB_ROWS = 16;
const SPRITES = {
  idle: {
    c: "#63E04B",
    rows: ["", "", "", "", "....XXXX.....XXXX....", "...XXXXXX...XXXXXX...", "...XXXXXX...XXXXXX...", "...XXXXXX...XXXXXX...", "....XXXX.....XXXX...."]
  },
  wink: {
    c: "#FFD23E",
    rows: ["", "", "", ".......X.............", "....XXX.X....XXXX....", "...XX....X..XXXXXX...", "....XXX.X...XXXXXX...", ".......X....XXXXXX...", ".............XXXX...."]
  },
  mail: {
    c: "#FF6B5E",
    rows: ["", "", "", "....XXXXXXXXXXXXX....", "....X...........X....", "....XX.........XX....", "....X.XX.....XX.X....", "....X...XX.XX...X....", "....X.....X.....X....", "....X...........X....", "....XXXXXXXXXXXXX...."]
  },
  bell: {
    c: "#FFB84D",
    rows: ["", "", "....XX...XX....", "...XXX...XXX...", ".....XXXXX.....", "....X.....X....", "...X.......X...", "...X.......X...", "...X.......X...", "...X.......X...", "....X.....X....", ".....XXXXX.....", "....X.....X...."].map(r => r ? "...".slice(0, 3) + r : r)
  },
  clock: {
    c: "#E9F56B",
    rows: ["", "", "......XXXXXXXXX......", "......X.......X......", ".......X.....X.......", "........X...X........", ".........XXX.........", "........X...X........", ".......X.....X.......", "......X..XXX..X......", "......X.XXXXX.X......", "......XXXXXXXXX......"]
  }
};
function Orb({
  face = "idle",
  busy = false,
  onClick,
  title
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext("2d");
    const P = cv.width / ORB_COLS,
      r = P * 0.33;
    const ox = (cv.width - ORB_COLS * P) / 2 + P / 2,
      oy = (cv.height - ORB_ROWS * P) / 2 + P / 2;
    const panelR = cv.width / 2 - 2;
    const sp = SPRITES[face] || SPRITES.idle;
    g.clearRect(0, 0, cv.width, cv.height);
    for (let row = 0; row < ORB_ROWS; row++) {
      for (let col = 0; col < ORB_COLS; col++) {
        const cx = ox + col * P,
          cy = oy + row * P;
        const dx = cx - cv.width / 2,
          dy = cy - cv.height / 2;
        if (Math.sqrt(dx * dx + dy * dy) > panelR - r - 0.5) continue;
        const on = sp.rows[row] && sp.rows[row][col] === "X";
        if (on) {
          g.beginPath();
          g.arc(cx, cy, r * 1.65, 0, 6.284);
          g.fillStyle = sp.c;
          g.globalAlpha = 0.16;
          g.fill();
          g.globalAlpha = 1;
          g.beginPath();
          g.arc(cx, cy, r, 0, 6.284);
          g.fillStyle = sp.c;
          g.fill();
        } else {
          g.beginPath();
          g.arc(cx, cy, r * 0.42, 0, 6.284);
          g.fillStyle = "#313437";
          g.globalAlpha = 0.72;
          g.fill();
          g.globalAlpha = 1;
        }
      }
    }
  }, [face]);
  return /*#__PURE__*/React.createElement("button", {
    className: "orb" + (busy ? " busy" : ""),
    onClick: onClick,
    title: title,
    "aria-label": title
  }, /*#__PURE__*/React.createElement("span", {
    className: "led"
  }, /*#__PURE__*/React.createElement("canvas", {
    ref: ref,
    width: "168",
    height: "168"
  })), /*#__PURE__*/React.createElement("span", {
    className: "gloss"
  }));
}
function Toast({
  onClose
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "bubble",
    style: {
      width: 320
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tail"
  }), /*#__PURE__*/React.createElement("div", {
    className: "bubble-body",
    style: {
      borderRadius: 17
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "bubble-icon round"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-mail"
  })), /*#__PURE__*/React.createElement("span", {
    className: "bubble-txt"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bubble-t"
  }, "\uB2F5\uC7A5\uC774 \uD544\uC694\uD55C \uBA54\uC77C"), /*#__PURE__*/React.createElement("span", {
    className: "bubble-m"
  }, "\uBC15\uC81C\uC601 \xB7 \uBC30\uD3EC \uD655\uC778 \uAC74 \xB7 \uC624\uC804 10:41")), /*#__PURE__*/React.createElement("button", {
    className: "bubble-x",
    onClick: onClose,
    "aria-label": "\uB2EB\uAE30"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-x"
  }))));
}
function Peek({
  onClose
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "bubble",
    style: {
      width: 300
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tail"
  }), /*#__PURE__*/React.createElement("div", {
    className: "bubble-body",
    style: {
      borderRadius: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "bubble-icon"
  }, "W"), /*#__PURE__*/React.createElement("span", {
    className: "bubble-txt"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bubble-t"
  }, "\uC5C5\uBB34\uC77C\uC9C0_\uBB38\uC11C.docx"), /*#__PURE__*/React.createElement("span", {
    className: "bubble-m",
    style: {
      color: "#A9C1FF"
    }
  }, "\uD074\uB9AD\uD574\uC11C \uC694\uC57D \uBCF4\uAE30")), /*#__PURE__*/React.createElement("button", {
    className: "bubble-x",
    onClick: onClose,
    "aria-label": "\uB2EB\uAE30"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-x"
  }))));
}
function StatusLine({
  when = "8월 15일 토요일"
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "statusline"
  }, /*#__PURE__*/React.createElement("span", {
    className: "live"
  }), /*#__PURE__*/React.createElement("span", {
    className: "model"
  }, "Local SLM \xB7 Qwen3.5-4B-Q4_K_M \xB7 16K"), /*#__PURE__*/React.createElement("span", {
    className: "when"
  }, when));
}
function Composer({
  focus,
  onClearFocus,
  onSubmit,
  signals = true
}) {
  const [v, setV] = React.useState("");
  const ph = focus ? `『${focus}』에 대해 물어보기…` : "확인하거나 실행할 업무를 입력하세요...";
  return /*#__PURE__*/React.createElement("form", {
    className: "composer",
    onSubmit: e => {
      e.preventDefault();
      if (v.trim()) {
        onSubmit && onSubmit(v);
        setV("");
      }
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-sparkles spark"
  }), focus && /*#__PURE__*/React.createElement("span", {
    className: "focustag"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-pin"
  }), /*#__PURE__*/React.createElement("span", {
    className: "t"
  }, focus), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClearFocus,
    "aria-label": "\uD3EC\uCEE4\uC2A4 \uD574\uC81C"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-x"
  }))), /*#__PURE__*/React.createElement("span", {
    className: "field"
  }, /*#__PURE__*/React.createElement("input", {
    value: v,
    onChange: e => setV(e.target.value),
    placeholder: ph
  })), signals && /*#__PURE__*/React.createElement("span", {
    className: "sigs"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "sig",
    style: {
      color: "var(--sig-mail)",
      background: "var(--sig-mail-bg)"
    },
    title: "\uC0C8 \uBA54\uC77C 1\uAC74"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-mail"
  }), /*#__PURE__*/React.createElement("span", {
    className: "sig-badge urgent"
  }, "1")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "sig",
    style: {
      color: "var(--sig-bell)",
      background: "var(--sig-bell-bg)"
    },
    title: "\uC54C\uB9BC 6\uAC74"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-bell"
  }), /*#__PURE__*/React.createElement("span", {
    className: "sig-badge neutral"
  }, "6"))), /*#__PURE__*/React.createElement("span", {
    className: "kbd"
  }, "\u2325Space"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "mic",
    title: "\uC74C\uC131 \uC785\uB825"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-microphone"
  })));
}
function Counts({
  onOverdue
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "counts"
  }, /*#__PURE__*/React.createElement("button", {
    className: "cnt"
  }, "\uC77C\uC815 ", /*#__PURE__*/React.createElement("b", null, "1")), /*#__PURE__*/React.createElement("button", {
    className: "cnt"
  }, "\uD560 \uC77C ", /*#__PURE__*/React.createElement("b", null, "2")), /*#__PURE__*/React.createElement("button", {
    className: "cnt"
  }, "\uD6C4\uC18D ", /*#__PURE__*/React.createElement("b", null, "6")), /*#__PURE__*/React.createElement("button", {
    className: "cnt urgent",
    onClick: onOverdue
  }, "\uC9C0\uC5F0 ", /*#__PURE__*/React.createElement("b", null, "8")));
}
function Hero({
  dots,
  onDraft
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "hero" + (dots ? " dots" : "")
  }, /*#__PURE__*/React.createElement("div", {
    className: "kick"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-flag-2"
  }), "\uCD94\uCC9C \uC561\uC158", /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "\xB7 \uC9C0\uC5F0 8-12")), /*#__PURE__*/React.createElement("h2", null, "\uC7AC\uBC1C\uC1A1 : [\uC6D4\uBCF4] 2026-07 \uC6D4\uAC04\uC6B4\uC601 \uBCF4\uACE0"), /*#__PURE__*/React.createElement("div", {
    className: "src"
  }, "\uC6D0\uBCF8 \xB7 \uD50C\uB798\uADF8 \uBA54\uC77C"), /*#__PURE__*/React.createElement("div", {
    className: "acts"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: onDraft
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-pencil"
  }), "\uB2F5\uC7A5 \uCD08\uC548 \uB9CC\uB4E4\uAE30"), /*#__PURE__*/React.createElement("button", {
    className: "btn"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-mail-opened"
  }), "\uD6C4\uC18D \uBA54\uC77C \uC5F4\uAE30"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost"
  }, "\uB098\uC911\uC5D0"), /*#__PURE__*/React.createElement("span", {
    className: "soon",
    style: {
      marginLeft: "auto"
    }
  }, "\uC900\uBE44 \uC911")));
}
function BriefingScreen({
  onDraft,
  onOverdue
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("h1", null, "\uC624\uB298 \uC5C5\uBB34"), /*#__PURE__*/React.createElement(Counts, {
    onOverdue: onOverdue
  })), /*#__PURE__*/React.createElement(Hero, {
    onDraft: onDraft
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, "\uB2E4\uB978 \uD56D\uBAA9 \uCD94\uCC9C", /*#__PURE__*/React.createElement("span", {
    className: "line"
  }), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, "1")), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "[\uBCF4\uC548\uC6B4\uC601] \uB0B4\uBD80 \uAD6C\uC131\uC6D0 \uAC04 \uAC1C\uC778\uC815\uBCF4 \uBA54\uC77C \uCC28\uB2E8 \uAD00\uB828 \uC9C4\uD589 \uC0C1\uD669 \uD655\uC778"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, "\uC9C0\uC5F0 \uBA54\uC77C \uD655\uC778 \xB7 \uC6D0\uBCF8 \xB7 \uD50C\uB798\uADF8 \uBA54\uC77C")), /*#__PURE__*/React.createElement("button", {
    className: "btn"
  }, "\uBA54\uC77C \uC5F4\uAE30"))), /*#__PURE__*/React.createElement("div", {
    className: "cols"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "colhd"
  }, /*#__PURE__*/React.createElement("span", null, "\uC624\uB298 \uC77C\uC815"), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, "1")), /*#__PURE__*/React.createElement("div", {
    className: "item"
  }, /*#__PURE__*/React.createElement("span", {
    className: "accent"
  }), /*#__PURE__*/React.createElement("div", {
    className: "txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "\uAE08\uD638\uC0DD\uBA85 \uC554\uBCF4\uD5D8 \uC778\uCD9C"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, "10:00\u201310:00")), /*#__PURE__*/React.createElement("span", {
    className: "time"
  }, "10:00"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "colhd"
  }, /*#__PURE__*/React.createElement("span", null, "\uD560 \uC77C"), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, "2")), /*#__PURE__*/React.createElement("div", {
    className: "item todo"
  }, /*#__PURE__*/React.createElement("span", {
    className: "accent"
  }), /*#__PURE__*/React.createElement("div", {
    className: "txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "SSO Oracle \uC554\uD638 \uBCC0\uACBD"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, "Outlook \uC791\uC5C5 ", /*#__PURE__*/React.createElement("span", {
    className: "late"
  }, "\uC9C0\uC5F0 2-24")))), /*#__PURE__*/React.createElement("div", {
    className: "item todo"
  }, /*#__PURE__*/React.createElement("span", {
    className: "accent"
  }), /*#__PURE__*/React.createElement("div", {
    className: "txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "\uADF8\uB8F9\uBA54\uC77C \uC8FC\uC18C \uC0DD\uC131"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, "Outlook \uC791\uC5C5"))))));
}
const MAILS = [{
  i: "박",
  n: "박제영",
  t: "회신 필요",
  s: "배포 확인 건",
  p: "배포는 아직 완료되지 않았습니다. 현재 인증 오류를 확인 중이며…",
  tag: "reply"
}, {
  i: "윤",
  n: "윤중식",
  t: "지연 27일",
  s: "[월보] 2026-07 월간운영 보고 회신 요청",
  p: "월간운영 보고 관련하여 확인 부탁드립니다.",
  tag: "late"
}, {
  i: "배",
  n: "배수민",
  t: null,
  s: "FW: [D-1 Remind] AI Asset 등록",
  p: "등록 마감이 하루 남았습니다.",
  tag: null
}];
function ConversationScreen({
  onDraft,
  sent
}) {
  const [open, setOpen] = React.useState(false);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "ask"
  }, /*#__PURE__*/React.createElement("span", {
    className: "who"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-user"
  })), /*#__PURE__*/React.createElement("span", {
    className: "q"
  }, "\uC6D4\uAC04\uC6B4\uC601 \uBCF4\uACE0 \uC5B4\uB5BB\uAC8C \uB410\uC5B4?")), sent && /*#__PURE__*/React.createElement("div", {
    className: "row",
    style: {
      borderColor: "var(--ok)"
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-check",
    style: {
      color: "var(--ok)",
      fontSize: 15
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "\uBA54\uC77C \uBC1C\uC1A1\uB428"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, "\uC724\uC911\uC2DD \xB7 [\uC6D4\uBCF4] 2026-07 \uC7AC\uBC1C\uC1A1 \xB7 \uC624\uC804 10:52"))), /*#__PURE__*/React.createElement("div", {
    className: "answer"
  }, "\uC7AC\uBC1C\uC1A1 \uC694\uCCAD \uC774\uD6C4 ", /*#__PURE__*/React.createElement("b", null, "27\uC77C\uC9F8 \uD68C\uC2E0\uC774 \uC5C6\uC2B5\uB2C8\uB2E4"), ". \uAD00\uB828 \uBA54\uC77C 3\uAC74\uC744 \uC2DC\uAC04\uC21C\uC73C\uB85C \uC5EE\uC5B4 \uBCF4\uBA74 \uC778\uC99D \uC624\uB958 \uD655\uC778 \uB2E8\uACC4\uC5D0\uC11C \uBA48\uCDB0 \uC788\uACE0, \uC774\uD6C4 \uC9C4\uD589\uC744 \uD655\uC778\uD55C \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uBCD1\uBAA9\uC740 ", /*#__PURE__*/React.createElement("b", null, "\uBC15\uC81C\uC601"), "\uC758 \uBC30\uD3EC \uD655\uC778 \uD68C\uC2E0\uC785\uB2C8\uB2E4."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, "\uAD00\uB828 \uBA54\uC77C", /*#__PURE__*/React.createElement("span", {
    className: "line"
  }), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, "3")), MAILS.map(m => /*#__PURE__*/React.createElement("div", {
    className: "mailrow",
    key: m.s,
    style: {
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "av"
  }, m.i), /*#__PURE__*/React.createElement("span", {
    className: "txt"
  }, /*#__PURE__*/React.createElement("span", {
    className: "t"
  }, /*#__PURE__*/React.createElement("span", {
    className: "s"
  }, m.s), m.t && /*#__PURE__*/React.createElement("span", {
    className: "tag " + (m.tag === "late" ? "late" : "reply")
  }, m.t)), /*#__PURE__*/React.createElement("span", {
    className: "p"
  }, m.n, " \xB7 ", m.p))))), /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, /*#__PURE__*/React.createElement("button", {
    className: "chip first",
    onClick: onDraft
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-pencil"
  }), "\uB3C5\uCD09 \uBA54\uC77C \uCD08\uC548 \uB9CC\uB4E4\uAE30"), /*#__PURE__*/React.createElement("button", {
    className: "chip"
  }, "\uBCD1\uBAA9 \uB2E8\uACC4 \uC790\uC138\uD788 \uBCF4\uAE30"), /*#__PURE__*/React.createElement("button", {
    className: "chip"
  }, "\uD68C\uC2E0 \uAE30\uD55C \uC77C\uC815 \uB4F1\uB85D")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    className: "trace",
    onClick: () => setOpen(!open)
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-chevron-" + (open ? "down" : "right")
  }), "\uC791\uC5C5 \uACFC\uC815 3\uB2E8\uACC4 \xB7 \uBA54\uC77C \uAC80\uC0C9 \u2192 \uBD84\uC11D \u2192 \uC885\uD569"), open && /*#__PURE__*/React.createElement("div", {
    className: "steps"
  }, /*#__PURE__*/React.createElement("div", {
    className: "step done"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "\uBA54\uC77C \uAC80\uC0C9 \u2014 \uCCA8\uBD80\xB7\uB3D9\uC758\uC5B4 \uD655\uC7A5\uC73C\uB85C 12\uAC74 \uC870\uD68C", /*#__PURE__*/React.createElement("span", {
    className: "ag"
  }, "mail")), /*#__PURE__*/React.createElement("div", {
    className: "step done"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "\uD0C0\uC784\uB77C\uC778 \uBD84\uC11D \u2014 \uBBF8\uACB0 3\uAC74 \uC2DD\uBCC4", /*#__PURE__*/React.createElement("span", {
    className: "ag"
  }, "insight")), /*#__PURE__*/React.createElement("div", {
    className: "step done"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "\uC885\uD569 \u2014 \uBCD1\uBAA9 \uD310\uB2E8 + \uB2E4\uC74C \uC561\uC158 \uC81C\uC548", /*#__PURE__*/React.createElement("span", {
    className: "ag"
  }, "supervisor")))));
}
function ApprovalScreen({
  onApprove,
  onReject
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "ask"
  }, /*#__PURE__*/React.createElement("span", {
    className: "who"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-user"
  })), /*#__PURE__*/React.createElement("span", {
    className: "q"
  }, "\uC774 \uB0B4\uC6A9\uC73C\uB85C \uC724\uC911\uC2DD \uB2D8\uAED8 \uBCF4\uB0B4\uC918")), /*#__PURE__*/React.createElement("div", {
    className: "answer"
  }, "\uCD08\uC548\uC744 \uC900\uBE44\uD588\uC2B5\uB2C8\uB2E4. \uBC1C\uC1A1 \uC804\uC5D0 \uD655\uC778\uD574 \uC8FC\uC138\uC694."), /*#__PURE__*/React.createElement("div", {
    className: "approval"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ahead"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-shield-check"
  }), "\uBA54\uC77C \uBC1C\uC1A1 \u2014 \uC2B9\uC778\uC774 \uD544\uC694\uD574\uC694"), /*#__PURE__*/React.createElement("div", {
    className: "target"
  }, "\uC724\uC911\uC2DD \xB7 [\uC6D4\uBCF4] 2026-07 \uC6D4\uAC04\uC6B4\uC601 \uBCF4\uACE0 \uC7AC\uBC1C\uC1A1"), /*#__PURE__*/React.createElement("div", {
    className: "prev"
  }, "안녕하세요, 윤중식님.\n\n7월 월간운영 보고 관련 회신을 기다리고 있어 다시 보내드립니다.\n인증 오류 확인이 완료되면 알려주시면 이후 절차를 이어가겠습니다.\n\n감사합니다."), /*#__PURE__*/React.createElement("div", {
    className: "ameta"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-alert-triangle"
  }), "\uC678\uBD80 \uC804\uC1A1 \uC5C6\uC74C \xB7 \uBC1C\uC1A1 \uD6C4 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC74C"), /*#__PURE__*/React.createElement("div", {
    className: "aacts"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: onReject
  }, "\uAC70\uBD80"), /*#__PURE__*/React.createElement("button", {
    className: "btn ok",
    onClick: onApprove
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-send"
  }), "\uC2B9\uC778"))));
}
function DraftArtifact({
  onClose,
  onSend
}) {
  return /*#__PURE__*/React.createElement("aside", {
    className: "artifact"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ahd"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-mail-plus"
  }), "\uB2F5\uC7A5 \uCD08\uC548", /*#__PURE__*/React.createElement("button", {
    className: "x",
    onClick: onClose,
    "aria-label": "\uB2EB\uAE30"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-x"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "abody"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fld"
  }, /*#__PURE__*/React.createElement("label", null, "TO"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "\uC724\uC911\uC2DD (YOON Joongshik)")), /*#__PURE__*/React.createElement("div", {
    className: "fld"
  }, /*#__PURE__*/React.createElement("label", null, "SUBJECT"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "[\uC6D4\uBCF4] 2026-07 \uC6D4\uAC04\uC6B4\uC601 \uBCF4\uACE0 \uC7AC\uBC1C\uC1A1")), /*#__PURE__*/React.createElement("div", {
    className: "fld"
  }, /*#__PURE__*/React.createElement("label", null, "BODY"), /*#__PURE__*/React.createElement("textarea", {
    defaultValue: "안녕하세요, 윤중식님.\n\n7월 월간운영 보고 관련 회신을 기다리고 있어 다시 보내드립니다.\n인증 오류 확인이 완료되면 알려주시면 이후 절차를 이어가겠습니다.\n\n감사합니다."
  })), /*#__PURE__*/React.createElement("div", {
    className: "hint"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-sparkles"
  }), "\uC790\uB3D9 \uC0DD\uC131\uB41C \uCD08\uC548\uC785\uB2C8\uB2E4")), /*#__PURE__*/React.createElement("div", {
    className: "afoot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    onClick: onClose
  }, "\uB2EB\uAE30"), /*#__PURE__*/React.createElement("button", {
    className: "btn primary",
    onClick: onSend
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-send"
  }), "\uBC1C\uC1A1 \uC2B9\uC778 \uC694\uCCAD")));
}
const SKILLS = [["daily-briefing", "Outlook Classic의 오늘 일정과 오늘까지 해야 할 일을 종합한다.", "매일 08:45"], ["weekly-planning", "Outlook Classic의 이번 주 일정과 미완료 할 일을 함께 정리한다.", "매주 월 09:00"], ["mail-summary", "Outlook Classic에서 열거나 선택한 현재 메일의 본문을 요약한다.", null], ["mail-follow-up", "현재 Outlook 메일에서 요청·기한·후속 행동을 근거와 함께 확인한다.", null], ["groupware-notices", "사용자가 연결한 HISK 그룹웨어 공지 화면에서 중요한 공지를 요약한다.", null], ["groupware-notice-detail", "연결된 HISK 공지 목록에서 사용자가 지정한 순번의 공지 하나를 열고 상세 본문을 요약한다.", null]];
function SkillsScreen() {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "head"
  }, /*#__PURE__*/React.createElement("h1", null, "\uC2A4\uD0AC"), /*#__PURE__*/React.createElement("div", {
    className: "counts"
  }, /*#__PURE__*/React.createElement("span", {
    className: "cnt",
    style: {
      cursor: "default"
    }
  }, "\uB4F1\uB85D ", /*#__PURE__*/React.createElement("b", null, "6")))), /*#__PURE__*/React.createElement("div", {
    className: "hero",
    style: {
      background: "var(--acc-bg)",
      border: "1px solid var(--acc-bd)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "kick",
    style: {
      color: "var(--acc)"
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-wand"
  }), "\uC2A4\uD0AC \uC81C\uC548", /*#__PURE__*/React.createElement("span", {
    className: "num"
  }, "\xB7 3\uD68C \uBC18\uBCF5")), /*#__PURE__*/React.createElement("h2", null, "\uC8FC\uAC04 \uBCF4\uACE0 \uBA54\uC77C \uC815\uB9AC\uB97C \uC2A4\uD0AC\uB85C \uB9CC\uB4E4\uAE4C\uC694?"), /*#__PURE__*/React.createElement("div", {
    className: "src"
  }, "\uC9C0\uB09C 3\uC8FC \uB3D9\uC548 \uAC19\uC740 \uD615\uD0DC\uB85C \uBC18\uBCF5\uD588\uC2B5\uB2C8\uB2E4 \xB7 \uB4F1\uB85D\uC740 \uC2B9\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4"), /*#__PURE__*/React.createElement("div", {
    className: "acts"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn primary"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-plus"
  }), "\uC2A4\uD0AC\uB85C \uB4F1\uB85D"), /*#__PURE__*/React.createElement("button", {
    className: "btn"
  }, "\uB0B4\uC6A9 \uBCF4\uAE30"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost"
  }, "\uC548 \uB9CC\uB4E4\uAE30"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, "\uB4F1\uB85D\uB41C \uC2A4\uD0AC", /*#__PURE__*/React.createElement("span", {
    className: "line"
  }), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, "6")), SKILLS.map(([name, desc, sched]) => /*#__PURE__*/React.createElement("div", {
    className: "item",
    key: name,
    style: {
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "accent",
    style: {
      background: sched ? "var(--ok)" : "var(--pf)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t",
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 11.5,
      letterSpacing: ".03em"
    }
  }, name, ".md"), /*#__PURE__*/React.createElement("div", {
    className: "m",
    style: {
      whiteSpace: "normal"
    }
  }, desc)), sched ? /*#__PURE__*/React.createElement("span", {
    className: "time",
    style: {
      color: "var(--ok)"
    }
  }, sched) : null))), /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, /*#__PURE__*/React.createElement("button", {
    className: "chip accent-first",
    style: {
      color: "var(--acc)",
      background: "var(--acc-bg)",
      borderColor: "var(--acc-bd)"
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-plus"
  }), "\uB300\uD654\uB85C \uC0C8 \uC2A4\uD0AC \uB9CC\uB4E4\uAE30"), /*#__PURE__*/React.createElement("button", {
    className: "chip"
  }, "\uC608\uC57D \uBAA9\uB85D \uBCF4\uAE30")));
}
function WindowAnalysisScreen() {
  const [open, setOpen] = React.useState(false);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "ask"
  }, /*#__PURE__*/React.createElement("span", {
    className: "who"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-arrow-down-to-arc"
  })), /*#__PURE__*/React.createElement("span", {
    className: "q"
  }, "\uC5C5\uBB34\uC77C\uC9C0_\uBB38\uC11C.docx \uCC3D\uC744 \uC624\uBE0C\uC5D0 \uB193\uC74C")), /*#__PURE__*/React.createElement("div", {
    className: "answer"
  }, "\uD611\uC758\uC0AC\uD56D\uC5D0\uC11C ", /*#__PURE__*/React.createElement("b", null, "\uD560 \uC77C 3\uAC74"), "\uC744 \uCC3E\uC558\uC2B5\uB2C8\uB2E4. \uAE30\uD55C\uC774 \uC801\uD78C \uAC83\uC740 2\uAC74\uC774\uACE0, \uB098\uBA38\uC9C0 1\uAC74\uC740 \uB2F4\uB2F9\uC790\uB9CC \uC788\uC2B5\uB2C8\uB2E4."), /*#__PURE__*/React.createElement("div", {
    style: {
      borderLeft: "3px solid var(--acc-bd)",
      paddingLeft: 10,
      fontSize: 12,
      color: "var(--pm)",
      lineHeight: 1.6
    }
  }, "\u201C\uACC4\uC815 \uC815\uCC45 \uAC1C\uC815\uC548\uC740 8/22\uAE4C\uC9C0 \uC815\uBCF4\uBCF4\uD638\uD300 \uAC80\uD1A0\uB97C \uBC1B\uACE0, \uADF8\uB8F9\uBA54\uC77C \uC8FC\uC18C \uC0DD\uC131\uC740 \uBC30\uD3EC \uC804\uAE4C\uC9C0 \uC644\uB8CC\uD55C\uB2E4.\u201D"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sect"
  }, "\uCD94\uCD9C\uD55C \uD560 \uC77C", /*#__PURE__*/React.createElement("span", {
    className: "line"
  }), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, "3")), /*#__PURE__*/React.createElement("div", {
    className: "item todo"
  }, /*#__PURE__*/React.createElement("span", {
    className: "accent"
  }), /*#__PURE__*/React.createElement("div", {
    className: "txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "\uACC4\uC815 \uC815\uCC45 \uAC1C\uC815\uC548 \uC815\uBCF4\uBCF4\uD638\uD300 \uAC80\uD1A0"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, "\uBB38\uC11C \xB7 \uD611\uC758\uC0AC\uD56D 2\uD56D")), /*#__PURE__*/React.createElement("span", {
    className: "time"
  }, "8-22")), /*#__PURE__*/React.createElement("div", {
    className: "item todo"
  }, /*#__PURE__*/React.createElement("span", {
    className: "accent"
  }), /*#__PURE__*/React.createElement("div", {
    className: "txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "\uADF8\uB8F9\uBA54\uC77C \uC8FC\uC18C \uC0DD\uC131"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, "\uBB38\uC11C \xB7 \uD611\uC758\uC0AC\uD56D 3\uD56D")), /*#__PURE__*/React.createElement("span", {
    className: "time"
  }, "\uBC30\uD3EC \uC804")), /*#__PURE__*/React.createElement("div", {
    className: "item todo"
  }, /*#__PURE__*/React.createElement("span", {
    className: "accent",
    style: {
      background: "var(--pf)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "txt"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t"
  }, "\uC6B4\uC601 \uC774\uAD00 \uB2F4\uB2F9\uC790 \uC9C0\uC815"), /*#__PURE__*/React.createElement("div", {
    className: "m"
  }, "\uBB38\uC11C \xB7 \uD611\uC758\uC0AC\uD56D 5\uD56D ", /*#__PURE__*/React.createElement("span", {
    className: "late"
  }, "\uAE30\uD55C \uC5C6\uC74C"))))), /*#__PURE__*/React.createElement("div", {
    className: "chips"
  }, /*#__PURE__*/React.createElement("button", {
    className: "chip",
    style: {
      color: "var(--acc)",
      background: "var(--acc-bg)",
      borderColor: "var(--acc-bd)"
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-plus"
  }), "\uD560 \uC77C 3\uAC74 \uB4F1\uB85D\uD558\uAE30"), /*#__PURE__*/React.createElement("button", {
    className: "chip"
  }, "\uAE30\uD55C \uC5C6\uB294 1\uAC74 \uD655\uC778"), /*#__PURE__*/React.createElement("button", {
    className: "chip"
  }, "\uBB38\uC11C \uC6D0\uBCF8 \uC5F4\uAE30")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    className: "trace",
    onClick: () => setOpen(!open)
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-chevron-" + (open ? "down" : "right")
  }), "\uC791\uC5C5 \uACFC\uC815 3\uB2E8\uACC4 \xB7 \uCC3D \uCEA1\uCC98 \u2192 \uBB38\uC790 \uC778\uC2DD \u2192 \uC561\uC158\uC544\uC774\uD15C \uCD94\uCD9C"), open && /*#__PURE__*/React.createElement("div", {
    className: "steps"
  }, /*#__PURE__*/React.createElement("div", {
    className: "step done"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "\uCC3D \uCEA1\uCC98 \u2014 \uD65C\uC131 \uCC3D 1\uC7A5", /*#__PURE__*/React.createElement("span", {
    className: "ag"
  }, "window")), /*#__PURE__*/React.createElement("div", {
    className: "step done"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "\uBB38\uC790 \uC778\uC2DD \u2014 Windows OCR", /*#__PURE__*/React.createElement("span", {
    className: "ag"
  }, "file")), /*#__PURE__*/React.createElement("div", {
    className: "step done"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "\uC561\uC158\uC544\uC774\uD15C \uCD94\uCD9C \u2014 \uAE30\uD55C 2\uAC74 \uD655\uC778", /*#__PURE__*/React.createElement("span", {
    className: "ag"
  }, "supervisor")))));
}
function Launcher({
  view,
  mode,
  onOrb,
  focus,
  setFocus,
  go,
  sent
}) {
  const wide = view === "focus";
  if (view === "bar") {
    return /*#__PURE__*/React.createElement("div", {
      className: "launcher bar-only"
    }, /*#__PURE__*/React.createElement(Composer, {
      onSubmit: () => go("chat")
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "launcher" + (wide ? " wide" : "")
  }, /*#__PURE__*/React.createElement(StatusLine, null), /*#__PURE__*/React.createElement("div", {
    className: "body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "stream"
  }, view === "brief" && /*#__PURE__*/React.createElement(BriefingScreen, {
    onDraft: () => {
      setFocus("[월보] 2026-07 월간운영 보고");
      go("focus");
    },
    onOverdue: () => go("chat")
  }), view === "chat" && /*#__PURE__*/React.createElement(ConversationScreen, {
    sent: sent,
    onDraft: () => {
      setFocus("[월보] 2026-07 월간운영 보고");
      go("focus");
    }
  }), view === "focus" && /*#__PURE__*/React.createElement(ConversationScreen, {
    sent: sent,
    onDraft: () => {}
  }), view === "approve" && /*#__PURE__*/React.createElement(ApprovalScreen, {
    onApprove: () => {
      setFocus(null);
      go("chat", true);
    },
    onReject: () => {
      setFocus(null);
      go("chat");
    }
  }), view === "skills" && /*#__PURE__*/React.createElement(SkillsScreen, null), view === "window" && /*#__PURE__*/React.createElement(WindowAnalysisScreen, null), view === "plan" && /*#__PURE__*/React.createElement(PlanScreen, {
    onRun: () => go("run"),
    onCancel: () => go("brief"),
    onPerm: () => go("perm")
  }), view === "run" && /*#__PURE__*/React.createElement(RunningScreen, {
    onDone: () => go("result")
  }), view === "result" && /*#__PURE__*/React.createElement(ResultScreen, {
    onPlan: () => go("plan")
  }), view === "perm" && /*#__PURE__*/React.createElement(PermissionScreen, {
    onBack: () => go("plan")
  }), view === "mail" && /*#__PURE__*/React.createElement(MailSummaryScreen, null)), wide && /*#__PURE__*/React.createElement(DraftArtifact, {
    onClose: () => {
      setFocus(null);
      go("chat");
    },
    onSend: () => go("approve")
  })), /*#__PURE__*/React.createElement(Composer, {
    focus: focus,
    onClearFocus: () => setFocus(null),
    onSubmit: () => go("chat"),
    signals: view !== "approve"
  }));
}
function KitApp() {
  const [mode, setMode] = React.useState("light");
  const [view, setView] = React.useState("brief");
  const [focus, setFocus] = React.useState(null);
  const [sent, setSent] = React.useState(false);
  const go = (v, wasSent) => {
    if (wasSent) setSent(true);
    setView(v);
  };
  const busy = view === "approve" || view === "window" || view === "run";
  const face = busy ? "clock" : view === "notify" ? "bell" : view === "bar" || view === "perm" ? "idle" : "wink";
  return /*#__PURE__*/React.createElement("div", {
    className: "kit",
    "data-mode": mode,
    "data-theme": mode === "light" ? "day" : undefined
  }, /*#__PURE__*/React.createElement("div", {
    className: "kit-bar"
  }, /*#__PURE__*/React.createElement("span", {
    className: "kit-lbl"
  }, "\uBAB0\uB450\uBD07 \xB7 \uB370\uC2A4\uD06C\uD1B1 \uC0C1\uC8FC \uD328\uB110"), /*#__PURE__*/React.createElement("div", {
    className: "seg"
  }, [["light", "라이트"], ["dark", "다크"]].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: mode === k ? "on" : "",
    onClick: () => setMode(k)
  }, l))), /*#__PURE__*/React.createElement("div", {
    className: "seg"
  }, [["bar", "접힘"], ["brief", "오늘 업무"], ["chat", "진행 보고"], ["focus", "초안 작성"], ["approve", "승인"], ["window", "창 분석"], ["skills", "스킬"], ["notify", "알림"], ["plan", "계획 확인"], ["run", "실행 중"], ["result", "결과"], ["perm", "권한"], ["mail", "메일 요약"]].map(([k, l]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    className: view === k ? "on" : "",
    onClick: () => {
      setView(k);
      setFocus(k === "focus" ? "[월보] 2026-07 월간운영 보고" : null);
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    className: "stage",
    "data-mode": mode
  }, /*#__PURE__*/React.createElement("div", {
    className: "dock"
  }, view === "notify" ? /*#__PURE__*/React.createElement(Toast, {
    onClose: () => setView("brief")
  }) : view === "window" ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Peek, {
    onClose: () => setView("brief")
  }), /*#__PURE__*/React.createElement(Launcher, {
    view: view,
    mode: mode,
    focus: focus,
    setFocus: setFocus,
    go: go,
    sent: sent
  })) : /*#__PURE__*/React.createElement(Launcher, {
    view: view,
    mode: mode,
    focus: focus,
    setFocus: setFocus,
    go: go,
    sent: sent
  }), /*#__PURE__*/React.createElement(Orb, {
    face: face,
    busy: busy,
    title: "\uBAB0\uB450\uBD07 \uC5F4\uAE30 / \uC811\uAE30",
    onClick: () => setView(view === "bar" ? "brief" : "bar")
  }))));
}
Object.assign(window, {
  Orb,
  Toast,
  Peek,
  SkillsScreen,
  WindowAnalysisScreen,
  StatusLine,
  Composer,
  Counts,
  Hero,
  BriefingScreen,
  ConversationScreen,
  ApprovalScreen,
  DraftArtifact,
  Launcher,
  KitApp
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/desktop-panel/Panel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/desktop-panel/Summary.jsx
try { (() => {
/* 몰두봇 — 메일 요약 화면.
   원칙: 메타는 짧게, 요약이 주인공, 원문은 접어둔다. 헤더 덤프와 URL은 절대 본문에 넣지 않는다. */

const MAIL = {
  from: "배수민",
  fromTeam: "AX Solution서비스4팀",
  subject: "반응 일별 다이제스트 — 2026년 8월 15일 토요일",
  at: "08-14 14:06",
  to: 3,
  points: ["8월 14일자 반응 지표 일별 집계가 첨부돼 있습니다.", "전일 대비 큰 변동은 없고, 별도 조치를 요청하지 않았습니다.", "수신자 3명 모두 참조이며 회신 요청은 없습니다."],
  excerpt: "안녕하세요. 8월 14일 기준 반응 일별 다이제스트를 공유드립니다. 상세 수치는 첨부 파일을 참고 부탁드립니다."
};
function MailSummaryScreen() {
  const [open, setOpen] = React.useState(false);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "ask"
  }, /*#__PURE__*/React.createElement("span", {
    className: "who"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-user"
  })), /*#__PURE__*/React.createElement("span", {
    className: "q"
  }, "\uD604\uC7AC \uBA54\uC77C \uC694\uC57D\uD574\uC918")), /*#__PURE__*/React.createElement("div", {
    className: "hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "kick",
    style: {
      color: "var(--acc)"
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-mail"
  }), "\uBA54\uC77C \uC694\uC57D"), /*#__PURE__*/React.createElement("div", {
    className: "mtitle"
  }, MAIL.subject), /*#__PURE__*/React.createElement("div", {
    className: "mmeta"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-user"
  }), MAIL.from, " \xB7 ", MAIL.fromTeam), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-users"
  }), "\uBC1B\uB294 \uC0AC\uB78C ", MAIL.to, "\uBA85"), /*#__PURE__*/React.createElement("span", {
    className: "mono"
  }, MAIL.at)), /*#__PURE__*/React.createElement("ul", {
    className: "points"
  }, MAIL.points.map((p, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, p))), /*#__PURE__*/React.createElement("div", {
    className: "acts"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn primary"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-pencil"
  }), "\uB2F5\uC7A5 \uCD08\uC548"), /*#__PURE__*/React.createElement("button", {
    className: "btn"
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-mail-opened"
  }), "\uC6D0\uBB38 \uC5F4\uAE30"), /*#__PURE__*/React.createElement("button", {
    className: "btn ghost"
  }, "\uB098\uC911\uC5D0"))), /*#__PURE__*/React.createElement("button", {
    className: "trace",
    onClick: () => setOpen(o => !o)
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti " + (open ? "ti-chevron-down" : "ti-chevron-right")
  }), "\uC6D0\uBB38 \uBC1C\uCDCC"), open && /*#__PURE__*/React.createElement("div", {
    className: "excerpt"
  }, MAIL.excerpt));
}
Object.assign(window, {
  MailSummaryScreen,
  MAIL
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/desktop-panel/Summary.jsx", error: String((e && e.message) || e) }); }

__ds_ns.OrbLed = __ds_scope.OrbLed;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.CountChip = __ds_scope.CountChip;

__ds_ns.SignalButton = __ds_scope.SignalButton;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.NotificationToast = __ds_scope.NotificationToast;

__ds_ns.OrbPeek = __ds_scope.OrbPeek;

__ds_ns.AgentTrace = __ds_scope.AgentTrace;

__ds_ns.ApprovalBox = __ds_scope.ApprovalBox;

__ds_ns.MailResultCard = __ds_scope.MailResultCard;

__ds_ns.PanelShell = __ds_scope.PanelShell;

})();
