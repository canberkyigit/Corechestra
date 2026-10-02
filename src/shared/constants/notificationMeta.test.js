import {
  NOTIF_META,
  filterNotificationsForUser,
  getNotificationMeta,
  isNotificationVisibleTo,
  resolveNotificationTarget,
} from "./notificationMeta";

describe("notificationMeta", () => {
  it("falls back to status_change for unknown types and to release meta for release types", () => {
    expect(getNotificationMeta("nope")).toBe(NOTIF_META.status_change);
    expect(getNotificationMeta("release_published")).toBe(NOTIF_META.release_update);
    expect(getNotificationMeta("sprint_started")).toBe(NOTIF_META.sprint_started);
  });

  it("shows broadcasts to everyone and targeted notifications only to the recipient", () => {
    expect(isNotificationVisibleTo({ id: 1 }, "alice")).toBe(true);
    expect(isNotificationVisibleTo({ id: 2, recipient: "Alice" }, "alice")).toBe(true);
    expect(isNotificationVisibleTo({ id: 3, recipient: "bob" }, "alice")).toBe(false);
    expect(filterNotificationsForUser([{ id: 1 }, { id: 2, recipient: "bob" }], "alice")).toEqual([{ id: 1 }]);
  });

  it("resolves task, archive, docs and type-based targets", () => {
    const tasks = [{ id: "CY-1", title: "A" }];
    const allow = () => true;

    expect(resolveNotificationTarget({ type: "assignment", taskId: "CY-1" }, { tasks, canAccessPage: allow }))
      .toEqual({ kind: "task", task: tasks[0] });
    expect(resolveNotificationTarget({ type: "task_archived", taskId: "CY-9" }, { tasks, archivedTasks: [{ id: "CY-9" }], canAccessPage: allow }))
      .toEqual({ kind: "route", route: "archive" });
    expect(resolveNotificationTarget({ type: "mention", pageId: "page-1" }, { canAccessPage: allow }))
      .toEqual({ kind: "route", route: "docs?page=page-1" });
    expect(resolveNotificationTarget({ type: "sprint_completed" }, { canAccessPage: allow }))
      .toEqual({ kind: "route", route: "board" });
    expect(resolveNotificationTarget({ type: "epic_created" }, { canAccessPage: allow }))
      .toEqual({ kind: "route", route: "roadmap" });
    expect(resolveNotificationTarget({ type: "task_created", taskId: "CY-404" }, { tasks, canAccessPage: allow }))
      .toEqual({ kind: "route", route: "board" });
  });

  it("falls back from archive to board when archive is not accessible, and returns null when nothing is", () => {
    const noArchive = (page) => page !== "archive";
    expect(resolveNotificationTarget({ type: "task_deleted", taskId: "CY-1" }, { tasks: [{ id: "CY-1" }], canAccessPage: noArchive }))
      .toEqual({ kind: "route", route: "board" });
    expect(resolveNotificationTarget({ type: "project_created" }, { canAccessPage: () => false })).toBeNull();
    expect(resolveNotificationTarget({ type: "something_else" }, {})).toBeNull();
  });
});
