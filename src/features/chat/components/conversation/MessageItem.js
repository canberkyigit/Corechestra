import React, { memo, useState } from "react";
import {
  FaBookmark, FaRegBookmark, FaCommentDots, FaEllipsisH, FaRegSmile, FaThumbtack, FaPen, FaTrash, FaLink,
  FaEyeSlash, FaCopy, FaTasks, FaFileAlt, FaDownload, FaExclamationCircle, FaReply, FaQuoteLeft, FaShare, FaRegClock,
  FaHeadphones,
} from "react-icons/fa";
import { getUserDisplayName } from "../../../../shared/services/chat/chatModel";
import { formatFullTimestamp, formatListTime, formatMessageTime } from "../../utils/chatTime";
import { emojiFromReactionKey, getEmojiName, QUICK_REACTIONS, reactionKey } from "../../utils/emoji";
import { formatBytes, isImageAttachment } from "../../utils/chatAttachments";
import { EmojiPicker, MenuPopover } from "../common/Popovers";
import UserAvatar from "../common/UserAvatar";
import MessageText from "./MessageText";
import {
  BotEventCard, EntityCards, ForwardedCard, LinkPreviews, PollCard, QuoteCard, TaskThreadCard,
} from "./MessageCards";
import EmojiGlyph from "../common/EmojiGlyph";
import { getSchedulePresets } from "../../utils/chatSchedule";
import { useHuddle } from "../../huddle/HuddleContext";
import MessageComposer from "../composer/MessageComposer";
import { decodeForEditing } from "../../utils/chatMentions";

function HuddleJoinButton({ channelId }) {
  const huddle = useHuddle();
  const live = huddle?.huddles?.[channelId];
  if (!live || huddle?.current?.channelId === channelId) return null;
  return (
    <button type="button" onClick={() => huddle.join(channelId)} className="ml-2 inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-emerald-500">
      <FaHeadphones className="w-2.5 h-2.5" /> Join
    </button>
  );
}

function ActionButton({ icon: Icon, label, onClick, active = false, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`h-7 min-w-[28px] px-1.5 inline-flex items-center justify-center rounded-md text-sm transition-colors ${
        active ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
      } hover:bg-slate-100 dark:hover:bg-white/10`}
    >
      {Icon ? <Icon className="w-3.5 h-3.5" /> : children}
    </button>
  );
}

export function SystemMessageText({ message, usersById, channel }) {
  const actor = getUserDisplayName(usersById[message.authorId]);
  const names = (message.system?.userIds || []).map((id) => getUserDisplayName(usersById[id])).join(", ");
  switch (message.system?.type) {
    case "channel_created": return <>{actor} created this channel.</>;
    case "joined": return <>{actor} joined {channel ? `#${channel.name}` : "the channel"}.</>;
    case "left": return <>{actor} left {channel ? `#${channel.name}` : "the channel"}.</>;
    case "added": return <>{actor} added {names}.</>;
    case "removed": return <>{actor} removed {names}.</>;
    case "renamed": return <>{actor} renamed the channel to #{message.system.name}.</>;
    case "topic": return message.system.topic ? <>{actor} set the topic: <i>{message.system.topic}</i></> : <>{actor} cleared the topic.</>;
    case "description": return <>{actor} updated the channel description.</>;
    case "archived": return <>{actor} archived this channel.</>;
    case "unarchived": return <>{actor} unarchived this channel.</>;
    case "private": return <>{actor} made this channel {message.system.isPrivate ? "private" : "public"}.</>;
    case "me": return <i>{actor} {message.system.text}</i>;
    case "huddle_started": return <>{actor} started a huddle.</>;
    case "huddle_ended": {
      const minutes = Math.max(1, Math.round((message.system.durationMs || 0) / 60000));
      return <>The huddle ended after {minutes} minute{minutes === 1 ? "" : "s"}.</>;
    }
    default: return <>{actor} updated the channel.</>;
  }
}

function Attachments({ attachments, onOpenImage }) {
  const images = attachments.filter(isImageAttachment);
  const files = attachments.filter((file) => !isImageAttachment(file));
  return (
    <div className="mt-1.5 space-y-1.5">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {images.map((file) => (
            <button
              key={file.id}
              type="button"
              onClick={() => onOpenImage?.(file, images)}
              className="block overflow-hidden rounded-lg border border-slate-200 dark:border-[#2a3044] hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <img
                src={file.url || file.dataUrl}
                alt={file.name}
                loading="lazy"
                className={`${images.length === 1 ? "max-h-72 max-w-[min(420px,100%)]" : "h-36 w-36"} object-cover bg-slate-100 dark:bg-[#232838]`}
              />
            </button>
          ))}
        </div>
      )}
      {files.map((file) => (
        <a
          key={file.id}
          href={file.dataUrl}
          download={file.name}
          className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] px-3 py-2.5 hover:border-blue-300 dark:hover:border-blue-500/50 group/file"
        >
          <span className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center flex-shrink-0">
            <FaFileAlt className="w-4 h-4 text-blue-500" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{file.name}</span>
            <span className="block text-xs text-slate-400">{formatBytes(file.size || 0)}</span>
          </span>
          <FaDownload className="w-3.5 h-3.5 text-slate-400 group-hover/file:text-blue-500" />
        </a>
      ))}
    </div>
  );
}

function Reactions({ message, ctx, onReact }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const entries = Object.entries(message.reactions || {}).filter(([, ids]) => Array.isArray(ids) && ids.length);
  if (!entries.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      {entries.map(([key, ids]) => {
        const mine = ids.includes(ctx.uid);
        const emoji = emojiFromReactionKey(key);
        const names = ids.map((id) => (id === ctx.uid ? "You" : getUserDisplayName(ctx.usersById[id]))).join(", ");
        return (
          <button
            key={key}
            type="button"
            title={`${names} reacted with ${getEmojiName(emoji) ? `:${getEmojiName(emoji)}:` : emoji}`}
            onClick={() => onReact(message, key)}
            className={`h-6 inline-flex items-center gap-1 rounded-full border px-2 text-xs transition-colors ${
              mine
                ? "border-blue-400 bg-blue-50 text-blue-700 dark:border-blue-500/60 dark:bg-blue-500/15 dark:text-blue-200"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-[#2a3044] dark:bg-[#232838] dark:text-slate-300"
            }`}
          >
            <EmojiGlyph value={emoji} customEmoji={ctx.customEmoji} className="text-sm leading-none" size="1rem" />
            <span className="font-semibold tabular-nums">{ids.length}</span>
          </button>
        );
      })}
      <div className="relative">
        <button
          type="button"
          aria-label="Add reaction"
          onClick={() => setPickerOpen((value) => !value)}
          className="h-6 w-8 inline-flex items-center justify-center rounded-full border border-slate-200 dark:border-[#2a3044] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-50 dark:bg-[#232838]"
        >
          <FaRegSmile className="w-3 h-3" />
        </button>
        {pickerOpen && (
          <EmojiPicker
            align="left"
            onClose={() => setPickerOpen(false)}
            onSelect={(emoji) => { setPickerOpen(false); onReact(message, reactionKey(emoji)); }}
          />
        )}
      </div>
    </div>
  );
}

function ThreadSummary({ message, ctx, onOpenThread, unread }) {
  if (!message.replyCount) return null;
  const participants = [...new Set([message.authorId, ...(message.threadParticipantIds || [])])].filter(Boolean).slice(-4);
  return (
    <button
      type="button"
      onClick={() => onOpenThread(message)}
      className="mt-1.5 -ml-1.5 flex items-center gap-2 rounded-lg border border-transparent px-1.5 py-1 hover:border-slate-200 hover:bg-white dark:hover:border-[#2a3044] dark:hover:bg-[#1c2030] group/thread"
    >
      <span className="flex -space-x-1">
        {participants.map((id) => <UserAvatar key={id} user={ctx.usersById[id]} size="xs" className="ring-2 ring-white dark:ring-[#141720]" />)}
      </span>
      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
        {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
      </span>
      {unread && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
      <span className="text-xs text-slate-400 group-hover/thread:hidden">Last reply {formatListTime(message.lastReplyAt)}</span>
      <span className="text-xs text-slate-400 hidden group-hover/thread:inline">View thread</span>
    </button>
  );
}

function MessageItem({
  message,
  grouped = false,
  ctx,
  channel,
  inThread = false,
  isRoot = false,
  saved = false,
  canEdit = false,
  canDelete = false,
  canPin = false,
  canCreateTask = false,
  editing = false,
  highlighted = false,
  threadUnread = false,
  footer = null,
  handlers,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const author = ctx.usersById[message.authorId];
  const isPending = Boolean(message.pending);
  const failed = message.status === "failed";

  if (message.system?.type === "event") return <BotEventCard message={message} ctx={ctx} />;
  if (message.system?.type === "task_thread") {
    if (isRoot) {
      return (
        <div className="px-5 pb-2" data-message-id={message.id}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Task discussion</p>
          <EntityCards message={{ ...message, text: message.system.taskId }} ctx={ctx} />
          {!ctx.resolveTask?.(message.system.taskId) && (
            <p className="text-sm text-slate-600 dark:text-slate-300">{message.system.taskId} {message.system.title}</p>
          )}
        </div>
      );
    }
    return <TaskThreadCard message={message} ctx={ctx} onOpenThread={handlers.onOpenThread} />;
  }
  if (message.system) {
    return (
      <div className="flex items-center gap-2 px-5 py-1 pl-[68px] text-[13px] text-slate-500 dark:text-slate-400" data-message-id={message.id}>
        <span className="flex-1">
          {message.system?.type?.startsWith("huddle") && <FaHeadphones className="mr-1.5 inline w-3 h-3 text-emerald-500" />}
          <SystemMessageText message={message} usersById={ctx.usersById} channel={channel} />
          {message.system?.type === "huddle_started" && <HuddleJoinButton channelId={message.channelId} />}
        </span>
        <span className="text-[11px] text-slate-400" title={formatFullTimestamp(message.createdAt)}>{formatMessageTime(message.createdAt)}</span>
      </div>
    );
  }

  const showToolbar = !isPending && !message.deleted && !editing;
  const menuItems = [
    !inThread && !message.sharedFromThread && { id: "reply", label: "Reply in thread", icon: FaCommentDots, onClick: () => handlers.onOpenThread(message) },
    handlers.onQuote && { id: "quote", label: "Quote reply", icon: FaQuoteLeft, onClick: () => handlers.onQuote(message) },
    handlers.onForward && { id: "forward", label: "Forward…", icon: FaShare, onClick: () => handlers.onForward(message) },
    { id: "copy", label: "Copy text", icon: FaCopy, onClick: () => handlers.onCopyText(message) },
    { id: "link", label: "Copy link to message", icon: FaLink, onClick: () => handlers.onCopyLink(message) },
    !inThread && message.seq > 0 && { id: "unread", label: "Mark unread", icon: FaEyeSlash, onClick: () => handlers.onMarkUnread(message) },
    canCreateTask && { id: "task", label: "Create task from message", icon: FaTasks, onClick: () => handlers.onCreateTask(message) },
    canPin && !message.threadRootId && { id: "pin", label: message.pinned ? "Unpin from channel" : "Pin to channel", icon: FaThumbtack, onClick: () => handlers.onTogglePin(message) },
    ...(handlers.onRemind ? [
      { divider: true },
      { header: "Remind me about this" },
      ...getSchedulePresets().slice(0, 4).map((preset) => ({
        id: `remind-${preset.id}`, label: preset.label, icon: FaRegClock, onClick: () => handlers.onRemind(message, preset.at),
      })),
      { id: "remind-custom", label: "Custom time…", icon: FaRegClock, onClick: () => handlers.onRemind(message, null) },
    ] : []),
    (canEdit || canDelete) && { divider: true },
    canEdit && { id: "edit", label: "Edit message", icon: FaPen, hint: "↑", onClick: () => handlers.onStartEdit(message) },
    canDelete && { id: "delete", label: "Delete message", icon: FaTrash, danger: true, onClick: () => handlers.onDelete(message) },
  ].filter(Boolean);

  return (
    <div
      data-message-id={message.id}
      className={`group relative flex gap-3 px-5 ${grouped ? "py-0.5" : "pt-2 pb-0.5"} transition-colors ${
        highlighted
          ? "bg-amber-50 dark:bg-amber-500/10"
          : message.pinned
            ? "bg-amber-50/40 dark:bg-amber-500/[0.04] hover:bg-amber-50/70 dark:hover:bg-amber-500/[0.07]"
            : "hover:bg-slate-50 dark:hover:bg-white/[0.025]"
      } ${isPending && !failed ? "opacity-60" : ""} ${isRoot ? "pb-2" : ""}`}
    >
      <div className="w-9 flex-shrink-0">
        {grouped ? (
          <span className="block pt-1 text-right text-[10.5px] leading-5 text-slate-400 opacity-0 group-hover:opacity-100 tabular-nums" title={formatFullTimestamp(message.createdAt)}>
            {formatMessageTime(message.createdAt)}
          </span>
        ) : (
          <UserAvatar user={author} size="lg" onClick={() => ctx.onOpenProfile?.(message.authorId)} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {message.pinned && !grouped && (
          <p className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 mb-0.5">
            <FaThumbtack className="w-2.5 h-2.5" /> Pinned{message.pinnedBy ? ` by ${getUserDisplayName(ctx.usersById[message.pinnedBy])}` : ""}
          </p>
        )}
        {message.sharedFromThread && (
          <button
            type="button"
            onClick={() => handlers.onOpenThreadById?.(message.threadRootId)}
            className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 hover:text-blue-600 mb-0.5"
          >
            <FaReply className="w-2.5 h-2.5" /> replied to a thread
          </button>
        )}
        {!grouped && (
          <div className="flex items-baseline gap-2 min-w-0">
            <button
              type="button"
              onClick={() => ctx.onOpenProfile?.(message.authorId)}
              className="text-[14.5px] font-semibold text-slate-900 dark:text-white hover:underline truncate"
            >
              {getUserDisplayName(author)}
            </button>
            {ctx.statusFor?.(message.authorId) && (
              <span title={ctx.statusFor(message.authorId).text} className="text-sm leading-none">{ctx.statusFor(message.authorId).emoji}</span>
            )}
            <span className="text-[11.5px] text-slate-400 flex-shrink-0" title={formatFullTimestamp(message.createdAt)}>
              {formatMessageTime(message.createdAt)}
            </span>
          </div>
        )}

        {editing ? (
          <div className="mt-1 mb-1">
            <MessageComposer
              mode="edit"
              autoFocus
              initialText={decodeForEditing(message.text, { usersById: ctx.usersById, channelsById: ctx.channelsById })}
              users={ctx.activeUsers}
              channels={ctx.channelList}
              presence={ctx.presence}
              allowAttachments={false}
              onCancel={handlers.onCancelEdit}
              onSubmit={({ text }) => handlers.onSaveEdit(message, text)}
              onError={handlers.onError}
            />
            <p className="mt-1 text-[11px] text-slate-400">Escape to cancel · Enter to save</p>
          </div>
        ) : message.deleted ? (
          <p className="text-sm italic text-slate-400">This message was deleted.</p>
        ) : (
          <>
            {message.quote && <QuoteCard quote={message.quote} ctx={ctx} />}
            {message.text && !message.poll && <MessageText text={message.text} ctx={ctx} />}
            {message.editedAt > 0 && (
              <span className="text-[11px] text-slate-400" title={`Edited ${formatFullTimestamp(message.editedAt)}`}>(edited)</span>
            )}
            {message.poll && (
              <PollCard
                message={message}
                ctx={ctx}
                onVote={handlers.onVote}
                onToggleClosed={handlers.onTogglePollClosed}
                canClose={message.authorId === ctx.uid || canDelete}
              />
            )}
            {message.forwarded && <ForwardedCard forwarded={message.forwarded} ctx={ctx} />}
            {message.attachments?.length > 0 && <Attachments attachments={message.attachments} onOpenImage={ctx.onOpenImage} />}
            <EntityCards message={message} ctx={ctx} />
            <LinkPreviews message={message} canHide={message.authorId === ctx.uid} onHide={() => handlers.onHidePreviews?.(message)} />
            {message.linkedTasks?.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {message.linkedTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => ctx.onOpenTaskKey?.(task.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 text-xs text-indigo-700 dark:text-indigo-200 hover:border-indigo-400"
                  >
                    <FaTasks className="w-3 h-3" />
                    <span className="font-mono font-semibold">{task.id}</span>
                    <span className="max-w-[220px] truncate">{task.title}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {failed && (
          <p className="mt-1 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
            <FaExclamationCircle className="w-3 h-3" /> {message.error || "Message not sent."}
            <button type="button" className="font-semibold underline" onClick={() => handlers.onRetry(message)}>Retry</button>
            <button type="button" className="font-semibold underline" onClick={() => handlers.onDiscard(message)}>Delete</button>
          </p>
        )}
        {isPending && !failed && <p className="mt-0.5 text-[11px] text-slate-400">Sending…</p>}

        {!message.deleted && <Reactions message={message} ctx={ctx} onReact={handlers.onReact} />}
        {!inThread && <ThreadSummary message={message} ctx={ctx} onOpenThread={handlers.onOpenThread} unread={threadUnread} />}
        {footer}
      </div>

      {showToolbar && (
        <div
          className={`absolute right-4 -top-3.5 z-10 items-center rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] shadow-sm px-0.5 py-0.5 ${
            menuOpen || pickerOpen ? "flex" : "hidden group-hover:flex group-focus-within:flex"
          }`}
        >
          {QUICK_REACTIONS.slice(0, 3).map((emoji) => (
            <ActionButton key={emoji} label={`React with ${emoji}`} onClick={() => handlers.onReact(message, reactionKey(emoji))}>
              <span className="text-base leading-none">{emoji}</span>
            </ActionButton>
          ))}
          <div className="relative">
            <ActionButton icon={FaRegSmile} label="Add reaction" active={pickerOpen} onClick={() => setPickerOpen((value) => !value)} />
            {pickerOpen && (
              <EmojiPicker
                onClose={() => setPickerOpen(false)}
                onSelect={(emoji) => { setPickerOpen(false); handlers.onReact(message, reactionKey(emoji)); }}
              />
            )}
          </div>
          {!inThread && !message.sharedFromThread && (
            <ActionButton icon={FaCommentDots} label="Reply in thread" onClick={() => handlers.onOpenThread(message)} />
          )}
          <ActionButton icon={saved ? FaBookmark : FaRegBookmark} label={saved ? "Remove from saved" : "Save for later"} active={saved} onClick={() => handlers.onToggleSaved(message)} />
          <div className="relative">
            <ActionButton icon={FaEllipsisH} label="More actions" active={menuOpen} onClick={() => setMenuOpen((value) => !value)} />
            {menuOpen && <MenuPopover items={menuItems} onClose={() => setMenuOpen(false)} />}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(MessageItem);
