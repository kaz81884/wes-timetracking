import React from "react";
import { ChevronDown, Check } from "lucide-react";
import { fmtHours, clientIdForEntry, colorForClient } from "../lib/utils";

export function IconBtn({ onClick, title, children, danger, disabled }) {
  return (
    <button
      onClick={onClick} title={title} disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 30, borderRadius: 8, border: "1px solid transparent",
        background: "transparent", cursor: disabled ? "default" : "pointer",
        color: danger ? "#B5654A" : "var(--ink-3)", opacity: disabled ? 0.4 : 1,
        transition: "background .15s, color .15s", flexShrink: 0,
      }}
      onMouseEnter={(e) => { if (disabled) return; e.currentTarget.style.background = danger ? "var(--danger-wash)" : "var(--wash)"; e.currentTarget.style.color = danger ? "#B5654A" : "var(--ink-1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = danger ? "#B5654A" : "var(--ink-3)"; }}
    >
      {children}
    </button>
  );
}

export function Pill({ color, children, muted }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5,
      padding: "3px 10px 3px 8px", borderRadius: 100, background: muted ? "var(--wash)" : color + "1c",
      color: muted ? "var(--ink-3)" : color, fontWeight: 600, letterSpacing: ".01em", whiteSpace: "nowrap"
    }}>
      {!muted && <span style={{ width: 6, height: 6, borderRadius: 99, background: color, flexShrink: 0 }} />}
      {children}
    </span>
  );
}

export function Select({ value, onChange, children, style, disabled }) {
  return (
    <div style={{ position: "relative", ...style }}>
      <select
        value={value} onChange={onChange} disabled={disabled}
        style={{
          width: "100%", appearance: "none", background: disabled ? "var(--wash)" : "var(--paper)",
          border: "1px solid var(--line)", borderRadius: 9, padding: "9px 32px 9px 12px",
          fontSize: 14, color: "var(--ink-1)", fontFamily: "inherit", cursor: disabled ? "default" : "pointer",
        }}
      >
        {children}
      </select>
      <ChevronDown size={14} style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--ink-3)" }} />
    </div>
  );
}

export function TextInput(props) {
  return (
    <input
      {...props}
      style={{
        width: "100%", border: "1px solid var(--line)", borderRadius: 9,
        padding: "9px 12px", fontSize: 14, color: "var(--ink-1)", fontFamily: "inherit",
        background: props.disabled ? "var(--wash)" : "var(--paper)", ...(props.style || {}),
      }}
    />
  );
}

export function Button({ children, onClick, variant = "primary", style, type = "button", disabled }) {
  const variants = {
    primary: { background: "var(--chip)", color: "#fff", border: "1px solid var(--chip)" },
    accent: { background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" },
    ghost: { background: "transparent", color: "var(--ink-1)", border: "1px solid var(--line)" },
    subtle: { background: "var(--wash)", color: "var(--ink-1)", border: "1px solid transparent" },
    danger: { background: "#B5654A", color: "#fff", border: "1px solid #B5654A" },
  };
  return (
    <button
      type={type} onClick={onClick} disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600,
        padding: "9px 14px", borderRadius: 9, cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1, fontFamily: "inherit", letterSpacing: ".01em",
        transition: "opacity .15s, transform .1s", ...variants[variant], ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.97)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
    >
      {children}
    </button>
  );
}

export function Card({ children, style }) {
  return <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 14, padding: 20, ...style }}>{children}</div>;
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--ink-2)" }}>
      <span style={{
        width: 32, height: 18, borderRadius: 99, background: checked ? "var(--accent)" : "var(--line)",
        position: "relative", transition: "background .15s", flexShrink: 0,
      }} onClick={() => onChange(!checked)}>
        <span style={{
          position: "absolute", top: 2, left: checked ? 16 : 2, width: 14, height: 14, borderRadius: 99,
          background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.2)",
        }} />
      </span>
      {label}
    </label>
  );
}

export function TaskChip({ name, active, onClick, disabled }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, padding: "5px 11px",
        borderRadius: 100, cursor: disabled ? "default" : "pointer", fontWeight: 600, fontFamily: "inherit",
        border: active ? "1px solid var(--accent)" : "1px solid var(--line)",
        background: active ? "var(--accent)1c" : "var(--paper)", color: active ? "var(--accent)" : "var(--ink-3)",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {active && <Check size={11} />}
      {name}
    </button>
  );
}

// groups contact (project) options in a <select> under their company, so picking
// the right person is fast even with several companies each holding several contacts
export function projectOptionGroups(projects, clients) {
  const byClient = {};
  projects.forEach((p) => { (byClient[p.clientId] = byClient[p.clientId] || []).push(p); });
  return Object.entries(byClient).map(([clientId, projs]) => {
    const client = clients.find((c) => c.id === clientId);
    return (
      <optgroup key={clientId} label={client ? client.name : "Other"}>
        {projs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </optgroup>
    );
  });
}

export function DayRibbon({ entries, clients, projects, dateStr }) {
  const dayEntries = entries.filter((e) => e.date === dateStr);
  const total = dayEntries.reduce((s, e) => s + e.hours, 0);
  const cap = Math.max(total, 8);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)", fontWeight: 700 }}>Today's ribbon</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--ink-2)" }}>{fmtHours(total)}</span>
      </div>
      {dayEntries.length === 0 ? (
        <div style={{ height: 34, borderRadius: 8, background: "var(--wash)", display: "flex", alignItems: "center", paddingLeft: 12, fontSize: 12.5, color: "var(--ink-3)" }}>
          Nothing logged yet — the day is a blank ribbon.
        </div>
      ) : (
        <div style={{ display: "flex", height: 34, borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)" }}>
          {dayEntries.map((e) => {
            const client = clients.find((c) => c.id === clientIdForEntry(e, projects));
            const w = (e.hours / cap) * 100;
            return <div key={e.id} title={`${client ? client.name : "Unassigned"} · ${fmtHours(e.hours)}`} style={{ width: `${w}%`, minWidth: e.hours > 0 ? 3 : 0, background: client ? colorForClient(client) : "#B7BFC7" }} />;
          })}
        </div>
      )}
    </div>
  );
}
