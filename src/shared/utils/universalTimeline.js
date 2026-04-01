import { taskKey } from "./helpers";

function mentionMatch(text, currentUser) {
  if (!text || !currentUser) return false;
  const normalizedUser = String(currentUser).trim().toLowerCase();
  const localPart = normalizedUser.split("@")[0];
  return text.toLowerCase().includes(`@${normalizedUser}`) || text.toLowerCase().includes(`@${localPart}`);
}

export function buildUniversalTimeline({
  currentUser,
  globalActivityLog = [],
  activeTasks = [],
  backlogSections = [],
  docPages = [],
  releases = [],
  testRuns = [],
}) {
  const allTasks = [
    ...(activeTasks || []),
    ...((backlogSections || []).flatMap((section) => section.tasks || [])),
  ];
  const taskMap = new Map(allTasks.map((task) => [String(task.id), task]));
  const entries = [];

  globalActivityLog.forEach((entry) => {
    const task = entry.taskId ? taskMap.get(String(entry.taskId)) : null;
    entries.push({
      id: `activity-${entry.id}`,
      timestamp: entry.timestamp,
      category: "activity",
      title: entry.action,
      subtitle: task ? `${taskKey(task.id)} · ${task.title}` : "Workspace activity",
      entityType: task ? "task" : "workspace",
      entityId: task?.id || entry.projectId || null,
      actor: entry.user,
      mentionsCurrentUser: false,
    });
  });

  docPages.forEach((page) => {
    if (page.createdAt) {
      entries.push({
        id: `doc-created-${page.id}`,
        timestamp: page.createdAt,
        category: "doc",
        title: "Page created",
        subtitle: page.title,
        entityType: "doc",
        entityId: page.id,
        actor: page.owner || null,
        mentionsCurrentUser: false,
      });
    }

    (page.comments || []).forEach((comment) => {
      entries.push({
        id: `doc-comment-${page.id}-${comment.id}`,
        timestamp: comment.createdAt,
        category: "comment",
        title: `Comment on ${page.title}`,
        subtitle: comment.text,
        entityType: "doc",
        entityId: page.id,
        actor: comment.author,
        mentionsCurrentUser: mentionMatch(comment.text, currentUser),
      });
    });
  });

  releases.forEach((release) => {
    if (release.createdAt) {
      entries.push({
        id: `release-created-${release.id}`,
        timestamp: release.createdAt,
        category: "release",
        title: "Release created",
        subtitle: release.name || release.version,
        entityType: "release",
        entityId: release.id,
        actor: release.owner || null,
        mentionsCurrentUser: false,
      });
    }

    (release.changelog || []).forEach((entry) => {
      entries.push({
        id: `release-note-${release.id}-${entry.id}`,
        timestamp: entry.createdAt,
        category: "release",
        title: `Release note · ${release.version || release.name}`,
        subtitle: entry.title || entry.text || entry.description || "",
        entityType: "release",
        entityId: release.id,
        actor: entry.author || release.owner || null,
        mentionsCurrentUser: false,
      });
    });
  });

  testRuns.forEach((run) => {
    if (run.createdAt) {
      entries.push({
        id: `run-created-${run.id}`,
        timestamp: run.createdAt,
        category: "test",
        title: "Test run started",
        subtitle: run.name || run.status || "Test run",
        entityType: "test-run",
        entityId: run.id,
        actor: run.owner || null,
        mentionsCurrentUser: false,
      });
    }
    if (run.completedAt) {
      entries.push({
        id: `run-completed-${run.id}`,
        timestamp: run.completedAt,
        category: "test",
        title: "Test run completed",
        subtitle: run.name || run.status || "Test run",
        entityType: "test-run",
        entityId: run.id,
        actor: run.owner || null,
        mentionsCurrentUser: false,
      });
    }
  });

  allTasks.forEach((task) => {
    (task.comments || []).forEach((comment) => {
      entries.push({
        id: `task-comment-${task.id}-${comment.id}`,
        timestamp: comment.createdAt,
        category: "comment",
        title: `Comment on ${taskKey(task.id)}`,
        subtitle: comment.text,
        entityType: "task",
        entityId: task.id,
        actor: comment.author,
        mentionsCurrentUser: mentionMatch(comment.text, currentUser),
      });
    });
  });

  return entries
    .filter((entry) => entry.timestamp)
    .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
}
