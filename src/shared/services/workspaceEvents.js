/*
 * In-process bus for product events (task moved, sprint started, release
 * shipped…). Actions emit on the client of the person who performed them, so
 * listeners (the Chats bot that posts into project channels) never see the
 * same event twice across users. Kept tiny and dependency-free so a backend
 * event stream can replace it later.
 *
 * Event shape: { type, projectId, actor, at, ...payload }
 */

export const WORKSPACE_EVENT = "corechestra:workspace-event";

export const WORKSPACE_EVENT_TYPES = {
  TASK_CREATED: "task_created",
  TASK_STATUS: "task_status",
  TASK_ASSIGNED: "task_assigned",
  TASK_ARCHIVED: "task_archived",
  SPRINT_STARTED: "sprint_started",
  SPRINT_COMPLETED: "sprint_completed",
  EPIC_CREATED: "epic_created",
  RELEASE_CREATED: "release_created",
  RELEASE_STATUS: "release_status",
  TEST_RUN_COMPLETED: "test_run_completed",
};

/** Which channel setting (`channel.botEvents[category]`) controls an event. */
export const WORKSPACE_EVENT_CATEGORIES = {
  task_created: "tasks",
  task_status: "tasks",
  task_assigned: "tasks",
  task_archived: "tasks",
  sprint_started: "sprints",
  sprint_completed: "sprints",
  epic_created: "sprints",
  release_created: "releases",
  release_status: "releases",
  test_run_completed: "tests",
};

export function emitWorkspaceEvent(event) {
  if (!event?.type || typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(WORKSPACE_EVENT, { detail: { at: Date.now(), ...event } }));
}

export function subscribeWorkspaceEvents(listener) {
  if (typeof window === "undefined") return () => {};
  const handler = (event) => { if (event?.detail) listener(event.detail); };
  window.addEventListener(WORKSPACE_EVENT, handler);
  return () => window.removeEventListener(WORKSPACE_EVENT, handler);
}
