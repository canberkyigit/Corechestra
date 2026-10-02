import React, { useMemo, useState } from "react";
import {
  FaArrowLeft, FaBookmark, FaCheck, FaCheckDouble, FaClock, FaEnvelopeOpenText, FaHashtag, FaLock, FaPaperPlane, FaPen,
  FaRegClock, FaTrashAlt,
} from "react-icons/fa";
import { useChat, useChatActions } from "../../../../shared/context/ChatContext";
import { useToast } from "../../../../shared/context/ToastContext";
import { CHANNEL_TYPES, getUserDisplayName, isChannelMember } from "../../../../shared/services/chat/chatModel";
import { useChannelMessages } from "../../hooks/useChatSubscriptions";
import { formatFullTimestamp, formatListTime } from "../../utils/chatTime";
import { formatScheduledTime, getSchedulePresets } from "../../utils/chatSchedule";
import UserAvatar from "../common/UserAvatar";
import { MenuPopover } from "../common/Popovers";
import MessageText from "../conversation/MessageText";

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

function EmptyState({ icon: Icon, title, description }) {
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

// ── All unreads ─────────────────────────────────────────────────────────────
function UnreadChannelCard({ channel, count, ctx, chat, onOpen, onMarkRead }) {
  const { messages, loading } = useChannelMessages(channel.id, Math.min(Math.max(count, 1), 15));
  const unread = useMemo(
    () => messages.filter((message) => !message.system && message.authorId !== chat.uid).slice(-Math.min(count, 15)),
    [chat.uid, count, messages]
  );
  const isDm = channel.type === CHANNEL_TYPES.DM;
  return (
    <section className="rounded-2xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] overflow-hidden" data-testid={`unread-card-${channel.id}`}>
      <header className="flex items-center gap-2 border-b border-slate-100 dark:border-[#232838] px-4 py-2.5">
        <span className="text-slate-500">{isDm ? null : channel.isPrivate ? <FaLock className="w-3 h-3" /> : <FaHashtag className="w-3 h-3" />}</span>
        <button type="button" onClick={() => onOpen(channel.id)} className="min-w-0 truncate text-sm font-bold text-slate-900 dark:text-white hover:underline">
          {chat.getChannelName(channel)}
        </button>
        <span className="rounded-full bg-red-500 px-1.5 text-[10.5px] font-bold text-white tabular-nums">{count > 99 ? "99+" : count}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <button type="button" onClick={() => onMarkRead(channel.id)} className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5">
            <FaCheckDouble className="w-3 h-3" /> Mark read
          </button>
          <button type="button" onClick={() => onOpen(channel.id)} className="inline-flex h-7 items-center rounded-lg bg-blue-600 px-2.5 text-xs font-semibold text-white hover:bg-blue-500">Open</button>
        </div>
      </header>
      <div className="divide-y divide-slate-50 dark:divide-[#20253a]">
        {loading && <p className="px-4 py-3 text-sm text-slate-400">Loading…</p>}
        {!loading && unread.length === 0 && <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">New activity in this conversation.</p>}
        {unread.map((message) => (
          <button key={message.id} type="button" onClick={() => ctx.onJumpToMessage(channel.id, message.id)} className="flex w-full gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03]">
            <UserAvatar user={chat.usersById[message.authorId]} size="md" />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">{getUserDisplayName(chat.usersById[message.authorId])}</span>
                <span className="text-[11px] text-slate-400" title={formatFullTimestamp(message.createdAt)}>{formatListTime(message.createdAt)}</span>
              </span>
              {message.text ? <MessageText text={message.text} ctx={ctx} className="line-clamp-4" /> : (
                <span className="text-sm text-slate-500">{message.poll ? `📊 ${message.poll.question}` : message.attachments?.length ? "📎 Attachment" : "Message"}</span>
              )}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function UnreadsView({ ctx, isMobile, onBack, onOpenChannel }) {
  const chat = useChat();
  const actions = useChatActions();
  const list = useMemo(() => chat.channels
    .filter((channel) => isChannelMember(channel, chat.uid) && !channel.archived)
    .map((channel) => ({ channel, info: chat.unread.perChannel[channel.id] }))
    .filter(({ info }) => info && info.unread > 0)
    .sort((a, b) => (b.info.mentions - a.info.mentions) || ((b.channel.lastMessageAt || 0) - (a.channel.lastMessageAt || 0))),
  [chat.channels, chat.uid, chat.unread.perChannel]);

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-slate-50 dark:bg-[#141720]">
      <ViewHeader icon={FaEnvelopeOpenText} title="All unreads" subtitle={list.length ? `${list.length} conversation${list.length === 1 ? "" : "s"} with new messages` : "Nothing new"} isMobile={isMobile} onBack={onBack}>
        {list.length > 0 && (
          <button type="button" onClick={() => actions.markAllRead()} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10">
            <FaCheckDouble className="w-3 h-3" /> Mark all read
          </button>
        )}
      </ViewHeader>
      {list.length === 0 ? (
        <EmptyState icon={FaCheckDouble} title="You're all caught up" description="New messages from every conversation you're in show up here, so you can read them without switching channels." />
      ) : (
        <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-3">
          {list.map(({ channel, info }) => (
            <UnreadChannelCard
              key={channel.id}
              channel={channel}
              count={info.unread}
              ctx={ctx}
              chat={chat}
              onOpen={onOpenChannel}
              onMarkRead={(id) => actions.markChannelRead(id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Later: saved, reminders, scheduled ──────────────────────────────────────
const LATER_TABS = [
  { id: "saved", label: "Saved", icon: FaBookmark },
  { id: "reminders", label: "Reminders", icon: FaRegClock },
  { id: "scheduled", label: "Scheduled", icon: FaPaperPlane },
];

function SnoozeMenu({ onPick, onClose }) {
  return (
    <MenuPopover
      onClose={onClose}
      items={[
        { header: "Snooze until" },
        ...getSchedulePresets().map((preset) => ({ id: preset.id, label: preset.label, icon: FaClock, onClick: () => onPick(preset.at) })),
      ]}
    />
  );
}

function ReminderRow({ reminder, chat, actions, onOpenItem, addToast }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const overdue = !reminder.done && reminder.at <= Date.now();
  return (
    <li className={`group flex gap-3 px-3 md:px-5 py-3 ${overdue ? "bg-amber-50/70 dark:bg-amber-500/[0.06]" : "hover:bg-slate-50 dark:hover:bg-white/[0.03]"}`}>
      <button
        type="button"
        aria-label={reminder.done ? "Mark as not done" : "Mark as done"}
        onClick={() => actions.completeReminder(reminder.id, !reminder.done)}
        className={`mt-0.5 h-5 w-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center ${reminder.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 dark:border-slate-500 hover:border-emerald-500"}`}
      >
        {reminder.done && <FaCheck className="w-2.5 h-2.5" />}
      </button>
      <button type="button" onClick={() => reminder.channelId && onOpenItem(reminder)} className="min-w-0 flex-1 text-left">
        <span className={`block text-sm font-medium ${reminder.done ? "text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}>
          {reminder.text || reminder.preview || "Reminder"}
        </span>
        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
          <span className={overdue ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>
            {overdue ? "Due " : ""}{formatScheduledTime(reminder.at)}
          </span>
          {reminder.channelId && <> · {getUserDisplayName(chat.usersById[reminder.authorId])} in {whereLabel(chat, reminder.channelId)}</>}
        </span>
        {reminder.text && reminder.preview && <span className="mt-0.5 block truncate text-xs text-slate-400">“{reminder.preview}”</span>}
      </button>
      <div className="relative flex items-start gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
        {!reminder.done && (
          <button type="button" title="Snooze" onClick={() => setMenuOpen((value) => !value)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10">
            <FaClock className="w-3 h-3" />
          </button>
        )}
        <button type="button" title="Delete" onClick={() => actions.deleteReminder(reminder.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
          <FaTrashAlt className="w-3 h-3" />
        </button>
        {menuOpen && (
          <SnoozeMenu
            onClose={() => setMenuOpen(false)}
            onPick={(at) => actions.snoozeReminder(reminder.id, at).then(() => addToast(`Snoozed until ${formatScheduledTime(at)}`, "info"))}
          />
        )}
      </div>
    </li>
  );
}

export function LaterView({ ctx, isMobile, onBack, onOpenItem, onNewReminder, onEditScheduled, initialTab = "saved" }) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const [tab, setTab] = useState(initialTab);
  const [showDone, setShowDone] = useState(false);

  const saved = useMemo(() => Object.values(chat.userState?.saved || {}).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)), [chat.userState?.saved]);
  const reminders = useMemo(() => Object.values(chat.userState?.reminders || {})
    .filter((entry) => showDone || !entry.done)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.at - b.at), [chat.userState?.reminders, showDone]);
  const scheduled = useMemo(() => Object.values(chat.userState?.scheduled || {}).sort((a, b) => a.at - b.at), [chat.userState?.scheduled]);
  const counts = { saved: saved.length, reminders: chat.later.openReminders, scheduled: scheduled.length };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-white dark:bg-[#141720]">
      <ViewHeader icon={FaBookmark} title="Later" subtitle="Saved messages, reminders and scheduled messages — private to you" isMobile={isMobile} onBack={onBack}>
        {tab === "reminders" && (
          <button type="button" onClick={onNewReminder} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-500">
            <FaRegClock className="w-3 h-3" /> New reminder
          </button>
        )}
      </ViewHeader>
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 md:px-5 py-2.5 border-b border-slate-100 dark:border-[#232838]">
        {LATER_TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            data-testid={`later-tab-${entry.id}`}
            className={`h-7 inline-flex items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors ${
              tab === entry.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#232838] dark:text-slate-300 dark:hover:bg-[#2a3044]"
            }`}
          >
            <entry.icon className="w-2.5 h-2.5" /> {entry.label}
            {counts[entry.id] > 0 && <span className={`tabular-nums ${tab === entry.id ? "text-white/80" : "text-slate-400"}`}>{counts[entry.id]}</span>}
          </button>
        ))}
        {tab === "reminders" && (
          <label className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
            <input type="checkbox" checked={showDone} onChange={(event) => setShowDone(event.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600" />
            Show completed
          </label>
        )}
      </div>

      {tab === "saved" && (saved.length === 0 ? (
        <EmptyState icon={FaBookmark} title="No saved messages" description="Hover a message and click the bookmark to keep it here." />
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#232838]">
          {saved.map((item) => (
            <li key={item.messageId} className="group flex gap-3 px-3 md:px-5 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03]">
              <UserAvatar user={chat.usersById[item.authorId]} size="lg" />
              <button type="button" onClick={() => onOpenItem(item)} className="min-w-0 flex-1 text-left">
                <span className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{getUserDisplayName(chat.usersById[item.authorId])}</span>
                  <span className="text-xs text-slate-400 truncate">in {whereLabel(chat, item.channelId)} · {formatListTime(item.messageAt)}</span>
                </span>
                <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400 line-clamp-3 break-words">{item.preview || "Message"}</span>
              </button>
              <button type="button" title="Remove from saved" onClick={() => actions.updateUserState({ saved: { [item.messageId]: null } })} className="h-8 w-8 flex-shrink-0 hidden group-hover:inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                <FaTrashAlt className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      ))}

      {tab === "reminders" && (reminders.length === 0 ? (
        <EmptyState icon={FaRegClock} title="No reminders" description="Use “Remind me about this” on any message, type /remind in 30m …, or create one here." />
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#232838]">
          {reminders.map((reminder) => (
            <ReminderRow key={reminder.id} reminder={reminder} chat={chat} actions={actions} onOpenItem={onOpenItem} addToast={addToast} />
          ))}
        </ul>
      ))}

      {tab === "scheduled" && (scheduled.length === 0 ? (
        <EmptyState icon={FaPaperPlane} title="Nothing scheduled" description="Use the arrow next to Send to schedule a message for later." />
      ) : (
        <>
          <p className="px-3 md:px-5 py-2 text-[11px] text-slate-400 border-b border-slate-100 dark:border-[#232838]">
            Scheduled messages are sent by your open Corechestra. If you're offline at that time, they go out as soon as you open it again.
          </p>
          <ul className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#232838]">
            {scheduled.map((entry) => (
              <li key={entry.id} className="group flex gap-3 px-3 md:px-5 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03]" data-testid={`scheduled-${entry.id}`}>
                <span className="mt-0.5 h-8 w-8 flex-shrink-0 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 flex items-center justify-center"><FaPaperPlane className="w-3 h-3" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    To <b className="text-slate-700 dark:text-slate-200">{whereLabel(chat, entry.channelId)}</b>{entry.threadRootId ? " (thread)" : ""} · <span className="font-semibold text-blue-600 dark:text-blue-400">{formatScheduledTime(entry.at)}</span>
                    {entry.failedAt ? <span className="ml-1 text-red-500">· last attempt failed</span> : null}
                  </p>
                  <MessageText text={entry.text} ctx={ctx} className="mt-0.5 line-clamp-4" />
                </div>
                <div className="flex items-start gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                  <button type="button" title="Send now" onClick={() => actions.sendScheduledNow(entry.id).then(() => addToast("Sent", "success")).catch((err) => addToast(err?.message || "Could not send.", "error"))} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10">
                    <FaPaperPlane className="w-3 h-3" />
                  </button>
                  <button type="button" title="Edit" onClick={() => onEditScheduled(entry)} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/5">
                    <FaPen className="w-3 h-3" />
                  </button>
                  <button type="button" title="Cancel" onClick={() => actions.cancelScheduled(entry.id).then(() => addToast("Scheduled message deleted", "info"))} className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                    <FaTrashAlt className="w-3 h-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ))}
    </section>
  );
}
