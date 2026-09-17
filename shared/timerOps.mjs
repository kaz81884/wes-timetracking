// Shared between server/index.js (local dev) and netlify/functions/timer.mjs
// (production) — the actual "start" / "stop" mutation logic for the shared
// timers map, applied server-side against whatever data the caller just
// read. Keeping this off the client removes the network round trip that
// used to sit between reading current state and writing the change back:
// with that round trip, one employee's start/stop could read another
// employee's timer mid-flight (already stopped locally, not yet written)
// and unwittingly write the stale value back. Doing the whole
// read-modify-write in one server invocation shrinks that window from a
// full client-server round trip (which can be seconds on a cold start) down
// to the server's own local I/O latency.
export function applyTimerOp(data, body) {
  const { op, employeeId } = body || {};
  if (!employeeId) throw new Error("employeeId is required");

  if (op === "start") {
    const { startedAt, clientId, taskId, notes, billable } = body;
    return { ...data, timers: { ...data.timers, [employeeId]: { startedAt, clientId, taskId, notes, billable } } };
  }

  if (op === "stop") {
    const nextTimers = { ...data.timers };
    delete nextTimers[employeeId];
    const nextEntries = body.entry ? [...data.timeEntries, body.entry] : data.timeEntries;
    return { ...data, timers: nextTimers, timeEntries: nextEntries };
  }

  throw new Error(`Unknown timer op: ${op}`);
}
