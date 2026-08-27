import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { Select, TextInput, Button, Toggle } from "./ui";
import { todayStr, fmtHours, rangeToHours, logAudit, clientIdForEntry } from "../lib/utils";

// Inline edit form for a single time entry — used by ReportsTab and
// TimesheetTab. Duration is always derived from start/end time, never typed
// directly, so an edited entry's hours can't drift from its actual clock
// times — including for timer-based entries, which only ever stored a
// duration, not clock times, until edited here.
export default function EditEntryForm({ data, setData, entry, currentUser, onDone }) {
  const [date, setDate] = useState(entry.date);
  const [clientId, setClientId] = useState(clientIdForEntry(entry, data.projects) || "");
  const [taskId, setTaskId] = useState(entry.taskId || "");
  const [notes, setNotes] = useState(entry.notes || "");
  const [billable, setBillable] = useState(entry.billable !== false);
  const [startTime, setStartTime] = useState(entry.start || "");
  const [endTime, setEndTime] = useState(entry.end || "");
  const [error, setError] = useState("");

  const client = data.clients.find((c) => c.id === clientId);
  const tasks = client ? data.taskTypes.filter((t) => (client.taskIds || []).includes(t.id)) : [];

  const computedHours = rangeToHours(startTime, endTime);

  const save = () => {
    if (!startTime || !endTime || computedHours <= 0) { setError("Enter both a start and end time."); return; }
    const updated = {
      ...entry, date, clientId: clientId || null, taskId: taskId || null,
      notes, billable, hours: computedHours, mode: "range", start: startTime, end: endTime,
      updatedBy: currentUser.id, updatedAt: Date.now(),
    };
    setData(logAudit(
      { ...data, timeEntries: data.timeEntries.map((e) => e.id === entry.id ? updated : e) },
      { action: "edit", actor: currentUser, entryId: entry.id, before: entry, after: updated },
    ));
    onDone();
  };

  const Field = ({ label, children }) => (
    <div>
      <div style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4, fontWeight: 600 }}>{label}</div>
      {children}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 10, padding: 12, background: "var(--wash)", borderRadius: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field label="Date">
          <TextInput type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Company">
          <Select value={clientId} onChange={(e) => { setClientId(e.target.value); setTaskId(""); }}>
            <option value="">No company</option>
            {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Activity">
        <Select value={taskId} onChange={(e) => setTaskId(e.target.value)}>
          <option value="">No activity</option>
          {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Field label="Start time">
          <TextInput type="time" step="1" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </Field>
        <Field label="End time">
          <TextInput type="time" step="1" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </Field>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>
        Duration: <span style={{ fontFamily: "var(--mono)", color: "var(--ink-1)", fontWeight: 600 }}>{startTime && endTime ? fmtHours(computedHours) : "—"}</span>
      </div>
      <Field label="Notes">
        <TextInput placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Toggle checked={billable} onChange={setBillable} label="Billable" />
      {error && <p style={{ fontSize: 12, color: "#B5654A", margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <Button onClick={save}><Check size={14} /> Save</Button>
        <Button variant="ghost" onClick={onDone}><X size={14} /> Cancel</Button>
      </div>
    </div>
  );
}
