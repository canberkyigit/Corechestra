// Turkey public holidays (ISO dates so they can be compared and plotted on calendars).
export const PUBLIC_HOLIDAY_COUNTRY = { code: "TR", name: "Turkey", flag: "🇹🇷" };

export const PUBLIC_HOLIDAYS = [
  { date: "2026-01-01", name: "New Year's Day" },
  { date: "2026-04-23", name: "National Sovereignty and Children's Day" },
  { date: "2026-05-01", name: "Labor and Solidarity Day" },
  { date: "2026-05-19", name: "Commemoration of Atatürk, Youth and Sports Day" },
  { date: "2026-07-15", name: "Democracy and National Unity Day" },
  { date: "2026-08-30", name: "Victory Day" },
  { date: "2026-10-29", name: "Republic Day" },
];

export function formatHolidayDate(isoDate) {
  const [year, month, day] = String(isoDate).split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function getHolidaysForYear(year) {
  return PUBLIC_HOLIDAYS.filter((holiday) => holiday.date.startsWith(`${year}-`));
}

export function getUpcomingHolidays(todayIso, limit = 3) {
  return PUBLIC_HOLIDAYS.filter((holiday) => holiday.date >= todayIso).slice(0, limit);
}
