import React, { useState } from "react";
import { Clock, Shield, Lock } from "lucide-react";
import { TextInput, Button } from "./ui";

export default function LoginScreen({ employees, onLogin, onBootstrapAdmin }) {
  const [picked, setPicked] = useState(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [bootName, setBootName] = useState("");
  const [bootPin, setBootPin] = useState("");

  const tryLogin = () => {
    if (pin === picked.pin) onLogin(picked.id);
    else setErr("That PIN doesn't match.");
  };

  return (
    <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div style={{ width: 360, textAlign: "center" }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: "var(--ink-1)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <Clock size={22} />
        </div>
        <h1 style={{ fontFamily: "var(--display)", fontSize: 26, fontWeight: 600, color: "var(--ink-1)", margin: "0 0 6px" }}>Ledger</h1>
        <p style={{ fontSize: 13.5, color: "var(--ink-3)", margin: "0 0 26px" }}>Time tracking for Williams Executive Support</p>

        {employees.length === 0 ? (
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 10 }}>
              No one's set up yet. Create the first account — it becomes the admin and can add everyone else.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              <TextInput placeholder="Your name" value={bootName} onChange={(e) => setBootName(e.target.value)} />
              <TextInput placeholder="Choose a 4-digit PIN" inputMode="numeric" maxLength={4} value={bootPin} onChange={(e) => setBootPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
              <Button disabled={!bootName.trim() || bootPin.length < 4} onClick={() => onBootstrapAdmin(bootName.trim(), bootPin)}>
                <Shield size={14} /> Create admin account
              </Button>
            </div>
          </div>
        ) : !picked ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {employees.map((e) => (
              <button key={e.id} onClick={() => { setPicked(e); setErr(""); setPin(""); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", borderRadius: 10, border: "1px solid var(--line)", background: "#fff", cursor: "pointer", fontSize: 14.5, fontWeight: 600, color: "var(--ink-1)", fontFamily: "inherit" }}
                onMouseEnter={(ev) => { ev.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseLeave={(ev) => { ev.currentTarget.style.borderColor = "var(--line)"; }}
              >
                <span style={{ width: 26, height: 26, borderRadius: 99, background: "var(--accent)", color: "#fff", fontSize: 11.5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {e.name.slice(0, 1).toUpperCase()}
                </span>
                {e.name}
                {e.role === "admin" && <Shield size={13} style={{ marginLeft: "auto", color: "var(--ink-3)" }} />}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "left" }}>
            <button onClick={() => setPicked(null)} style={{ background: "none", border: "none", color: "var(--ink-3)", fontSize: 12.5, cursor: "pointer", marginBottom: 12, padding: 0, fontFamily: "inherit" }}>
              ← back
            </button>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)", marginBottom: 10 }}>Enter {picked.name}'s PIN</p>
            <div style={{ display: "flex", gap: 8 }}>
              <TextInput autoFocus type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} onKeyDown={(e) => e.key === "Enter" && tryLogin()} />
              <Button onClick={tryLogin}><Lock size={13} /> Unlock</Button>
            </div>
            {err && <p style={{ fontSize: 12.5, color: "#B5654A", marginTop: 8 }}>{err}</p>}
          </div>
        )}
        <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 22, lineHeight: 1.5 }}>
          Shared workspace — everyone with this link sees the same clients, projects, and time entries. PINs are a light lock for a trusted team, not bank-grade security.
        </p>
      </div>
    </div>
  );
}
