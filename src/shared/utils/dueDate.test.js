import { daysUntil, formatDueRelative, getDueStatus, isOverdue } from "./dueDate";

const NOW = new Date(2026, 9, 2, 15, 30); // Oct 2 2026, afternoon

describe("dueDate helpers", () => {
  it("never flags finished work", () => {
    expect(getDueStatus("2026-09-01", "done", NOW)).toBeNull();
    expect(isOverdue("2026-09-01", "done", NOW)).toBe(false);
  });

  it("classifies open work by calendar day", () => {
    expect(getDueStatus("2026-10-01", "todo", NOW)).toBe("overdue");
    expect(getDueStatus("2026-10-02", "todo", NOW)).toBe("soon");
    expect(getDueStatus("2026-10-04", "inprogress", NOW)).toBe("soon");
    expect(getDueStatus("2026-10-05", "inprogress", NOW)).toBe("ok");
  });

  it("ignores missing or invalid dates", () => {
    expect(getDueStatus("", "todo", NOW)).toBeNull();
    expect(getDueStatus("not-a-date", "todo", NOW)).toBeNull();
    expect(daysUntil(null, NOW)).toBeNull();
  });

  it("formats relative labels", () => {
    expect(formatDueRelative("2026-10-02", NOW)).toBe("Today");
    expect(formatDueRelative("2026-10-03", NOW)).toBe("Tomorrow");
    expect(formatDueRelative("2026-10-01", NOW)).toBe("Yesterday");
    expect(formatDueRelative("2026-10-06", NOW)).toBe("in 4 days");
    expect(formatDueRelative("2026-09-28", NOW)).toBe("4 days ago");
    expect(formatDueRelative("2026-12-24", NOW)).toBe("Dec 24");
  });
});
