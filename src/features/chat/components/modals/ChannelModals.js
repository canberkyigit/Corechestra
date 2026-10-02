import React, { useMemo, useState } from "react";
import { FaHashtag, FaLock, FaSearch, FaArchive, FaCheck, FaPlus } from "react-icons/fa";
import { useChat, useChatActions } from "../../../../shared/context/ChatContext";
import { useToast } from "../../../../shared/context/ToastContext";
import {
  CHANNEL_TYPES, buildDmChannelId, getUserDisplayName, isChannelMember, slugifyChannelName, validateChannelName,
} from "../../../../shared/services/chat/chatModel";
import { ChatButton, ChatModal, FieldLabel, fieldClass } from "../common/ChatModal";
import UserAvatar from "../common/UserAvatar";
import PeoplePicker from "./PeoplePicker";

export function CreateChannelModal({ onClose, onCreated, projects = [], defaultProjectId = null }) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [projectId, setProjectId] = useState(defaultProjectId || "");
  const [memberIds, setMemberIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const error = validateChannelName(name, chat.channels);
  const slug = slugifyChannelName(name);

  const create = async () => {
    setBusy(true);
    try {
      const id = await actions.createChannel({ name, description, isPrivate, memberIds, projectId: projectId || null });
      addToast(`#${slug} created`, "success");
      onCreated(id);
    } catch (err) {
      addToast(err?.message || "The channel could not be created.", "error");
      setBusy(false);
    }
  };

  if (step === 2) {
    return (
      <ChatModal
        title={`Add people to #${slug}`}
        subtitle={isPrivate ? "Only the people you add can see this private channel." : "Anyone can join a public channel later, too."}
        onClose={onClose}
        footer={(
          <>
            <ChatButton variant="ghost" onClick={() => setStep(1)}>Back</ChatButton>
            <ChatButton variant="secondary" disabled={busy} onClick={() => { setMemberIds([]); create(); }}>Skip for now</ChatButton>
            <ChatButton disabled={busy} onClick={create} data-testid="chat-create-channel-submit">{busy ? "Creating…" : "Create channel"}</ChatButton>
          </>
        )}
      >
        <PeoplePicker
          autoFocus
          users={chat.activeUsers}
          selectedIds={memberIds}
          onChange={setMemberIds}
          excludeIds={[chat.uid]}
          presence={chat.presence}
        />
      </ChatModal>
    );
  }

  return (
    <ChatModal
      title="Create a channel"
      subtitle="Channels are where your team talks about a topic, a project or a team."
      onClose={onClose}
      footer={(
        <>
          <ChatButton variant="secondary" onClick={onClose}>Cancel</ChatButton>
          <ChatButton disabled={Boolean(error)} onClick={() => { setTouched(true); if (!error) setStep(2); }} data-testid="chat-create-channel-next">Next</ChatButton>
        </>
      )}
    >
      <div className="space-y-4">
        <div>
          <FieldLabel htmlFor="chat-channel-name">Name</FieldLabel>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{isPrivate ? <FaLock className="w-3 h-3" /> : <FaHashtag className="w-3 h-3" />}</span>
            <input
              id="chat-channel-name"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => setTouched(true)}
              onKeyDown={(event) => { if (event.key === "Enter" && !error) setStep(2); }}
              placeholder="e.g. release-planning"
              className={`${fieldClass} pl-8`}
              data-testid="chat-channel-name"
            />
          </div>
          {touched && error && name ? <p className="mt-1 text-xs text-red-500">{error}</p> : slug && slug !== name.trim() && (
            <p className="mt-1 text-xs text-slate-400">Will be created as <b>#{slug}</b></p>
          )}
        </div>
        <div>
          <FieldLabel htmlFor="chat-channel-description" hint="(optional)">Description</FieldLabel>
          <textarea
            id="chat-channel-description"
            rows={2}
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What's this channel about?"
            className={fieldClass}
          />
        </div>
        {projects.length > 0 && (
          <div>
            <FieldLabel htmlFor="chat-channel-project" hint="(optional)">Linked project</FieldLabel>
            <select id="chat-channel-project" value={projectId} onChange={(event) => setProjectId(event.target.value)} className={fieldClass}>
              <option value="">No project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { value: false, icon: FaHashtag, title: "Public", text: "Anyone in the workspace can find and join" },
            { value: true, icon: FaLock, title: "Private", text: "Only invited people can see it" },
          ].map((option) => (
            <button
              key={option.title}
              type="button"
              onClick={() => setIsPrivate(option.value)}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                isPrivate === option.value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                  : "border-slate-200 dark:border-[#2a3044] hover:border-slate-300 dark:hover:border-slate-500"
              }`}
            >
              <option.icon className={`mt-0.5 w-3.5 h-3.5 ${isPrivate === option.value ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`} />
              <span>
                <span className="block text-sm font-semibold text-slate-900 dark:text-white">{option.title}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{option.text}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </ChatModal>
  );
}

export function NewMessageModal({ onClose, onOpened, initialIds = [] }) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const [ids, setIds] = useState(initialIds);
  const [busy, setBusy] = useState(false);
  const existing = ids.length ? chat.channelsById[buildDmChannelId([chat.uid, ...ids])] : null;

  const open = async (targetIds = ids) => {
    if (!targetIds.length) return;
    setBusy(true);
    try {
      const id = await actions.openDirectMessage(targetIds);
      onOpened(id);
    } catch (err) {
      addToast(err?.message || "The conversation could not be opened.", "error");
      setBusy(false);
    }
  };

  const recent = useMemo(() => chat.channels
    .filter((channel) => channel.type === CHANNEL_TYPES.DM)
    .sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0))
    .slice(0, 5), [chat.channels]);

  return (
    <ChatModal
      title="New message"
      subtitle="Start a direct message with one person or a group (up to 8 people)."
      onClose={onClose}
      footer={(
        <>
          <ChatButton variant="secondary" onClick={onClose}>Cancel</ChatButton>
          <ChatButton disabled={!ids.length || busy || ids.length > 8} onClick={() => open()} data-testid="chat-open-dm">
            {existing ? "Open conversation" : ids.length > 1 ? "Start group conversation" : "Start conversation"}
          </ChatButton>
        </>
      )}
    >
      <PeoplePicker
        autoFocus
        users={chat.activeUsers.filter((user) => user.id !== chat.uid)}
        selectedIds={ids}
        onChange={setIds}
        presence={chat.presence}
      />
      {ids.length === 0 && recent.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent conversations</p>
          <ul className="space-y-0.5">
            {recent.map((channel) => (
              <li key={channel.id}>
                <button type="button" onClick={() => onOpened(channel.id)} className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-white/5">
                  <span className="flex -space-x-1.5">
                    {channel.memberIds.filter((id) => id !== chat.uid).slice(0, 3).map((id) => (
                      <UserAvatar key={id} user={chat.usersById[id]} size="sm" className="ring-2 ring-white dark:ring-[#1c2030]" />
                    ))}
                  </span>
                  <span className="text-sm text-slate-800 dark:text-slate-200 truncate">{chat.getChannelName(channel)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={() => open([chat.uid])}
        className="mt-3 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
      >
        Message yourself (notes to self)
      </button>
    </ChatModal>
  );
}

const BROWSE_FILTERS = [
  { id: "all", label: "All channels" },
  { id: "joined", label: "My channels" },
  { id: "other", label: "Not joined" },
  { id: "archived", label: "Archived" },
];

export function BrowseChannelsModal({ onClose, onOpen, onCreate }) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return chat.channels
      .filter((channel) => channel.type !== CHANNEL_TYPES.DM)
      .filter((channel) => (filter === "archived" ? channel.archived : !channel.archived))
      .filter((channel) => {
        if (filter === "joined") return isChannelMember(channel, chat.uid);
        if (filter === "other") return !isChannelMember(channel, chat.uid);
        return true;
      })
      .filter((channel) => !needle || channel.name.includes(needle) || channel.description.toLowerCase().includes(needle))
      .sort((a, b) => (b.isDefault - a.isDefault) || a.name.localeCompare(b.name));
  }, [chat.channels, chat.uid, filter, query]);

  const join = async (channel) => {
    setBusyId(channel.id);
    try {
      await actions.joinChannel(channel.id);
      addToast(`Joined #${channel.name}`, "success");
    } catch (err) {
      addToast(err?.message || "Could not join the channel.", "error");
    }
    setBusyId(null);
  };

  return (
    <ChatModal
      title="Browse channels"
      onClose={onClose}
      width="max-w-2xl"
      footer={chat.permissions.canManageChannels ? <ChatButton onClick={onCreate}><FaPlus className="w-3 h-3" /> Create channel</ChatButton> : null}
    >
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by channel name or description" className={`${fieldClass} pl-8`} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {BROWSE_FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setFilter(entry.id)}
            className={`h-7 rounded-full px-3 text-xs font-semibold ${filter === entry.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-[#232838] dark:text-slate-300 dark:hover:bg-[#2a3044]"}`}
          >
            {entry.label}
          </button>
        ))}
      </div>
      <ul className="mt-3 max-h-[50vh] overflow-y-auto divide-y divide-slate-100 dark:divide-[#232838] rounded-xl border border-slate-200 dark:border-[#2a3044]">
        {list.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-400">No channels found.</li>}
        {list.map((channel) => {
          const member = isChannelMember(channel, chat.uid);
          const count = channel.isDefault ? chat.activeUsers.length : channel.memberIds.length;
          return (
            <li key={channel.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03]">
              <button type="button" onClick={() => onOpen(channel.id)} className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                  {channel.isPrivate ? <FaLock className="w-3 h-3 text-slate-400" /> : <FaHashtag className="w-3 h-3 text-slate-400" />}
                  {channel.name}
                  {channel.archived && <FaArchive className="w-3 h-3 text-slate-400" />}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400 truncate">
                  {member && <span className="font-semibold text-emerald-600 dark:text-emerald-400"><FaCheck className="inline w-2.5 h-2.5 -mt-0.5" /> Joined · </span>}
                  {count} {count === 1 ? "member" : "members"}{channel.description ? ` · ${channel.description}` : ""}
                </span>
              </button>
              {!member && !channel.archived ? (
                <ChatButton size="sm" disabled={busyId === channel.id} onClick={() => join(channel)}>Join</ChatButton>
              ) : (
                <ChatButton size="sm" variant="secondary" onClick={() => onOpen(channel.id)}>Open</ChatButton>
              )}
            </li>
          );
        })}
      </ul>
    </ChatModal>
  );
}

export function AddPeopleModal({ channel, onClose }) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const [ids, setIds] = useState([]);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    try {
      await actions.addMembers(channel.id, ids);
      addToast(`Added ${ids.length === 1 ? getUserDisplayName(chat.usersById[ids[0]]) : `${ids.length} people`} to #${channel.name}`, "success");
      onClose();
    } catch (err) {
      addToast(err?.message || "Could not add people.", "error");
      setBusy(false);
    }
  };

  return (
    <ChatModal
      title={`Add people to #${channel.name}`}
      onClose={onClose}
      footer={(
        <>
          <ChatButton variant="secondary" onClick={onClose}>Cancel</ChatButton>
          <ChatButton disabled={!ids.length || busy} onClick={add}>Add</ChatButton>
        </>
      )}
    >
      <PeoplePicker
        autoFocus
        users={chat.activeUsers}
        selectedIds={ids}
        onChange={setIds}
        excludeIds={channel.memberIds}
        presence={chat.presence}
      />
    </ChatModal>
  );
}
