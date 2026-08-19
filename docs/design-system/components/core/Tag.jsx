const tagBase = {
  fontSize: 10, padding: "1px 6px", borderRadius: "var(--radius-chip-sm)",
  border: "0.5px solid", whiteSpace: "nowrap", fontWeight: 500, fontFamily: "var(--font-ui)",
};
const tagTones = {
  follow: { color: "var(--tag-follow-text)", background: "var(--tag-follow-bg)", borderColor: "var(--tag-follow-border)" },
  urgent: { color: "var(--tag-urgent-text)", background: "var(--tag-urgent-bg)", borderColor: "var(--tag-urgent-border)" },
};

export function Tag({ tone = "follow", children, style }) {
  return <span style={{ ...tagBase, ...tagTones[tone], ...style }}>{children}</span>;
}
