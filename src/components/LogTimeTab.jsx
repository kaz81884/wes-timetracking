import React, { useState } from "react";
import { Clock, Plus, AlertCircle, Pencil, PictureInPicture2, ExternalLink } from "lucide-react";
import { Card, Select, TextInput, Button, IconBtn, Toggle } from "./ui";
import { todayStr, rangeToHours } from "../lib/utils";
import { pipSupported } from "../lib/useLiveTimer";

export default function LogTimeTab({ data, timer }) {
  const { clientId, taskId, notes, setNotes, billable, setBillable, tasks, timerStart, computeDefaultTask, applySelection, addEntry, pipWindow, pipMode, openPip, renderTimerControls } = timer;

  const [mode, setMode] = useState("duration");
  const [manualDate, setManualDate] = useState(todayStr());
  const [manualHours, setManualHours] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

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
          <span style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)", flex: 1 }}>Live timer</span>
          {pipSupported && timerStart && (
            <IconBtn title={pipWindow && pipMode === "mini" ? "Timer is popped out" : "Pop out timer"} onClick={() => openPip("mini")} disabled={pipWindow && pipMode === "mini"}>
              <PictureInPicture2 size={15} />
            </IconBtn>
          )}
          {pipSupported && !noCompanies && (
            <IconBtn title={pipWindow && pipMode === "full" ? "Full controls popped out" : "Pop out full controls"} onClick={() => openPip("full")} disabled={pipWindow && pipMode === "full"}>
              <ExternalLink size={15} />
            </IconBtn>
          )}
        </div>

        {noCompanies ? (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "var(--wash)", padding: 14, borderRadius: 10, fontSize: 13, color: "var(--ink-2)" }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            No companies yet. Add one on the Companies tab before logging time.
          </div>
        ) : renderTimerControls()}
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
                  background: mode === m ? "var(--paper)" : "transparent", fontWeight: 600, fontSize: 12.5,
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
