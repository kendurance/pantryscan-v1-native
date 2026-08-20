import { daysUntil, fromIsoDate, startOfToday, toIsoDate } from "@/lib/iso-date";

describe("iso date helpers", () => {
  it("formats a date as local YYYY-MM-DD", () => {
    expect(toIsoDate(new Date(2026, 7, 23))).toBe("2026-08-23");
  });

  it("zero-pads single-digit months and days", () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("round-trips without shifting the day", () => {
    // `new Date("2026-08-23")` parses as UTC, which lands on the 22nd for
    // anyone west of UTC. Parsing with an explicit time keeps it local.
    const iso = "2026-08-23";
    const parsed = fromIsoDate(iso);

    expect(parsed.getDate()).toBe(23);
    expect(parsed.getMonth()).toBe(7);
    expect(toIsoDate(parsed)).toBe(iso);
  });

  it("keeps a late-evening date on the same calendar day", () => {
    // A naive UTC conversion would roll this forward to the next day.
    expect(toIsoDate(new Date(2026, 7, 23, 23, 30))).toBe("2026-08-23");
  });

  it("counts whole days until a future date", () => {
    const inAWeek = new Date(startOfToday());
    inAWeek.setDate(inAWeek.getDate() + 7);
    expect(daysUntil(toIsoDate(inAWeek))).toBe(7);
  });

  it("returns a negative count for a past date", () => {
    const yesterday = new Date(startOfToday());
    yesterday.setDate(yesterday.getDate() - 1);
    expect(daysUntil(toIsoDate(yesterday))).toBe(-1);
  });
});
