const panelShellStyle = {
  width: 320, flex: "none", display: "flex", flexDirection: "column",
  borderLeft: "0.5px solid var(--border-default)", background: "var(--surface-plate)",
  fontFamily: "var(--font-ui)", color: "var(--text-primary)",
};
const panelHeadStyle = {
  display: "flex", alignItems: "center", gap: 8, padding: "11px 13px", whiteSpace: "nowrap",
  borderBottom: "0.5px solid var(--border-default)", fontSize: 12.5, color: "var(--text-secondary)",
};
const panelCloseStyle = { marginLeft: "auto", background: "none", border: 0, color: "var(--text-faint)", cursor: "pointer", fontSize: 14, padding: 0 };
const panelBodyStyle = { padding: "12px 13px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" };
const panelFootStyle = { display: "flex", gap: 8, padding: "11px 13px", borderTop: "0.5px solid var(--border-default)", justifyContent: "flex-end" };

export function PanelShell({ title, icon = "file", onClose, footer, children, style }) {
  return (
    <aside style={{ ...panelShellStyle, ...style }}>
      <div style={panelHeadStyle}>
        <i className={"ti ti-" + icon} style={{ fontSize: 15, color: "var(--accent)" }} aria-hidden="true" />
        {title}
        {onClose ? <button type="button" style={panelCloseStyle} onClick={onClose} aria-label="닫기"><i className="ti ti-x" /></button> : null}
      </div>
      <div style={panelBodyStyle}>{children}</div>
      {footer ? <div style={panelFootStyle}>{footer}</div> : null}
    </aside>
  );
}
