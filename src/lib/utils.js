export const PROJECT_COLORS = ["#7C9885", "#C9A227", "#8E6C88", "#5C7F9E", "#B5654A", "#4F8A7B", "#9C8AA5", "#7A8B99"];
export const DEFAULT_TASK_TYPES = ["Manage Inbox", "Calendar Management", "Research", "Client Call", "Admin & Ops"];

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const todayStr = () => new Date().toISOString().slice(0, 10);

export const fmtHours = (h) => {
  const sign = h < 0 ? "-" : "";
  h = Math.abs(h || 0);
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${sign}${hrs}h ${mins.toString().padStart(2, "0")}m`;
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
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 100) / 100;
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
