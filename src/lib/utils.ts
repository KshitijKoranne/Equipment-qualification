// ─── Date Formatting ────────────────────────────────────────────────────────

const DATE_FORMAT: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" };
const DATETIME_FORMAT: Intl.DateTimeFormatOptions = { ...DATE_FORMAT, hour: "2-digit", minute: "2-digit" };

/** Format a date string as "01 Jan 2025" (en-IN locale) */
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-IN", DATE_FORMAT);
}

/** Format a datetime string as "01 Jan 2025, 14:30" */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", DATETIME_FORMAT);
}

// ─── Common Style Objects ───────────────────────────────────────────────────

export const INPUT_STYLE: React.CSSProperties = {
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
};

export const SURFACE_STYLE: React.CSSProperties = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
};

export const LABEL_STYLE: React.CSSProperties = {
  color: "var(--text-muted)",
};

export const INPUT_CLS = "w-full px-3 py-2 text-sm rounded-lg focus:outline-none";
