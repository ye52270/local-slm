const mailCardStyle = {
  display: "flex", gap: 10, padding: "9px 10px", alignItems: "flex-start", cursor: "pointer",
  borderRadius: "var(--radius-card-sm)", background: "var(--surface-item)",
  border: "0.5px solid var(--border-default)", fontFamily: "var(--font-ui)", width: "100%", textAlign: "left",
};
const mailAvatarStyle = {
  width: 26, height: 26, borderRadius: "50%", flex: "none", fontSize: 11.5, fontWeight: 600,
  background: "var(--accent-bg)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
};
const mailTextStyle = { minWidth: 0, flex: 1, display: "flex", flexDirection: "column" };
const mailSubjectStyle = { fontSize: 12.5, lineHeight: 1.35, display: "flex", alignItems: "center", gap: 6, minWidth: 0, color: "var(--text-primary)" };
const mailSubjectClamp = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 };
const mailPreviewStyle = { fontSize: 11.5, color: "var(--text-faint)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

export function MailResultCard({ sender, subject, preview, tag, onClick, style }) {
  const initial = sender ? sender.trim().charAt(0) : "·";
  return (
    <button type="button" style={{ ...mailCardStyle, ...style }} onClick={onClick}>
      <span style={mailAvatarStyle}>{initial}</span>
      <span style={mailTextStyle}>
        <span style={mailSubjectStyle}>
          <span style={mailSubjectClamp}>{subject}</span>
          {tag}
        </span>
        <span style={mailPreviewStyle}>{sender}{preview ? " · " + preview : ""}</span>
      </span>
    </button>
  );
}
