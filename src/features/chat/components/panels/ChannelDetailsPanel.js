import React, { useEffect, useMemo, useState } from "react";
import {
  FaArchive, FaBell, FaBellSlash, FaFileAlt, FaLock, FaPen, FaSearch, FaSignOutAlt, FaThumbtack, FaTrash,
  FaUserPlus, FaUserMinus, FaHashtag, FaUndo, FaShieldAlt, FaEyeSlash, FaLayerGroup, FaDownload,
} from "react-icons/fa";
import { useChat, useChatActions } from "../../../../shared/context/ChatContext";
import { useToast } from "../../../../shared/context/ToastContext";
import {
  CHANNEL_KINDS, CHANNEL_TYPES, getDmPartnerIds, getNotifyLevel, getPresenceState, getUserDisplayName, isChannelMember, isMuted,
  NOTIFY_LEVELS, validateChannelName, buildPreview,
} from "../../../../shared/services/chat/chatModel";
import { RETENTION_OPTIONS } from "../../../../shared/context/chat/useChatWorkspace";
import { BOT_CATEGORIES } from "../../utils/chatBot";
import { buildCsvExport, buildJsonExport, buildMarkdownExport, downloadTextFile, exportFileName } from "../../utils/chatExport";
import { usePinnedMessages } from "../../hooks/useChatSubscriptions";
import { formatFullTimestamp, formatListTime } from "../../utils/chatTime";
import { formatBytes, isImageAttachment } from "../../utils/chatAttachments";
import UserAvatar, { PRESENCE_LABELS } from "../common/UserAvatar";
import { fieldClass } from "../common/ChatModal";
import { PanelShell } from "./ThreadPanel";

const TABS = [
  { id: "about", label: "About" },
  { id: "members", label: "Members" },
  { id: "pinned", label: "Pinned" },
  { id: "files", label: "Files" },
  { id: "settings", label: "Settings" },
];

const LEVEL_OPTIONS = [
  { id: NOTIFY_LEVELS.ALL, label: "All new messages", description: "Alert me for every message" },
  { id: NOTIFY_LEVELS.MENTIONS, label: "Mentions & keywords", description: "Alert me for @mentions and my keywords" },
  { id: NOTIFY_LEVELS.NOTHING, label: "Nothing", description: "No alerts — badges only" },
];

function SettingsTab({ channel, chat, actions, reportError, addToast }) {
  const level = getNotifyLevel(channel, chat.userState);
  const admin = chat.isChannelAdmin(channel) || chat.permissions.isWorkspaceAdmin;
  const isProject = channel.kind === CHANNEL_KINDS.PROJECT;
  const isDm = channel.type === CHANNEL_TYPES.DM;
  const [exporting, setExporting] = useState(null);
  const workspaceDays = Number(chat.workspace?.retention?.days) || 0;

  const exportAs = async (format) => {
    setExporting(format);
    try {
      const messages = await actions.fetchChannelHistory(channel.id);
      const exportCtx = { usersById: chat.usersById, channelsById: chat.channelsById, getName: chat.getChannelName };
      const builders = {
        json: [buildJsonExport, "json", "application/json"],
        md: [buildMarkdownExport, "md", "text/markdown"],
        csv: [buildCsvExport, "csv", "text/csv"],
      };
      const [build, extension, mime] = builders[format];
      downloadTextFile(exportFileName(channel, chat.getChannelName, extension), build(channel, messages, exportCtx), mime);
      addToast(`Exported ${messages.length} messages`, "success");
    } catch (error) {
      reportError(error);
    }
    setExporting(null);
  };

  return (
    <div className="space-y-3 p-4">
      <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] p-3.5">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
        <div className="mt-2 space-y-1">
          {LEVEL_OPTIONS.map((option) => (
            <label key={option.id} className={`flex items-start gap-3 rounded-lg px-2 py-1.5 cursor-pointer ${level === option.id ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}>
              <input
                type="radio"
                name={`notify-${channel.id}`}
                checked={level === option.id}
                onChange={() => actions.setNotifyLevel(channel.id, option.id).catch(reportError)}
                className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <span>
                <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{option.label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
        <label className="mt-2 flex items-center gap-3 px-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
          <input type="checkbox" checked={isMuted(channel.id, chat.userState)} onChange={() => actions.toggleMute(channel.id).catch(reportError)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
          Mute (hide from unread, dim in the sidebar)
        </label>
      </div>

      {isProject && (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] p-3.5">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Project updates</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Corechestra posts these events from the linked project into this channel.</p>
          <div className="mt-2 space-y-1.5">
            {BOT_CATEGORIES.map((category) => {
              const enabled = category.id === "verbose" ? channel.botEvents?.verbose === true : channel.botEvents?.[category.id] !== false;
              return (
                <label key={category.id} className="flex items-start gap-3 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!admin && !isChannelMember(channel, chat.uid)}
                    checked={enabled}
                    onChange={(event) => actions.updateChannel(channel.id, { botEvents: { ...(channel.botEvents || {}), [category.id]: event.target.checked } }).catch(reportError)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <span>
                    <span className="block font-medium text-slate-800 dark:text-slate-100">{category.label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{category.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {!isDm && admin && (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] p-3.5">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Message retention</p>
          <select
            value={Number(channel.retentionDays) || 0}
            onChange={(event) => actions.updateChannel(channel.id, { retentionDays: Number(event.target.value) }).catch(reportError)}
            className="mt-2 w-full rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
            aria-label="Channel retention"
          >
            <option value={0}>Workspace default ({RETENTION_OPTIONS.find((option) => option.days === workspaceDays)?.label || "Keep everything"})</option>
            {RETENTION_OPTIONS.filter((option) => option.days > 0).map((option) => <option key={option.days} value={option.days}>{option.label}</option>)}
          </select>
          <p className="mt-1 text-[11px] text-slate-400">Older messages are deleted permanently during the daily clean-up.</p>
        </div>
      )}

      {(admin || isDm) && (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] p-3.5">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Export history</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Every message and thread reply. Attachments are listed by name.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[["json", "JSON"], ["md", "Markdown"], ["csv", "CSV"]].map(([format, label]) => (
              <button
                key={format}
                type="button"
                disabled={Boolean(exporting)}
                onClick={() => exportAs(format)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50"
              >
                <FaDownload className="w-3 h-3" /> {exporting === format ? "Exporting…" : label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditableField({ label, value, placeholder, multiline = false, canEdit, onSave, validate, emptyText }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [error, setError] = useState(null);
  useEffect(() => { if (!editing) setDraft(value || ""); }, [editing, value]);

  const save = async () => {
    const problem = validate?.(draft);
    if (problem) { setError(problem); return; }
    setError(null);
    setEditing(false);
    if ((draft || "").trim() !== (value || "").trim()) await onSave(draft.trim());
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        {canEdit && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">
            <FaPen className="w-2.5 h-2.5" /> Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          {multiline ? (
            <textarea autoFocus rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} className={fieldClass} placeholder={placeholder} maxLength={500} />
          ) : (
            <input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") save(); if (event.key === "Escape") { event.stopPropagation(); setEditing(false); } }}
              className={fieldClass}
              placeholder={placeholder}
              maxLength={250}
            />
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="h-8 px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5">Cancel</button>
            <button type="button" onClick={save} className="h-8 px-3 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500">Save</button>
          </div>
        </div>
      ) : (
        <p className={`mt-1 text-sm whitespace-pre-wrap break-words ${value ? "text-slate-800 dark:text-slate-200" : "text-slate-400 italic"}`}>
          {value || emptyText}
        </p>
      )}
    </div>
  );
}

function AboutTab({ channel, chat, actions, pageApi, projects, reportError, addToast }) {
  const isDm = channel.type === CHANNEL_TYPES.DM;
  const admin = chat.isChannelAdmin(channel);
  const member = isChannelMember(channel, chat.uid);
  const muted = isMuted(channel.id, chat.userState);
  const creator = chat.usersById[channel.createdBy];
  const project = (projects || []).find((entry) => entry.id === channel.projectId);

  if (isDm) {
    const partners = getDmPartnerIds(channel, chat.uid);
    return (
      <div className="space-y-3 p-4">
        <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] divide-y divide-slate-100 dark:divide-[#2a3044]">
          {partners.map((id) => {
            const person = chat.usersById[id];
            return (
              <button key={id} type="button" onClick={() => pageApi.openProfile(id)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-white/5">
                <UserAvatar user={person} size="lg" showPresence presence={chat.presence[id]} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">{getUserDisplayName(person)}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{[person?.title, person?.email].filter(Boolean).join(" · ")}</span>
                </span>
              </button>
            );
          })}
        </div>
        <EditableField
          label="Topic"
          value={channel.topic}
          placeholder="What is this conversation about?"
          emptyText="No topic set"
          canEdit
          onSave={(topic) => actions.updateChannel(channel.id, { topic }, { type: "topic", topic }).catch(reportError)}
        />
        <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] divide-y divide-slate-100 dark:divide-[#2a3044]">
          <button type="button" onClick={() => actions.toggleMute(channel.id).catch(reportError)} className="w-full flex items-center gap-3 px-3.5 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5">
            {muted ? <FaBell className="w-3.5 h-3.5" /> : <FaBellSlash className="w-3.5 h-3.5" />}
            {muted ? "Unmute conversation" : "Mute conversation"}
          </button>
          <button type="button" onClick={() => pageApi.hideDm(channel)} className="w-full flex items-center gap-3 px-3.5 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5">
            <FaEyeSlash className="w-3.5 h-3.5" /> Close conversation
          </button>
        </div>
      </div>
    );
  }

  const otherChannels = chat.channels;

  return (
    <div className="space-y-3 p-4">
      <EditableField
        label="Channel name"
        value={channel.name}
        placeholder="e.g. release-planning"
        canEdit={admin && !channel.isDefault}
        validate={(name) => validateChannelName(name, otherChannels, channel.id)}
        onSave={(name) => actions.updateChannel(channel.id, { name }, { type: "renamed", name }).catch(reportError)}
      />
      <EditableField
        label="Topic"
        value={channel.topic}
        placeholder="Add a topic"
        emptyText="No topic set"
        canEdit={member && !channel.archived}
        onSave={(topic) => actions.updateChannel(channel.id, { topic }, { type: "topic", topic }).catch(reportError)}
      />
      <EditableField
        label="Description"
        value={channel.description}
        placeholder="What is this channel for?"
        emptyText="No description"
        multiline
        canEdit={(admin || (channel.isDefault && chat.permissions.isWorkspaceAdmin)) && !channel.archived}
        onSave={(description) => actions.updateChannel(channel.id, { description }, { type: "description" }).catch(reportError)}
      />

      <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] p-3.5 space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500 dark:text-slate-400">Visibility</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
            {channel.isPrivate ? <><FaLock className="w-3 h-3" /> Private</> : <><FaHashtag className="w-3 h-3" /> Public</>}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500 dark:text-slate-400">Created</span>
          <span className="text-right text-slate-800 dark:text-slate-200">
            {creator ? `${getUserDisplayName(creator)}, ` : ""}{formatListTime(channel.createdAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400"><FaLayerGroup className="w-3 h-3" /> Project</span>
          {admin && !channel.isDefault ? (
            <select
              value={channel.projectId || ""}
              onChange={(event) => actions.updateChannel(channel.id, { projectId: event.target.value || null }).catch(reportError)}
              className="max-w-[60%] rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] px-2 py-1 text-sm text-slate-800 dark:text-slate-200"
            >
              <option value="">None</option>
              {(projects || []).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
            </select>
          ) : (
            <span className="text-slate-800 dark:text-slate-200">{project?.name || "—"}</span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] divide-y divide-slate-100 dark:divide-[#2a3044] overflow-hidden">
        {member && (
          <button type="button" onClick={() => actions.toggleMute(channel.id).catch(reportError)} className="w-full flex items-center gap-3 px-3.5 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5">
            {muted ? <FaBell className="w-3.5 h-3.5" /> : <FaBellSlash className="w-3.5 h-3.5" />}
            {muted ? "Unmute channel" : "Mute channel"}
            <span className="ml-auto text-xs text-slate-400">{muted ? "Only @mentions notify you" : ""}</span>
          </button>
        )}
        {admin && !channel.isDefault && (
          <button
            type="button"
            onClick={() => pageApi.requestConfirm({
              title: channel.isPrivate ? `Make #${channel.name} public?` : `Make #${channel.name} private?`,
              message: channel.isPrivate
                ? "Anyone in the workspace will be able to find, read and join this channel."
                : "Only current members will be able to see this channel and its history.",
              confirmLabel: channel.isPrivate ? "Make public" : "Make private",
              tone: "warning",
              onConfirm: () => actions.updateChannel(channel.id, { isPrivate: !channel.isPrivate }, { type: "private", isPrivate: !channel.isPrivate }).catch(reportError),
            })}
            className="w-full flex items-center gap-3 px-3.5 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
          >
            {channel.isPrivate ? <FaHashtag className="w-3.5 h-3.5" /> : <FaLock className="w-3.5 h-3.5" />}
            {channel.isPrivate ? "Change to a public channel" : "Change to a private channel"}
          </button>
        )}
        {member && !channel.isDefault && (
          <button type="button" onClick={() => pageApi.leaveChannel(channel)} className="w-full flex items-center gap-3 px-3.5 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10">
            <FaSignOutAlt className="w-3.5 h-3.5" /> Leave channel
          </button>
        )}
        {admin && !channel.isDefault && (
          <button
            type="button"
            onClick={() => {
              const archived = !channel.archived;
              actions.updateChannel(channel.id, { archived }, { type: archived ? "archived" : "unarchived" })
                .then(() => addToast(archived ? `#${channel.name} archived` : `#${channel.name} unarchived`, "info"))
                .catch(reportError);
            }}
            className="w-full flex items-center gap-3 px-3.5 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
          >
            {channel.archived ? <FaUndo className="w-3.5 h-3.5" /> : <FaArchive className="w-3.5 h-3.5" />}
            {channel.archived ? "Unarchive channel" : "Archive channel"}
          </button>
        )}
        {admin && !channel.isDefault && (
          <button
            type="button"
            onClick={() => pageApi.requestConfirm({
              title: `Delete #${channel.name}?`,
              message: "All messages, threads and files in this channel are permanently deleted for everyone. Consider archiving instead.",
              confirmLabel: "Delete channel",
              onConfirm: () => pageApi.deleteChannel(channel),
            })}
            className="w-full flex items-center gap-3 px-3.5 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            <FaTrash className="w-3.5 h-3.5" /> Delete channel
          </button>
        )}
      </div>
    </div>
  );
}

function MembersTab({ channel, chat, actions, pageApi, reportError }) {
  const [query, setQuery] = useState("");
  const admin = chat.isChannelAdmin(channel);
  const isDm = channel.type === CHANNEL_TYPES.DM;
  const ids = channel.isDefault ? chat.activeUsers.map((user) => user.id) : channel.memberIds;
  const members = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ids
      .map((id) => chat.usersById[id] || { id, name: "Unknown user" })
      .filter((person) => !needle || getUserDisplayName(person).toLowerCase().includes(needle) || String(person.email || "").toLowerCase().includes(needle))
      .sort((a, b) => {
        const order = { active: 0, away: 1, dnd: 1, offline: 2 };
        return (order[getPresenceState(chat.presence[a.id])] - order[getPresenceState(chat.presence[b.id])])
          || getUserDisplayName(a).localeCompare(getUserDisplayName(b));
      });
  }, [chat.presence, chat.usersById, ids, query]);

  return (
    <div className="p-4 space-y-3">
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find members" className={`${fieldClass} pl-8`} />
      </div>
      {!isDm && !channel.isDefault && isChannelMember(channel, chat.uid) && !channel.archived && (
        <button type="button" onClick={() => pageApi.openAddPeople(channel)} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10">
          <span className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-500/15 flex items-center justify-center"><FaUserPlus className="w-3.5 h-3.5" /></span>
          Add people
        </button>
      )}
      <ul className="space-y-0.5">
        {members.map((person) => {
          const state = getPresenceState(chat.presence[person.id]);
          const isAdmin = channel.createdBy === person.id || (channel.adminIds || []).includes(person.id);
          const canRemove = admin && !isDm && !channel.isDefault && person.id !== chat.uid;
          return (
            <li key={person.id} className="group flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5">
              <button type="button" onClick={() => pageApi.openProfile(person.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <UserAvatar user={person} size="md" showPresence presence={chat.presence[person.id]} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-white">
                    <span className="truncate">{getUserDisplayName(person)}{person.id === chat.uid ? " (you)" : ""}</span>
                    {isAdmin && !channel.isDefault && !isDm && <FaShieldAlt className="w-2.5 h-2.5 text-blue-500 flex-shrink-0" title="Channel manager" />}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{person.title || PRESENCE_LABELS[state]}</span>
                </span>
              </button>
              {canRemove && (
                <button
                  type="button"
                  title="Remove from channel"
                  onClick={() => pageApi.requestConfirm({
                    title: `Remove ${getUserDisplayName(person)}?`,
                    message: channel.isPrivate ? "They will lose access to this private channel and its history." : "They can rejoin this public channel at any time.",
                    confirmLabel: "Remove",
                    onConfirm: () => actions.removeMember(channel.id, person.id).catch(reportError),
                  })}
                  className="hidden group-hover:inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  <FaUserMinus className="w-3 h-3" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PinnedTab({ channel, chat, actions, pageApi, reportError }) {
  const pinned = usePinnedMessages(channel.id);
  if (!pinned.length) {
    return (
      <div className="p-8 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-500"><FaThumbtack className="w-5 h-5" /></span>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">No pinned messages yet</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pin important messages from the message menu so everyone can find them here.</p>
      </div>
    );
  }
  return (
    <ul className="p-3 space-y-2">
      {pinned.map((message) => (
        <li key={message.id} className="group rounded-xl border border-slate-200 dark:border-[#2a3044] p-3 hover:border-blue-300 dark:hover:border-blue-500/40">
          <div className="flex items-center gap-2">
            <UserAvatar user={chat.usersById[message.authorId]} size="xs" />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{getUserDisplayName(chat.usersById[message.authorId])}</span>
            <span className="text-xs text-slate-400" title={formatFullTimestamp(message.createdAt)}>{formatListTime(message.createdAt)}</span>
            <button type="button" onClick={() => actions.togglePin(message).catch(reportError)} className="ml-auto hidden group-hover:inline text-xs text-slate-400 hover:text-red-500">Unpin</button>
          </div>
          <button type="button" onClick={() => pageApi.jumpToMessage(channel.id, message.id)} className="mt-1 block w-full text-left text-sm text-slate-700 dark:text-slate-300 line-clamp-3">
            {buildPreview(message.text, message.attachments, { usersById: chat.usersById, channelsById: chat.channelsById }) || "Message"}
          </button>
        </li>
      ))}
    </ul>
  );
}

function FilesTab({ channel, chat, pageApi }) {
  const [state, setState] = useState({ loading: true, files: [] });
  useEffect(() => {
    let cancelled = false;
    chat.backend.fetchRecentMessages(channel.id, 200)
      .then((messages) => {
        if (cancelled) return;
        const files = messages
          .filter((message) => !message.deleted)
          .flatMap((message) => (message.attachments || []).map((file) => ({ ...file, message })));
        setState({ loading: false, files });
      })
      .catch(() => { if (!cancelled) setState({ loading: false, files: [] }); });
    return () => { cancelled = true; };
  }, [channel.id, chat.backend]);

  if (state.loading) return <p className="p-6 text-sm text-slate-400 text-center">Loading files…</p>;
  if (!state.files.length) {
    return (
      <div className="p-8 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-500"><FaFileAlt className="w-5 h-5" /></span>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">No files shared yet</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Drag files into the conversation or use the paperclip in the composer.</p>
      </div>
    );
  }
  const images = state.files.filter(isImageAttachment);
  const docs = state.files.filter((file) => !isImageAttachment(file));
  return (
    <div className="p-4 space-y-4">
      {images.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Images</p>
          <div className="grid grid-cols-3 gap-1.5">
            {images.map((file) => (
              <button key={file.id} type="button" onClick={() => pageApi.openImage(file, images)} className="aspect-square overflow-hidden rounded-lg border border-slate-200 dark:border-[#2a3044]">
                <img src={file.url || file.dataUrl} alt={file.name} loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
      {docs.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Files</p>
          <ul className="space-y-1.5">
            {docs.map((file) => (
              <li key={file.id} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-[#2a3044] px-3 py-2">
                <FaFileAlt className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <a href={file.dataUrl} download={file.name} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100 hover:underline">{file.name}</span>
                  <span className="block text-xs text-slate-400">{formatBytes(file.size || 0)} · {getUserDisplayName(chat.usersById[file.message.authorId])} · {formatListTime(file.message.createdAt)}</span>
                </a>
                <button type="button" onClick={() => pageApi.jumpToMessage(channel.id, file.message.id)} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline">View</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ChannelDetailsPanel({ channel, tab = "about", onTabChange, onClose, pageApi, projects }) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const reportError = (error) => addToast(error?.message || "Something went wrong.", "error");
  const isDm = channel.type === CHANNEL_TYPES.DM;
  const props = { channel, chat, actions, pageApi, projects, reportError, addToast };

  return (
    <PanelShell
      title={isDm ? "Conversation details" : `#${channel.name}`}
      subtitle={isDm ? chat.getChannelName(channel) : channel.isPrivate ? "Private channel" : "Public channel"}
      onClose={onClose}
    >
      <div className="flex-shrink-0 flex gap-1 border-b border-slate-200 dark:border-[#2a3044] px-3">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onTabChange(entry.id)}
            className={`relative px-2.5 py-2.5 text-sm font-medium transition-colors ${
              tab === entry.id ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {entry.label}
            {tab === entry.id && <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" />}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === "about" && <AboutTab {...props} />}
        {tab === "members" && <MembersTab {...props} />}
        {tab === "pinned" && <PinnedTab {...props} />}
        {tab === "files" && <FilesTab {...props} />}
        {tab === "settings" && <SettingsTab {...props} />}
      </div>
    </PanelShell>
  );
}
