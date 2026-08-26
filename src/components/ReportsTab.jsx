import React, { useState, useMemo } from "react";
import { Download, Pencil } from "lucide-react";
import { Card, Pill, Select, TextInput, Button, IconBtn, projectOptionGroups } from "./ui";
import { todayStr, fmtHours, fmtDate, startOfWeek, logAudit } from "../lib/utils";
import EditEntryForm from "./EditEntryForm";
import DeleteEntryButton from "./DeleteEntryButton";

export default function ReportsTab({ data, setData, currentUser }) {
  const isAdmin = currentUser.role === "admin";
  const [editingId, setEditingId] = useState(null);

  const canManage = (entry) => isAdmin || entry.employeeId === currentUser.id;
  const deleteEntry = (entry) => setData(logAudit(
    { ...data, timeEntries: data.timeEntries.filter((e) => e.id !== entry.id) },
    { action: "delete", actor: currentUser, entryId: entry.id, before: entry },
  ));
  const [from, setFrom] = useState(startOfWeek(todayStr()));
  const [to, setTo] = useState(todayStr());
  const [employeeFilter, setEmployeeFilter] = useState(isAdmin ? "all" : currentUser.id);
  const [clientFilter, setClientFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const [engagementFilter, setEngagementFilter] = useState("all");

  const projectsInClient = clientFilter === "all" ? data.projects : data.projects.filter((p) => p.clientId === clientFilter);
  const engagementsInClient = clientFilter === "all" ? data.engagements : data.engagements.filter((e) => e.clientId === clientFilter);
  const availableTasks = projectFilter === "all"
    ? data.taskTypes
    : data.taskTypes.filter((t) => (data.projects.find((p) => p.id === projectFilter)?.taskIds || []).includes(t.id));

  const filtered = useMemo(() => {
    return data.timeEntries.filter((e) => {
      if (e.date < from || e.date > to) return false;
      if (!isAdmin && e.employeeId !== currentUser.id) return false;
      if (isAdmin && employeeFilter !== "all" && e.employeeId !== employeeFilter) return false;
      if (clientFilter !== "all" && data.projects.find((p) => p.id === e.projectId)?.clientId !== clientFilter) return false;
      if (projectFilter !== "all" && e.projectId !== projectFilter) return false;
      if (taskFilter !== "all" && e.taskId !== taskFilter) return false;
      if (engagementFilter !== "all" && e.engagementId !== engagementFilter) return false;
      return true;
    });
  }, [data.timeEntries, data.projects, from, to, employeeFilter, clientFilter, projectFilter, taskFilter, engagementFilter, isAdmin, currentUser.id]);

  const total = filtered.reduce((s, e) => s + e.hours, 0);
  const billable = filtered.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);

  const byEmployee = useMemo(() => {
    const map = {};
    filtered.forEach((e) => { map[e.employeeId] = (map[e.employeeId] || 0) + e.hours; });
    return Object.entries(map).map(([id, hours]) => ({ employee: data.employees.find((x) => x.id === id), hours })).filter((r) => r.employee).sort((a, b) => b.hours - a.hours);
  }, [filtered, data.employees]);

  const byCompany = useMemo(() => {
    const map = {};
    filtered.forEach((e) => {
      const cid = data.projects.find((p) => p.id === e.projectId)?.clientId;
      if (!cid) return;
      map[cid] = (map[cid] || 0) + e.hours;
    });
    return Object.entries(map).map(([id, hours]) => ({ client: data.clients.find((c) => c.id === id), hours })).filter((r) => r.client).sort((a, b) => b.hours - a.hours);
  }, [filtered, data.projects, data.clients]);

  const exportCsv = () => {
    const rows = [["Date", "Employee", "Company", "Contact", "Project", "Activity", "Duration", "Hours", "Billable", "Notes"]];
    filtered.forEach((e) => {
      const emp = data.employees.find((x) => x.id === e.employeeId);
      const proj = data.projects.find((p) => p.id === e.projectId);
      const client = proj ? data.clients.find((c) => c.id === proj.clientId) : null;
      const task = data.taskTypes.find((t) => t.id === e.taskId);
      const engagement = data.engagements.find((en) => en.id === e.engagementId);
      rows.push([e.date, emp?.name || "", client?.name || "", proj?.name || "", engagement?.name || "", task?.name || "", (Math.round(e.hours * 100) / 100).toFixed(2), fmtHours(e.hours), e.billable ? "Yes" : "No", (e.notes || "").replace(/[\n,]/g, " ")]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `timesheet_${from}_to_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div><div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5, fontWeight: 600 }}>From</div><TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5, fontWeight: 600 }}>To</div><TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          {isAdmin && (
            <div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5, fontWeight: 600 }}>Team member</div>
              <Select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} style={{ minWidth: 150 }}>
                <option value="all">Everyone</option>
                {data.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5, fontWeight: 600 }}>Company</div>
            <Select value={clientFilter} onChange={(e) => { setClientFilter(e.target.value); setProjectFilter("all"); setTaskFilter("all"); setEngagementFilter("all"); }} style={{ minWidth: 150 }}>
              <option value="all">All companies</option>
              {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5, fontWeight: 600 }}>Contact</div>
            <Select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setTaskFilter("all"); }} style={{ minWidth: 150 }}>
              <option value="all">All contacts</option>
              {projectOptionGroups(projectsInClient, data.clients)}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5, fontWeight: 600 }}>Activity</div>
            <Select value={taskFilter} onChange={(e) => setTaskFilter(e.target.value)} style={{ minWidth: 150 }}>
              <option value="all">All activities</option>
              {availableTasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 5, fontWeight: 600 }}>Project</div>
            <Select value={engagementFilter} onChange={(e) => setEngagementFilter(e.target.value)} style={{ minWidth: 150 }}>
              <option value="all">All projects</option>
              {engagementsInClient.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          </div>
          <Button variant="ghost" onClick={exportCsv} style={{ marginLeft: "auto" }}><Download size={14} /> Export CSV</Button>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card><div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)", fontWeight: 700, marginBottom: 8 }}>Total hours</div><div style={{ fontFamily: "var(--mono)", fontSize: 26, color: "var(--ink-1)" }}>{fmtHours(total)}</div></Card>
        <Card><div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)", fontWeight: 700, marginBottom: 8 }}>Billable</div><div style={{ fontFamily: "var(--mono)", fontSize: 26, color: "var(--ink-1)" }}>{fmtHours(billable)}</div></Card>
      </div>

      {isAdmin && (
        <Card>
          <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)", fontWeight: 700, marginBottom: 14 }}>By company</div>
          {byCompany.length === 0 ? <p style={{ fontSize: 13, color: "var(--ink-3)" }}>No entries in this range.</p> : (
            <div style={{ display: "grid", gap: 10 }}>
              {byCompany.map((r) => (
                <div key={r.client.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13.5, color: "var(--ink-1)", fontWeight: 600 }}>{r.client.name}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--ink-2)" }}>{fmtHours(r.hours)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {isAdmin && (
        <Card>
          <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)", fontWeight: 700, marginBottom: 14 }}>By team member</div>
          {byEmployee.length === 0 ? <p style={{ fontSize: 13, color: "var(--ink-3)" }}>No entries in this range.</p> : (
            <div style={{ display: "grid", gap: 10 }}>
              {byEmployee.map((r) => (
                <div key={r.employee.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13.5, color: "var(--ink-1)", fontWeight: 600 }}>{r.employee.name}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--ink-2)" }}>{fmtHours(r.hours)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px 10px", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)", fontWeight: 700 }}>Entries ({filtered.length})</div>
        <div style={{ maxHeight: 340, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--ink-3)", fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".04em" }}>
                <th style={{ padding: "8px 20px" }}>Date</th>
                {isAdmin && <th style={{ padding: "8px" }}>Who</th>}
                <th style={{ padding: "8px" }}>Company</th>
                <th style={{ padding: "8px" }}>Contact</th>
                <th style={{ padding: "8px" }}>Project</th>
                <th style={{ padding: "8px" }}>Activity</th>
                <th style={{ padding: "8px 20px", textAlign: "right" }}>Hours</th>
                <th style={{ padding: "8px 20px" }}></th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].sort((a, b) => (a.date < b.date ? 1 : -1)).map((e) => {
                const emp = data.employees.find((x) => x.id === e.employeeId);
                const proj = data.projects.find((p) => p.id === e.projectId);
                const client = proj ? data.clients.find((c) => c.id === proj.clientId) : null;
                const task = data.taskTypes.find((t) => t.id === e.taskId);
                const engagement = data.engagements.find((en) => en.id === e.engagementId);
                const colCount = isAdmin ? 8 : 7;
                if (editingId === e.id) {
                  return (
                    <tr key={e.id} style={{ borderTop: "1px solid var(--line)" }}>
                      <td colSpan={colCount} style={{ padding: "9px 20px" }}>
                        <EditEntryForm data={data} setData={setData} entry={e} currentUser={currentUser} onDone={() => setEditingId(null)} />
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={e.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "9px 20px", color: "var(--ink-2)" }}>{fmtDate(e.date)}</td>
                    {isAdmin && <td style={{ padding: "9px", color: "var(--ink-2)" }}>{emp?.name || "—"}</td>}
                    <td style={{ padding: "9px", color: "var(--ink-2)" }}>{client?.name || "—"}</td>
                    <td style={{ padding: "9px" }}>{proj ? <Pill color={proj.color}>{proj.name}</Pill> : "—"}</td>
                    <td style={{ padding: "9px", color: "var(--ink-2)" }}>{engagement?.name || "—"}</td>
                    <td style={{ padding: "9px", color: "var(--ink-2)" }}>{task?.name || "—"}</td>
                    <td style={{ padding: "9px 20px", textAlign: "right", fontFamily: "var(--mono)", color: "var(--ink-1)" }}>{fmtHours(e.hours)}</td>
                    <td style={{ padding: "9px 20px" }}>
                      {canManage(e) && (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <IconBtn title="Edit entry" onClick={() => setEditingId(e.id)}><Pencil size={14} /></IconBtn>
                          <DeleteEntryButton onConfirm={() => deleteEntry(e)} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
