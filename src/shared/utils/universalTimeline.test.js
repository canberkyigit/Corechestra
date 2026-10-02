import { buildUniversalTimeline } from "./universalTimeline";

describe("buildUniversalTimeline", () => {
  it("merges activity, doc comments, release entries and test runs into a single sorted feed", () => {
    const entries = buildUniversalTimeline({
      currentUser: "alice",
      globalActivityLog: [
        {
          id: 1,
          taskId: 101,
          action: "updated task",
          user: "alice",
          timestamp: "2026-04-01T10:00:00.000Z",
        },
      ],
      activeTasks: [
        {
          id: 101,
          title: "Fix login",
          comments: [{ id: "c-1", author: "bob", text: "@alice please verify", createdAt: "2026-04-01T12:00:00.000Z" }],
        },
      ],
      backlogSections: [],
      docPages: [
        {
          id: "page-1",
          title: "Auth RFC",
          createdAt: "2026-04-01T09:00:00.000Z",
          comments: [{ id: "dc-1", author: "carol", text: "Looks good", createdAt: "2026-04-01T11:00:00.000Z" }],
        },
      ],
      releases: [
        {
          id: "rel-1",
          version: "v2.0.0",
          createdAt: "2026-04-01T08:00:00.000Z",
          changelog: [{ id: "cl-1", title: "Added SSO", createdAt: "2026-04-01T13:00:00.000Z" }],
        },
      ],
      testRuns: [
        {
          id: "run-1",
          name: "Auth nightly",
          createdAt: "2026-04-01T07:00:00.000Z",
          completedAt: "2026-04-01T14:00:00.000Z",
        },
      ],
    });

    expect(entries[0]).toMatchObject({
      id: "run-completed-run-1",
      title: "Test run completed",
    });
    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "release-note-rel-1-cl-1", title: "Release note · v2.0.0" }),
      expect.objectContaining({ id: "task-comment-101-c-1", mentionsCurrentUser: true }),
      expect.objectContaining({ id: "doc-comment-page-1-dc-1", title: "Comment on Auth RFC" }),
    ]));
  });

  it("includes legacy task comments stored as { user, timestamp } and new { author, createdAt } comments", () => {
    const entries = buildUniversalTimeline({
      currentUser: "alice",
      activeTasks: [
        {
          id: "CY-1",
          title: "Legacy task",
          comments: [
            { id: 1, user: "You", text: "old note", timestamp: "2026-04-01T10:00:00.000Z" },
            { id: 2, user: "bob", text: "@alice ping", timestamp: "2026-04-01T11:00:00.000Z" },
            { id: "tcmt-3", author: "carol", text: "new shape", createdAt: "2026-04-01T12:00:00.000Z" },
          ],
        },
      ],
    });

    expect(entries.map((entry) => entry.id)).toEqual([
      "task-comment-CY-1-tcmt-3",
      "task-comment-CY-1-2",
      "task-comment-CY-1-1",
    ]);
    expect(entries[0]).toMatchObject({ actor: "carol", title: "Comment on CY-1" });
    expect(entries[1]).toMatchObject({ actor: "bob", mentionsCurrentUser: true });
    expect(entries[2]).toMatchObject({ actor: null });
  });
});
