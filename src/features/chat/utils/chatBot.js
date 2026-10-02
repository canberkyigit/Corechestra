import { WORKSPACE_EVENT_TYPES } from "../../../shared/services/workspaceEvents";

export { buildBotSystemPayload, isBotEventEnabled } from "../../../shared/services/chat/chatBotModel";

/* Display helpers for "Corechestra bot" cards (rules live in chatBotModel). */

export const BOT_CATEGORIES = [
  { id: "tasks", label: "Tasks", description: "Created, moved, assigned and archived tasks" },
  { id: "sprints", label: "Sprints & epics", description: "Sprint start/finish and new epics" },
  { id: "releases", label: "Releases", description: "New releases and status changes" },
  { id: "tests", label: "Test runs", description: "Completed runs with pass/fail results" },
  { id: "verbose", label: "Assignment changes", description: "Also post every reassignment (off by default)" },
];

const RELEASE_LABELS = {
  planned: "Planned",
  "in-progress": "In progress",
  "code-freeze": "Code freeze",
  released: "Released",
  "rolled-back": "Rolled back",
  cancelled: "Cancelled",
};

/**
 * Display model for a stored event: `{ tone, title, detail, taskId?, route? }`.
 * `nameOf(username)` resolves actor/assignee display names.
 */
export function describeBotEvent(event, { nameOf = (value) => value || "Someone" } = {}) {
  const actor = nameOf(event.actor);
  const task = event.task || {};
  switch (event.type) {
    case WORKSPACE_EVENT_TYPES.TASK_CREATED:
      return { tone: "green", icon: "task", title: `${actor} created ${task.id}`, detail: task.title, taskId: task.id, meta: event.destination === "backlog" ? "Added to the backlog" : "Added to the active sprint" };
    case WORKSPACE_EVENT_TYPES.TASK_STATUS: {
      const tone = event.to === "done" ? "green" : event.to === "blocked" ? "red" : "blue";
      return {
        tone,
        icon: event.to === "done" ? "done" : event.to === "blocked" ? "blocked" : "move",
        title: `${actor} moved ${task.id} to ${event.toLabel || event.to}`,
        detail: task.title,
        taskId: task.id,
        meta: event.blockReason ? `Blocked: ${event.blockReason}` : `${event.fromLabel || event.from} → ${event.toLabel || event.to}`,
      };
    }
    case WORKSPACE_EVENT_TYPES.TASK_ASSIGNED:
      return { tone: "blue", icon: "assign", title: `${actor} assigned ${task.id} to ${nameOf(event.assignee)}`, detail: task.title, taskId: task.id };
    case WORKSPACE_EVENT_TYPES.TASK_ARCHIVED:
      return { tone: "amber", icon: "archive", title: `${actor} archived ${task.id}`, detail: task.title, route: "archive" };
    case WORKSPACE_EVENT_TYPES.SPRINT_STARTED:
      return {
        tone: "blue",
        icon: "sprint",
        title: `${actor} started ${event.sprint?.name || "a sprint"}`,
        detail: event.sprint?.goal ? `Goal: ${event.sprint.goal}` : "",
        meta: event.sprint?.endDate ? `Ends ${new Date(event.sprint.endDate).toLocaleDateString()}` : "",
        route: "board",
      };
    case WORKSPACE_EVENT_TYPES.SPRINT_COMPLETED:
      return {
        tone: "green",
        icon: "sprint",
        title: `${actor} completed ${event.sprint?.name || "the sprint"}`,
        detail: `${event.done ?? 0} of ${event.total ?? 0} tasks done${event.carriedOver ? ` · ${event.carriedOver} carried over` : ""}`,
        progress: event.total ? Math.round(((event.done || 0) / event.total) * 100) : null,
        route: "board",
      };
    case WORKSPACE_EVENT_TYPES.EPIC_CREATED:
      return { tone: "violet", icon: "epic", title: `${actor} created the epic “${event.epic?.title || "Untitled"}”`, detail: "", route: "roadmap" };
    case WORKSPACE_EVENT_TYPES.RELEASE_CREATED:
      return {
        tone: "violet",
        icon: "release",
        title: `${actor} planned ${event.release?.version || "a release"}`,
        detail: event.release?.name || "",
        meta: event.release?.targetDate ? `Target ${new Date(event.release.targetDate).toLocaleDateString()}` : "",
        releaseId: event.release?.id,
      };
    case WORKSPACE_EVENT_TYPES.RELEASE_STATUS: {
      const to = event.to || event.release?.status;
      return {
        tone: to === "released" ? "green" : to === "rolled-back" || to === "cancelled" ? "red" : "violet",
        icon: "release",
        title: `${event.release?.version || "Release"} is now ${RELEASE_LABELS[to] || to}`,
        detail: event.release?.name || "",
        meta: `${RELEASE_LABELS[event.from] || event.from} → ${RELEASE_LABELS[to] || to} · by ${actor}`,
        releaseId: event.release?.id,
      };
    }
    case WORKSPACE_EVENT_TYPES.TEST_RUN_COMPLETED: {
      const results = event.results || {};
      const failed = results.failed || 0;
      return {
        tone: failed ? "red" : "green",
        icon: failed ? "testFail" : "testPass",
        title: `${event.run?.name || "Test run"} finished${failed ? ` with ${failed} failure${failed === 1 ? "" : "s"}` : " — all passing"}`,
        detail: `${results.passed || 0} passed · ${failed} failed${results.blocked ? ` · ${results.blocked} blocked` : ""}${results.skipped ? ` · ${results.skipped} skipped` : ""}`,
        meta: `${event.run?.environment ? `${event.run.environment} · ` : ""}by ${actor}`,
        progress: results.total ? Math.round(((results.passed || 0) / results.total) * 100) : null,
        route: "tests",
      };
    }
    default:
      return { tone: "blue", icon: "move", title: `${actor} updated the project`, detail: "" };
  }
}

/** Plain-text preview of an event (sidebar previews, search, exports). */
export function botEventText(event, options) {
  const described = describeBotEvent(event, options);
  return [described.title, described.detail].filter(Boolean).join(" — ");
}
