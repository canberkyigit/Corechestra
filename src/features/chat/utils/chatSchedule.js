import { addDays, format, isToday, isTomorrow, nextMonday, setHours, setMinutes, setSeconds, startOfMinute } from "date-fns";

/*
 * Scheduled messages and reminders.
 *
 * There is no server-side scheduler yet, so the author's client delivers
 * them: every open Corechestra tab checks once a minute (and on start-up), so
 * anything that came due while you were offline goes out the next time you
 * open the app. A backend job can take this over later without changing the
 * stored shape (`userState.scheduled` / `userState.reminders`).
 */

const UNIT_MS = {
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
};

const UNIT_ALIASES = {
  m: "m", min: "m", mins: "m", minute: "m", minutes: "m", dk: "m", dakika: "m",
  h: "h", hr: "h", hrs: "h", hour: "h", hours: "h", sa: "h", saat: "h",
  d: "d", day: "d", days: "d", g: "d", gün: "d", gun: "d",
  w: "w", week: "w", weeks: "w", hafta: "w",
};

function atTime(date, hours, minutes = 0) {
  return startOfMinute(setSeconds(setMinutes(setHours(date, hours), minutes), 0));
}

/** "30m", "2 hours", "1d", "45 dk" → milliseconds, or null. */
export function parseDuration(value) {
  const match = String(value || "").trim().toLowerCase().match(/^(\d+(?:[.,]\d+)?)\s*([a-zğüşöçı]+)$/);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  const unit = UNIT_ALIASES[match[2]];
  if (!unit || !Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * UNIT_MS[unit]);
}

export function getSchedulePresets(now = Date.now()) {
  const date = new Date(now);
  const tomorrowMorning = atTime(addDays(date, 1), 9);
  const monday = atTime(nextMonday(date), 9);
  return [
    { id: "20m", label: "In 20 minutes", at: now + 20 * UNIT_MS.m },
    { id: "1h", label: "In 1 hour", at: now + UNIT_MS.h },
    { id: "3h", label: "In 3 hours", at: now + 3 * UNIT_MS.h },
    { id: "tomorrow", label: `Tomorrow at ${format(tomorrowMorning, "HH:mm")}`, at: tomorrowMorning.getTime() },
    { id: "monday", label: `Next Monday at ${format(monday, "HH:mm")}`, at: monday.getTime() },
  ];
}

function parseClock(value) {
  const match = String(value || "").match(/^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] || 0);
  const meridiem = (match[3] || "").toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/**
 * `/remind` arguments:
 *   "in 30m review the PR" · "2h call Ayşe" · "tomorrow standup notes"
 *   "at 15:30 deploy" · "tomorrow at 10 ship it"
 * Returns `{ at, text }` or null.
 */
export function parseReminderInput(input, now = Date.now()) {
  let rest = String(input || "").trim().replace(/^me\s+/i, "");
  if (!rest) return null;
  let at = null;
  const tokens = rest.split(/\s+/);

  const takeClock = (index) => {
    if (tokens[index]?.toLowerCase() === "at" && parseClock(tokens[index + 1])) {
      const clock = parseClock(tokens[index + 1]);
      tokens.splice(index, 2);
      return clock;
    }
    return null;
  };

  if (tokens[0]?.toLowerCase() === "in" || tokens[0]?.toLowerCase() === "after") tokens.shift();
  const compact = parseDuration(tokens[0]);
  const spaced = tokens.length > 1 ? parseDuration(`${tokens[0]} ${tokens[1]}`) : null;
  if (compact) {
    at = now + compact;
    tokens.shift();
  } else if (spaced) {
    at = now + spaced;
    tokens.splice(0, 2);
  } else if (/^(tomorrow|yarın|yarin)$/i.test(tokens[0] || "")) {
    tokens.shift();
    const clock = takeClock(0) || { hours: 9, minutes: 0 };
    at = atTime(addDays(new Date(now), 1), clock.hours, clock.minutes).getTime();
  } else if (tokens[0]?.toLowerCase() === "at" || /^(saat)$/i.test(tokens[0] || "")) {
    const clock = parseClock(tokens[1]);
    if (clock) {
      tokens.splice(0, 2);
      let target = atTime(new Date(now), clock.hours, clock.minutes);
      if (target.getTime() <= now) target = addDays(target, 1);
      at = target.getTime();
    }
  }

  if (!at) return null;
  rest = tokens.join(" ").replace(/^(to|that)\s+/i, "").trim();
  return { at, text: rest };
}

export function formatScheduledTime(ms) {
  const date = new Date(ms);
  if (isToday(date)) return `today at ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `tomorrow at ${format(date, "HH:mm")}`;
  return format(date, "EEE d MMM 'at' HH:mm");
}

/** Value for <input type="datetime-local"> in local time. */
export function toDateTimeInputValue(ms) {
  return format(new Date(ms), "yyyy-MM-dd'T'HH:mm");
}

export function fromDateTimeInputValue(value) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

/** Entries due at `now` (sorted oldest first). */
export function dueEntries(map, now = Date.now()) {
  return Object.values(map || {})
    .filter((entry) => entry && !entry.done && Number(entry.at) <= now)
    .sort((a, b) => a.at - b.at);
}
