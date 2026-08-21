import React, { useState, useEffect, useRef } from "react";
import { Clock, Play, Square, Plus, AlertCircle, Pencil } from "lucide-react";
import { Card, Select, TextInput, Button, Toggle, projectOptionGroups } from "./ui";
import { uid, todayStr, rangeToHours } from "../lib/utils";

export default function LogTimeTab({ data, setData, currentUser }) {
  const activeProjects = data.projects.filter((p) => p.status !== "inactive");
  const [projectId, setProjectId] = useState(activeProjects[0]?.id || "");
  const [taskId, setTaskId] = useState("");
  const [engagementId, setEngagementId] = useState("");
  const [notes, setNotes] = useState("");
  const [billable, setBillable] = useState(true);

  const [mode, setMode] = useState("duration");
  const [manualDate, setManualDate] = useState(todayStr());
  const [manualHours, setManualHours] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [timerStart, setTimerStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const resumedRef = useRef(false);

  const project = data.projects.find((p) => p.id === projectId);
  const tasks = project ? data.taskTypes.filter((t) => project.taskIds.includes(t.id)) : [];
  const companyEngagements = project ? data.engagements.filter((e) => e.clientId === project.clientId && e.status !== "archived") : [];

  useEffect(() => {
    if (!projectId && activeProjects.length) setProjectId(activeProjects[0].id);
  }, [data.projects]);

  useEffect(() => {
    if (project && tasks.length && !tasks.find((t) => t.id === taskId)) setTaskId(tasks[0].id);
    if (project && !tasks.length) setTaskId("");
  }, [projectId, data.projects]);

  useEffect(() => {
    if (project && !companyEngagements.find((e) => e.id === engagementId)) setEngagementId(computeDefaultEngagement(projectId));
    if (!project) setEngagementId("");
  }, [projectId, data.projects, data.engagements]);

  // resume a timer that was left running (e.g. browser closed mid-shift)
  useEffect(() => {
    if (resumedRef.current) return;
    const t = data.timers[currentUser.id];
    if (t) {
      setTimerStart(t.startedAt);
      setProjectId(t.projectId);
      setTaskId(t.taskId || "");
      setEngagementId(t.engagementId || "");
      setNotes(t.notes || "");
      setBillable(t.billable !== false);
    }
    resumedRef.current = true;
  }, [data.timers, currentUser.id]);

  useEffect(() => {
    if (!timerStart) return;
    const t = setInterval(() => setElapsed((Date.now() - timerStart) / 1000), 1000);
    setElapsed((Date.now() - timerStart) / 1000);
    return () => clearInterval(t);
  }, [timerStart]);

  const computeDefaultTask = (pid) => {
    const proj = data.projects.find((p) => p.id === pid);
    const list = proj ? data.taskTypes.filter((t) => proj.taskIds.includes(t.id)) : [];
    return list[0]?.id || "";
  };

  // the most recently created active project (billing cycle) for a contact's company
  const computeDefaultEngagement = (pid) => {
    const proj = data.projects.find((p) => p.id === pid);
    if (!proj) return "";
    const list = data.engagements.filter((e) => e.clientId === proj.clientId && e.status !== "archived");
    if (!list.length) return "";
    return [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0].id;
  };

  // switching the contact, activity, or project while the timer is running saves the
  // segment just worked (e.g. 3 min of Manage Inbox) and starts a fresh segment
  // immediately — no need to stop and restart between short activities.
  const applySelection = (nextProjectId, nextTaskId, nextEngagementId) => {
    if (timerStart) {
      const hrs = (Date.now() - timerStart) / 3600000;
      let nextEntries = data.timeEntries;
      if (hrs > 0.005) {
        nextEntries = [...data.timeEntries, {
          id: uid(), employeeId: currentUser.id, projectId: projectId || null, taskId: taskId || null, engagementId: engagementId || null,
          notes, hours: Math.round(hrs * 100) / 100, date: todayStr(), billable, mode: "duration",
        }];
      }
      const newStart = Date.now();
      setData({
        ...data,
        timeEntries: nextEntries,
        timers: { ...data.timers, [currentUser.id]: { startedAt: newStart, projectId: nextProjectId, taskId: nextTaskId, engagementId: nextEngagementId, notes: "", billable } },
      });
      setTimerStart(newStart);
      setElapsed(0);
      setNotes("");
    }
    setProjectId(nextProjectId);
    setTaskId(nextTaskId);
    setEngagementId(nextEngagementId);
  };

  const addEntry = (hours, dateStr, extra = {}) => {
    const entry = {
      id: uid(), employeeId: currentUser.id, projectId: projectId || null, taskId: taskId || null, engagementId: engagementId || null,
      notes, hours, date: dateStr, billable, mode: "duration", ...extra,
    };
    setData({ ...data, timeEntries: [...data.timeEntries, entry] });
  };

  const startTimer = () => {
    const startedAt = Date.now();
    setTimerStart(startedAt);
    setData({ ...data, timers: { ...data.timers, [currentUser.id]: { startedAt, projectId, taskId, engagementId, notes, billable } } });
  };

  const stopTimer = () => {
    const hrs = elapsed / 3600;
    const nextTimers = { ...data.timers };
    delete nextTimers[currentUser.id];
    if (hrs > 0.005) {
      const entry = { id: uid(), employeeId: currentUser.id, projectId: projectId || null, taskId: taskId || null, engagementId: engagementId || null, notes, hours: Math.round(hrs * 100) / 100, date: todayStr(), billable, mode: "duration" };
      setData({ ...data, timeEntries: [...data.timeEntries, entry], timers: nextTimers });
    } else {
      setData({ ...data, timers: nextTimers });
    }
    setTimerStart(null);
    setElapsed(0);
    setNotes("");
  };

  const addManual = () => {
    if (mode === "duration") {
      const h = parseFloat(manualHours);
      if (!h || h <= 0) return;
      addEntry(h, manualDate, { mode: "duration" });
      setManualHours("");
    } else {
      const h = rangeToHours(startTime, endTime);
      if (!h || h <= 0) return;
      addEntry(h, manualDate, { mode: "range", start: startTime, end: endTime });
      setStartTime(""); setEndTime("");
    }
    setNotes("");
  };

  const noProjects = activeProjects.length === 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 20, alignItems: "start" }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <Clock size={16} color="var(--ink-3)" />
          <span style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)" }}>Live timer</span>
        </div>

        {noProjects ? (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "var(--wash)", padding: 14, borderRadius: 10, fontSize: 13, color: "var(--ink-2)" }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            No active contacts yet. Add a company and a contact on the Companies tab before logging time.
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "var(--mono)", fontSize: 44, fontWeight: 500, color: "var(--ink-1)", margin: "6px 0 18px", letterSpacing: "-0.01em" }}>
              {new Date(elapsed * 1000).toISOString().slice(11, 19)}
            </div>
            <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              <Select value={projectId} onChange={(e) => applySelection(e.target.value, computeDefaultTask(e.target.value), computeDefaultEngagement(e.target.value))}>
                {projectOptionGroups(activeProjects, data.clients)}
              </Select>
              <Select value={taskId} onChange={(e) => applySelection(projectId, e.target.value, engagementId)}>
                {tasks.length === 0 && <option value="">No activities assigned to this contact</option>}
                {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              {tasks.length === 0 && (
                <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: 0 }}>
                  Activities are managed by an admin on the Companies tab, so they stay consistent across every client.
                </p>
              )}
              <Select value={engagementId} onChange={(e) => applySelection(projectId, taskId, e.target.value)}>
                <option value="">No project (not tied to a billing cycle)</option>
                {companyEngagements.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
              <TextInput placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Toggle checked={billable} onChange={setBillable} label="Billable" />
            </div>
            {!timerStart ? (
              <Button variant="accent" onClick={startTimer} style={{ width: "100%", justifyContent: "center", padding: "11px 14px" }}>
                <Play size={15} /> Start timer
              </Button>
            ) : (
              <Button variant="danger" onClick={stopTimer} style={{ width: "100%", justifyContent: "center", padding: "11px 14px" }}>
                <Square size={13} /> Stop & save
              </Button>
            )}
            {timerStart && <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 10, textAlign: "center" }}>Running — switch the contact or activity above anytime and it saves what you just logged, then keeps going. Safe to refresh too.</p>}
          </>
        )}
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <Pencil size={15} color="var(--ink-3)" />
          <span style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)" }}>Log time manually</span>
        </div>
        {noProjects ? (
          <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Add a company and a contact first.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 6, background: "var(--wash)", borderRadius: 9, padding: 3 }}>
              {["duration", "range"].map((m) => (
                <button key={m} onClick={() => setMode(m)} style={{
                  flex: 1, padding: "7px 10px", borderRadius: 7, border: "none", cursor: "pointer",
                  background: mode === m ? "#fff" : "transparent", fontWeight: 600, fontSize: 12.5,
                  color: mode === m ? "var(--ink-1)" : "var(--ink-3)", fontFamily: "inherit",
                  boxShadow: mode === m ? "0 1px 2px rgba(0,0,0,.08)" : "none",
                }}>
                  {m === "duration" ? "Duration" : "Start – End"}
                </button>
              ))}
            </div>
            <TextInput type="date" value={manualDate} max={todayStr()} onChange={(e) => setManualDate(e.target.value)} />
            {mode === "duration" ? (
              <TextInput type="number" step="0.25" min="0" placeholder="Hours" value={manualHours} onChange={(e) => setManualHours(e.target.value)} />
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <TextInput type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                <TextInput type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            )}
            <Select value={projectId} onChange={(e) => applySelection(e.target.value, computeDefaultTask(e.target.value), computeDefaultEngagement(e.target.value))}>
              {projectOptionGroups(activeProjects, data.clients)}
            </Select>
            <Select value={taskId} onChange={(e) => applySelection(projectId, e.target.value, engagementId)}>
              {tasks.length === 0 && <option value="">No activities assigned</option>}
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <Select value={engagementId} onChange={(e) => applySelection(projectId, taskId, e.target.value)}>
              <option value="">No project (not tied to a billing cycle)</option>
              {companyEngagements.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
            <TextInput placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <Toggle checked={billable} onChange={setBillable} label="Billable" />
            <Button onClick={addManual} style={{ justifyContent: "center" }}><Plus size={14} /> Add entry</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
