const signalTints = {
  cal: ["var(--sig-cal)", "var(--sig-cal-bg)", "calendar-event"],
  mail: ["var(--sig-mail)", "var(--sig-mail-bg)", "mail"],
  todo: ["var(--sig-todo)", "var(--sig-todo-bg)", "checkbox"],
  bell: ["var(--sig-bell)", "var(--sig-bell-bg)", "bell"],
  timer: ["var(--sig-timer)", "var(--sig-timer-bg)", "clock"],
};
const signalButtonStyle = {
  position: "relative", width: 32, height: 32, borderRadius: "50%", border: 0, padding: 0,
  display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 17, cursor: "pointer",
  transition: "transform var(--dur-1) var(--ease-out)",
};
const signalBadgeStyle = {
  position: "absolute", top: -4, right: -5, minWidth: 15, height: 15, padding: "0 4px",
  borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 9.5, fontWeight: 700, fontFamily: "var(--font-ui)",
};
const signalBadgeTones = {
  neutral: { background: "var(--badge-neutral-bg)", color: "var(--badge-neutral-text)", border: "1px solid var(--badge-neutral-border)" },
  urgent: { background: "var(--urgent)", color: "#fff", boxShadow: "0 0 0 2px var(--urgent-ring)" },
};

export function SignalButton({ kind = "mail", count, urgent, style, ...rest }) {
  const [color, bg, icon] = signalTints[kind] || signalTints.mail;
  return (
    <button type="button" style={{ ...signalButtonStyle, color, background: bg, ...style }} {...rest}>
      <i className={"ti ti-" + icon} aria-hidden="true" />
      {count ? <span style={{ ...signalBadgeStyle, ...signalBadgeTones[urgent ? "urgent" : "neutral"] }}>{count}</span> : null}
    </button>
  );
}
