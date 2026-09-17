import { useState, useEffect, useCallback, useRef } from "react";

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
  auditLog: [],
  directory: [],
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

// Every collection in the document is an array of {id,...} objects, so
// concurrent edits from separate tabs can be reconciled generically: start
// from the server's current copy (theirs), drop anything this tab deleted
// (present in base, missing from mine), let this tab's version of an item
// win when it touched one (present in mine), and otherwise keep whatever
// the server has — which preserves entries someone else saved in the
// meantime that this tab never knew about.
function mergeArrayById(base, mine, theirs) {
  base = base || []; mine = mine || []; theirs = theirs || [];
  const baseIds = new Set(base.map((x) => x.id));
  const mineIds = new Set(mine.map((x) => x.id));
  const mineById = new Map(mine.map((x) => [x.id, x]));
  const result = [];
  const placed = new Set();
  theirs.forEach((item) => {
    if (baseIds.has(item.id) && !mineIds.has(item.id)) return; // deleted locally
    result.push(mineById.has(item.id) ? mineById.get(item.id) : item);
    placed.add(item.id);
  });
  mine.forEach((item) => { if (!placed.has(item.id)) result.push(item); }); // added locally, server doesn't have it yet
  return result;
}

// Same idea as mergeArrayById but for the plain-object maps (timers keyed
// by employeeId, timesheets keyed by "employeeId_weekStart", etc).
function mergeMapByKey(base, mine, theirs) {
  base = base || {}; mine = mine || {}; theirs = theirs || {};
  const result = {};
  Object.keys(theirs).forEach((key) => {
    if (Object.hasOwn(base, key) && !Object.hasOwn(mine, key)) return; // deleted locally
    result[key] = Object.hasOwn(mine, key) ? mine[key] : theirs[key];
  });
  Object.keys(mine).forEach((key) => { if (!Object.hasOwn(result, key)) result[key] = mine[key]; });
  return result;
}

const ARRAY_KEYS = ["employees", "clients", "projects", "taskTypes", "engagements", "timeEntries", "directory", "auditLog"];
const MAP_KEYS = ["timers", "timesheets", "passwordResets"];

function mergeData(base, mine, theirs) {
  const merged = { ...theirs };
  ARRAY_KEYS.forEach((k) => { merged[k] = mergeArrayById(base[k], mine[k], theirs[k]); });
  MAP_KEYS.forEach((k) => { merged[k] = mergeMapByKey(base[k], mine[k], theirs[k]); });
  return merged;
}

// Same shape as the artifact version's useAppData hook, but backed by the
// Express API instead of window.storage.
export function useAppData() {
  const [data, setDataState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const fetchingRef = useRef(false);
  const dataRef = useRef(null);

  const applyDataState = useCallback((next) => {
    dataRef.current = next;
    setDataState(next);
  }, []);

  const load = useCallback(async ({ silent } = {}) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const raw = await fetchData();
      applyDataState(migrateData(raw));
      if (!silent) setError(null);
    } catch (e) {
      console.error(e);
      if (!silent) {
        setError("Couldn't reach the server — is it running? (npm run dev)");
        if (!dataRef.current) applyDataState(DEFAULT_DATA);
      }
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [applyDataState]);

  useEffect(() => {
    load();
  }, [load]);

  // Each browser tab/session only ever sees the data it fetched on load —
  // there's no push/polling sync, so a second admin sitting in an
  // already-open tab won't see entries someone else just saved elsewhere.
  // Refetching whenever this tab regains focus (switching back to it, or
  // switching accounts and coming back) keeps that window's view current
  // without constant background polling.
  useEffect(() => {
    const onFocus = () => { if (!savingRef.current) load({ silent: true }); };
    const onVisibility = () => { if (document.visibilityState === "visible" && !savingRef.current) load({ silent: true }); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  // setData used to PUT the caller's `next` object as-is, which is a whole-
  // document overwrite: if another tab saved something in between this
  // tab's last fetch and now, that save gets silently wiped out. Instead,
  // refetch the server's current copy right before writing and merge this
  // tab's change onto it (see mergeData), so two tabs saving close together
  // both survive instead of last-write-wins clobbering the other.
  //
  // The base/mine/theirs merge still has one race: if `next` was computed
  // from local state that's briefly stale (someone else's save landing in
  // the gap between this tab's last known state and now), that staleness
  // gets read as "someone else has this and I don't know differently" and
  // gets carried forward — e.g. person A stops a timer, and if person B's
  // save's own refetch lands in the split second before A's write finishes,
  // B's save (touching a totally different key) unwittingly resurrects A's
  // just-stopped timer. `next` can be a function `(freshData) => nextData`
  // instead of a plain object to sidestep this: it's applied directly onto
  // the just-fetched server copy rather than reconciled against a locally
  // computed snapshot, so it can only ever affect the keys it actually
  // touches. Used by the live timer's start/stop, where this race matters.
  const setData = useCallback(async (next) => {
    const isUpdater = typeof next === "function";
    const base = dataRef.current || DEFAULT_DATA;
    // Apply immediately against local state so anything reading `data`
    // synchronously right after this call (e.g. switching accounts and
    // back, which resumes a timer straight from data.timers) sees the
    // change without waiting on a network round trip. For the updater
    // form this is a best-effort local computation — it gets superseded
    // below once the fresh fetch lands and the race-safe version applies.
    let toPersist = isUpdater ? next(base) : next;
    applyDataState(toPersist);
    setSaving(true);
    savingRef.current = true;
    try {
      const theirs = migrateData(await fetchData());
      toPersist = isUpdater ? next(theirs) : mergeData(base, next, theirs);
      applyDataState(toPersist);
    } catch (e) {
      console.error("refetch-before-save failed, saving local copy instead", e);
    }
    try {
      await persistData(toPersist);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Couldn't save — your last change may not have synced.");
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }, [applyDataState]);

  return { data, setData, loading, saving, error };
}
