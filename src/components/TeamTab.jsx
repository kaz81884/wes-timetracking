import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, Select, TextInput, Button, IconBtn } from "./ui";
import { uid } from "../lib/utils";

export default function TeamTab({ data, setData, currentUser }) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("employee");

  const addEmployee = () => {
    const n = name.trim();
    if (!n || pin.length < 4) return;
    setData({ ...data, employees: [...data.employees, { id: uid(), name: n, pin, role }] });
    setName(""); setPin(""); setRole("employee");
  };
  const removeEmployee = (id) => { if (id === currentUser.id) return; setData({ ...data, employees: data.employees.filter((e) => e.id !== id) }); };
  const setRoleFor = (id, r) => setData({ ...data, employees: data.employees.map((e) => e.id === id ? { ...e, role: r } : e) });

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
        <Button onClick={addEmployee} disabled={!name.trim() || pin.length < 4} style={{ justifyContent: "center" }}><Plus size={14} /> Add team member</Button>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {data.employees.map((e) => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, background: "var(--wash)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 22, height: 22, borderRadius: 99, background: "var(--accent)", color: "#fff", fontSize: 10.5, display: "flex", alignItems: "center", justifyContent: "center" }}>{e.name.slice(0, 1).toUpperCase()}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)" }}>{e.name}{e.id === currentUser.id ? " (you)" : ""}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Select value={e.role} onChange={(ev) => setRoleFor(e.id, ev.target.value)} disabled={e.id === currentUser.id} style={{ width: 110 }}>
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </Select>
              {e.id !== currentUser.id && <IconBtn danger title="Remove" onClick={() => removeEmployee(e.id)}><Trash2 size={14} /></IconBtn>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
