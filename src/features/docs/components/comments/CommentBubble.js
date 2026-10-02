import React from "react";
import { FaCheck, FaEdit, FaThumbtack, FaTrash } from "react-icons/fa";
import { useApp } from "../../../../shared/context/AppContext";
import { sameUser } from "../../utils/mentionUtils";
import { getCommentAuthor, getCommentTimestamp } from "../../utils/commentModel";
import { QUICK_EMOJIS, formatRelativeTime, renderMarkdown } from "./commentMarkdown";

export default function CommentBubble({ comment: c, allTasks, currentUser, isOwn, isEditing, editingText, onEditTextChange, onStartEdit, onSaveEdit, onCancelEdit, onDelete, onReact, onPin, onTaskClick, readOnly = false }) {
  const { users } = useApp();
  const author = getCommentAuthor(c);
  const userObj = author ? users?.find((u) => sameUser(u.username, author) || sameUser(u.id, author)) : null;
  const displayName = userObj?.name || author || "Unknown author";
  const initial = (displayName || "?").charAt(0).toUpperCase();
  const reactions = c.reactions || {};
  const avatarColor = userObj?.color || (author ? "#64748b" : "#94a3b8");
  const reactedByMe = (list) => (list || []).some((name) => sameUser(name, currentUser));

  return (
    <div className="flex gap-2 group/bubble" data-testid={`task-comment-${c.id}`}>
      {/* Avatar */}
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: avatarColor }}>{initial}</div>

      <div className="flex-1 min-w-0">
        {/* Meta row */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className={`text-xs font-semibold ${author ? "text-slate-700 dark:text-slate-300" : "italic text-slate-400 dark:text-slate-500"}`}>{displayName}</span>
          {isOwn && <span className="text-[9px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded font-medium">You</span>}
          {c.pinned && (
            <span className="text-[9px] flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded font-medium">
              <FaThumbtack className="w-2 h-2" />Pinned
            </span>
          )}
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatRelativeTime(getCommentTimestamp(c))}</span>
          {c.edited && <span className="text-[9px] text-slate-400 dark:text-slate-500 italic">(edited)</span>}
        </div>

        {isEditing && !readOnly ? (
          <div className="space-y-1.5">
            <textarea
              autoFocus
              className="w-full border border-blue-300 dark:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1c2030] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={3}
              value={editingText}
              onChange={(e) => onEditTextChange(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === "k") e.stopPropagation();
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSaveEdit(); }
                if (e.key === "Escape") onCancelEdit();
              }}
            />
            <div className="flex gap-1.5 justify-end">
              <button onClick={onCancelEdit} className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
              <button onClick={onSaveEdit} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
                <FaCheck className="w-2.5 h-2.5" />Save
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="bg-slate-50 dark:bg-[#232838] rounded-lg px-3 py-2 text-xs">
              {renderMarkdown(c.text, allTasks, onTaskClick)}
            </div>

            {/* Hover action toolbar */}
            {!readOnly && (
            <div className="absolute -top-3 right-1 opacity-0 group-hover/bubble:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-0.5 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg px-1 py-0.5 shadow-md z-10">
              {QUICK_EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => onReact(emoji)}
                  className={`text-xs px-0.5 rounded transition-all leading-none hover:scale-125 ${reactedByMe(reactions[emoji]) ? "opacity-100" : "opacity-40 hover:opacity-100"}`}
                  title={`React with ${emoji}`}
                >{emoji}</button>
              ))}
              <div className="w-px h-3 bg-slate-200 dark:bg-[#2a3044] mx-0.5" />
              <button
                onClick={onPin}
                className={`p-0.5 transition-colors ${c.pinned ? "text-amber-500" : "text-slate-400 hover:text-amber-500"}`}
                title={c.pinned ? "Unpin" : "Pin"}
              >
                <FaThumbtack className="w-2.5 h-2.5" />
              </button>
              {isOwn && (
                <>
                  <div className="w-px h-3 bg-slate-200 dark:bg-[#2a3044] mx-0.5" />
                  <button onClick={onStartEdit} className="p-0.5 text-slate-400 hover:text-blue-500 transition-colors" title="Edit">
                    <FaEdit className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={onDelete} className="p-0.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                    <FaTrash className="w-2.5 h-2.5" />
                  </button>
                </>
              )}
            </div>
            )}
          </div>
        )}

        {/* Reaction chips */}
        {Object.keys(reactions).length > 0 && !isEditing && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(reactions).map(([emoji, reactors]) =>
              (reactors || []).length > 0 ? (
                <button key={emoji} onClick={() => onReact(emoji)}
                  disabled={readOnly}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-all disabled:cursor-default ${
                    reactedByMe(reactors)
                      ? "bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                      : "bg-slate-50 border-slate-200 dark:bg-[#232838] dark:border-[#2a3044] text-slate-600 dark:text-slate-400 hover:border-blue-300"
                  }`}
                  title={reactors.join(", ")}
                >
                  <span>{emoji}</span><span>{reactors.length}</span>
                </button>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}
