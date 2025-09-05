// src/lib/date.ts
// Utilities for safe date-only handling across timezones

/**
 * Parse a YYYY-MM-DD string into a local Date at 00:00 local time.
 * Avoids the UTC interpretation of new Date("YYYY-MM-DD").
 */
export function parseYMDToLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return new Date(ymd); // fallback if unexpected
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Convert a Date (interpreted in the user's local timezone) to a Date
 * that represents the same calendar day at 00:00 UTC.
 * Use this before sending date-only values to the API to avoid off-by-one.
 */
export function toUTCDateOnly(date: Date): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

