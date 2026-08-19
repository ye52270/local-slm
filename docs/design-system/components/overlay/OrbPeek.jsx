// Windows/ContextPromptWindow.xaml — 300×78. 창을 오브에 끌어다 놓으면 뜨는 말풍선.
const peekWrapStyle = { display: "flex", alignItems: "center", width: 300, fontFamily: "var(--font-ui)" };
const peekTailStyle = { width: 10, height: 16, flex: "none", background: "rgba(27,31,42,.96)", clipPath: "polygon(100% 0,0 50%,100% 100%)" };
const peekBodyStyle = {
  flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
  borderRadius: 16, background: "rgba(27,31,42,.96)", border: "1px solid #53627D", cursor: "pointer",
};
const peekAppStyle = {
  width: 30, height: 30, flex: "none", borderRadius: 8, background: "#171B24",
  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#F5F7FF", fontWeight: 600,
};
const peekTextStyle = { fontSize: 12, color: "#F5F7FF", maxWidth: 185, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const peekActionStyle = { fontSize: 12, color: "#A9C1FF", marginTop: 2 };
const peekCloseStyle = { flex: "none", width: 24, height: 24, borderRadius: 12, border: 0, background: "transparent", color: "#8E9AB2", cursor: "pointer", fontSize: 13 };

export function OrbPeek({ app = "W", label, action = "클릭해서 요약 보기", onClick, onClose }) {
  return (
    <div style={peekWrapStyle}>
      <span style={peekTailStyle} />
      <div style={peekBodyStyle} onClick={onClick}>
        <span style={peekAppStyle}>{app}</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ ...peekTextStyle, display: "block" }}>{label}</span>
          <span style={{ ...peekActionStyle, display: "block" }}>{action}</span>
        </span>
        {onClose ? <button type="button" style={peekCloseStyle} onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="닫기"><i className="ti ti-x" /></button> : null}
      </div>
    </div>
  );
}
