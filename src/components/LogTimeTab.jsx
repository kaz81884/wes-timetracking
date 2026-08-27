import React, { useState, useEffect, useRef } from "react";
import { Clock, Play, Square, Plus, AlertCircle, Pencil } from "lucide-react";
import { Card, Select, TextInput, Button, Toggle } from "./ui";
import { uid, todayStr, fmtTimeHMS, rangeToHours } from "../lib/utils";

export default function LogTimeTab({ data, setData, currentUser }) {
  const [clientId, setClientId] = useState(data.clients[0]?.id || "");
  const [taskId, setTaskId] = useState("");
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

  const client = data.clients.find((c) => c.id === clientId);
  const tasks = client ? data.taskTypes.filter((t) => (client.taskIds || []).includes(t.id)) : [];

  useEffect(() => {
    if (!clientId && data.clients.length) setClientId(data.clients[0].id);
  }, [data.clients]);

  useEffect(() => {
    if (client && tasks.length && !tasks.find((t) => t.id === taskId)) setTaskId(tasks[0].id);
    if (client && !tasks.length) setTaskId("");
  }, [clientId, data.clients]);

  // resume a timer that was left running (e.g. browser closed mid-shift)
  useEffect(() => {
    if (resumedRef.current) return;
    const t = data.timers[currentUser.id];
    if (t) {
      setTimerStart(t.startedAt);
      setClientId(t.clientId);
      setTaskId(t.taskId || "");
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

  const computeDefaultTask = (cid) => {
    const c = data.clients.find((x) => x.id === cid);
    const list = c ? data.taskTypes.filter((t) => (c.taskIds || []).includes(t.id)) : [];
    return list[0]?.id || "";
  };

  // switching the company or activity while the timer is running saves the
  // segment just worked (e.g. 3 min of Manage Inbox) and starts a fresh segment
  // immediately — no need to stop and restart between short activities.
  const applySelection = (nextClientId, nextTaskId) => {
    if (timerStart) {
      const now = Date.now();
      const hrs = (now - timerStart) / 3600000;
      let nextEntries = data.timeEntries;
      if (hrs > 0.005) {
        nextEntries = [...data.timeEntries, {
          id: uid(), employeeId: currentUser.id, clientId: clientId || null, taskId: taskId || null,
          notes, hours: Math.round(hrs * 3600) / 3600, date: todayStr(), billable, mode: "range",
          start: fmtTimeHMS(new Date(timerStart)), end: fmtTimeHMS(new Date(now)),
        }];
      }
      const newStart = Date.now();
      setData({
        ...data,
        timeEntries: nextEntries,
        timers: { ...data.timers, [currentUser.id]: { startedAt: newStart, clientId: nextClientId, taskId: nextTaskId, notes: "", billable } },
      });
      setTimerStart(newStart);
      setElapsed(0);
      setNotes("");
    }
    setClientId(nextClientId);
    setTaskId(nextTaskId);
  };

  const addEntry = (hours, dateStr, extra = {}) => {
    const entry = {
      id: uid(), employeeId: currentUser.id, clientId: clientId || null, taskId: taskId || null,
      notes, hours, date: dateStr, billable, mode: "duration", ...extra,
    };
    setData({ ...data, timeEntries: [...data.timeEntries, entry] });
  };

  const startTimer = () => {
    const startedAt = Date.now();
    setTimerStart(startedAt);
    setData({ ...data, timers: { ...data.timers, [currentUser.id]: { startedAt, clientId, taskId, notes, billable } } });
  };

  const stopTimer = () => {
    const now = Date.now();
    const hrs = elapsed / 3600;
    const nextTimers = { ...data.timers };
    delete nextTimers[currentUser.id];
    if (hrs > 0.005) {
      const entry = {
        id: uid(), employeeId: currentUser.id, clientId: clientId || null, taskId: taskId || null,
        notes, hours: Math.round(hrs * 3600) / 3600, date: todayStr(), billable, mode: "range",
        start: fmtTimeHMS(new Date(timerStart)), end: fmtTimeHMS(new Date(now)),
      };
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

  const noCompanies = data.clients.length === 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 20, alignItems: "start" }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <Clock size={16} color="var(--ink-3)" />
          <span style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)" }}>Live timer</span>
        </div>

        {noCompanies ? (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "var(--wash)", padding: 14, borderRadius: 10, fontSize: 13, color: "var(--ink-2)" }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            No companies yet. Add one on the Companies tab before logging time.
          </div>
        ) : (
          <>
            <div style={{ fontFamily: "var(--mono)", fontSize: 44, fontWeight: 500, color: "var(--ink-1)", margin: "6px 0 18px", letterSpacing: "-0.01em" }}>
              {new Date(elapsed * 1000).toISOString().slice(11, 19)}
            </div>
            <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              <Select value={clientId} onChange={(e) => applySelection(e.target.value, computeDefaultTask(e.target.value))}>
                {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Select value={taskId} onChange={(e) => applySelection(clientId, e.target.value)}>
                {tasks.length === 0 && <option value="">No activities assigned to this company</option>}
                {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
              {tasks.length === 0 && (
                <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: 0 }}>
                  Activities are managed by an admin on the Companies tab, so they stay consistent across every client.
                </p>
              )}
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
            {timerStart && <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 10, textAlign: "center" }}>Running — switch the company or activity above anytime and it saves what you just logged, then keeps going. Safe to refresh too.</p>}
          </>
        )}
      </Card>

      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <Pencil size={15} color="var(--ink-3)" />
          <span style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)" }}>Log time manually</span>
        </div>
        {noCompanies ? (
          <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Add a company first.</p>
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
                <TextInput type="time" step="1" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                <TextInput type="time" step="1" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            )}
            <Select value={clientId} onChange={(e) => applySelection(e.target.value, computeDefaultTask(e.target.value))}>
              {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select value={taskId} onChange={(e) => applySelection(clientId, e.target.value)}>
              {tasks.length === 0 && <option value="">No activities assigned</option>}
              {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
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
