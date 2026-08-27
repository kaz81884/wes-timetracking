import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarCheck, Plus, Check, X, Pencil } from "lucide-react";
import { Card, Pill, Select, Button, IconBtn } from "./ui";
import { uid, todayStr, fmtHours, fmtDateShort, startOfWeek, addDays, weekDates, logAudit, clientIdForEntry, colorForClient } from "../lib/utils";
import EditEntryForm from "./EditEntryForm";
import DeleteEntryButton from "./DeleteEntryButton";

export default function TimesheetTab({ data, setData, currentUser }) {
  const [weekStart, setWeekStart] = useState(startOfWeek(todayStr()));
  const [editingId, setEditingId] = useState(null);
  const days = weekDates(weekStart);
  const key = `${currentUser.id}_${weekStart}`;
  const sheet = data.timesheets[key] || { status: "draft" };
  const submitted = sheet.status === "submitted";

  const myWeekEntries = data.timeEntries.filter((e) => e.employeeId === currentUser.id && days.includes(e.date));
  const gridEntries = myWeekEntries.filter((e) => e.gridRow);
  const otherEntries = myWeekEntries.filter((e) => !e.gridRow);

  const rowKeys = useMemo(() => {
    const seen = new Map();
    gridEntries.forEach((e) => {
      const cid = clientIdForEntry(e, data.projects);
      const k = `${cid}::${e.taskId}`;
      if (!seen.has(k)) seen.set(k, { clientId: cid, taskId: e.taskId });
    });
    return [...seen.values()];
  }, [gridEntries, data.projects]);

  const [addingRow, setAddingRow] = useState(false);
  const [newClientId, setNewClientId] = useState(data.clients[0]?.id || "");
  const [newTaskId, setNewTaskId] = useState("");

  const cellValue = (clientId, taskId, date) => {
    const e = gridEntries.find((x) => clientIdForEntry(x, data.projects) === clientId && x.taskId === taskId && x.date === date);
    return e ? e.hours : "";
  };

  const setCell = (clientId, taskId, date, value) => {
    if (submitted) return;
    const h = parseFloat(value);
    const existingIdx = data.timeEntries.findIndex((x) => x.employeeId === currentUser.id && clientIdForEntry(x, data.projects) === clientId && x.taskId === taskId && x.date === date && x.gridRow);
    let entries = [...data.timeEntries];
    if (!value || isNaN(h) || h <= 0) {
      if (existingIdx > -1) entries.splice(existingIdx, 1);
    } else if (existingIdx > -1) {
      entries[existingIdx] = { ...entries[existingIdx], hours: h };
    } else {
      entries.push({ id: uid(), employeeId: currentUser.id, clientId, taskId, date, hours: h, notes: "", billable: true, mode: "duration", gridRow: true });
    }
    setData({ ...data, timeEntries: entries });
  };

  const [localRows, setLocalRows] = useState([]);
  const allRows = [...rowKeys, ...localRows.filter((lr) => !rowKeys.find((r) => r.clientId === lr.clientId && r.taskId === lr.taskId))];

  const weekTotal = myWeekEntries.reduce((s, e) => s + e.hours, 0);
  const rowTotal = (clientId, taskId) => days.reduce((s, d) => s + (gridEntries.find((x) => clientIdForEntry(x, data.projects) === clientId && x.taskId === taskId && x.date === d)?.hours || 0), 0);
  const dayTotal = (d) => myWeekEntries.filter((e) => e.date === d).reduce((s, e) => s + e.hours, 0);

  const deleteEntry = (entry) => setData(logAudit(
    { ...data, timeEntries: data.timeEntries.filter((e) => e.id !== entry.id) },
    { action: "delete", actor: currentUser, entryId: entry.id, before: entry },
  ));

  const setSheetStatus = (status) => {
    setData({ ...data, timesheets: { ...data.timesheets, [key]: { status, submittedAt: status === "submitted" ? Date.now() : null } } });
  };

  const newClient = data.clients.find((c) => c.id === newClientId);
  const newClientTaskOptions = data.taskTypes.filter((t) => (newClient?.taskIds || []).includes(t.id));

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IconBtn title="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft size={16} /></IconBtn>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)", minWidth: 170, textAlign: "center" }}>
              {fmtDateShort(weekStart)} – {fmtDateShort(addDays(weekStart, 6))}
            </span>
            <IconBtn title="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight size={16} /></IconBtn>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {submitted ? (
              <>
                <Pill color="#7C9885">Submitted</Pill>
                <Button variant="ghost" onClick={() => setSheetStatus("draft")}>Reopen</Button>
              </>
            ) : (
              <Button variant="accent" onClick={() => setSheetStatus("submitted")}>
                <CalendarCheck size={14} /> Submit week ({fmtHours(weekTotal)})
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card style={{ padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--ink-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>
              <th style={{ padding: "12px 16px", minWidth: 200 }}>Company · Activity</th>
              {days.map((d) => <th key={d} style={{ padding: "12px 6px", textAlign: "center", minWidth: 64 }}>{fmtDateShort(d)}</th>)}
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((r) => {
              const client = data.clients.find((c) => c.id === r.clientId);
              const task = data.taskTypes.find((t) => t.id === r.taskId);
              return (
                <tr key={`${r.clientId}::${r.taskId}`} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "8px 16px" }}>
                    {client ? <Pill color={colorForClient(client)}>{client.name}</Pill> : "—"}
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>{task?.name || "—"}</div>
                  </td>
                  {days.map((d) => (
                    <td key={d} style={{ padding: "6px" }}>
                      <input
                        type="number" step="0.25" min="0" disabled={submitted}
                        value={cellValue(r.clientId, r.taskId, d)}
                        onChange={(e) => setCell(r.clientId, r.taskId, d, e.target.value)}
                        placeholder="–"
                        style={{
                          width: "100%", textAlign: "center", border: "1px solid var(--line)", borderRadius: 7,
                          padding: "6px 4px", fontSize: 13, fontFamily: "var(--mono)", background: submitted ? "var(--wash)" : "#fff",
                        }}
                      />
                    </td>
                  ))}
                  <td style={{ padding: "8px 16px", textAlign: "right", fontFamily: "var(--mono)", fontWeight: 600 }}>{fmtHours(rowTotal(r.clientId, r.taskId))}</td>
                </tr>
              );
            })}
            {!submitted && (
              <tr style={{ borderTop: "1px solid var(--line)" }}>
                <td colSpan={9} style={{ padding: "10px 16px" }}>
                  {addingRow ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <Select value={newClientId} onChange={(e) => { setNewClientId(e.target.value); setNewTaskId(""); }} style={{ maxWidth: 200 }}>
                        {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </Select>
                      <Select value={newTaskId} onChange={(e) => setNewTaskId(e.target.value)} style={{ maxWidth: 180 }}>
                        <option value="">Choose an activity</option>
                        {newClientTaskOptions.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </Select>
                      <Button variant="subtle" disabled={!newClientId || !newTaskId} onClick={() => { setLocalRows([...localRows, { clientId: newClientId, taskId: newTaskId }]); setAddingRow(false); }}><Check size={14} /></Button>
                      <Button variant="subtle" onClick={() => setAddingRow(false)}><X size={14} /></Button>
                    </div>
                  ) : (
                    <button onClick={() => setAddingRow(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--accent)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                      <Plus size={14} /> Add row
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid var(--line)", fontWeight: 700 }}>
              <td style={{ padding: "10px 16px", color: "var(--ink-2)" }}>Daily total</td>
              {days.map((d) => <td key={d} style={{ padding: "10px 6px", textAlign: "center", fontFamily: "var(--mono)", fontSize: 12.5 }}>{fmtHours(dayTotal(d)).replace(/ /g, "")}</td>)}
              <td style={{ padding: "10px 16px", textAlign: "right", fontFamily: "var(--mono)" }}>{fmtHours(weekTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {otherEntries.length > 0 && (
        <Card>
          <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)", fontWeight: 700, marginBottom: 12 }}>
            Also logged this week (from the timer / Log Time tab)
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {otherEntries.map((e) => {
              const client = data.clients.find((c) => c.id === clientIdForEntry(e, data.projects));
              const task = data.taskTypes.find((t) => t.id === e.taskId);
              if (editingId === e.id) {
                return <EditEntryForm key={e.id} data={data} setData={setData} entry={e} currentUser={currentUser} onDone={() => setEditingId(null)} />;
              }
              return (
                <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, gap: 10 }}>
                  <div>
                    <div style={{ color: "var(--ink-1)", fontWeight: 600 }}>
                      {fmtDateShort(e.date)} · {client?.name || "—"} · {task?.name || "—"}
                    </div>
                    {e.start && e.end && (
                      <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{e.start} – {e.end}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span style={{ fontFamily: "var(--mono)", color: "var(--ink-1)" }}>{fmtHours(e.hours)}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <IconBtn title="Edit entry" onClick={() => setEditingId(e.id)}><Pencil size={14} /></IconBtn>
                      <DeleteEntryButton onConfirm={() => deleteEntry(e)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
