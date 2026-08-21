import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
