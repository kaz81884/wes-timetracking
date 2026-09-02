import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Play, Square, Maximize2, Minimize2 } from "lucide-react";
import { Select, TextInput, Button, IconBtn, Toggle } from "../components/ui";
import { uid, todayStr, fmtTimeHMS } from "./utils";

// Copies the main document's stylesheets into the pop-out window so the
// floating timer matches the app's look — Document Picture-in-Picture opens
// a blank window with none of the page's CSS by default.
const copyStylesInto = (pipDocument) => {
  [...document.styleSheets].forEach((sheet) => {
    try {
      const cssText = [...sheet.cssRules].map((r) => r.cssText).join("\n");
      const style = pipDocument.createElement("style");
      style.textContent = cssText;
      pipDocument.head.appendChild(style);
    } catch {
      if (sheet.href) {
        const link = pipDocument.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        pipDocument.head.appendChild(link);
      }
    }
  });
};

export const pipSupported = typeof window !== "undefined" && "documentPictureInPicture" in window;

// A timer segment shorter than this doesn't get saved as an entry — avoids
// junk entries from an accidental click.
const MIN_ENTRY_HOURS = 5 / 3600;

// Generous by design: window.resizeTo() only reliably takes effect when
// called synchronously inside a click handler (confirmed — switching
// between mini/full works). Calls made later from effects/observers, after
// the click's event has finished, get silently ignored by the browser. So
// there's no fixing an undersized window after the fact — these sizes have
// to be right the first time, which means erring generous over exact.
const FULL_SIZE = { width: 340, height: 400 };
const MINI_HEIGHT = 220;
const MINI_MIN_WIDTH = 280;
const MINI_MAX_WIDTH = 560;

// Measures the "COMPANY · ACTIVITY" label at the font/transform it's
// actually rendered at, so the mini window can be sized to fit it exactly
// instead of truncating a long company/activity name. The label renders
// UPPERCASE via CSS text-transform, and uppercase runs meaningfully wider
// than mixed case — measuring the original string undercounted the width.
let measureCanvas;
const miniWidthFor = (label) => {
  measureCanvas = measureCanvas || document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  ctx.font = "700 11px Inter, sans-serif";
  const upper = label.toUpperCase();
  let textWidth = ctx.measureText(upper).width;
  // measureText doesn't account for the label's letter-spacing (.05em) —
  // approximate it by adding that per character.
  textWidth += upper.length * 11 * 0.05;
  // padding (14 each side) + gap to the maximize button + the button itself
  // + slack, since this only gets one chance to be right (see note above).
  const needed = Math.ceil(textWidth) + 28 + 8 + 30 + 20;
  return Math.min(MINI_MAX_WIDTH, Math.max(MINI_MIN_WIDTH, needed));
};

// Owns all live-timer + pop-out state. Called once from App.jsx (which stays
// mounted regardless of which tab is active) rather than from LogTimeTab
// itself — LogTimeTab unmounts on every tab switch, which used to kill the
// timer's state and leave the pop-out window blank with nothing feeding it.
export function useLiveTimer(data, setData, currentUser) {
  const [clientId, setClientId] = useState(data.clients[0]?.id || "");
  const [taskId, setTaskId] = useState("");
  const [notes, setNotes] = useState("");
  const [billable, setBillable] = useState(true);

  const [timerStart, setTimerStart] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [pipWindow, setPipWindow] = useState(null);
  const [pipMode, setPipMode] = useState("mini"); // "mini" (read-only + stop) or "full" (all controls)
  const resumedRef = useRef(false);

  const client = data.clients.find((c) => c.id === clientId);
  const tasks = client ? data.taskTypes.filter((t) => (client.taskIds || []).includes(t.id)) : [];
  const activeTask = tasks.find((t) => t.id === taskId);

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
  // segment just worked (e.g. 3 min of Manage Inbox) and stops the timer —
  // it never restarts on its own, only an explicit click of Start does that.
  const applySelection = (nextClientId, nextTaskId) => {
    if (timerStart) {
      const now = Date.now();
      const hrs = (now - timerStart) / 3600000;
      let nextEntries = data.timeEntries;
      if (hrs > MIN_ENTRY_HOURS) {
        nextEntries = [...data.timeEntries, {
          id: uid(), employeeId: currentUser.id, clientId: clientId || null, taskId: taskId || null,
          notes, hours: Math.round(hrs * 3600) / 3600, date: todayStr(), billable, mode: "range",
          start: fmtTimeHMS(new Date(timerStart)), end: fmtTimeHMS(new Date(now)),
        }];
      }
      const nextTimers = { ...data.timers };
      delete nextTimers[currentUser.id];
      setData({ ...data, timeEntries: nextEntries, timers: nextTimers });
      setTimerStart(null);
      setElapsed(0);
      setNotes("");
      if (pipWindow && pipMode === "mini") pipWindow.close();
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

  const miniLabel = `${client?.name || ""}${activeTask ? ` · ${activeTask.name}` : ""}`;
  const sizeFor = (targetMode) => targetMode === "mini" ? { width: miniWidthFor(miniLabel), height: MINI_HEIGHT } : FULL_SIZE;

  // Only one Picture-in-Picture window can exist at a time — if one's
  // already open, just switch what it shows (and resize to fit) instead of
  // opening a second one.
  const openPip = async (targetMode) => {
    if (!pipSupported) return;
    const size = sizeFor(targetMode);
    if (pipWindow) {
      setPipMode(targetMode);
      try { pipWindow.resizeTo(size.width, size.height); } catch {}
      return;
    }
    const pip = await window.documentPictureInPicture.requestWindow(size);
    copyStylesInto(pip.document);
    // A pop-out window is its own document, so it needs the same
    // data-theme attribute copied over for dark mode to apply there too.
    const theme = document.documentElement.getAttribute("data-theme");
    if (theme) pip.document.documentElement.setAttribute("data-theme", theme);
    pip.document.body.style.margin = "0";
    pip.document.body.style.boxSizing = "border-box";
    pip.document.body.style.background = "var(--body-bg)";
    pip.addEventListener("pagehide", () => setPipWindow(null));
    // The size passed to requestWindow() above isn't always honored on the
    // very first pop-out of a session — an explicit resize afterward fixes
    // it reliably, same as switching between mini/full does.
    try { pip.resizeTo(size.width, size.height); } catch {}
    setPipMode(targetMode);
    setPipWindow(pip);
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
    if (hrs > MIN_ENTRY_HOURS) {
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
    if (pipWindow && pipMode === "mini") pipWindow.close();
  };

  // shared between the main "Live timer" card and the "full controls"
  // pop-out window, so both stay in sync — they're bound to the same state
  // either way. `compact` drops the onboarding-style hint text and shrinks
  // the clock, so it fits the small pop-out window without scrolling.
  const renderTimerControls = (compact = false) => (
    <>
      <div style={{ fontFamily: "var(--mono)", fontSize: compact ? 24 : 44, fontWeight: 500, color: "var(--ink-1)", margin: compact ? "0 0 8px" : "6px 0 18px", letterSpacing: "-0.01em" }}>
        {new Date(elapsed * 1000).toISOString().slice(11, 19)}
      </div>
      <div style={{ display: "grid", gap: compact ? 6 : 10, marginBottom: compact ? 8 : 16 }}>
        <Select value={clientId} onChange={(e) => applySelection(e.target.value, computeDefaultTask(e.target.value))}>
          {data.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select value={taskId} onChange={(e) => applySelection(clientId, e.target.value)}>
          {tasks.length === 0 && <option value="">No activities assigned to this company</option>}
          {tasks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        {tasks.length === 0 && !compact && (
          <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: 0 }}>
            Activities are managed by an admin on the Companies tab, so they stay consistent across every client.
          </p>
        )}
        <TextInput placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} style={compact ? { padding: "5px 9px" } : undefined} />
        <Toggle checked={billable} onChange={setBillable} label="Billable" />
      </div>
      {!timerStart ? (
        <Button variant="accent" onClick={startTimer} style={{ width: "100%", justifyContent: "center", padding: compact ? "8px 14px" : "11px 14px" }}>
          <Play size={15} /> Start timer
        </Button>
      ) : (
        <Button variant="danger" onClick={stopTimer} style={{ width: "100%", justifyContent: "center", padding: compact ? "8px 14px" : "11px 14px" }}>
          <Square size={13} /> Stop & save
        </Button>
      )}
      {timerStart && !compact && <p style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 10, textAlign: "center" }}>Running — changing the company or activity above saves what you just logged and stops the timer; click Start again to begin the next one. Safe to refresh too.</p>}
    </>
  );

  const portals = (
    <>
      {pipWindow && pipMode === "mini" && createPortal(
        <div style={{ padding: 14, display: "grid", gap: 6, boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {client?.name}{activeTask ? ` · ${activeTask.name}` : ""}
            </div>
            <IconBtn title="Show full controls" onClick={() => openPip("full")}><Maximize2 size={14} /></IconBtn>
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 32, fontWeight: 600, color: "var(--ink-1)" }}>
            {new Date(elapsed * 1000).toISOString().slice(11, 19)}
          </div>
          <Button variant="danger" onClick={stopTimer} style={{ justifyContent: "center" }}>
            <Square size={13} /> Stop & save
          </Button>
        </div>,
        pipWindow.document.body,
      )}

      {pipWindow && pipMode === "full" && createPortal(
        <div style={{ position: "relative", padding: 14, paddingTop: 8, boxSizing: "border-box" }}>
          <div style={{ position: "absolute", top: 4, right: 4 }}>
            <IconBtn title="Minimize to just the running timer" onClick={() => openPip("mini")}><Minimize2 size={14} /></IconBtn>
          </div>
          {renderTimerControls(true)}
        </div>,
        pipWindow.document.body,
      )}
    </>
  );

  return {
    clientId, taskId, notes, setNotes, billable, setBillable,
    client, tasks, activeTask,
    timerStart, elapsed,
    computeDefaultTask, applySelection, addEntry, startTimer, stopTimer,
    pipWindow, pipMode, openPip,
    renderTimerControls,
    portals,
  };
}
