import React, { useState } from "react";
import { FaComment, FaLock, FaTrash } from "react-icons/fa";
import { useApp } from "../../../../shared/context/AppContext";
import { useToast } from "../../../../shared/context/ToastContext";
import { extractMentionedUsernames, sameUser } from "../../utils/mentionUtils";
import { relativeTime } from "../../utils/docsTime";

export default function DocComments({ pageId, readOnly = false }) {
  const { docPages, addDocComment, deleteDocComment, restoreDocComment, currentUser, users, addNotification } = useApp();
  const { addToast } = useToast();
  const handleDeleteComment = (commentId) => {
    const removed = deleteDocComment(pageId, commentId);
    addToast("Comment deleted", "info", removed && restoreDocComment ? {
      action: { label: "Undo", onClick: () => restoreDocComment(pageId, removed) },
    } : undefined);
  };
  const [text, setText] = useState("");
  const page = docPages.find((entry) => entry.id === pageId);
  const comments = page?.comments || [];

  const handlePost = () => {
    if (readOnly || !text.trim()) return;
    const trimmed = text.trim();
    addDocComment(pageId, trimmed);
    setText("");
    if (!page || typeof addNotification !== "function") return;

    const notifyBase = {
      pageId,
      spaceId: page.spaceId || null,
      route: `docs?page=${encodeURIComponent(pageId)}`,
      actor: currentUser || null,
    };
    const actorLabel = currentUser || "Someone";
    const mentioned = extractMentionedUsernames(trimmed, users).filter((username) => !sameUser(username, currentUser));
    mentioned.forEach((username) => {
      addNotification({
        ...notifyBase,
        type: "mention",
        recipient: username,
        text: `${actorLabel} mentioned you on "${page.title}"`,
      });
    });
    const owner = page.owner || page.author;
    if (owner && !sameUser(owner, currentUser) && !mentioned.some((username) => sameUser(username, owner))) {
      addNotification({
        ...notifyBase,
        type: "comment",
        recipient: owner,
        text: `${actorLabel} commented on "${page.title}"`,
      });
    }
  };

  return (
      <div className="mt-12 pt-6 border-t border-slate-200 dark:border-[#252b3b]">
      <div className="flex items-center gap-2 mb-5">
        <FaComment className="w-4 h-4 text-slate-400" />
        <h3 className="app-section-title">
          Comments {comments.length > 0 && <span className="text-slate-400 font-normal">({comments.length})</span>}
        </h3>
      </div>

      {comments.length > 0 && (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div key={comment.id} className="app-surface-muted flex gap-3 group p-4">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-0.5">
                {comment.author?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 capitalize">{comment.author}</span>
                  <span className="text-xs text-slate-400">{relativeTime(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{comment.text}</p>
              </div>
              {!readOnly && sameUser(comment.author, currentUser) && (
                <button type="button" onClick={() => handleDeleteComment(comment.id)} title="Delete comment" aria-label="Delete comment" className="opacity-60 sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 p-1.5 rounded text-slate-400 hover:text-red-500 transition-all flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
                  <FaTrash className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {comments.length === 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-5">
          {readOnly ? "No comments yet." : "No comments yet. Be the first to comment."}
        </p>
      )}

      {readOnly ? (
        <p
          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#1c2030] text-xs text-slate-500 dark:text-slate-400"
          data-testid="docs-comments-read-only"
        >
          <FaLock className="w-3 h-3 flex-shrink-0" />
          You have read-only access to documentation, so commenting is disabled.
        </p>
      ) : (
      <div className="app-surface p-4">
        <div className="flex gap-3">
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 mt-1">
          {currentUser?.[0]?.toUpperCase() || "U"}
        </div>
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) handlePost(); }}
            placeholder="Add a comment… (Ctrl+Enter to post)"
            rows={2}
            className="app-textarea w-full text-sm resize-none"
          />
          <div className="flex justify-end mt-2">
            <button onClick={handlePost} disabled={!text.trim()} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">
              Post Comment
            </button>
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  );
}
