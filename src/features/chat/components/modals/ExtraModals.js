import React, { useMemo, useRef, useState } from "react";
import { FaHashtag, FaLock, FaPlus, FaSearch, FaTimes, FaTrash, FaUpload, FaDownload, FaBroom, FaKey, FaSmile, FaDatabase, FaCheck } from "react-icons/fa";
import { useChat, useChatActions } from "../../../../shared/context/ChatContext";
import { useToast } from "../../../../shared/context/ToastContext";
import { CHANNEL_TYPES, buildPreview, createChatId, getUserDisplayName, isChannelMember } from "../../../../shared/services/chat/chatModel";
import { RETENTION_OPTIONS } from "../../../../shared/context/chat/useChatWorkspace";
import { ChatButton, ChatModal, FieldLabel, fieldClass } from "../common/ChatModal";
import UserAvatar from "../common/UserAvatar";
import EmojiGlyph from "../common/EmojiGlyph";
import { getSchedulePresets, formatScheduledTime, fromDateTimeInputValue, toDateTimeInputValue } from "../../utils/chatSchedule";
import { CUSTOM_EMOJI_NAME, emojiForShortcode } from "../../utils/emoji";
import { compressImageFile } from "../../../docs/utils/imageCompression";
import { buildJsonExport, downloadTextFile } from "../../utils/chatExport";
import { formatListTime } from "../../utils/chatTime";

// ── Poll ────────────────────────────────────────────────────────────────────
export function CreatePollModal({ onClose, onCreate }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multi, setMulti] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const filled = options.map((option) => option.trim()).filter(Boolean);
  const duplicate = new Set(filled.map((option) => option.toLowerCase())).size !== filled.length;
  const valid = question.trim() && filled.length >= 2 && !duplicate;

  const submit = () => {
    if (!valid) return;
    onCreate({
      question: question.trim().slice(0, 300),
      options: filled.slice(0, 10).map((text) => ({ id: createChatId("opt"), text: text.slice(0, 120) })),
      multi,
      anonymous,
      closed: false,
    });
  };

  return (
    <ChatModal
      title="Create a poll"
      onClose={onClose}
      footer={(
        <>
          <ChatButton variant="secondary" onClick={onClose}>Cancel</ChatButton>
          <ChatButton disabled={!valid} onClick={submit} data-testid="chat-poll-submit">Post poll</ChatButton>
        </>
      )}
    >
      <div className="space-y-4">
        <div>
          <FieldLabel htmlFor="chat-poll-question">Question</FieldLabel>
          <input id="chat-poll-question" data-autofocus value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={300} placeholder="What should we decide?" className={fieldClass} />
        </div>
        <div>
          <FieldLabel>Options</FieldLabel>
          <div className="space-y-2">
            {options.map((option, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={index} className="flex gap-2">
                <input
                  value={option}
                  onChange={(event) => setOptions((prev) => prev.map((entry, position) => (position === index ? event.target.value : entry)))}
                  onKeyDown={(event) => { if (event.key === "Enter" && index === options.length - 1 && options.length < 10) setOptions((prev) => [...prev, ""]); }}
                  maxLength={120}
                  placeholder={`Option ${index + 1}`}
                  aria-label={`Option ${index + 1}`}
                  className={fieldClass}
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => setOptions((prev) => prev.filter((_, position) => position !== index))} aria-label={`Remove option ${index + 1}`} className="h-10 w-10 flex-shrink-0 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                    <FaTimes className="mx-auto w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 10 && (
            <button type="button" onClick={() => setOptions((prev) => [...prev, ""])} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
              <FaPlus className="w-3 h-3" /> Add option
            </button>
          )}
          {duplicate && <p className="mt-1 text-xs text-red-500">Options must be different.</p>}
        </div>
        <div className="space-y-2 rounded-xl border border-slate-200 dark:border-[#2a3044] p-3">
          <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
            <input type="checkbox" checked={multi} onChange={(event) => setMulti(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            Allow multiple answers
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
            <input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
            Hide who voted for what
          </label>
        </div>
      </div>
    </ChatModal>
  );
}

// ── Forward ─────────────────────────────────────────────────────────────────
export function ForwardMessageModal({ message, onClose, encode }) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const targets = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return chat.channels
      .filter((channel) => isChannelMember(channel, chat.uid) && !channel.archived)
      .filter((channel) => !needle || chat.getChannelName(channel).toLowerCase().includes(needle))
      .sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0))
      .slice(0, 40);
  }, [chat, query]);

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id].slice(0, 10)));
  const preview = buildPreview(message.text, message.attachments, { usersById: chat.usersById, channelsById: chat.channelsById });

  const send = async () => {
    setBusy(true);
    try {
      await actions.forwardMessage(message, selected, encode(comment.trim()));
      addToast(`Forwarded to ${selected.length} conversation${selected.length === 1 ? "" : "s"}`, "success");
      onClose();
    } catch (err) {
      addToast(err?.message || "The message could not be forwarded.", "error");
      setBusy(false);
    }
  };

  return (
    <ChatModal
      title="Forward message"
      onClose={onClose}
      footer={(
        <>
          <ChatButton variant="secondary" onClick={onClose}>Cancel</ChatButton>
          <ChatButton disabled={!selected.length || busy} onClick={send} data-testid="chat-forward-submit">Forward</ChatButton>
        </>
      )}
    >
      <div className="space-y-3">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input data-autofocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a channel or person" className={`${fieldClass} pl-8`} />
        </div>
        <ul className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-[#2a3044] divide-y divide-slate-100 dark:divide-[#232838]">
          {targets.map((channel) => {
            const isDm = channel.type === CHANNEL_TYPES.DM;
            const checked = selected.includes(channel.id);
            const partner = isDm ? chat.usersById[channel.memberIds.find((id) => id !== chat.uid) || chat.uid] : null;
            return (
              <li key={channel.id}>
                <button type="button" onClick={() => toggle(channel.id)} className={`w-full flex items-center gap-3 px-3 py-2 text-left ${checked ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}>
                  {isDm ? <UserAvatar user={partner} size="sm" /> : (
                    <span className="h-6 w-6 rounded-md bg-slate-100 dark:bg-[#232838] text-slate-500 flex items-center justify-center">{channel.isPrivate ? <FaLock className="w-2.5 h-2.5" /> : <FaHashtag className="w-2.5 h-2.5" />}</span>
                  )}
                  <span className="flex-1 truncate text-sm text-slate-800 dark:text-slate-100">{chat.getChannelName(channel)}</span>
                  <span className={`h-4 w-4 rounded border flex items-center justify-center ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 dark:border-slate-500"}`}>
                    {checked && <FaCheck className="w-2 h-2" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div>
          <FieldLabel htmlFor="chat-forward-comment" hint="(optional)">Add a message</FieldLabel>
          <textarea id="chat-forward-comment" rows={2} value={comment} onChange={(event) => setComment(event.target.value)} className={fieldClass} placeholder="Why are you sharing this?" />
        </div>
        <div className="rounded-xl border-l-4 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#232838] px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <UserAvatar user={chat.usersById[message.authorId]} size="xs" /> {getUserDisplayName(chat.usersById[message.authorId])}
          </p>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300 line-clamp-3">{preview || "Message"}</p>
        </div>
      </div>
    </ChatModal>
  );
}

// ── Date / time picker (schedule, reminders) ────────────────────────────────
export function DateTimeModal({ title, subtitle, confirmLabel = "Save", initialAt = null, withText = false, initialText = "", textLabel = "Message", onClose, onConfirm }) {
  const [value, setValue] = useState(toDateTimeInputValue(initialAt || Date.now() + 60 * 60 * 1000));
  const [text, setText] = useState(initialText);
  const at = fromDateTimeInputValue(value);
  const inPast = !at || at <= Date.now();
  const presets = getSchedulePresets();

  return (
    <ChatModal
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={(
        <>
          <ChatButton variant="secondary" onClick={onClose}>Cancel</ChatButton>
          <ChatButton disabled={inPast || (withText && !text.trim())} onClick={() => onConfirm({ at, text: text.trim() })} data-testid="chat-datetime-confirm">{confirmLabel}</ChatButton>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setValue(toDateTimeInputValue(preset.at))}
              className={`h-8 rounded-full px-3 text-xs font-semibold ${fromDateTimeInputValue(value) === new Date(toDateTimeInputValue(preset.at)).getTime() ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#232838] dark:text-slate-300 dark:hover:bg-[#2a3044]"}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div>
          <FieldLabel htmlFor="chat-datetime">Date and time</FieldLabel>
          <input id="chat-datetime" type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} className={fieldClass} />
          <p className={`mt-1 text-xs ${inPast ? "text-red-500" : "text-slate-500 dark:text-slate-400"}`}>
            {inPast ? "Pick a time in the future." : `Scheduled for ${formatScheduledTime(at)}.`}
          </p>
        </div>
        {withText && (
          <div>
            <FieldLabel htmlFor="chat-datetime-text">{textLabel}</FieldLabel>
            <textarea id="chat-datetime-text" data-autofocus rows={3} value={text} onChange={(event) => setText(event.target.value)} className={fieldClass} />
          </div>
        )}
      </div>
    </ChatModal>
  );
}

// ── Workspace chat settings (admins) ────────────────────────────────────────
const SETTINGS_TABS = [
  { id: "emoji", label: "Custom emoji", icon: FaSmile },
  { id: "integrations", label: "Integrations", icon: FaKey },
  { id: "data", label: "Retention & export", icon: FaDatabase },
];

function CustomEmojiTab({ chat, actions, addToast, canManage }) {
  const [name, setName] = useState("");
  const [dataUrl, setDataUrl] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const clean = name.trim().toLowerCase().replace(/^:|:$/g, "");
  const exists = Boolean(chat.customEmoji[clean]);
  const builtin = Boolean(emojiForShortcode(clean));
  const error = !clean ? null : !CUSTOM_EMOJI_NAME.test(clean)
    ? "Use 2–32 lowercase letters, numbers, - _ or +."
    : exists ? "That name is already used." : builtin ? "That name is a built-in emoji." : null;

  const pickFile = async (file) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, { maxBytes: 48 * 1024 });
      setDataUrl(compressed);
      if (!name) setName(file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9_+-]+/g, "-").slice(0, 32));
    } catch (err) {
      addToast(err?.message || "That image can't be used.", "error");
    }
  };

  const add = async () => {
    if (!dataUrl || error || !clean) return;
    setBusy(true);
    try {
      await actions.addCustomEmoji(clean, dataUrl);
      addToast(`:${clean}: added`, "success");
      setName("");
      setDataUrl(null);
    } catch (err) {
      addToast(err?.message || "The emoji could not be added.", "error");
    }
    setBusy(false);
  };

  const list = Object.entries(chat.customEmoji).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] p-3.5">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Add custom emoji</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Square images work best. They're resized automatically.</p>
          <div className="mt-3 flex items-start gap-3">
            <button type="button" onClick={() => fileRef.current?.click()} className="h-14 w-14 flex-shrink-0 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden hover:border-blue-400">
              {dataUrl ? <img src={dataUrl} alt="" className="h-full w-full object-contain" /> : <FaUpload className="w-4 h-4 text-slate-400" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => { pickFile(event.target.files?.[0]); event.target.value = ""; }} />
            <div className="min-w-0 flex-1">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">:</span>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="party-parrot" className={`${fieldClass} pl-6 pr-6`} aria-label="Emoji name" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">:</span>
              </div>
              {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            </div>
            <ChatButton disabled={!dataUrl || !clean || Boolean(error) || busy} onClick={add}>Add</ChatButton>
          </div>
        </div>
      )}
      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No custom emoji yet.</p>
      ) : (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {list.map(([emojiName, entry]) => (
            <li key={emojiName} className="group flex items-center gap-3 rounded-lg border border-slate-200 dark:border-[#2a3044] px-3 py-2">
              <EmojiGlyph value={`:${emojiName}:`} customEmoji={chat.customEmoji} size="1.75rem" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">:{emojiName}:</span>
                <span className="block truncate text-[11px] text-slate-400">{getUserDisplayName(chat.usersById[entry.createdBy], "Unknown")} · {formatListTime(entry.createdAt)}</span>
              </span>
              {canManage && (
                <button type="button" title="Remove" onClick={() => actions.removeCustomEmoji(emojiName).catch((err) => addToast(err?.message || "Could not remove.", "error"))} className="hidden group-hover:inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                  <FaTrash className="w-3 h-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IntegrationsTab({ chat, actions, addToast, canManage }) {
  const [tenorKey, setTenorKey] = useState(chat.workspace?.integrations?.tenorKey || "");
  const aiEndpoint = process.env.REACT_APP_CHAT_AI_ENDPOINT;
  const previewEndpoint = process.env.REACT_APP_LINK_PREVIEW_ENDPOINT;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] p-3.5">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">GIFs (Tenor)</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Paste a Tenor API key to enable the GIF picker for everyone. Without a key the GIF button stays hidden.</p>
        <div className="mt-2 flex gap-2">
          <input type="password" value={tenorKey} disabled={!canManage} onChange={(event) => setTenorKey(event.target.value)} placeholder="Tenor API key" className={fieldClass} autoComplete="off" />
          <ChatButton
            disabled={!canManage}
            onClick={() => actions.updateWorkspaceSettings({ integrations: { tenorKey: tenorKey.trim() || null } }, "chat GIF integration updated")
              .then(() => addToast(tenorKey.trim() ? "GIF picker enabled" : "GIF picker disabled", "success"))
              .catch((err) => addToast(err?.message || "Could not save.", "error"))}
          >
            Save
          </ChatButton>
        </div>
        <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">The key is stored in the workspace chat settings and is visible to signed-in clients. Use a key restricted to your domain.</p>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] p-3.5 text-sm">
        <p className="font-semibold text-slate-900 dark:text-white">Server-side services</p>
        <ul className="mt-2 space-y-1.5 text-slate-600 dark:text-slate-300">
          <li className="flex items-center justify-between gap-3"><span>AI summaries (<code>REACT_APP_CHAT_AI_ENDPOINT</code>)</span><span className={aiEndpoint ? "text-emerald-600" : "text-slate-400"}>{aiEndpoint ? "Connected" : "Not configured"}</span></li>
          <li className="flex items-center justify-between gap-3"><span>Link previews (<code>REACT_APP_LINK_PREVIEW_ENDPOINT</code>)</span><span className={previewEndpoint ? "text-emerald-600" : "text-slate-400"}>{previewEndpoint ? "Connected" : "Not configured"}</span></li>
        </ul>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Without these, summaries are generated on the device and only well-known links (YouTube, GitHub, Figma, Loom, Google Docs, images, Corechestra) get previews.</p>
      </div>
    </div>
  );
}

function DataTab({ chat, actions, addToast, isAdmin }) {
  const retention = chat.workspace?.retention || {};
  const [days, setDays] = useState(Number(retention.days) || 0);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportWorkspace = async () => {
    setExporting(true);
    try {
      const list = chat.channels.filter((channel) => isChannelMember(channel, chat.uid));
      const sections = [];
      for (const channel of list) {
        // eslint-disable-next-line no-await-in-loop
        const messages = await actions.fetchChannelHistory(channel.id);
        sections.push(JSON.parse(buildJsonExport(channel, messages, { usersById: chat.usersById, channelsById: chat.channelsById, getName: chat.getChannelName })));
      }
      downloadTextFile(`corechestra-chat-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), conversations: sections }, null, 2), "application/json");
      addToast(`Exported ${sections.length} conversations`, "success");
    } catch (err) {
      addToast(err?.message || "Export failed.", "error");
    }
    setExporting(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] p-3.5">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Message retention</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Messages older than this are deleted permanently. Channels can override it in their details.</p>
        <div className="mt-2 flex gap-2">
          <select value={days} disabled={!isAdmin} onChange={(event) => setDays(Number(event.target.value))} className={fieldClass}>
            {RETENTION_OPTIONS.map((option) => <option key={option.days} value={option.days}>{option.label}</option>)}
          </select>
          <ChatButton
            disabled={!isAdmin || days === (Number(retention.days) || 0)}
            onClick={() => actions.updateWorkspaceSettings({ retention: { days } }, "chat retention policy changed")
              .then(() => addToast("Retention policy saved", "success"))
              .catch((err) => addToast(err?.message || "Could not save.", "error"))}
          >
            Save
          </ChatButton>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>
            {retention.lastRunAt ? `Last clean-up ${formatListTime(retention.lastRunAt)} · ${retention.lastRemoved || 0} messages removed` : "Clean-up has not run yet."}
          </span>
          {isAdmin && (
            <ChatButton
              size="sm"
              variant="secondary"
              disabled={running}
              onClick={() => {
                setRunning(true);
                actions.runRetentionNow()
                  .then(({ removed }) => addToast(`Clean-up finished: ${removed} messages removed`, "info"))
                  .catch((err) => addToast(err?.message || "Clean-up failed.", "error"))
                  .finally(() => setRunning(false));
              }}
            >
              <FaBroom className="w-3 h-3" /> {running ? "Cleaning…" : "Run clean-up now"}
            </ChatButton>
          )}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Until a scheduled backend job exists, clean-up runs once a day from an admin's open Corechestra, over the channels that admin can see.</p>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] p-3.5">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Export</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Download every conversation you're a member of as JSON (threads included, attachments as metadata). Single channels can be exported as Markdown or CSV from their details.</p>
        <ChatButton className="mt-2" variant="secondary" disabled={exporting} onClick={exportWorkspace}>
          <FaDownload className="w-3 h-3" /> {exporting ? "Exporting…" : "Export my conversations"}
        </ChatButton>
      </div>
    </div>
  );
}

export function WorkspaceChatSettingsModal({ onClose }) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const [tab, setTab] = useState("emoji");
  const isAdmin = chat.permissions.isWorkspaceAdmin;
  const canManage = chat.permissions.canManageChannels;
  const props = { chat, actions, addToast, isAdmin, canManage };

  return (
    <ChatModal title="Workspace chat settings" subtitle="Applies to everyone in the workspace" onClose={onClose} width="max-w-2xl">
      <div className="flex gap-1 border-b border-slate-200 dark:border-[#2a3044] -mx-5 px-5 mb-4">
        {SETTINGS_TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={`relative inline-flex items-center gap-1.5 px-2.5 py-2 text-sm font-medium ${tab === entry.id ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"}`}
          >
            <entry.icon className="w-3 h-3" /> {entry.label}
            {tab === entry.id && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" />}
          </button>
        ))}
      </div>
      {tab === "emoji" && <CustomEmojiTab {...props} />}
      {tab === "integrations" && <IntegrationsTab {...props} />}
      {tab === "data" && <DataTab {...props} />}
    </ChatModal>
  );
}
