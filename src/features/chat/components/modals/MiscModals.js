import React, { useEffect, useMemo, useState } from "react";
import { FaBell, FaChevronLeft, FaChevronRight, FaDownload, FaKeyboard, FaMoon, FaTimes } from "react-icons/fa";
import { useApp } from "../../../../shared/context/AppContext";
import { useChat, useChatActions } from "../../../../shared/context/ChatContext";
import { useToast } from "../../../../shared/context/ToastContext";
import {
  CHANNEL_TYPES, getActiveCustomStatus, getUserDisplayName, normalizeKeywords, toPlainText,
} from "../../../../shared/services/chat/chatModel";
import { TASK_PRIORITY_OPTIONS, TASK_TYPE_OPTIONS } from "../../../../shared/constants/taskMeta";
import { STATUS_DURATIONS, resolveStatusExpiry } from "../../utils/chatTime";
import { buildMessageLink } from "../../hooks/useMessageHandlers";
import { ChatButton, ChatModal, FieldLabel, fieldClass } from "../common/ChatModal";
import { EmojiPicker } from "../common/Popovers";

const TASK_TYPES = TASK_TYPE_OPTIONS.filter((option) => ["task", "bug", "feature", "userstory", "investigation", "defect"].includes(option.value));

export function CreateTaskFromMessageModal({ message, channel, initialTitle = "", onClose, onCreated }) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const { createTask, backlogSections, users, projects, currentProjectId } = useApp();
  const plain = message ? toPlainText(message.text, { usersById: chat.usersById, channelsById: chat.channelsById }) : "";
  const firstLine = plain.split("\n").find((line) => line.trim()) || "";
  const [title, setTitle] = useState(initialTitle || firstLine.replace(/[*_~`>#]/g, "").slice(0, 140));
  const where = channel ? (channel.type === CHANNEL_TYPES.DM ? "a direct message" : `#${channel.name}`) : "Chats";
  const author = message ? getUserDisplayName(chat.usersById[message.authorId]) : "";
  const [description, setDescription] = useState(message
    ? `${plain}\n\n— ${author} in ${where}\n${buildMessageLink(message)}`
    : "");
  const [type, setType] = useState("task");
  const [priority, setPriority] = useState("medium");
  const [assignee, setAssignee] = useState("unassigned");
  const [destination, setDestination] = useState("active");
  const project = (projects || []).find((entry) => entry.id === currentProjectId);
  const assignees = useMemo(() => (users || []).filter((user) => user.status !== "inactive" && user.status !== "deleted" && user.username), [users]);

  const submit = () => {
    if (!title.trim()) return;
    const task = createTask({
      title: title.trim(),
      description: description.trim(),
      type,
      priority,
      assignedTo: assignee,
      status: "todo",
    }, destination);
    if (task && message) actions.linkTaskToMessage(message, task).catch(() => {});
    addToast(`Task ${task?.id || ""} created`, "success");
    onCreated?.(task);
    onClose();
  };

  return (
    <ChatModal
      title="Create task"
      subtitle={`In ${project?.name || "the current project"}${message ? ` · from ${author}'s message` : ""}`}
      onClose={onClose}
      footer={(
        <>
          <ChatButton variant="secondary" onClick={onClose}>Cancel</ChatButton>
          <ChatButton disabled={!title.trim()} onClick={submit} data-testid="chat-create-task-submit">Create task</ChatButton>
        </>
      )}
    >
      <div className="space-y-3">
        <div>
          <FieldLabel htmlFor="chat-task-title">Title</FieldLabel>
          <input id="chat-task-title" data-autofocus value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} className={fieldClass} placeholder="What needs to be done?" />
        </div>
        <div>
          <FieldLabel htmlFor="chat-task-description">Description</FieldLabel>
          <textarea id="chat-task-description" rows={5} value={description} onChange={(event) => setDescription(event.target.value)} className={fieldClass} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="chat-task-type">Type</FieldLabel>
            <select id="chat-task-type" value={type} onChange={(event) => setType(event.target.value)} className={fieldClass}>
              {TASK_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="chat-task-priority">Priority</FieldLabel>
            <select id="chat-task-priority" value={priority} onChange={(event) => setPriority(event.target.value)} className={fieldClass}>
              {TASK_PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="chat-task-assignee">Assignee</FieldLabel>
            <select id="chat-task-assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)} className={fieldClass}>
              <option value="unassigned">Unassigned</option>
              {assignees.map((user) => <option key={user.id} value={user.username}>{user.name || user.username}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="chat-task-destination">Add to</FieldLabel>
            <select id="chat-task-destination" value={destination} onChange={(event) => setDestination(event.target.value)} className={fieldClass}>
              <option value="active">Active sprint</option>
              {(backlogSections || []).map((section) => <option key={section.id} value={`backlog-${section.id}`}>{section.title}</option>)}
            </select>
          </div>
        </div>
      </div>
    </ChatModal>
  );
}

const STATUS_PRESETS = [
  { emoji: "📅", text: "In a meeting", duration: "1h" },
  { emoji: "🚌", text: "Commuting", duration: "30m" },
  { emoji: "🎯", text: "Focusing", duration: "4h" },
  { emoji: "🤒", text: "Out sick", duration: "today" },
  { emoji: "🌴", text: "Vacationing", duration: "never" },
  { emoji: "🏡", text: "Working remotely", duration: "today" },
];

export function SetStatusModal({ onClose }) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const mine = chat.presence[chat.uid] || {};
  const current = getActiveCustomStatus(mine);
  const [emoji, setEmoji] = useState(current?.emoji || "💬");
  const [text, setText] = useState(current?.text || "");
  const [duration, setDuration] = useState("today");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dnd, setDnd] = useState(Boolean(mine.dnd));
  const [away, setAway] = useState(Boolean(mine.away));

  const save = async () => {
    try {
      await actions.setCustomStatus(text.trim() ? { emoji, text: text.trim(), expiresAt: resolveStatusExpiry(duration) } : null);
      await actions.setMyPresence({ dnd, away });
      addToast(text.trim() ? "Status updated" : "Status cleared", "success");
      onClose();
    } catch (err) {
      addToast(err?.message || "Status could not be saved.", "error");
    }
  };

  return (
    <ChatModal
      title="Set a status"
      onClose={onClose}
      footer={(
        <>
          {current && <ChatButton variant="dangerGhost" className="mr-auto" onClick={() => { setText(""); actions.setCustomStatus(null).then(onClose); }}>Clear status</ChatButton>}
          <ChatButton variant="secondary" onClick={onClose}>Cancel</ChatButton>
          <ChatButton onClick={save}>Save</ChatButton>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative">
            <button type="button" onClick={() => setPickerOpen((value) => !value)} className="h-10 w-10 rounded-lg border border-slate-200 dark:border-[#2a3044] text-xl hover:bg-slate-50 dark:hover:bg-white/5" aria-label="Pick status emoji">
              {emoji}
            </button>
            {pickerOpen && <EmojiPicker align="left" onClose={() => setPickerOpen(false)} onSelect={(value) => { setEmoji(value); setPickerOpen(false); }} />}
          </div>
          <input data-autofocus value={text} onChange={(event) => setText(event.target.value)} maxLength={100} placeholder="What's your status?" className={fieldClass} />
        </div>
        {!text && (
          <div className="grid gap-1 sm:grid-cols-2">
            {STATUS_PRESETS.map((preset) => (
              <button
                key={preset.text}
                type="button"
                onClick={() => { setEmoji(preset.emoji); setText(preset.text); setDuration(preset.duration); }}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                <span className="text-lg leading-none">{preset.emoji}</span>
                {preset.text}
                <span className="ml-auto text-xs text-slate-400">{STATUS_DURATIONS.find((entry) => entry.id === preset.duration)?.label}</span>
              </button>
            ))}
          </div>
        )}
        <div>
          <FieldLabel htmlFor="chat-status-duration">Clear after</FieldLabel>
          <select id="chat-status-duration" value={duration} onChange={(event) => setDuration(event.target.value)} className={fieldClass}>
            {STATUS_DURATIONS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </select>
        </div>
        <div className="space-y-2 rounded-xl border border-slate-200 dark:border-[#2a3044] p-3">
          <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
            <input type="checkbox" checked={away} onChange={(event) => setAway(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <FaMoon className="w-3.5 h-3.5 text-slate-400" /> Set yourself as away
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
            <input type="checkbox" checked={dnd} onChange={(event) => setDnd(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <FaBell className="w-3.5 h-3.5 text-slate-400" /> Pause notifications (do not disturb)
          </label>
        </div>
      </div>
    </ChatModal>
  );
}

const SHORTCUTS = [
  ["Enter", "Send message"],
  ["Shift + Enter", "New line"],
  ["↑ (empty composer)", "Edit your last message"],
  ["Esc", "Cancel editing / quote, close menus"],
  ["[[", "Reference a task, doc or release"],
  ["Alt + ↑ / ↓", "Previous / next conversation"],
  ["Alt + Shift + ↑ / ↓", "Previous / next unread conversation"],
  ["Ctrl/⌘ + B, I", "Bold, italic"],
  ["Ctrl/⌘ + Shift + X", "Strikethrough"],
  ["Ctrl/⌘ + Shift + C", "Code block"],
  ["@ # : /", "Mention, channel, emoji, command"],
];

export function ChatPreferencesModal({ onClose }) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const prefs = chat.userState?.prefs || {};
  const [enterToSend, setEnterToSend] = useState(prefs.enterToSend !== false);
  const [desktop, setDesktop] = useState(Boolean(prefs.desktopNotifications));
  const [richComposer, setRichComposer] = useState(prefs.richComposer !== false);
  const [keywords, setKeywords] = useState(normalizeKeywords(prefs.keywords).join(", "));
  const permission = typeof window !== "undefined" && typeof window.Notification === "function" ? window.Notification.permission : "unsupported";

  const toggleDesktop = async (next) => {
    if (next && permission !== "granted") {
      if (permission === "unsupported") { addToast("This browser doesn't support desktop notifications.", "warning"); return; }
      const result = await window.Notification.requestPermission();
      if (result !== "granted") { addToast("Desktop notifications are blocked in your browser settings.", "warning"); return; }
    }
    setDesktop(next);
  };

  const save = () => {
    actions.updatePrefs({ enterToSend, desktopNotifications: desktop, richComposer, keywords: normalizeKeywords(keywords) })
      .then(() => { addToast("Preferences saved", "success"); onClose(); })
      .catch((err) => addToast(err?.message || "Could not save preferences.", "error"));
  };

  return (
    <ChatModal
      title="Chat preferences"
      onClose={onClose}
      footer={(
        <>
          <ChatButton variant="secondary" onClick={onClose}>Cancel</ChatButton>
          <ChatButton onClick={save}>Save</ChatButton>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="space-y-2 rounded-xl border border-slate-200 dark:border-[#2a3044] p-3.5">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Sending messages</p>
          <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
            <input type="radio" name="chat-send" checked={enterToSend} onChange={() => setEnterToSend(true)} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
            <span><b>Enter</b> sends, <b>Shift+Enter</b> adds a new line</span>
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
            <input type="radio" name="chat-send" checked={!enterToSend} onChange={() => setEnterToSend(false)} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
            <span><b>Ctrl/⌘+Enter</b> sends, <b>Enter</b> adds a new line</span>
          </label>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] p-3.5">
          <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
            <input type="checkbox" checked={richComposer} onChange={(event) => setRichComposer(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span>
              <span className="block font-semibold text-slate-900 dark:text-white">Format messages as you type</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Rich-text composer (bold, lists, code blocks render live). Turn off to write raw markdown.</span>
            </span>
          </label>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] p-3.5">
          <label htmlFor="chat-keywords" className="block text-sm font-semibold text-slate-900 dark:text-white">Keyword alerts</label>
          <p className="text-xs text-slate-500 dark:text-slate-400">Get an alert when any of these words appear in your channels (comma separated).</p>
          <input id="chat-keywords" value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="deploy, outage, release" className="mt-2 w-full rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] px-3 py-2 text-sm text-slate-900 dark:text-slate-100" />
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] p-3.5">
          <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
            <input type="checkbox" checked={desktop} onChange={(event) => toggleDesktop(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            <span>
              <span className="block font-semibold text-slate-900 dark:text-white">Desktop notifications</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">For direct messages, @mentions and thread replies while this tab is in the background.</span>
            </span>
          </label>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] p-3.5">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white"><FaKeyboard className="w-3.5 h-3.5 text-slate-400" /> Keyboard shortcuts</p>
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5 text-sm">
            {SHORTCUTS.map(([keys, label]) => (
              <React.Fragment key={keys}>
                <dt><kbd className="rounded border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] px-1.5 py-0.5 font-mono text-[11px] text-slate-700 dark:text-slate-200">{keys}</kbd></dt>
                <dd className="text-slate-600 dark:text-slate-300">{label}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>
      </div>
    </ChatModal>
  );
}

export function ImageLightbox({ images, index: initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex);
  const image = images[index];
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") { event.stopPropagation(); onClose(); }
      if (event.key === "ArrowRight") setIndex((value) => Math.min(value + 1, images.length - 1));
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(value - 1, 0));
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [images.length, onClose]);
  if (!image) return null;
  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black/90" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <span className="min-w-0 flex-1 truncate text-sm">{image.name}{images.length > 1 ? ` · ${index + 1} / ${images.length}` : ""}</span>
        <a href={image.dataUrl} download={image.name} className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-white/10" aria-label="Download">
          <FaDownload className="w-4 h-4" />
        </a>
        <button type="button" onClick={onClose} className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-white/10" aria-label="Close">
          <FaTimes className="w-4 h-4" />
        </button>
      </div>
      <div className="relative flex flex-1 min-h-0 items-center justify-center p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
        {index > 0 && (
          <button type="button" onClick={() => setIndex(index - 1)} className="absolute left-4 h-11 w-11 inline-flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Previous image">
            <FaChevronLeft />
          </button>
        )}
        <img src={image.dataUrl} alt={image.name} className="max-h-full max-w-full object-contain rounded-lg shadow-2xl" />
        {index < images.length - 1 && (
          <button type="button" onClick={() => setIndex(index + 1)} className="absolute right-4 h-11 w-11 inline-flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Next image">
            <FaChevronRight />
          </button>
        )}
      </div>
    </div>
  );
}
