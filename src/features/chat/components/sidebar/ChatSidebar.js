import React, { useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  FaBookmark, FaCaretDown, FaCaretRight, FaCheckDouble, FaCog, FaEdit, FaEllipsisH, FaHashtag, FaInbox, FaLock,
  FaPen, FaPlus, FaRegStar, FaSearch, FaStar, FaBellSlash, FaBell, FaSignOutAlt, FaEyeSlash, FaCompass, FaEnvelopeOpenText,
  FaFolderPlus, FaLayerGroup, FaHeadphones, FaTrash, FaArrowUp, FaArrowDown, FaFolder, FaSlidersH,
} from "react-icons/fa";
import { useChat, useChatActions } from "../../../../shared/context/ChatContext";
import { useToast } from "../../../../shared/context/ToastContext";
import {
  CHANNEL_KINDS, CHANNEL_TYPES, getActiveCustomStatus, getDmPartnerIds, getNotifyLevel, getUserDisplayName, isHuddleLive, isMuted,
  isStarred, NOTIFY_LEVELS,
} from "../../../../shared/services/chat/chatModel";
import { useHuddle } from "../../huddle/HuddleContext";
import UserAvatar from "../common/UserAvatar";
import { MenuPopover } from "../common/Popovers";
import { useStoredValue } from "../../hooks/useChatUi";
import {
  addSidebarSection, buildSidebarSections, getSidebarConfig, moveSidebarSection, placeInSection, planSidebarMove,
  removeSidebarSection, renameSidebarSection,
} from "../../utils/chatSections";

function CountBadge({ count, tone = "red" }) {
  if (!count) return null;
  return (
    <span className={`min-w-[18px] h-[18px] px-1.5 rounded-full text-[10.5px] font-bold leading-[18px] text-center tabular-nums ${tone === "red" ? "bg-red-500 text-white" : "bg-slate-200 text-slate-700 dark:bg-[#2a3044] dark:text-slate-200"}`}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

function NavRow({ icon: Icon, label, active, badge, onClick, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
        active ? "bg-blue-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
      }`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
      <span className="flex-1 truncate text-left font-medium">{label}</span>
      {badge}
    </button>
  );
}

function SectionHeader({ section, collapsed, onToggle, actions, renaming, onRename, onCancelRename, count }) {
  const [draft, setDraft] = useState(section.name);
  return (
    <div className="group flex items-center gap-1 px-1 pt-3 pb-1">
      {renaming ? (
        <input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => onRename(draft)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onRename(draft);
            if (event.key === "Escape") { event.stopPropagation(); onCancelRename(); }
          }}
          maxLength={40}
          className="flex-1 rounded-md border border-blue-400 bg-white dark:bg-[#232838] px-1.5 py-0.5 text-[12px] font-semibold text-slate-800 dark:text-slate-100 focus:outline-none"
          aria-label="Section name"
        />
      ) : (
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
          {collapsed ? <FaCaretRight className="w-3 h-3 flex-shrink-0" /> : <FaCaretDown className="w-3 h-3 flex-shrink-0" />}
          {section.custom && <FaFolder className="w-2.5 h-2.5 flex-shrink-0 opacity-70" />}
          <span className="truncate">{section.name}</span>
          {collapsed && count > 0 && <span className="ml-1 text-[10.5px] font-normal text-slate-400">{count}</span>}
        </button>
      )}
      {actions}
    </div>
  );
}

function ConversationRow({ channel, active, chat, unreadInfo, hasDraft, live, onSelect, menuItems, dragHandleProps, dragging }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isDm = channel.type === CHANNEL_TYPES.DM;
  const partners = isDm ? getDmPartnerIds(channel, chat.uid) : [];
  const partner = isDm && partners.length === 1 ? chat.usersById[partners[0]] : null;
  const status = partner ? getActiveCustomStatus(chat.presence[partner.id]) : null;
  const unread = unreadInfo?.unread || 0;
  const mentions = unreadInfo?.mentions || 0;
  const muted = unreadInfo?.muted;
  const bold = unread > 0 && !muted;
  const label = isDm ? chat.getChannelName(channel) : channel.name;

  return (
    <div className={`group relative ${dragging ? "rounded-lg shadow-lg ring-1 ring-blue-400 bg-white dark:bg-[#232838]" : ""}`} {...dragHandleProps}>
      <button
        type="button"
        onClick={() => onSelect(channel.id)}
        data-testid={`chat-row-${channel.id}`}
        title={label}
        className={`w-full flex items-center gap-2 rounded-lg pl-2.5 pr-8 py-[5px] text-sm transition-colors ${
          active
            ? "bg-blue-600 text-white"
            : `${bold ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"} hover:bg-slate-100 dark:hover:bg-white/5`
        } ${muted && !active ? "opacity-60" : ""}`}
      >
        {isDm ? (
          partner ? (
            <UserAvatar user={partner} size="xs" showPresence presence={chat.presence[partner.id]} />
          ) : (
            <span className="relative inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-slate-200 dark:bg-[#2a3044] text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {partners.length}
            </span>
          )
        ) : channel.kind === CHANNEL_KINDS.PROJECT ? (
          <FaLayerGroup className="w-3 h-3 flex-shrink-0 opacity-70" />
        ) : channel.isPrivate ? (
          <FaLock className="w-3 h-3 flex-shrink-0 opacity-70" />
        ) : (
          <FaHashtag className="w-3 h-3 flex-shrink-0 opacity-70" />
        )}
        <span className={`flex-1 truncate text-left ${bold ? "font-bold" : "font-medium"}`}>{label}</span>
        {live && <FaHeadphones className={`w-3 h-3 flex-shrink-0 ${active ? "text-white" : "text-emerald-500"}`} title="Huddle in progress" />}
        {status?.emoji && <span className="text-xs" title={status.text}>{status.emoji}</span>}
        {hasDraft && !active && <FaPen className="w-2.5 h-2.5 flex-shrink-0 opacity-60" title="Draft" />}
        {muted && <FaBellSlash className="w-2.5 h-2.5 flex-shrink-0 opacity-60" />}
        {mentions > 0 ? <CountBadge count={mentions} /> : isDm && unread > 0 && !muted ? <CountBadge count={unread} /> : null}
      </button>
      <button
        type="button"
        aria-label={`Options for ${label}`}
        onClick={(event) => { event.stopPropagation(); setMenuOpen((value) => !value); }}
        className={`absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 items-center justify-center rounded-md ${menuOpen ? "flex" : "hidden group-hover:flex"} ${active ? "text-white/80 hover:bg-white/15" : "text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"}`}
      >
        <FaEllipsisH className="w-3 h-3" />
      </button>
      {menuOpen && <MenuPopover items={menuItems} width="w-60" onClose={() => setMenuOpen(false)} />}
    </div>
  );
}

export default function ChatSidebar({
  activeView,
  draftIds,
  onSelectChannel,
  onOpenActivity,
  onOpenUnreads,
  onOpenLater,
  onNewMessage,
  onCreateChannel,
  onBrowseChannels,
  onSetStatus,
  onOpenPreferences,
  onOpenWorkspaceSettings,
  onLeaveChannel,
  onHideDm,
}) {
  const chat = useChat();
  const actions = useChatActions();
  const { addToast } = useToast();
  const huddle = useHuddle();
  const { uid, channels, userState, unread, usersById, presence, permissions } = chat;
  const [filter, setFilter] = useState("");
  const [collapsed, setCollapsed] = useStoredValue(uid, "sidebar_sections", {});
  const [menuOpen, setMenuOpen] = useState(false);
  const [channelMenuOpen, setChannelMenuOpen] = useState(false);
  const [sectionMenu, setSectionMenu] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const me = usersById[uid];
  const myStatus = getActiveCustomStatus(presence[uid]);
  const huddles = huddle?.huddles || {};

  const sections = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return buildSidebarSections({
      channels,
      uid,
      userState,
      getName: chat.getChannelName,
      isVisible: (channel) => {
        if (channel.archived) return false;
        if (needle && !chat.getChannelName(channel).toLowerCase().includes(needle)) return false;
        if (channel.type === CHANNEL_TYPES.DM && userState?.hiddenDms?.[channel.id]) {
          return (unread.perChannel[channel.id]?.unread || 0) > 0 || activeView.channelId === channel.id;
        }
        return true;
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView.channelId, channels, filter, uid, unread.perChannel, userState, usersById]);

  const config = getSidebarConfig(userState);
  const toggleSection = (id) => setCollapsed((prev) => ({ ...prev, [id]: !prev?.[id] }));

  const saveSidebar = (next, message) => actions.updateSidebar(next)
    .then(() => { if (message) addToast(message, "info"); })
    .catch((error) => addToast(error?.message || "Could not update the sidebar.", "error"));

  const createSection = (channelId = null) => {
    // eslint-disable-next-line no-alert
    const name = window.prompt("Section name", "");
    const result = addSidebarSection(userState, name);
    if (!result) return;
    const next = channelId ? { ...result.sidebar, placement: { ...result.sidebar.placement, [channelId]: result.section.id } } : result.sidebar;
    saveSidebar(next, `Section “${result.section.name}” created`);
  };

  const onDragEnd = ({ draggableId, source, destination }) => {
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const plan = planSidebarMove({
      sections,
      channelId: draggableId,
      fromSectionId: source.droppableId,
      toSectionId: destination.droppableId,
      toIndex: destination.index,
      userState,
    });
    if (!plan) {
      addToast("Conversations can only move into Starred, custom sections or their own section.", "warning");
      return;
    }
    saveSidebar(plan.sidebar);
    if (plan.starred !== undefined && plan.starred !== isStarred(draggableId, userState)) actions.toggleStar(draggableId);
  };

  const rowMenu = (channel) => {
    const isDm = channel.type === CHANNEL_TYPES.DM;
    const muted = isMuted(channel.id, userState);
    const star = isStarred(channel.id, userState);
    const level = getNotifyLevel(channel, userState);
    const placedIn = config.placement[channel.id];
    return [
      { id: "read", label: "Mark as read", icon: FaCheckDouble, onClick: () => actions.markChannelRead(channel.id) },
      { id: "star", label: star ? "Unstar" : "Star", icon: star ? FaStar : FaRegStar, onClick: () => actions.toggleStar(channel.id) },
      { id: "mute", label: muted ? "Unmute" : "Mute", icon: muted ? FaBell : FaBellSlash, onClick: () => actions.toggleMute(channel.id) },
      { header: "Notify me about" },
      ...[
        [NOTIFY_LEVELS.ALL, "All new messages"],
        [NOTIFY_LEVELS.MENTIONS, "Mentions & keywords"],
        [NOTIFY_LEVELS.NOTHING, "Nothing"],
      ].map(([value, label]) => ({ id: `level-${value}`, label, checked: level === value, onClick: () => actions.setNotifyLevel(channel.id, value) })),
      { header: "Move to section" },
      ...config.sections.map((section) => ({
        id: `move-${section.id}`,
        label: section.name,
        icon: FaFolder,
        checked: placedIn === section.id,
        onClick: () => saveSidebar(placeInSection(userState, channel.id, placedIn === section.id ? null : section.id)),
      })),
      placedIn && { id: "move-default", label: "Back to default section", onClick: () => saveSidebar(placeInSection(userState, channel.id, null)) },
      { id: "move-new", label: "New section…", icon: FaFolderPlus, onClick: () => createSection(channel.id) },
      { divider: true },
      isDm
        ? { id: "hide", label: "Close conversation", icon: FaEyeSlash, onClick: () => onHideDm(channel) }
        : !channel.isDefault && { id: "leave", label: "Leave channel", icon: FaSignOutAlt, danger: true, onClick: () => onLeaveChannel(channel) },
    ].filter(Boolean);
  };

  const sectionMenuItems = (section) => [
    { id: "rename", label: "Rename section", icon: FaPen, onClick: () => setRenaming(section.id) },
    { id: "up", label: "Move up", icon: FaArrowUp, onClick: () => { const next = moveSidebarSection(userState, section.id, -1); if (next) saveSidebar(next); } },
    { id: "down", label: "Move down", icon: FaArrowDown, onClick: () => { const next = moveSidebarSection(userState, section.id, 1); if (next) saveSidebar(next); } },
    { divider: true },
    { id: "delete", label: "Delete section", icon: FaTrash, danger: true, onClick: () => saveSidebar(removeSidebarSection(userState, section.id), "Section removed — its conversations moved back") },
  ];

  const later = chat.later || {};
  const savedCount = Object.keys(userState?.saved || {}).length;
  const unreadConversations = Object.values(unread.perChannel || {}).filter((info) => info.unread > 0 && !info.muted).length;

  const renderSection = (section) => {
    if (!section.custom && !section.items.length && section.id !== "channels" && section.id !== "dms") return null;
    const isCollapsed = Boolean(collapsed?.[section.id]);
    const sectionActions = section.id === "channels" ? (
      <div className="relative">
        <button
          type="button"
          aria-label="Add channels"
          onClick={() => setChannelMenuOpen((value) => !value)}
          className="h-6 w-6 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
        >
          <FaPlus className="w-2.5 h-2.5" />
        </button>
        {channelMenuOpen && (
          <MenuPopover
            onClose={() => setChannelMenuOpen(false)}
            items={[
              permissions.canManageChannels && { id: "create", label: "Create a channel", icon: FaPlus, onClick: onCreateChannel },
              { id: "browse", label: "Browse channels", icon: FaCompass, onClick: onBrowseChannels },
              { id: "section", label: "New section…", icon: FaFolderPlus, onClick: () => createSection() },
            ].filter(Boolean)}
          />
        )}
      </div>
    ) : section.id === "dms" ? (
      <button type="button" aria-label="New direct message" onClick={onNewMessage} className="h-6 w-6 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200">
        <FaPlus className="w-2.5 h-2.5" />
      </button>
    ) : section.custom ? (
      <div className="relative">
        <button type="button" aria-label={`Options for ${section.name}`} onClick={() => setSectionMenu((value) => (value === section.id ? null : section.id))} className="h-6 w-6 inline-flex items-center justify-center rounded-md text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200">
          <FaEllipsisH className="w-2.5 h-2.5" />
        </button>
        {sectionMenu === section.id && <MenuPopover items={sectionMenuItems(section)} onClose={() => setSectionMenu(null)} />}
      </div>
    ) : null;

    return (
      <div key={section.id} data-testid={`chat-section-${section.id}`}>
        <SectionHeader
          section={section}
          collapsed={isCollapsed}
          count={section.items.length}
          onToggle={() => toggleSection(section.id)}
          actions={sectionActions}
          renaming={renaming === section.id}
          onCancelRename={() => setRenaming(null)}
          onRename={(name) => {
            setRenaming(null);
            const next = renameSidebarSection(userState, section.id, name);
            if (next) saveSidebar(next);
          }}
        />
        <Droppable droppableId={section.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-px rounded-lg ${snapshot.isDraggingOver ? "bg-blue-50/70 dark:bg-blue-500/10" : ""} ${isCollapsed ? "min-h-[4px]" : section.items.length ? "" : "min-h-[28px]"}`}
            >
              {!isCollapsed && section.items.map((channel, index) => (
                <Draggable key={channel.id} draggableId={channel.id} index={index}>
                  {(dragProvided, dragSnapshot) => (
                    <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}>
                      <ConversationRow
                        channel={channel}
                        chat={chat}
                        active={activeView.kind === "channel" && activeView.channelId === channel.id}
                        unreadInfo={unread.perChannel[channel.id]}
                        hasDraft={draftIds.has(channel.id)}
                        live={isHuddleLive(huddles[channel.id])}
                        onSelect={onSelectChannel}
                        menuItems={rowMenu(channel)}
                        dragHandleProps={dragProvided.dragHandleProps}
                        dragging={dragSnapshot.isDragging}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {!isCollapsed && section.custom && !section.items.length && (
                <p className="px-3 py-1 text-xs text-slate-400">Drag conversations here</p>
              )}
              {!isCollapsed && section.id === "channels" && (
                <button type="button" onClick={onBrowseChannels} className="w-full flex items-center gap-2 rounded-lg px-2.5 py-[5px] text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
                  <span className="h-5 w-5 inline-flex items-center justify-center rounded-md bg-slate-200/70 dark:bg-[#232838]"><FaPlus className="w-2 h-2" /></span>
                  {permissions.canManageChannels ? "Add channels" : "Browse channels"}
                </button>
              )}
              {!isCollapsed && section.id === "dms" && !section.items.length && !filter && (
                <button type="button" onClick={onNewMessage} className="w-full rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
                  Start a conversation…
                </button>
              )}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  const anyMatch = sections.some((section) => section.items.length);

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#1a1f2e]" aria-label="Conversations">
      <div className="h-14 flex-shrink-0 flex items-center gap-2 border-b border-slate-200 dark:border-[#2a3044] px-3">
        <h1 className="flex-1 text-base font-bold text-slate-900 dark:text-white">Chats</h1>
        <div className="relative">
          <button
            type="button"
            title="Chat settings"
            aria-label="Chat settings"
            onClick={() => setMenuOpen((value) => !value)}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
          >
            <FaEllipsisH className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <MenuPopover
              onClose={() => setMenuOpen(false)}
              items={[
                { id: "read-all", label: "Mark all as read", icon: FaCheckDouble, onClick: () => actions.markAllRead() },
                { id: "browse", label: "Browse channels", icon: FaCompass, onClick: onBrowseChannels },
                { id: "section", label: "New sidebar section…", icon: FaFolderPlus, onClick: () => createSection() },
                { divider: true },
                { id: "prefs", label: "Chat preferences", icon: FaCog, onClick: onOpenPreferences },
                { id: "workspace", label: "Workspace chat settings", icon: FaSlidersH, onClick: onOpenWorkspaceSettings },
              ]}
            />
          )}
        </div>
        <button
          type="button"
          title="New message"
          aria-label="New message"
          onClick={onNewMessage}
          data-testid="chat-new-message"
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500 shadow-sm"
        >
          <FaEdit className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-shrink-0 px-3 pt-3">
        <div className="relative">
          <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                const first = sections.flatMap((section) => section.items)[0];
                if (first) { onSelectChannel(first.id); setFilter(""); }
              }
              if (event.key === "Escape") setFilter("");
            }}
            placeholder="Find a conversation"
            aria-label="Find a conversation"
            className="w-full h-8 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] pl-7 pr-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 pt-2">
        <div className="space-y-0.5">
          <NavRow
            icon={FaEnvelopeOpenText}
            label="All unreads"
            testId="chat-nav-unreads"
            active={activeView.kind === "unreads"}
            onClick={onOpenUnreads}
            badge={unreadConversations ? <span className={`text-xs tabular-nums ${activeView.kind === "unreads" ? "text-white/80" : "text-slate-400"}`}>{unreadConversations}</span> : null}
          />
          <NavRow
            icon={FaInbox}
            label="Activity"
            testId="chat-nav-activity"
            active={activeView.kind === "activity"}
            onClick={onOpenActivity}
            badge={<CountBadge count={unread.activityUnread} />}
          />
          <NavRow
            icon={FaBookmark}
            label="Later"
            testId="chat-nav-later"
            active={activeView.kind === "later"}
            onClick={onOpenLater}
            badge={later.overdueReminders ? <CountBadge count={later.overdueReminders} /> : (savedCount + (later.openReminders || 0) + (later.scheduled || 0)) ? (
              <span className={`text-xs tabular-nums ${activeView.kind === "later" ? "text-white/80" : "text-slate-400"}`}>{savedCount + (later.openReminders || 0) + (later.scheduled || 0)}</span>
            ) : null}
          />
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          {sections.map(renderSection)}
        </DragDropContext>

        {filter && !anyMatch && (
          <p className="px-3 py-4 text-sm text-slate-400">No conversations match “{filter}”.</p>
        )}
      </nav>

      {huddle?.current && (
        <button
          type="button"
          onClick={() => onSelectChannel(huddle.current.channelId)}
          className="mx-2 mb-2 flex flex-shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-left text-xs font-semibold text-white hover:bg-emerald-500"
        >
          <FaHeadphones className="w-3 h-3" />
          <span className="min-w-0 flex-1 truncate">In a huddle · {chat.channelsById[huddle.current.channelId] ? chat.getChannelName(chat.channelsById[huddle.current.channelId]) : "conversation"}</span>
        </button>
      )}

      <button
        type="button"
        onClick={onSetStatus}
        className="flex-shrink-0 flex items-center gap-2.5 border-t border-slate-200 dark:border-[#2a3044] px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-white/5"
        title="Set a status"
      >
        <UserAvatar user={me} size="md" showPresence presence={presence[uid]} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{getUserDisplayName(me)}</span>
          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
            {myStatus ? `${myStatus.emoji} ${myStatus.text}`.trim() : presence[uid]?.dnd ? "Notifications paused" : presence[uid]?.away ? "Away" : "Set a status"}
          </span>
        </span>
      </button>
    </aside>
  );
}
