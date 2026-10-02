import { differenceInCalendarDays, isValid, parseISO } from "date-fns";
import { taskKey } from "../../../shared/utils/helpers";
import { toStoryPoints } from "./sprintMetrics";

export const DEFAULT_VELOCITY_PER_PERSON = 10;
export const DEFAULT_CAPACITY_PCT = 80;
export const MAX_CAPACITY_MEMBERS = 8;

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

const parseDate = (value) => {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

/** Story points a member contributes at the given availability percentage. */
export function memberCapacitySP(pct) {
  return Math.round(DEFAULT_VELOCITY_PER_PERSON * ((Number(pct) || 0) / 100));
}

export function getMemberPct(capacities, memberId) {
  return capacities?.[memberId] ?? DEFAULT_CAPACITY_PCT;
}

/**
 * Project members (or every person when the project lists none) as
 * `{ id, name, uniqueKey, ... }`, deduped by username/email and capped.
 */
export function buildPlanningMembers(users, project) {
  const memberNames = new Set(project?.memberUsernames || []);
  const filtered = memberNames.size > 0
    ? (users || []).filter((u) => (
      typeof u === "string"
        ? memberNames.has(u)
        : memberNames.has(u.username) || memberNames.has(u.id)
    ))
    : (users || []);

  const seen = new Set();
  return filtered
    .filter((u) => (typeof u === "string" ? true : u?.status !== "deleted"))
    .map((u) => {
      if (typeof u === "string") return { id: u, name: u, username: u, uniqueKey: u.toLowerCase() };
      const displayName = u.name || u.username || u.email || u.id;
      const uniqueKey = String(u.username || u.email || displayName || u.id).toLowerCase();
      return { ...u, id: u.id || uniqueKey, name: displayName, uniqueKey };
    })
    .filter((u) => {
      if (!u.uniqueKey || seen.has(u.uniqueKey)) return false;
      seen.add(u.uniqueKey);
      return true;
    })
    .slice(0, MAX_CAPACITY_MEMBERS);
}

/** Normalised assignee key of a task, or null when unassigned. */
export function getAssigneeKey(task) {
  const value = task?.assignedTo;
  if (!value || value === "unassigned") return null;
  if (typeof value === "object") return value.username || value.id || value.name || null;
  return value;
}

export function memberMatchesAssignee(member, key) {
  if (!member || !key) return false;
  const lower = String(key).toLowerCase();
  return [member.id, member.username, member.email, member.name]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase() === lower);
}

/**
 * Per-member load: capacity (from availability %) vs story points assigned
 * in the sprint. Also returns story points nobody on the team carries.
 */
export function buildMemberLoad(members, tasks, capacities) {
  const rows = (members || []).map((member) => {
    const pct = getMemberPct(capacities, member.id);
    return { member, pct, capacity: memberCapacitySP(pct), assigned: 0, items: 0 };
  });
  let unassignedSP = 0;
  let unassignedItems = 0;
  let otherSP = 0;

  (tasks || []).forEach((task) => {
    const key = getAssigneeKey(task);
    const points = toStoryPoints(task.storyPoint);
    if (!key) {
      unassignedSP += points;
      unassignedItems += 1;
      return;
    }
    const row = rows.find((entry) => memberMatchesAssignee(entry.member, key));
    if (row) {
      row.assigned += points;
      row.items += 1;
    } else {
      otherSP += points;
    }
  });

  return { rows, unassignedSP, unassignedItems, otherSP };
}

/** Load ratio → semantic tone used by bars and labels. */
export function getLoadTone(used, capacity) {
  if (capacity <= 0) return used > 0 ? "over" : "idle";
  const ratio = used / capacity;
  if (ratio > 1) return "over";
  if (ratio >= 0.85) return "near";
  if (ratio === 0) return "idle";
  return "ok";
}

/** Sprint timing facts for the header: working days, phase and countdown. */
export function getSprintTiming(sprint, today = new Date()) {
  const start = parseDate(sprint?.startDate);
  const end = parseDate(sprint?.endDate);
  if (!start || !end || differenceInCalendarDays(end, start) < 0) {
    return { hasWindow: false, workingDays: null, phase: null, label: "" };
  }

  let workingDays = 0;
  const span = Math.min(differenceInCalendarDays(end, start), 365);
  for (let offset = 0; offset <= span; offset += 1) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset).getDay();
    if (day !== 0 && day !== 6) workingDays += 1;
  }

  const untilStart = differenceInCalendarDays(start, today);
  const untilEnd = differenceInCalendarDays(end, today);
  let phase;
  let label;
  if (untilStart > 0) {
    phase = "upcoming";
    label = `Starts in ${untilStart} day${untilStart !== 1 ? "s" : ""}`;
  } else if (untilEnd >= 0) {
    phase = "active";
    label = untilEnd === 0 ? "Last day" : `${untilEnd} day${untilEnd !== 1 ? "s" : ""} left`;
  } else {
    phase = "ended";
    label = `Ended ${Math.abs(untilEnd)} day${Math.abs(untilEnd) !== 1 ? "s" : ""} ago`;
  }

  return { hasWindow: true, workingDays, phase, label };
}

/**
 * Planning readiness checklist. Each check: `{ key, label, ok, detail }`.
 * The velocity check only appears once there is velocity history.
 */
export function getPlanningReadiness({ sprint, tasks, committedSP, capacitySP, avgVelocity }) {
  const items = tasks || [];
  const unestimated = items.filter((task) => toStoryPoints(task.storyPoint) === 0).length;
  const unassigned = items.filter((task) => !getAssigneeKey(task)).length;
  const hasGoal = Boolean(String(sprint?.goal || "").trim());

  const checks = [
    {
      key: "goal",
      label: "Sprint goal defined",
      ok: hasGoal,
      detail: hasGoal ? "Team knows what success looks like" : "Add a goal the team can commit to",
    },
    {
      key: "scope",
      label: "Scope selected",
      ok: items.length > 0,
      detail: items.length > 0 ? `${items.length} item${items.length !== 1 ? "s" : ""} in sprint` : "Pull work from the backlog",
    },
    {
      key: "estimated",
      label: "All items estimated",
      ok: items.length > 0 && unestimated === 0,
      detail: unestimated > 0 ? `${unestimated} item${unestimated !== 1 ? "s" : ""} without story points` : "Every item has story points",
    },
    {
      key: "assigned",
      label: "All items assigned",
      ok: items.length > 0 && unassigned === 0,
      detail: unassigned > 0 ? `${unassigned} item${unassigned !== 1 ? "s" : ""} without an owner` : "Every item has an owner",
    },
    {
      key: "capacity",
      label: "Within team capacity",
      ok: committedSP <= capacitySP,
      detail: committedSP > capacitySP
        ? `Over by ${committedSP - capacitySP} SP`
        : `${capacitySP - committedSP} SP headroom`,
    },
  ];

  if (avgVelocity !== null && avgVelocity !== undefined) {
    const ceiling = Math.round(avgVelocity * 1.1);
    checks.push({
      key: "velocity",
      label: "Aligned with velocity",
      ok: committedSP <= ceiling,
      detail: committedSP <= ceiling
        ? `Commitment fits the ${avgVelocity} SP average`
        : `${committedSP - avgVelocity} SP above average velocity`,
    });
  }

  return { checks, passed: checks.filter((check) => check.ok).length, total: checks.length, unestimated, unassigned };
}

export const POOL_QUICK_FILTERS = [
  { value: "all", label: "All items" },
  { value: "unestimated", label: "Not estimated" },
  { value: "urgent", label: "Critical & high" },
  { value: "bugs", label: "Bugs & defects" },
  { value: "unassigned", label: "Unassigned" },
];

export const POOL_SORTS = [
  { value: "rank", label: "Backlog order" },
  { value: "priority", label: "Priority" },
  { value: "points", label: "Story points" },
];

const QUICK_FILTER_TESTS = {
  all: () => true,
  unestimated: (task) => toStoryPoints(task.storyPoint) === 0,
  urgent: (task) => ["critical", "high"].includes(String(task.priority || "").toLowerCase()),
  bugs: (task) => ["bug", "defect"].includes(String(task.type || "").toLowerCase()),
  unassigned: (task) => !getAssigneeKey(task),
};

export function matchesPlanningSearch(task, query) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return true;
  return String(task.title || "").toLowerCase().includes(needle)
    || taskKey(task.id).toLowerCase().includes(needle);
}

/** Search + quick filter + sort applied to one list of tasks. */
export function refineTasks(tasks, { query = "", quickFilter = "all", sort = "rank" } = {}) {
  const test = QUICK_FILTER_TESTS[quickFilter] || QUICK_FILTER_TESTS.all;
  const result = (tasks || []).filter((task) => test(task) && matchesPlanningSearch(task, query));
  if (sort === "priority") {
    return [...result].sort((a, b) => (
      (PRIORITY_RANK[String(a.priority || "medium").toLowerCase()] ?? 2)
      - (PRIORITY_RANK[String(b.priority || "medium").toLowerCase()] ?? 2)
    ));
  }
  if (sort === "points") {
    return [...result].sort((a, b) => toStoryPoints(b.storyPoint) - toStoryPoints(a.storyPoint));
  }
  return result;
}
