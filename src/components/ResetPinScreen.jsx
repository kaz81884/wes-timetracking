import React, { useState } from "react";
import { Clock, KeyRound, AlertCircle } from "lucide-react";
import { TextInput, Button } from "./ui";

// Reached via a ?reset=<token> link emailed by /api/request-reset. The token
// and its expiry live in data.passwordResets, part of the same document the
// rest of the app reads/writes — no separate reset endpoint needed, since
// the frontend already has full read/write access to that document.
export default function ResetPinScreen({ data, setData, token, onDone }) {
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  const entry = data.passwordResets?.[token];
  const employee = entry ? data.employees.find((e) => e.id === entry.employeeId) : null;
  const expired = !entry || entry.expiresAt < Date.now() || !employee;

  const submit = () => {
    if (newPin.length < 4) { setError("PIN needs to be 4 digits."); return; }
    if (newPin !== confirmPin) { setError("PIN and confirmation don't match."); return; }
    const { [token]: _removed, ...restResets } = data.passwordResets;
    setData({
      ...data,
      employees: data.employees.map((e) => e.id === employee.id ? { ...e, pin: newPin } : e),
      passwordResets: restResets,
    });
    onDone(employee.id);
  };

  return (
    <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div style={{ width: 360, textAlign: "center" }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: "var(--ink-1)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <Clock size={22} />
        </div>
        <h1 style={{ fontFamily: "var(--display)", fontSize: 26, fontWeight: 600, color: "var(--ink-1)", margin: "0 0 6px" }}>Ledger</h1>

        {expired ? (
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: 13.5, color: "var(--ink-3)", marginBottom: 16 }}>
              This reset link is invalid or has expired. Request a new one, or ask an admin to reset your PIN from the Team tab.
            </p>
            <Button variant="ghost" onClick={() => onDone(null)} style={{ width: "100%", justifyContent: "center" }}>Back to sign in</Button>
          </div>
        ) : (
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)", marginBottom: 14 }}>Set a new PIN for {employee.name}</p>
            <div style={{ display: "grid", gap: 8 }}>
              <TextInput autoFocus type="password" inputMode="numeric" maxLength={4} placeholder="New 4-digit PIN" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
              <TextInput type="password" inputMode="numeric" maxLength={4} placeholder="Confirm new PIN" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))} onKeyDown={(e) => e.key === "Enter" && submit()} />
              <Button onClick={submit} disabled={!newPin || !confirmPin} style={{ justifyContent: "center" }}><KeyRound size={14} /> Set PIN & sign in</Button>
              {error && <p style={{ fontSize: 12.5, color: "#B5654A", display: "flex", alignItems: "center", gap: 6, margin: 0 }}><AlertCircle size={14} /> {error}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
