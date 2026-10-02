import React, { useState, useMemo } from "react";
import { useApp } from "../../../shared/context/AppContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { extractMentionedUsernames, sameUser } from "../utils/mentionUtils";
import {
  createTaskComment,
  getCommentAuthor,
  normalizeTaskComments,
} from "../utils/commentModel";
import { FaComment, FaReply, FaTimes, FaChevronDown, FaChevronRight, FaLock } from "react-icons/fa";
import CommentEditor from "./comments/CommentEditor";
import CommentBubble from "./comments/CommentBubble";

// ─── CommentSection ───────────────────────────────────────────────────────────

export default function CommentSection({ savedComments = [], allTasks = [], onUpdate, onTaskRefClick, taskTitle, taskId }) {
  const { addNotification, currentUser, users } = useApp();
  const { canPerform } = usePermissions();
  const readOnly = !canPerform("task:edit");
  const [localNew,       setLocalNew]       = useState([]);
  const [compose,        setCompose]        = useState("");
  const [editingId,      setEditingId]      = useState(null);
  const [editingText,    setEditingText]    = useState("");
  const [collapsed,      setCollapsed]      = useState(new Set());
  const [inlineReplyId,  setInlineReplyId]  = useState(null);
  const [inlineReplyText,setInlineReplyText]= useState("");

  const normalizedSaved = useMemo(() => normalizeTaskComments(savedComments), [savedComments]);
  const savedIds    = useMemo(() => new Set(normalizedSaved.map(c => c.id)), [normalizedSaved]);
  const allComments = useMemo(() => [
    ...localNew.filter(c => !savedIds.has(c.id)),
    ...normalizedSaved,
  ], [localNew, normalizedSaved, savedIds]);

  const { topLevel, repliesMap } = useMemo(() => {
    const pinned   = allComments.filter(c =>  c.pinned && !c.replyTo);
    const unpinned = allComments.filter(c => !c.pinned && !c.replyTo);
    const topLevel = [...pinned, ...unpinned];
    const repliesMap = {};
    allComments.filter(c => c.replyTo).forEach(c => {
      repliesMap[c.replyTo] = [...(repliesMap[c.replyTo] || []), c];
    });
    return { topLevel, repliesMap };
  }, [allComments]);

  const isOwnComment = (comment) => Boolean(currentUser) && sameUser(getCommentAuthor(comment), currentUser);

  const pushUpdate = (newAll) => onUpdate?.(newAll);

  const mutate = (updater) => {
    if (readOnly) return;
    const newAll = allComments.map(updater);
    setLocalNew(p => p.map(updater));
    pushUpdate(newAll);
  };

  // Notifications are targeted: mentioned users, the task assignee/watchers on
  // new top-level comments, and the parent author on replies. The commenter is
  // never notified about their own comment.
  const notifyForComment = (text, parentComment = null) => {
    if (!taskTitle || typeof addNotification !== "function") return;
    const actor = currentUser || null;
    const actorLabel = currentUser || "Someone";
    const base = { taskId, taskTitle, actor };
    const notified = new Set();
    const send = (recipient, payload) => {
      if (!recipient || recipient === "unassigned" || sameUser(recipient, actor)) return;
      const key = String(recipient).toLowerCase();
      if (notified.has(key)) return;
      notified.add(key);
      addNotification({ ...base, ...payload, recipient });
    };

    extractMentionedUsernames(text, users).forEach((username) => {
      send(username, { type: "mention", text: `${actorLabel} mentioned you in "${taskTitle}"` });
    });

    if (parentComment) {
      send(getCommentAuthor(parentComment), { type: "comment", text: `${actorLabel} replied to your comment on "${taskTitle}"` });
      return;
    }

    const task = (allTasks || []).find((t) => String(t.id) === String(taskId));
    [task?.assignedTo, ...((task?.watchers) || [])].forEach((recipient) => {
      send(recipient, { type: "comment", text: `${actorLabel} commented on "${taskTitle}"` });
    });
  };

  const handlePost = () => {
    if (readOnly || !compose.trim()) return;
    const text = compose.trim();
    const c = createTaskComment({ text, author: currentUser });
    const newAll = [c, ...allComments];
    setLocalNew(p => [c, ...p]);
    setCompose("");
    pushUpdate(newAll);
    notifyForComment(text);
  };

  const handlePostReply = (parentId) => {
    if (readOnly || !inlineReplyText.trim()) return;
    const text = inlineReplyText.trim();
    const c = createTaskComment({ text, author: currentUser, replyTo: parentId });
    const newAll = [...allComments, c];
    setLocalNew(p => [...p, c]);
    setInlineReplyText("");
    setInlineReplyId(null);
    // Auto-expand replies for this comment
    setCollapsed(p => { const s = new Set(p); s.delete(parentId); return s; });
    pushUpdate(newAll);
    notifyForComment(text, allComments.find((comment) => comment.id === parentId) || null);
  };

  const handleDelete = (id) => {
    if (readOnly) return;
    const target = allComments.find(c => c.id === id);
    if (!target || !isOwnComment(target)) return;
    const newAll = allComments.filter(c => c.id !== id && c.replyTo !== id);
    setLocalNew(p => p.filter(c => c.id !== id && c.replyTo !== id));
    pushUpdate(newAll);
  };

  const handleSaveEdit = () => {
    if (readOnly || !editingText.trim()) return;
    const target = allComments.find(c => c.id === editingId);
    if (!target || !isOwnComment(target)) return;
    const text = editingText.trim();
    const editedAt = new Date().toISOString();
    mutate(c => c.id === editingId ? { ...c, text, edited: true, editedAt } : c);
    setEditingId(null);
    setEditingText("");
  };

  const handleReaction = (commentId, emoji) => {
    if (!currentUser) return;
    mutate(c => {
      if (c.id !== commentId) return c;
      const reactions = { ...(c.reactions || {}) };
      const cur = reactions[emoji] || [];
      reactions[emoji] = cur.some(u => sameUser(u, currentUser))
        ? cur.filter(u => !sameUser(u, currentUser))
        : [...cur, currentUser];
      if (!reactions[emoji].length) delete reactions[emoji];
      return { ...c, reactions };
    });
  };

  const handlePin = (commentId) => mutate(c => c.id === commentId ? { ...c, pinned: !c.pinned } : c);

  const totalCount = allComments.length;

  const renderBubble = (comment) => (
    <CommentBubble
      key={comment.id}
      comment={comment}
      allTasks={allTasks}
      currentUser={currentUser}
      isOwn={isOwnComment(comment)}
      isEditing={editingId === comment.id}
      editingText={editingText}
      onEditTextChange={setEditingText}
      onStartEdit={() => { setEditingId(comment.id); setEditingText(comment.text); }}
      onSaveEdit={handleSaveEdit}
      onCancelEdit={() => { setEditingId(null); setEditingText(""); }}
      onDelete={() => handleDelete(comment.id)}
      onReact={(emoji) => handleReaction(comment.id, emoji)}
      onPin={() => handlePin(comment.id)}
      onTaskClick={onTaskRefClick}
      readOnly={readOnly}
    />
  );

  return (
    <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-[#232838] border-b border-slate-200 dark:border-[#2a3044]">
        <FaComment className="w-3 h-3 text-slate-400" />
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Comments</span>
        {totalCount > 0 && (
          <span className="text-xs text-slate-400 bg-slate-200 dark:bg-[#2a3044] px-1.5 rounded-full">{totalCount}</span>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Compose area — top-level only */}
        {readOnly ? (
          <p
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#1c2030] text-xs text-slate-500 dark:text-slate-400"
            data-testid="task-comments-read-only"
          >
            <FaLock className="w-2.5 h-2.5 flex-shrink-0" />
            Read-only — your role can view comments but not add or change them.
          </p>
        ) : (
          <CommentEditor
            value={compose}
            onChange={setCompose}
            onSubmit={handlePost}
            allTasks={allTasks}
          />
        )}

        {/* Comment list */}
        {topLevel.length === 0 ? (
          <div className="py-5 text-center border-t border-slate-100 dark:border-[#2a3044]">
            <FaComment className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
            <p className="text-xs text-slate-400 dark:text-slate-500">{readOnly ? "No comments yet." : "No comments yet. Be the first!"}</p>
          </div>
        ) : (
          <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-[#2a3044]">
            {topLevel.map(c => {
              const replies    = repliesMap[c.id] || [];
              const isCollapsed = collapsed.has(c.id);
              const isReplying  = inlineReplyId === c.id;
              const parentLabel = getCommentAuthor(c) || "comment";
              return (
                <div key={c.id}>
                  {renderBubble(c)}

                  {/* Thread: replies + inline reply box */}
                  <div className="ml-8 mt-2 space-y-2">
                    {/* Collapse / expand toggle */}
                    {replies.length > 0 && (
                      <button
                        onClick={() => setCollapsed(p => { const s = new Set(p); s.has(c.id) ? s.delete(c.id) : s.add(c.id); return s; })}
                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        {isCollapsed ? <FaChevronRight className="w-2 h-2" /> : <FaChevronDown className="w-2 h-2" />}
                        {replies.length} {replies.length === 1 ? "reply" : "replies"}
                      </button>
                    )}

                    {/* Existing replies */}
                    {!isCollapsed && replies.length > 0 && (
                      <div className="space-y-2 border-l-2 border-slate-100 dark:border-[#2a3044] pl-3">
                        {replies.map(renderBubble)}
                      </div>
                    )}

                    {/* Inline reply editor */}
                    {isReplying && !readOnly && (
                      <div className="border-l-2 border-blue-300 dark:border-blue-600 pl-3">
                        <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-blue-500 dark:text-blue-400 font-medium">
                          <FaReply className="w-2.5 h-2.5" />
                          Replying to <span className="font-semibold">@{parentLabel}</span>
                          <button
                            onClick={() => { setInlineReplyId(null); setInlineReplyText(""); }}
                            className="ml-auto p-0.5 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 transition-colors"
                            title="Cancel reply"
                          >
                            <FaTimes className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <CommentEditor
                          value={inlineReplyText}
                          onChange={setInlineReplyText}
                          onSubmit={() => handlePostReply(c.id)}
                          onCancel={() => { setInlineReplyId(null); setInlineReplyText(""); }}
                          placeholder={`Reply to @${parentLabel}… (Ctrl+Enter)`}
                          autoFocus
                          allTasks={allTasks}
                        />
                      </div>
                    )}

                    {/* "Reply" link when not already open */}
                    {!isReplying && !readOnly && (
                      <button
                        onClick={() => { setInlineReplyId(c.id); setInlineReplyText(""); }}
                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        <FaReply className="w-2.5 h-2.5" />
                        Reply
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
