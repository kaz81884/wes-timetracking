import { getStore } from "@netlify/blobs";
import { applyTimerOp } from "../../shared/timerOps.mjs";

const DEFAULT_DATA = {
  employees: [],
  clients: [],
  projects: [],
  taskTypes: [],
  engagements: [],
  timeEntries: [],
  timers: {},
  timesheets: {},
  passwordResets: {},
  auditLog: [],
  directory: [],
};

// Dedicated start/stop endpoint for the live timer — see
// shared/timerOps.mjs for why this reads, mutates, and writes back in one
// function invocation instead of going through the generic GET/PUT
// /api/data round trip (which left a window where one employee's action
// could read another's timer mid-flight and write a stale copy back).
export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const store = getStore("wes-timetrack", { consistency: "strong" });
  try {
    const data = (await store.get("data", { type: "json" })) || DEFAULT_DATA;
    const next = applyTimerOp(data, body);
    await store.setJSON("data", next);
    return Response.json(next);
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
};

export const config = { path: "/api/timer" };
