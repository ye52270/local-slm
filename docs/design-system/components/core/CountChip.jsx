const countChipStyle = {
  height: 24, padding: "0 9px", display: "inline-flex", alignItems: "center", gap: 5,
  borderRadius: "var(--radius-chip-sm)", border: "0.5px solid var(--border-default)",
  background: "var(--surface-item)", color: "var(--text-secondary)",
  fontSize: 11.5, fontFamily: "var(--font-ui)", whiteSpace: "nowrap", cursor: "pointer",
};
const countChipUrgent = {
  color: "var(--tag-urgent-text)", background: "var(--tag-urgent-bg)", borderColor: "var(--tag-urgent-border)",
};
const countNumStyle = { fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-primary)" };

export function CountChip({ label, count, urgent, style, ...rest }) {
  return (
    <button type="button" style={{ ...countChipStyle, ...(urgent ? countChipUrgent : null), ...style }} {...rest}>
      {label}
      <b style={{ ...countNumStyle, ...(urgent ? { color: "var(--tag-urgent-text)" } : null) }}>{count}</b>
    </button>
  );
}
