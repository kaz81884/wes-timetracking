import { getStore } from "@netlify/blobs";

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

// Netlify's equivalent of server/index.js's GET/PUT /api/data, but backed by
// Netlify Blobs instead of a JSON file on disk — a JSON file wouldn't
// persist between function invocations in Netlify's serverless environment.
// getStore() auto-picks up the site/deploy context when running on Netlify,
// no extra setup or environment variables needed.
export default async (request) => {
  const store = getStore("wes-timetrack");

  if (request.method === "GET") {
    const data = await store.get("data", { type: "json" });
    return Response.json(data || DEFAULT_DATA);
  }

  if (request.method === "PUT") {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    await store.setJSON("data", body);
    return Response.json(body);
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/data" };
