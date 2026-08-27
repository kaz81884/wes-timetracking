export const PROJECT_COLORS = ["#7C9885", "#C9A227", "#8E6C88", "#5C7F9E", "#B5654A", "#4F8A7B", "#9C8AA5", "#7A8B99"];
export const DEFAULT_TASK_TYPES = ["Manage Inbox", "Calendar Management", "Research", "Client Call", "Admin & Ops"];

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const todayStr = () => new Date().toISOString().slice(0, 10);

// Appends one audit event (edit or delete of a time entry) to data.auditLog.
// `before`/`after` are full entry snapshots (an edit has both, a delete only
// `before`) so the log stays self-contained even after the entry itself is
// gone — deleting a row can't erase the record that it happened.
export const logAudit = (data, { action, actor, entryId, before, after }) => ({
  ...data,
  auditLog: [...(data.auditLog || []), { id: uid(), action, entryId, actorId: actor.id, actorName: actor.name, timestamp: Date.now(), before: before || null, after: after || null }],
});

export const fmtHours = (h) => {
  const sign = h < 0 ? "-" : "";
  h = Math.abs(h || 0);
  const totalSeconds = Math.round(h * 3600);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${sign}${hrs}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
};

// Formats digits as the user types into (123)456-7890, capped at 10 digits.
export const formatPhone = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)})${digits.slice(3)}`;
  return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`;
};

export const fmtTimeHMS = (date) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
};

// Resolves which company a time entry belongs to, whether it was logged the
// current way (entry.clientId, set directly) or predates that — logged
// against a contact whose company has to be looked up via projectId.
export const clientIdForEntry = (entry, projects) => entry.clientId || (projects || []).find((p) => p.id === entry.projectId)?.clientId || null;

// A stable color per company even for ones created before `clients` had a
// `color` field of its own (contacts always did) — hashes the id instead of
// picking randomly, so the same company always lands on the same color.
export const colorForClient = (client) => {
  if (!client) return "#B7BFC7";
  if (client.color) return client.color;
  const hash = [...client.id].reduce((s, ch) => s + ch.charCodeAt(0), 0);
  return PROJECT_COLORS[hash % PROJECT_COLORS.length];
};

export const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" });
export const fmtDateShort = (d) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

export const startOfWeek = (date) => {
  const d = new Date(date + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
};

export const addDays = (dateStr, n) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const weekDates = (weekStart) => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

export const rangeToHours = (start, end) => {
  if (!start || !end) return 0;
  const [sh, sm, ss = 0] = start.split(":").map(Number);
  const [eh, em, es = 0] = end.split(":").map(Number);
  let secs = (eh * 3600 + em * 60 + es) - (sh * 3600 + sm * 60 + ss);
  if (secs < 0) secs += 24 * 3600;
  return Math.round(secs) / 3600;
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_YEAR_PATTERN = new RegExp(`(${MONTH_NAMES.join("|")})\\s+\\d{4}`, "i");

// When duplicating a monthly project, try to bump a trailing "Month YYYY" in
// the name to the current month/year (e.g. "VGS Retainer — August 2026" ->
// "VGS Retainer — September 2026"). Falls back to appending "(new)".
export const suggestDuplicateName = (name) => {
  const now = new Date();
  const label = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  if (MONTH_YEAR_PATTERN.test(name)) return name.replace(MONTH_YEAR_PATTERN, label);
  return `${name} (new)`;
};
