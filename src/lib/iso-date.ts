/**
 * Local-time conversions between `Date` and the `YYYY-MM-DD` strings stored in
 * SQLite. Deliberately avoids the built-in UTC parsing/serialising, which
 * shifts the calendar day for anyone west of UTC.
 */

/** Formats a date as YYYY-MM-DD in local time (not UTC, which can shift the day). */
export function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Parses YYYY-MM-DD as a local date; `new Date(iso)` would parse it as UTC. */
export function fromIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

/** Midnight today, for comparisons that should ignore the time of day. */
export function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Days until the given date; negative when already past. */
export function daysUntil(iso: string): number {
  return Math.round(
    (fromIsoDate(iso).getTime() - startOfToday().getTime()) / 86_400_000,
  );
}
