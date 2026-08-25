import React, { useState } from "react";
import { Plus, Trash2, KeyRound, Mail } from "lucide-react";
import { Card, Select, TextInput, Button, IconBtn } from "./ui";
import { uid } from "../lib/utils";

export default function TeamTab({ data, setData, currentUser }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("employee");
  const [resettingId, setResettingId] = useState(null);
  const [resetPin, setResetPin] = useState("");
  const [editingEmailId, setEditingEmailId] = useState(null);
  const [editEmail, setEditEmail] = useState("");

  const addEmployee = () => {
    const n = name.trim();
    if (!n || pin.length < 4) return;
    setData({ ...data, employees: [...data.employees, { id: uid(), name: n, email: email.trim(), pin, role }] });
    setName(""); setEmail(""); setPin(""); setRole("employee");
  };
  const removeEmployee = (id) => { if (id === currentUser.id) return; setData({ ...data, employees: data.employees.filter((e) => e.id !== id) }); };
  const setRoleFor = (id, r) => setData({ ...data, employees: data.employees.map((e) => e.id === id ? { ...e, role: r } : e) });

  const startReset = (id) => { setResettingId(id); setResetPin(""); };
  const cancelReset = () => { setResettingId(null); setResetPin(""); };
  const confirmReset = (id) => {
    if (resetPin.length < 4) return;
    setData({ ...data, employees: data.employees.map((e) => e.id === id ? { ...e, pin: resetPin } : e) });
    setResettingId(null); setResetPin("");
  };

  const startEditEmail = (emp) => { setEditingEmailId(emp.id); setEditEmail(emp.email || ""); };
  const cancelEditEmail = () => { setEditingEmailId(null); setEditEmail(""); };
  const confirmEditEmail = (id) => {
    setData({ ...data, employees: data.employees.map((e) => e.id === id ? { ...e, email: editEmail.trim() } : e) });
    setEditingEmailId(null); setEditEmail("");
  };

  return (
    <Card style={{ maxWidth: 520 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)", marginBottom: 14 }}>Team members</div>
      <div style={{ display: "grid", gap: 8, marginBottom: 18, background: "var(--wash)", padding: 14, borderRadius: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 110px", gap: 8 }}>
          <TextInput placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <TextInput placeholder="PIN" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        <TextInput type="email" placeholder="Email (for PIN resets, optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button onClick={addEmployee} disabled={!name.trim() || pin.length < 4} style={{ justifyContent: "center" }}><Plus size={14} /> Add team member</Button>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {data.employees.map((e) => (
          <div key={e.id} style={{ padding: "8px 10px", borderRadius: 8, background: "var(--wash)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ width: 22, height: 22, borderRadius: 99, background: "var(--accent)", color: "#fff", fontSize: 10.5, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{e.name.slice(0, 1).toUpperCase()}</span>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)" }}>{e.name}{e.id === currentUser.id ? " (you)" : ""}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{e.email || "No email set"}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Select value={e.role} onChange={(ev) => setRoleFor(e.id, ev.target.value)} disabled={e.id === currentUser.id} style={{ width: 110 }}>
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </Select>
                <IconBtn title="Edit email" onClick={() => (editingEmailId === e.id ? cancelEditEmail() : startEditEmail(e))}><Mail size={14} /></IconBtn>
                <IconBtn title="Reset PIN" onClick={() => (resettingId === e.id ? cancelReset() : startReset(e.id))}><KeyRound size={14} /></IconBtn>
                {e.id !== currentUser.id && <IconBtn danger title="Remove" onClick={() => removeEmployee(e.id)}><Trash2 size={14} /></IconBtn>}
              </div>
            </div>
            {editingEmailId === e.id && (
              <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                <TextInput
                  autoFocus type="email" placeholder="Email"
                  value={editEmail} onChange={(ev) => setEditEmail(ev.target.value)}
                  onKeyDown={(ev) => ev.key === "Enter" && confirmEditEmail(e.id)}
                  style={{ maxWidth: 220 }}
                />
                <Button onClick={() => confirmEditEmail(e.id)} style={{ justifyContent: "center" }}>Save</Button>
                <Button variant="ghost" onClick={cancelEditEmail} style={{ justifyContent: "center" }}>Cancel</Button>
              </div>
            )}
            {resettingId === e.id && (
              <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                <TextInput
                  autoFocus type="password" inputMode="numeric" maxLength={4} placeholder="New 4-digit PIN"
                  value={resetPin} onChange={(ev) => setResetPin(ev.target.value.replace(/\D/g, "").slice(0, 4))}
                  onKeyDown={(ev) => ev.key === "Enter" && confirmReset(e.id)}
                  style={{ maxWidth: 160 }}
                />
                <Button onClick={() => confirmReset(e.id)} disabled={resetPin.length < 4} style={{ justifyContent: "center" }}>Set PIN</Button>
                <Button variant="ghost" onClick={cancelReset} style={{ justifyContent: "center" }}>Cancel</Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
