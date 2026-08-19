const chipStyle = {
  height: 28, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 6,
  borderRadius: "var(--radius-chip)", border: "0.5px solid var(--border-strong)",
  background: "var(--surface-item)", color: "var(--text-secondary)",
  fontSize: 12.5, fontFamily: "var(--font-ui)", whiteSpace: "nowrap", cursor: "pointer",
  transition: "var(--transition-control)",
};
const chipAccent = { color: "var(--accent)", background: "var(--accent-bg)", borderColor: "var(--accent)" };

export function Chip({ accent, icon, children, style, ...rest }) {
  return (
    <button type="button" style={{ ...chipStyle, ...(accent ? chipAccent : null), ...style }} {...rest}>
      {icon ? <i className={"ti ti-" + icon} style={{ fontSize: 14 }} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
