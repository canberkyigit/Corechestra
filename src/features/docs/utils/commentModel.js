import { taskKey } from "../../../shared/utils/helpers";

// Task comments share the doc-comment shape `{ id, author, text, createdAt }`
// plus thread metadata (`replyTo`, `reactions`, `pinned`, `edited`, `editedAt`).
// Older task comments were stored as `{ user: "You", timestamp }`; those are
// still readable. The literal legacy author "You" carries no identity, so it
// is treated as unknown (no one may edit/delete it as "own").

const LEGACY_ANONYMOUS_AUTHOR = "You";

export function getCommentAuthor(comment) {
  const raw = comment?.author ?? comment?.user ?? null;
  if (!raw || raw === LEGACY_ANONYMOUS_AUTHOR) return null;
  return String(raw);
}

export function getCommentTimestamp(comment) {
  return comment?.createdAt || comment?.timestamp || null;
}

/** Converts one comment (new or legacy) to the canonical shape. */
export function normalizeTaskComment(comment) {
  if (!comment || typeof comment !== "object") return comment;
  const { user, timestamp, ...rest } = comment;
  return {
    ...rest,
    author: getCommentAuthor(comment),
    createdAt: getCommentTimestamp(comment),
    replyTo: comment.replyTo ?? null,
    reactions: comment.reactions || {},
    pinned: Boolean(comment.pinned),
  };
}

export function normalizeTaskComments(comments) {
  return (Array.isArray(comments) ? comments : []).filter(Boolean).map(normalizeTaskComment);
}

export function createTaskComment({ text, author, replyTo = null }) {
  return {
    id: `tcmt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    author: author || null,
    text,
    createdAt: new Date().toISOString(),
    replyTo,
    reactions: {},
    pinned: false,
  };
}

/** Finds a task by a `CY-123` reference (string or legacy numeric ids). */
export function findTaskByRef(tasks, ref) {
  if (!ref) return null;
  const normalized = String(ref).trim().toUpperCase();
  return (tasks || []).find((task) => taskKey(task?.id).toUpperCase() === normalized) || null;
}
