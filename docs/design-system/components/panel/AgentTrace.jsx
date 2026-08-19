const traceToggleStyle = {
  display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: "var(--text-faint)",
  background: "none", border: 0, padding: 0, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "var(--font-ui)",
};
const traceStepsStyle = { marginTop: 8, display: "flex", flexDirection: "column", gap: 6, paddingLeft: 2 };
const traceStepStyle = { display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--text-faint)", whiteSpace: "nowrap" };
const traceDotStyle = { width: 5, height: 5, borderRadius: "50%", flex: "none", background: "var(--step-pending)" };
const traceAgentStyle = { fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: ".04em", marginLeft: "auto", color: "var(--text-faint)" };

export function AgentTrace({ steps = [], defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const flow = steps.map((s) => s.label.split(" — ")[0]).join(" → ");
  return (
    <div>
      <button type="button" style={traceToggleStyle} onClick={() => setOpen(!open)}>
        <i className={"ti ti-chevron-" + (open ? "down" : "right")} style={{ fontSize: 13 }} aria-hidden="true" />
        작업 과정 {steps.length}단계 · {flow}
      </button>
      {open ? (
        <div style={traceStepsStyle}>
          {steps.map((s, i) => (
            <div key={i} style={traceStepStyle}>
              <span style={{ ...traceDotStyle, ...(s.done ? { background: "var(--ok)" } : null) }} />
              {s.label}
              {s.agent ? <span style={traceAgentStyle}>{s.agent}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
