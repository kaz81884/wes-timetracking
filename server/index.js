import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { sendResetEmail, makeResetToken, RESET_TOKEN_TTL_MS } from "../shared/sendResetEmail.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "data.json");
const PORT = process.env.PORT || 5175;

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

function readData() {
  if (!fs.existsSync(DATA_FILE)) return DEFAULT_DATA;
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch (e) {
    console.error("Failed to parse data.json, starting fresh:", e.message);
    return DEFAULT_DATA;
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// The whole app's state (employees, clients, projects, time entries, etc.)
// travels as one JSON document — same shape the artifact version used with
// window.storage. Simple, and easy to swap for a real table-per-entity
// schema later once this outgrows a single file (see README).
app.get("/api/data", (req, res) => {
  res.json(readData());
});

app.put("/api/data", (req, res) => {
  try {
    writeData(req.body);
    res.json(req.body);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to save" });
  }
});

// Kicks off a PIN reset: if the email matches an account, stashes a
// short-lived token in the same data document and emails a reset link
// pointing back at the app (built from the origin the request came from,
// so this works on localhost, Netlify previews, and the real domain alike).
// Always responds ok so the frontend can't use this to enumerate emails.
app.post("/api/request-reset", async (req, res) => {
  try {
    const { email, origin } = req.body || {};
    const data = readData();
    const employee = (data.employees || []).find((e) => e.email && e.email.toLowerCase() === String(email || "").trim().toLowerCase());

    if (employee && origin) {
      const token = makeResetToken();
      data.passwordResets = { ...data.passwordResets, [token]: { employeeId: employee.id, expiresAt: Date.now() + RESET_TOKEN_TTL_MS } };
      writeData(data);
      await sendResetEmail({ to: employee.email, name: employee.name, resetUrl: `${origin}/?reset=${token}` });
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to process reset request" });
  }
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

// In production, serve the built frontend from this same server.
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "..", "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
}

app.listen(PORT, () => {
  console.log(`Ledger API listening on http://localhost:${PORT}`);
});
