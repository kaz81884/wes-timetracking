import { getStore } from "@netlify/blobs";
import { sendResetEmail, makeResetToken, RESET_TOKEN_TTL_MS } from "../../shared/sendResetEmail.mjs";

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
};

// Netlify's equivalent of server/index.js's POST /api/request-reset, backed
// by the same Netlify Blobs store as netlify/functions/data.mjs.
export default async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const store = getStore("wes-timetrack");
  const data = (await store.get("data", { type: "json" })) || DEFAULT_DATA;
  const { email, origin } = body;
  const employee = (data.employees || []).find((e) => e.email && e.email.toLowerCase() === String(email || "").trim().toLowerCase());

  try {
    if (employee && origin) {
      const token = makeResetToken();
      data.passwordResets = { ...data.passwordResets, [token]: { employeeId: employee.id, expiresAt: Date.now() + RESET_TOKEN_TTL_MS } };
      await store.setJSON("data", data);
      await sendResetEmail({ to: employee.email, name: employee.name, resetUrl: `${origin}/?reset=${token}` });
    }
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Failed to process reset request" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

export const config = { path: "/api/request-reset" };
