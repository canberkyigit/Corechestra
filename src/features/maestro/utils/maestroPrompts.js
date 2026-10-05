// Context-aware starter prompts and the preview answer shown on the Maestro
// tab. Pure functions over the dashboard data so they are easy to test.
import { isActiveStatus } from "../../releases/utils/releaseModel";

export function greetingFor(now = new Date()) {
  const hour = now.getHours();
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** First name from a full name or an email-style username ("jane.doe" → "Jane"). */
export function firstName(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const part = raw.includes(" ") ? raw.split(/\s+/)[0] : raw.split(/[._@-]/)[0];
  return part ? part.charAt(0).toUpperCase() + part.slice(1) : "";
}

export function nextActiveRelease(release) {
  const list = (release?.projectReleases || []).filter((item) => isActiveStatus(item.status));
  list.sort((a, b) => String(a.releaseDate || "9999").localeCompare(String(b.releaseDate || "9999")));
  const next = list[0];
  if (!next) return null;
  return { ...next, readiness: release.metricsById?.get(next.id)?.readiness?.score ?? null };
}

/**
 * Six starter prompts. `context` is a short line built from live data so the
 * cards feel specific to the project even though no model is connected yet.
 */
export function buildMaestroSuggestions({ data, projectName }) {
  const { stats, health, sprint, workload = [], release } = data || {};
  const sprintName = sprint?.name;
  const next = nextActiveRelease(release);
  const busiest = [...workload].filter((row) => row.key !== "__unassigned__").sort((a, b) => (b.openPoints || b.open) - (a.openPoints || a.open))[0];

  return [
    {
      id: "sprint-summary",
      icon: "sprint",
      title: sprintName ? `Summarize ${sprintName} for stakeholders` : "Summarize where this project stands",
      context: sprintName && health?.workPct !== undefined
        ? `${health.workPct}% done${health.status === "overdue" ? " · past end date" : health.daysLeft !== undefined && health.daysLeft !== null ? ` · ${health.daysLeft}d left` : ""}`
        : `${stats?.open ?? 0} open items in ${projectName || "this project"}`,
    },
    {
      id: "blockers",
      icon: "blocked",
      title: "What's blocking us, and who can unblock it?",
      context: `${stats?.statusCounts?.blocked ?? 0} blocked · ${stats?.overdueTasks ?? 0} overdue`,
    },
    {
      id: "workload",
      icon: "people",
      title: "Who has too much on their plate this sprint?",
      context: busiest ? `${busiest.name} has ${busiest.open} open item${busiest.open === 1 ? "" : "s"}` : `${workload.length} people in the sprint`,
    },
    {
      id: "release",
      icon: "release",
      title: next ? `Is ${next.version} ready to ship?` : "Draft release notes from completed work",
      context: next
        ? `${next.readiness ?? 0}% ready${next.releaseDate ? ` · due ${next.releaseDate}` : ""}`
        : `${stats?.done ?? 0} items completed`,
    },
    {
      id: "standup",
      icon: "standup",
      title: "Draft today's stand-up from board activity",
      context: `${stats?.completedThisWeek ?? 0} completed in the last 7 days`,
    },
    {
      id: "portfolio",
      icon: "portfolio",
      title: "Which projects need attention this week?",
      context: "Portfolio health across every project",
    },
  ];
}

/** The illustrative exchange ("How Maestro will answer") built from real numbers. */
export function buildPreviewAnswer({ data, projectName }) {
  const { stats, health, sprint, workload = [], release } = data || {};
  const next = nextActiveRelease(release);
  const busiest = [...workload].filter((row) => row.key !== "__unassigned__").sort((a, b) => (b.openPoints || b.open) - (a.openPoints || a.open))[0];
  const blocked = stats?.byStatus?.blocked || [];
  const paceLabel = {
    "on-track": "on pace",
    "at-risk": "slightly behind pace",
    "off-track": "behind pace",
    completed: "complete",
    overdue: "past its end date",
  }[health?.status];

  const hasDaysLeft = health?.daysLeft !== undefined && health?.daysLeft !== null && health.status !== "overdue" && health.status !== "completed";
  const headline = sprint
    ? `${sprint.name} is ${health?.workPct ?? 0}% complete${hasDaysLeft ? ` with ${health.daysLeft} day${health.daysLeft === 1 ? "" : "s"} left` : ""}${paceLabel ? ` — ${paceLabel}` : ""}.`
    : `${projectName || "This project"} has no active sprint; ${stats?.open ?? 0} items are open.`;

  const points = [];
  points.push(blocked.length
    ? `${blocked.length} item${blocked.length === 1 ? " is" : "s are"} blocked${blocked[0]?.title ? `, starting with “${blocked[0].title}”` : ""}.`
    : "Nothing is blocked right now.");
  if (stats?.overdueTasks) points.push(`${stats.overdueTasks} item${stats.overdueTasks === 1 ? " is" : "s are"} past due — worth a look in today's stand-up.`);
  if (busiest) points.push(`${busiest.name} carries the most open work (${busiest.open} item${busiest.open === 1 ? "" : "s"}).`);
  if (next) points.push(`${next.version} is ${next.readiness ?? 0}% ready${next.releaseDate ? ` for ${next.releaseDate}` : ""}.`);

  const sources = ["Board"];
  if (next) sources.push("Releases");
  if (data?.testHealth) sources.push("Tests");

  return {
    question: sprint ? `How is ${sprint.name} going?` : `How is ${projectName || "the project"} doing?`,
    headline,
    points: points.slice(0, 4),
    sources,
  };
}
