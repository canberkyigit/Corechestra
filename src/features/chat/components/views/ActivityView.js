import React, { useMemo, useState } from "react";
import { FaArrowLeft, FaAt, FaCheckDouble, FaCommentDots, FaInbox } from "react-icons/fa";
import { useChat, useChatActions } from "../../../../shared/context/ChatContext";
import { CHANNEL_TYPES, INBOX_KINDS, getUserDisplayName } from "../../../../shared/services/chat/chatModel";
import { formatFullTimestamp, formatListTime } from "../../utils/chatTime";
import UserAvatar from "../common/UserAvatar";

const FILTERS = [
  { id: "all", label: "All" },
  { id: INBOX_KINDS.MENTION, label: "Mentions" },
  { id: INBOX_KINDS.THREAD, label: "Threads" },
  { id: "unread", label: "Unread" },
];

function ViewHeader({ icon: Icon, title, subtitle, isMobile, onBack, children }) {
  return (
    <header className="h-14 flex-shrink-0 flex items-center gap-3 border-b border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] px-3 md:px-5">
      {isMobile && (
        <button type="button" onClick={onBack} aria-label="Back" className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5">
          <FaArrowLeft className="w-3.5 h-3.5" />
        </button>
      )}
      <span className="h-8 w-8 flex-shrink-0 rounded-lg bg-slate-100 dark:bg-[#232838] text-slate-600 dark:text-slate-300 flex items-center justify-center">
        <Icon className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0">
        <h2 className="font-semibold text-[15px] text-slate-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
      </div>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </header>
  );
}

function EmptyView({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-500"><Icon className="w-6 h-6" /></span>
      <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

function whereLabel(chat, channelId) {
  const channel = chat.channelsById[channelId];
  if (!channel) return "a conversation you can't access";
  return channel.type === CHANNEL_TYPES.DM ? chat.getChannelName(channel) : `#${channel.name}`;
}

export function ActivityView({ isMobile, onBack, onOpenItem }) {
  const chat = useChat();
  const actions = useChatActions();
  const [filter, setFilter] = useState("all");
  const items = useMemo(() => chat.inbox.filter((item) => {
    if (filter === "unread") return !item.read;
    if (filter === "all") return true;
    return item.kind === filter;
  }), [chat.inbox, filter]);
  const unread = chat.inbox.filter((item) => !item.read).length;

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-white dark:bg-[#141720]">
      <ViewHeader icon={FaInbox} title="Activity" subtitle="Mentions and replies to threads you follow" isMobile={isMobile} onBack={onBack}>
        {unread > 0 && (
          <button type="button" onClick={() => actions.markInboxRead()} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10">
            <FaCheckDouble className="w-3 h-3" /> Mark all read
          </button>
        )}
      </ViewHeader>
      <div className="flex-shrink-0 flex gap-1.5 px-3 md:px-5 py-2.5 border-b border-slate-100 dark:border-[#232838]">
        {FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setFilter(entry.id)}
            className={`h-7 rounded-full px-3 text-xs font-semibold transition-colors ${
              filter === entry.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#232838] dark:text-slate-300 dark:hover:bg-[#2a3044]"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <EmptyView
          icon={FaInbox}
          title={filter === "unread" ? "You're all caught up" : "Nothing here yet"}
          description="When someone @mentions you or replies to a thread you're part of, it shows up here."
        />
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#232838]">
          {items.map((item) => {
            const author = chat.usersById[item.authorId];
            const Icon = item.kind === INBOX_KINDS.THREAD ? FaCommentDots : FaAt;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpenItem(item)}
                  className={`w-full flex gap-3 px-3 md:px-5 py-3 text-left transition-colors ${item.read ? "hover:bg-slate-50 dark:hover:bg-white/[0.03]" : "bg-blue-50/60 hover:bg-blue-50 dark:bg-blue-500/[0.06] dark:hover:bg-blue-500/10"}`}
                >
                  <span className="relative flex-shrink-0">
                    <UserAvatar user={author} size="lg" />
                    <span className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-2 ring-white dark:ring-[#141720] flex items-center justify-center ${item.kind === INBOX_KINDS.THREAD ? "bg-violet-500" : "bg-blue-600"} text-white`}>
                      <Icon className="w-2.5 h-2.5" />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                        <b className="font-semibold text-slate-900 dark:text-white">{getUserDisplayName(author)}</b>
                        {item.kind === INBOX_KINDS.THREAD ? " replied to a thread in " : " mentioned you in "}
                        <b className="font-semibold text-slate-900 dark:text-white">{whereLabel(chat, item.channelId)}</b>
                      </span>
                      <span className="ml-auto flex-shrink-0 text-xs text-slate-400" title={formatFullTimestamp(item.createdAt)}>{formatListTime(item.createdAt)}</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400 line-clamp-2 break-words">{item.preview}</span>
                  </span>
                  {!item.read && <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function WelcomeView({ onNewMessage, onBrowse, onCreateChannel, canManageChannels }) {
  return (
    <section className="flex h-full flex-1 flex-col items-center justify-center bg-white dark:bg-[#141720] p-10 text-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20"><FaCommentDots className="w-7 h-7" /></span>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Welcome to Chats</h2>
      <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">Talk with your team in channels, direct messages and threads — mention people, react, share files and turn messages into tasks.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onNewMessage} className="h-9 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500">New message</button>
        <button type="button" onClick={onBrowse} className="h-9 rounded-lg border border-slate-200 dark:border-[#2a3044] px-4 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5">Browse channels</button>
        {canManageChannels && (
          <button type="button" onClick={onCreateChannel} className="h-9 rounded-lg border border-slate-200 dark:border-[#2a3044] px-4 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5">Create a channel</button>
        )}
      </div>
    </section>
  );
}
