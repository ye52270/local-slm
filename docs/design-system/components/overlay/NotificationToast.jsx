// Windows/OrbNotificationWindow.xaml — 320×84, 오브 옆에 뜨는 알림 말풍선.
const toastWrapStyle = { display: "flex", alignItems: "center", width: 320, fontFamily: "var(--font-ui)" };
const toastTailStyle = { width: 10, height: 16, flex: "none", background: "rgba(27,31,42,.96)", clipPath: "polygon(100% 0,0 50%,100% 100%)" };
const toastBodyStyle = {
  flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
  borderRadius: 17, background: "rgba(27,31,42,.96)", border: "1px solid #53627D", cursor: "pointer",
};
const toastIconStyle = {
  width: 30, height: 30, flex: "none", borderRadius: 15, background: "#242B3A",
  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#8FB0FF",
};
const toastTitleStyle = { fontSize: 12, fontWeight: 600, color: "#F5F7FF", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const toastMsgStyle = { fontSize: 12, color: "#C3CDDD", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const toastCloseStyle = { flex: "none", width: 24, height: 24, borderRadius: 12, border: 0, background: "transparent", color: "#8E9AB2", cursor: "pointer", fontSize: 13 };

export function NotificationToast({ icon = "mail", title, message, side = "left", onClick, onClose }) {
  return (
    <div style={toastWrapStyle}>
      {side === "left" ? <span style={toastTailStyle} /> : null}
      <div style={toastBodyStyle} onClick={onClick}>
        <span style={toastIconStyle}><i className={"ti ti-" + icon} aria-hidden="true" /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ ...toastTitleStyle, display: "block" }}>{title}</span>
          <span style={{ ...toastMsgStyle, display: "block" }}>{message}</span>
        </span>
        {onClose ? <button type="button" style={toastCloseStyle} onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="닫기"><i className="ti ti-x" /></button> : null}
      </div>
      {side === "right" ? <span style={{ ...toastTailStyle, clipPath: "polygon(0 0,100% 50%,0 100%)" }} /> : null}
    </div>
  );
}
