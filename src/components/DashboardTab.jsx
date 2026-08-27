import React, { useMemo } from "react";
import { Card, DayRibbon } from "./ui";
import { todayStr, fmtHours, fmtDate, startOfWeek, addDays, clientIdForEntry, colorForClient } from "../lib/utils";

export default function DashboardTab({ data, currentUser }) {
  const today = todayStr();
  const weekStart = startOfWeek(today);
  const myEntries = data.timeEntries.filter((e) => e.employeeId === currentUser.id);
  const weekEntries = myEntries.filter((e) => e.date >= weekStart && e.date <= addDays(weekStart, 6));
  const todayEntries = myEntries.filter((e) => e.date === today);

  const weekTotal = weekEntries.reduce((s, e) => s + e.hours, 0);
  const todayTotal = todayEntries.reduce((s, e) => s + e.hours, 0);
  const billableWeek = weekEntries.filter((e) => e.billable).reduce((s, e) => s + e.hours, 0);
  const teamTodayTotal = data.timeEntries.filter((e) => e.date === today).reduce((s, e) => s + e.hours, 0);

  const byCompany = useMemo(() => {
    const map = {};
    weekEntries.forEach((e) => { const cid = clientIdForEntry(e, data.projects); map[cid] = (map[cid] || 0) + e.hours; });
    return Object.entries(map).map(([cid, hours]) => ({ client: data.clients.find((c) => c.id === cid), hours })).filter((r) => r.client).sort((a, b) => b.hours - a.hours);
  }, [weekEntries, data.projects, data.clients]);
  const maxCompanyHours = Math.max(1, ...byCompany.map((r) => r.hours));
  const recent = [...myEntries].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <Card>
          <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)", fontWeight: 700, marginBottom: 8 }}>Today</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 26, color: "var(--ink-1)" }}>{fmtHours(todayTotal)}</div>
        </Card>
        <Card>
          <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)", fontWeight: 700, marginBottom: 8 }}>This week</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 26, color: "var(--ink-1)" }}>{fmtHours(weekTotal)}</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{fmtHours(billableWeek)} billable</div>
        </Card>
        <Card>
          <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)", fontWeight: 700, marginBottom: 8 }}>Whole team, today</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 26, color: "var(--ink-1)" }}>{fmtHours(teamTodayTotal)}</div>
        </Card>
      </div>
      <Card><DayRibbon entries={myEntries} clients={data.clients} projects={data.projects} dateStr={today} /></Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)", fontWeight: 700, marginBottom: 14 }}>This week by company</div>
          {byCompany.length === 0 ? <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Nothing logged this week yet.</p> : (
            <div style={{ display: "grid", gap: 10 }}>
              {byCompany.map((r) => (
                <div key={r.client.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ color: "var(--ink-2)", fontWeight: 600 }}>{r.client.name}</span>
                    <span style={{ fontFamily: "var(--mono)", color: "var(--ink-3)" }}>{fmtHours(r.hours)}</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 5, background: "var(--wash)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(r.hours / maxCompanyHours) * 100}%`, background: colorForClient(r.client), borderRadius: 5 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <div style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)", fontWeight: 700, marginBottom: 14 }}>Recent entries</div>
          {recent.length === 0 ? <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Nothing logged yet.</p> : (
            <div style={{ display: "grid", gap: 10 }}>
              {recent.map((e) => {
                const client = data.clients.find((c) => c.id === clientIdForEntry(e, data.projects));
                return (
                  <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: "var(--ink-1)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client ? client.name : "Unassigned"}</div>
                      <div style={{ color: "var(--ink-3)", fontSize: 12 }}>{fmtDate(e.date)}</div>
                    </div>
                    <span style={{ fontFamily: "var(--mono)", color: "var(--ink-2)", flexShrink: 0, marginLeft: 10 }}>{fmtHours(e.hours)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
