const buttonBase = {
  height: 28, padding: "0 12px", display: "inline-flex", alignItems: "center", gap: 6,
  borderRadius: "var(--radius-chip-sm)", border: "0.5px solid var(--border-strong)",
  background: "var(--surface-item)", color: "var(--text-secondary)",
  fontSize: 12.5, fontFamily: "var(--font-ui)", whiteSpace: "nowrap", cursor: "pointer",
  transition: "var(--transition-control)",
};
const buttonVariants = {
  primary: { background: "var(--accent)", borderColor: "transparent", color: "#fff", fontWeight: 500 },
  secondary: {},
  ghost: { background: "transparent", borderColor: "transparent", color: "var(--text-faint)", padding: "0 6px" },
  ok: { background: "var(--ok)", borderColor: "transparent", color: "#fff", fontWeight: 500 },
};
const buttonSizes = { sm: { height: 24, fontSize: 11.5, padding: "0 9px" }, md: {} };

export function Button({ variant = "secondary", size = "md", icon, disabled, children, style, ...rest }) {
  const s = { ...buttonBase, ...buttonVariants[variant], ...buttonSizes[size], ...(disabled ? { opacity: 0.45, cursor: "default" } : null), ...style };
  return (
    <button type="button" style={s} disabled={disabled} {...rest}>
      {icon ? <i className={"ti ti-" + icon} style={{ fontSize: 14 }} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
