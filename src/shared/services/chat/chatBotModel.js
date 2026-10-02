import { WORKSPACE_EVENT_CATEGORIES, WORKSPACE_EVENT_TYPES } from "../workspaceEvents";

/*
 * Rules for the "Corechestra bot" that posts workspace events into project
 * channels. Cards are stored as system messages (`system.type === "event"`),
 * so they show in the timeline without inflating unread counts.
 */

/** Low-signal events skipped unless a channel opts in explicitly. */
const QUIET_BY_DEFAULT = new Set([WORKSPACE_EVENT_TYPES.TASK_ASSIGNED]);

export function isBotEventEnabled(channel, event) {
  const category = WORKSPACE_EVENT_CATEGORIES[event?.type];
  if (!category) return false;
  const settings = channel?.botEvents || {};
  if (settings[category] === false) return false;
  if (QUIET_BY_DEFAULT.has(event.type)) return settings.verbose === true;
  return true;
}

/** Compact, serialisable event stored on the message. */
export function buildBotSystemPayload(event) {
  const { type, actor = null, at = Date.now() } = event;
  const payload = { type: "event", event: { type, actor, at } };
  ["task", "sprint", "epic", "release", "run", "results"].forEach((key) => {
    if (event[key]) payload.event[key] = event[key];
  });
  ["from", "fromLabel", "to", "toLabel", "blockReason", "assignee", "destination", "done", "total", "carriedOver"].forEach((key) => {
    if (event[key] !== undefined && event[key] !== null && event[key] !== "") payload.event[key] = event[key];
  });
  return payload;
}
