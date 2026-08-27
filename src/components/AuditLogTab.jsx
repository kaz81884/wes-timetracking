import React, { useMemo, useState } from "react";
import { History, Pencil, Trash2 } from "lucide-react";
import { Card, Select } from "./ui";
import { fmtHours, clientIdForEntry } from "../lib/utils";

// A field's raw value plus how to render it for a human, keyed by what an
// entry snapshot (before/after) stores.
const FIELD_LABELS = { date: "Date", hours: "Duration", notes: "Notes", billable: "Billable" };

export default function AuditLogTab({ data }) {
  const [employeeFilter, setEmployeeFilter] = useState("all");

  const nameFor = {
    employee: (id) => data.employees.find((e) => e.id === id)?.name || "—",
    client: (id) => data.clients.find((c) => c.id === id)?.name || "—",
    task: (id) => data.taskTypes.find((t) => t.id === id)?.name || "—",
  };

  const describeSnapshot = (s) => s ? `${nameFor.client(clientIdForEntry(s, data.projects))} · ${nameFor.task(s.taskId)}` : "—";

  const describeChanges = (before, after) => {
    if (!before || !after) return [];
    const diffs = [];
    Object.keys(FIELD_LABELS).forEach((key) => {
      if (before[key] === after[key]) return;
      const fmt = key === "hours" ? fmtHours : key === "billable" ? (v) => (v === false ? "No" : "Yes") : (v) => v || "—";
      diffs.push({ label: FIELD_LABELS[key], from: fmt(before[key]), to: fmt(after[key]) });
    });
    const beforeClientId = clientIdForEntry(before, data.projects);
    const afterClientId = clientIdForEntry(after, data.projects);
    if (beforeClientId !== afterClientId) diffs.push({ label: "Company", from: nameFor.client(beforeClientId), to: nameFor.client(afterClientId) });
    if (before.taskId !== after.taskId) diffs.push({ label: "Activity", from: nameFor.task(before.taskId), to: nameFor.task(after.taskId) });
    if (before.start !== after.start || before.end !== after.end) diffs.push({ label: "Time", from: before.start ? `${before.start}–${before.end}` : "—", to: after.start ? `${after.start}–${after.end}` : "—" });
    return diffs;
  };

  const events = useMemo(() => {
    return [...(data.auditLog || [])]
      .filter((ev) => employeeFilter === "all" || (ev.before || ev.after)?.employeeId === employeeFilter)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [data.auditLog, employeeFilter]);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <History size={16} color="var(--ink-3)" />
          <span style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)" }}>Audit log</span>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: "4px 0 14px" }}>
          Every edit or delete made to a logged time entry, who made it, and when — including entries that were deleted entirely.
        </p>
        <div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5, fontWeight: 600 }}>Whose time</div>
          <Select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} style={{ minWidth: 180 }}>
            <option value="all">Everyone</option>
            {data.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select>
        </div>
      </Card>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        {events.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-3)", padding: 20 }}>No edits or deletions logged yet.</p>
        ) : (
          <div style={{ display: "grid" }}>
            {events.map((ev) => {
              const snapshot = ev.after || ev.before;
              const changes = ev.action === "edit" ? describeChanges(ev.before, ev.after) : [];
              return (
                <div key={ev.id} style={{ padding: "14px 20px", borderTop: "1px solid var(--line)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13 }}>
                    {ev.action === "delete" ? <Trash2 size={14} color="#B5654A" /> : <Pencil size={14} color="var(--ink-3)" />}
                    <span style={{ fontWeight: 700, color: "var(--ink-1)" }}>{ev.actorName}</span>
                    <span style={{ color: "var(--ink-3)" }}>{ev.action === "delete" ? "deleted" : "edited"} {nameFor.employee(snapshot?.employeeId)}'s entry</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-3)" }}>{new Date(ev.timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: changes.length ? 8 : 0 }}>
                    {snapshot?.date} · {describeSnapshot(snapshot)} · {fmtHours(snapshot?.hours || 0)}
                  </div>
                  {changes.length > 0 && (
                    <div style={{ display: "grid", gap: 3 }}>
                      {changes.map((c) => (
                        <div key={c.label} style={{ fontSize: 12, color: "var(--ink-3)" }}>
                          {c.label}: <span style={{ color: "var(--ink-2)" }}>{c.from}</span> → <span style={{ color: "var(--ink-1)", fontWeight: 600 }}>{c.to}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
