import React, { useState } from "react";
import { Clock, LayoutDashboard, ListChecks, Building2, Users, BarChart3, Shield, AlertCircle, UserCircle, History } from "lucide-react";
import { useAppData } from "./lib/data";
import { uid, DEFAULT_TASK_TYPES } from "./lib/utils";
import LoginScreen from "./components/LoginScreen";
import ResetPinScreen from "./components/ResetPinScreen";
import DashboardTab from "./components/DashboardTab";
import LogTimeTab from "./components/LogTimeTab";
import TimesheetTab from "./components/TimesheetTab";
import CompaniesTab from "./components/CompaniesTab";
import TeamTab from "./components/TeamTab";
import ReportsTab from "./components/ReportsTab";
import ProfileTab from "./components/ProfileTab";
import AuditLogTab from "./components/AuditLogTab";

export default function App() {
  const { data, setData, loading, saving, error } = useAppData();
  const [userId, setUserId] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [resetToken, setResetToken] = useState(() => new URLSearchParams(window.location.search).get("reset"));

  if (loading || !data) {
    return <div style={{ padding: 60, textAlign: "center", color: "#9AA5B1" }}>Loading…</div>;
  }

  if (resetToken) {
    return (
      <ResetPinScreen
        data={data}
        setData={setData}
        token={resetToken}
        onDone={(employeeId) => {
          window.history.replaceState(null, "", window.location.pathname);
          setResetToken(null);
          if (employeeId) setUserId(employeeId);
        }}
      />
    );
  }

  const currentUser = data.employees.find((e) => e.id === userId);
  const isAdmin = currentUser?.role === "admin";

  if (!currentUser) {
    return (
      <LoginScreen
        employees={data.employees}
        onLogin={setUserId}
        onBootstrapAdmin={(name, pin, email) => {
          const emp = { id: uid(), name, pin, email, role: "admin" };
          const taskTypes = data.taskTypes.length ? data.taskTypes : DEFAULT_TASK_TYPES.map((n) => ({ id: uid(), name: n }));
          setData({ ...data, employees: [emp], taskTypes });
          setUserId(emp.id);
        }}
      />
    );
  }

  const TABS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { id: "timer", label: "Log time", icon: Clock, show: true },
    { id: "timesheet", label: "Timesheet", icon: ListChecks, show: true },
    { id: "companies", label: "Companies", icon: Building2, show: isAdmin },
    { id: "team", label: "Team", icon: Users, show: isAdmin },
    { id: "reports", label: "Reports", icon: BarChart3, show: true },
    { id: "audit", label: "Audit log", icon: History, show: isAdmin },
    { id: "profile", label: "Profile", icon: UserCircle, show: true },
  ].filter((t) => t.show);

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 26, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--ink-1)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><Clock size={16} /></div>
            <div>
              <div style={{ fontFamily: "var(--display)", fontSize: 19, fontWeight: 600, lineHeight: 1.1 }}>Ledger</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Williams Executive Support</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {saving && <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Saving…</span>}
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 24, height: 24, borderRadius: 99, background: "var(--accent)", color: "#fff", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{currentUser.name.slice(0, 1).toUpperCase()}</span>
              {currentUser.name}
              {isAdmin && <Shield size={13} color="var(--ink-3)" />}
            </div>
            <button onClick={() => setUserId(null)} style={{ fontSize: 12.5, color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Switch</button>
          </div>
        </div>

        {error && <div style={{ display: "flex", gap: 8, alignItems: "center", background: "#F6E7E1", color: "#B5654A", padding: "10px 14px", borderRadius: 9, fontSize: 13, marginBottom: 16 }}><AlertCircle size={15} /> {error}</div>}

        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid var(--line)", overflowX: "auto" }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 7, padding: "10px 14px", background: "none", border: "none",
                cursor: "pointer", fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap",
                color: active ? "var(--ink-1)" : "var(--ink-3)", borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -1,
              }}>
                <Icon size={15} /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "dashboard" && <DashboardTab data={data} currentUser={currentUser} />}
        {tab === "timer" && <LogTimeTab data={data} setData={setData} currentUser={currentUser} />}
        {tab === "timesheet" && <TimesheetTab data={data} setData={setData} currentUser={currentUser} />}
        {tab === "companies" && isAdmin && <CompaniesTab data={data} setData={setData} />}
        {tab === "team" && isAdmin && <TeamTab data={data} setData={setData} currentUser={currentUser} />}
        {tab === "reports" && <ReportsTab data={data} setData={setData} currentUser={currentUser} />}
        {tab === "audit" && isAdmin && <AuditLogTab data={data} />}
        {tab === "profile" && <ProfileTab data={data} setData={setData} currentUser={currentUser} />}
      </div>
    </div>
  );
}
