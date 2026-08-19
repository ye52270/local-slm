const approvalStyle = {
  borderRadius: "var(--radius-card)", padding: "11px 13px", fontFamily: "var(--font-ui)",
  background: "var(--warn-bg)", border: "0.5px solid var(--warn)", color: "var(--text-primary)",
};
const approvalHeadStyle = { display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "var(--warn)", marginBottom: 7 };
const approvalTargetStyle = { fontSize: 13, color: "var(--text-primary)" };
const approvalPreviewStyle = {
  fontSize: 12, color: "var(--text-secondary)", background: "var(--surface-item)",
  border: "0.5px solid var(--border-default)", borderRadius: 6, padding: "7px 9px", margin: "7px 0",
  maxHeight: 88, overflowY: "auto", whiteSpace: "pre-wrap", lineHeight: 1.55,
};
const approvalMetaStyle = { fontSize: 11, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" };
const approvalActionsStyle = { display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" };
const approvalBtn = {
  height: 28, padding: "0 12px", borderRadius: "var(--radius-chip-sm)", fontSize: 12.5, cursor: "pointer",
  display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-ui)",
};

export function ApprovalBox({ verb = "메일 발송", target, preview, meta, onApprove, onReject }) {
  return (
    <div style={approvalStyle}>
      <div style={approvalHeadStyle}><i className="ti ti-shield-check" style={{ fontSize: 13 }} aria-hidden="true" />{verb} — 승인이 필요해요</div>
      <div style={approvalTargetStyle}>{target}</div>
      {preview ? <div style={approvalPreviewStyle}>{preview}</div> : null}
      {meta ? <div style={approvalMetaStyle}><i className="ti ti-alert-triangle" style={{ fontSize: 12 }} aria-hidden="true" />{meta}</div> : null}
      <div style={approvalActionsStyle}>
        <button type="button" onClick={onReject} style={{ ...approvalBtn, border: "0.5px solid var(--border-strong)", background: "var(--surface-item)", color: "var(--text-secondary)" }}>거부</button>
        <button type="button" onClick={onApprove} style={{ ...approvalBtn, border: 0, background: "var(--ok)", color: "#fff", fontWeight: 500 }}>
          <i className="ti ti-send" style={{ fontSize: 14 }} aria-hidden="true" />승인
        </button>
      </div>
    </div>
  );
}
