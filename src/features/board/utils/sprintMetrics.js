import { addDays, differenceInCalendarDays, format, isValid, parseISO } from "date-fns";

/** Story points as a number (handles legacy string values and blanks). */
export function toStoryPoints(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

export function sumStoryPoints(tasks = []) {
  return tasks.reduce((sum, task) => sum + toStoryPoints(task.storyPoint), 0);
}

export function getSprintTotals(tasks = []) {
  const total = sumStoryPoints(tasks);
  const done = sumStoryPoints(tasks.filter((task) => task.status === "done"));
  return { total, done, remaining: Math.max(0, total - done) };
}

/**
 * Completed sprint snapshots (stored newest first) → chronological velocity
 * entries `{ id, name, committed, completed }`, optionally limited to the
 * last `limit` sprints.
 */
export function buildVelocityHistory(completedSprints = [], limit = 5) {
  return [...(completedSprints || [])]
    .slice(0, limit)
    .reverse()
    .map((sprint) => ({
      id: sprint.id,
      name: sprint.name || "Sprint",
      committed: toStoryPoints(sprint.totalPoints),
      completed: toStoryPoints(sprint.completedPoints),
    }));
}

/** Average completed story points over the last `limit` completed sprints. */
export function getAverageVelocity(completedSprints = [], limit = 3) {
  const recent = (completedSprints || []).slice(0, limit);
  if (recent.length === 0) return null;
  const total = recent.reduce((sum, sprint) => sum + toStoryPoints(sprint.completedPoints), 0);
  return Math.round(total / recent.length);
}

const parseDate = (value) => {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

/**
 * Real burndown series from persisted daily snapshots
 * (`perProjectBurndownSnapshots[pid] = [{ date, remaining, total }]`).
 * Today's point is replaced by the live totals. The ideal line runs from the
 * sprint's starting scope down to zero across the sprint window.
 */
export function buildBurndownSeries({ snapshots = [], sprint, totals, today = new Date() }) {
  const todayKey = format(today, "yyyy-MM-dd");
  const start = parseDate(sprint?.startDate);
  const end = parseDate(sprint?.endDate);
  const hasWindow = Boolean(start && end && differenceInCalendarDays(end, start) >= 0);

  const byDate = new Map();
  (snapshots || []).forEach((snapshot) => {
    if (!snapshot?.date) return;
    byDate.set(snapshot.date, {
      remaining: toStoryPoints(snapshot.remaining),
      total: toStoryPoints(snapshot.total),
    });
  });
  if (totals) byDate.set(todayKey, { remaining: totals.remaining, total: totals.total });

  let dates;
  if (hasWindow) {
    const days = Math.min(differenceInCalendarDays(end, start), 90);
    dates = Array.from({ length: days + 1 }, (_, index) => format(addDays(start, index), "yyyy-MM-dd"));
  } else {
    dates = [...byDate.keys()].sort().slice(-14);
  }

  const actualPoints = dates
    .map((date) => ({ date, value: byDate.get(date) }))
    .filter((entry) => entry.value && entry.date <= todayKey);

  const startScope = actualPoints[0]?.value.total ?? totals?.total ?? 0;
  const lastIndex = Math.max(dates.length - 1, 1);

  const points = dates.map((date, index) => {
    const value = byDate.get(date);
    return {
      date,
      label: format(parseISO(date), "MMM d"),
      ideal: Math.max(0, Math.round((startScope - (startScope / lastIndex) * index) * 10) / 10),
      actual: value && date <= todayKey ? value.remaining : null,
    };
  });

  const maxY = Math.max(1, startScope, ...points.map((point) => point.actual ?? 0));
  return { points, maxY, hasData: actualPoints.length > 0, hasWindow };
}
