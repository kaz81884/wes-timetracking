import { useState, useEffect, useCallback } from "react";

export const DEFAULT_DATA = {
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

// Migrates data saved by an older version of the app: per-project `tasks`
// arrays get folded into the shared `taskTypes` pool, preserving ids so
// existing time entries stay linked to the right activity.
export function migrateData(raw) {
  const data = { ...DEFAULT_DATA, ...raw };
  data.taskTypes = data.taskTypes || [];
  data.engagements = data.engagements || [];
  const nameToId = new Map(data.taskTypes.map((t) => [t.name, t.id]));
  const idRemap = {};
  let touched = false;

  data.projects = (data.projects || []).map((p) => {
    if (p.tasks && !p.taskIds) {
      touched = true;
      const taskIds = [];
      p.tasks.forEach((t) => {
        let canonicalId = nameToId.get(t.name);
        if (!canonicalId) {
          canonicalId = t.id;
          nameToId.set(t.name, canonicalId);
          data.taskTypes.push({ id: canonicalId, name: t.name });
        }
        idRemap[t.id] = canonicalId;
        if (!taskIds.includes(canonicalId)) taskIds.push(canonicalId);
      });
      const { tasks, ...rest } = p;
      return { ...rest, taskIds };
    }
    if (!p.taskIds) return { ...p, taskIds: [] };
    return p;
  });

  if (touched) {
    data.timeEntries = (data.timeEntries || []).map((e) =>
      e.taskId && idRemap[e.taskId] ? { ...e, taskId: idRemap[e.taskId] } : e
    );
  }
  return data;
}

async function fetchData() {
  const res = await fetch("/api/data");
  if (!res.ok) throw new Error(`GET /api/data failed: ${res.status}`);
  return res.json();
}

// Fire-and-forget from the frontend's point of view: the backend always
// responds ok (whether or not the email matched an account) so this can't
// be used to enumerate who has an account.
export async function requestPinReset(email) {
  const res = await fetch("/api/request-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, origin: window.location.origin }),
  });
  if (!res.ok) throw new Error(`POST /api/request-reset failed: ${res.status}`);
  return res.json();
}

async function persistData(data) {
  const res = await fetch("/api/data", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`PUT /api/data failed: ${res.status}`);
  return res.json();
}

// Same shape as the artifact version's useAppData hook, but backed by the
// Express API instead of window.storage.
export function useAppData() {
  const [data, setDataState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await fetchData();
        setDataState(migrateData(raw));
      } catch (e) {
        console.error(e);
        setError("Couldn't reach the server — is it running? (npm run dev)");
        setDataState(DEFAULT_DATA);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setData = useCallback(async (next) => {
    setDataState(next);
    setSaving(true);
    try {
      await persistData(next);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Couldn't save — your last change may not have synced.");
    } finally {
      setSaving(false);
    }
  }, []);

  return { data, setData, loading, saving, error };
}
