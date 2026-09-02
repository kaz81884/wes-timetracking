import React, { useState } from "react";
import { UserCircle, Check, AlertCircle, Shield, SunMoon } from "lucide-react";
import { Card, Select, TextInput, Button } from "./ui";

export default function ProfileTab({ data, setData, currentUser }) {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email || "");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const saveName = () => {
    const n = name.trim();
    if (!n) return;
    setData({ ...data, employees: data.employees.map((e) => e.id === currentUser.id ? { ...e, name: n } : e) });
    setSuccess("Name updated.");
    setError("");
  };

  const saveEmail = () => {
    const em = email.trim();
    setData({ ...data, employees: data.employees.map((e) => e.id === currentUser.id ? { ...e, email: em } : e) });
    setSuccess("Email updated.");
    setError("");
  };

  const setTheme = (theme) => {
    setData({ ...data, employees: data.employees.map((e) => e.id === currentUser.id ? { ...e, theme } : e) });
  };

  const changePin = () => {
    setError("");
    setSuccess("");
    if (currentPin !== currentUser.pin) {
      setError("Current PIN doesn't match.");
      return;
    }
    if (newPin.length < 4) {
      setError("New PIN needs to be 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      setError("New PIN and confirmation don't match.");
      return;
    }
    setData({ ...data, employees: data.employees.map((e) => e.id === currentUser.id ? { ...e, pin: newPin } : e) });
    setCurrentPin(""); setNewPin(""); setConfirmPin("");
    setSuccess("PIN updated.");
  };

  return (
    <div style={{ display: "grid", gap: 20, maxWidth: 460 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <UserCircle size={16} color="var(--ink-3)" />
          <span style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)" }}>Your profile</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ width: 40, height: 40, borderRadius: 99, background: "var(--accent)", color: "#fff", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
            {currentUser.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-1)" }}>{currentUser.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 4 }}>
              {currentUser.role === "admin" && <Shield size={12} />}
              {currentUser.role === "admin" ? "Admin" : "Employee"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <TextInput placeholder="Display name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveName()} />
          <Button variant="ghost" onClick={saveName} disabled={!name.trim() || name.trim() === currentUser.name}><Check size={14} /> Save</Button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <TextInput type="email" placeholder="Email (for PIN resets)" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveEmail()} />
          <Button variant="ghost" onClick={saveEmail} disabled={email.trim() === (currentUser.email || "")}><Check size={14} /> Save</Button>
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <SunMoon size={16} color="var(--ink-3)" />
          <span style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)" }}>Appearance</span>
        </div>
        <Select value={currentUser.theme || "system"} onChange={(e) => setTheme(e.target.value)}>
          <option value="system">Match system</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </Select>
      </Card>

      <Card>
        <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)", marginBottom: 14 }}>Change PIN</div>
        <div style={{ display: "grid", gap: 10 }}>
          <TextInput type="password" inputMode="numeric" maxLength={4} placeholder="Current PIN" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          <TextInput type="password" inputMode="numeric" maxLength={4} placeholder="New PIN (4 digits)" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          <TextInput type="password" inputMode="numeric" maxLength={4} placeholder="Confirm new PIN" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))} onKeyDown={(e) => e.key === "Enter" && changePin()} />
          <Button onClick={changePin} disabled={!currentPin || !newPin || !confirmPin} style={{ justifyContent: "center" }}>Update PIN</Button>
          {error && <p style={{ fontSize: 12.5, color: "#B5654A", display: "flex", alignItems: "center", gap: 6, margin: 0 }}><AlertCircle size={14} /> {error}</p>}
          {success && <p style={{ fontSize: 12.5, color: "var(--accent)", display: "flex", alignItems: "center", gap: 6, margin: 0 }}><Check size={14} /> {success}</p>}
        </div>
      </Card>
    </div>
  );
}
