import React, { useState } from "react";
import {
  FaArrowLeft, FaBellSlash, FaEllipsisV, FaHashtag, FaInfoCircle, FaLock, FaRegStar, FaSearch, FaStar,
  FaThumbtack, FaUserPlus, FaBell, FaSignOutAlt, FaArchive, FaEyeSlash, FaCheckDouble, FaMagic, FaHeadphones, FaLayerGroup,
} from "react-icons/fa";
import {
  CHANNEL_KINDS, CHANNEL_TYPES, getActiveCustomStatus, getDmPartnerIds, getNotifyLevel, getPresenceState, getUserDisplayName,
  isChannelMember, NOTIFY_LEVELS,
} from "../../../../shared/services/chat/chatModel";
import { useHuddle } from "../../huddle/HuddleContext";
import UserAvatar, { PRESENCE_LABELS } from "../common/UserAvatar";
import { MenuPopover } from "../common/Popovers";

function HeaderButton({ icon: Icon, label, onClick, active = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`h-8 min-w-[32px] px-2 inline-flex items-center justify-center gap-1.5 rounded-lg text-sm transition-colors ${
        active
          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/5 dark:hover:text-slate-100"
      }`}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

export function ChannelGlyph({ channel, className = "w-3.5 h-3.5" }) {
  if (channel?.kind === CHANNEL_KINDS.PROJECT) return <FaLayerGroup className={className} />;
  if (channel?.isPrivate) return <FaLock className={className} />;
  return <FaHashtag className={className} />;
}

export default function ConversationHeader({
  channel,
  chat,
  starred,
  muted,
  rightPanel,
  pinnedCount,
  isMobile,
  onBack,
  onToggleStar,
  onToggleMute,
  onOpenDetails,
  onOpenSearch,
  onOpenProfile,
  onAddPeople,
  onLeave,
  onHide,
  onMarkRead,
  onSetNotifyLevel,
  onCatchUp,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const huddle = useHuddle();
  const liveHuddle = huddle?.huddles?.[channel.id];
  const inThisHuddle = huddle?.current?.channelId === channel.id;
  const { uid, usersById, presence } = chat;
  const isDm = channel.type === CHANNEL_TYPES.DM;
  const partners = getDmPartnerIds(channel, uid);
  const isOneToOne = isDm && partners.length === 1;
  const partner = isOneToOne ? usersById[partners[0]] : null;
  const partnerPresence = partner ? presence[partner.id] : null;
  const partnerStatus = getActiveCustomStatus(partnerPresence);
  const memberIds = channel.isDefault ? chat.activeUsers.map((user) => user.id) : channel.memberIds;
  const member = isChannelMember(channel, uid);
  const panelKind = rightPanel?.kind;

  const subtitle = isDm
    ? (isOneToOne
      ? [partnerStatus ? `${partnerStatus.emoji} ${partnerStatus.text}`.trim() : PRESENCE_LABELS[getPresenceState(partnerPresence)], partner?.title].filter(Boolean).join(" · ")
      : `${partners.length + 1} members`)
    : channel.topic || channel.description;

  const menuItems = [
    { id: "details", label: isDm ? "Conversation details" : "Channel details", icon: FaInfoCircle, onClick: () => onOpenDetails("about") },
    { id: "read", label: "Mark as read", icon: FaCheckDouble, onClick: onMarkRead },
    { id: "mute", label: muted ? "Unmute conversation" : "Mute conversation", icon: muted ? FaBell : FaBellSlash, onClick: onToggleMute },
    { header: "Notify me about" },
    ...[
      [NOTIFY_LEVELS.ALL, "All new messages"],
      [NOTIFY_LEVELS.MENTIONS, "Mentions & keywords"],
      [NOTIFY_LEVELS.NOTHING, "Nothing"],
    ].map(([value, label]) => ({ id: `level-${value}`, label, checked: getNotifyLevel(channel, chat.userState) === value, onClick: () => onSetNotifyLevel(value) })),
    { divider: true },
    { id: "star", label: starred ? "Remove from starred" : "Star conversation", icon: starred ? FaStar : FaRegStar, onClick: onToggleStar },
    !isDm && member && !channel.archived && { id: "add", label: "Add people", icon: FaUserPlus, onClick: onAddPeople },
    { divider: true },
    isDm
      ? { id: "hide", label: "Close conversation", icon: FaEyeSlash, onClick: onHide }
      : !channel.isDefault && member && { id: "leave", label: `Leave #${channel.name}`, icon: FaSignOutAlt, danger: true, onClick: onLeave },
  ].filter(Boolean);

  return (
    <header className="h-14 flex-shrink-0 flex items-center gap-2 px-3 md:px-5 border-b border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030]">
      {isMobile && (
        <HeaderButton icon={FaArrowLeft} label="Back to conversations" onClick={onBack} />
      )}
      <button
        type="button"
        onClick={() => (isOneToOne && partner ? onOpenProfile(partner.id) : onOpenDetails("about"))}
        className="flex min-w-[96px] items-center gap-2.5 rounded-lg px-1.5 py-1 -ml-1.5 hover:bg-slate-100 dark:hover:bg-white/5 text-left"
      >
        {isDm ? (
          isOneToOne ? (
            <UserAvatar user={partner} size="md" showPresence presence={partnerPresence} />
          ) : (
            <span className="relative h-8 w-8 flex-shrink-0">
              <UserAvatar user={usersById[partners[0]]} size="sm" className="absolute left-0 top-0" />
              <UserAvatar user={usersById[partners[1]]} size="sm" className="absolute right-0 bottom-0 ring-2 ring-white dark:ring-[#1c2030]" />
            </span>
          )
        ) : (
          <span className="h-8 w-8 flex-shrink-0 rounded-lg bg-slate-100 dark:bg-[#232838] text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <ChannelGlyph channel={channel} />
          </span>
        )}
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="font-semibold text-[15px] text-slate-900 dark:text-white truncate">
              {isDm ? chat.getChannelName(channel) : channel.name}
            </span>
            {channel.archived && <FaArchive className="w-3 h-3 text-slate-400" title="Archived" />}
            {muted && <FaBellSlash className="w-3 h-3 text-slate-400" title="Muted" />}
          </span>
          {subtitle && <span className="block text-xs text-slate-500 dark:text-slate-400 truncate max-w-[52vw] md:max-w-md">{subtitle}</span>}
        </span>
      </button>

      <HeaderButton icon={starred ? FaStar : FaRegStar} label={starred ? "Unstar" : "Star"} active={starred} onClick={onToggleStar} />

      <div className="ml-auto flex items-center gap-1">
        {!isDm && (
          <button
            type="button"
            onClick={() => onOpenDetails("members")}
            title="Members"
            className={`${rightPanel ? "hidden 2xl:flex" : "hidden sm:flex"} h-8 items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] pl-1.5 pr-2 hover:bg-slate-50 dark:hover:bg-white/5`}
          >
            <span className="flex -space-x-1.5">
              {memberIds.slice(0, 3).map((id) => (
                <UserAvatar key={id} user={usersById[id]} size="xs" className="ring-2 ring-white dark:ring-[#1c2030]" />
              ))}
            </span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">{memberIds.length}</span>
          </button>
        )}
        {huddle?.supported && member && !channel.archived && (
          <button
            type="button"
            onClick={() => (inThisHuddle ? huddle.setExpanded(true) : huddle.join(channel.id))}
            title={liveHuddle ? "Join the huddle" : "Start a huddle"}
            aria-label={liveHuddle ? "Join huddle" : "Start huddle"}
            data-testid="chat-huddle-button"
            className={`h-8 inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors ${
              liveHuddle
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/5 dark:hover:text-slate-100"
            }`}
          >
            <FaHeadphones className="w-3.5 h-3.5" />
            <span className={rightPanel ? "hidden 2xl:inline" : "hidden lg:inline"}>{inThisHuddle ? "In huddle" : liveHuddle ? `Join (${liveHuddle.participants.length})` : "Huddle"}</span>
          </button>
        )}
        <HeaderButton icon={FaMagic} label="Catch me up" active={panelKind === "summary"} onClick={onCatchUp} />
        <HeaderButton icon={FaThumbtack} label="Pinned messages" active={panelKind === "details" && rightPanel?.tab === "pinned"} onClick={() => onOpenDetails("pinned")}>
          {pinnedCount > 0 && <span className="text-xs font-semibold tabular-nums">{pinnedCount}</span>}
        </HeaderButton>
        <HeaderButton icon={FaSearch} label="Search in conversation" active={panelKind === "search"} onClick={onOpenSearch} />
        <HeaderButton icon={FaInfoCircle} label="Details" active={panelKind === "details" && rightPanel?.tab !== "pinned"} onClick={() => onOpenDetails("about")} />
        <div className="relative">
          <HeaderButton icon={FaEllipsisV} label="More" active={menuOpen} onClick={() => setMenuOpen((value) => !value)} />
          {menuOpen && <MenuPopover items={menuItems} onClose={() => setMenuOpen(false)} />}
        </div>
      </div>
    </header>
  );
}

export function ChannelIntro({ channel, chat, onOpenDetails, onAddPeople, onOpenProfile }) {
  const { uid, usersById } = chat;
  const created = channel.createdAt ? new Date(channel.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "";
  if (channel.type === CHANNEL_TYPES.DM) {
    const partners = getDmPartnerIds(channel, uid);
    const self = partners.length === 1 && partners[0] === uid;
    return (
      <div className="px-5 pt-10 pb-4">
        <div className="flex -space-x-2 mb-3">
          {partners.slice(0, 4).map((id) => <UserAvatar key={id} user={usersById[id]} size="xl" className="ring-4 ring-white dark:ring-[#141720]" />)}
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{chat.getChannelName(channel)}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {self
            ? "This is your space. Draft messages, keep links and files handy, or jot down to-dos."
            : <>This is the very beginning of your conversation with {partners.map((id, index) => (
              <React.Fragment key={id}>
                {index > 0 && (index === partners.length - 1 ? " and " : ", ")}
                <button type="button" onClick={() => onOpenProfile(id)} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                  {getUserDisplayName(usersById[id])}
                </button>
              </React.Fragment>
            ))}.</>}
        </p>
      </div>
    );
  }
  const creator = usersById[channel.createdBy];
  return (
    <div className="px-5 pt-10 pb-4">
      <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300">
        <ChannelGlyph channel={channel} className="w-6 h-6" />
      </span>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Welcome to #{channel.name}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {channel.isDefault
          ? "This channel is for the whole workspace — announcements, questions and everything in between."
          : <>{creator ? `${getUserDisplayName(creator)} created this channel` : "This channel was created"}{created ? ` on ${created}` : ""}. This is the very beginning of #{channel.name}.</>}
      </p>
      {channel.description && !channel.isDefault && <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{channel.description}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {!channel.isDefault && isChannelMember(channel, uid) && (
          <button type="button" onClick={onAddPeople} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5">
            <FaUserPlus className="w-3.5 h-3.5" /> Add people
          </button>
        )}
        <button type="button" onClick={() => onOpenDetails("about")} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5">
          <FaInfoCircle className="w-3.5 h-3.5" /> {channel.description ? "Channel details" : "Add a description"}
        </button>
      </div>
    </div>
  );
}

export function TypingIndicator({ userIds, usersById }) {
  if (!userIds.length) return <div className="h-5" aria-hidden="true" />;
  const names = userIds.map((id) => getUserDisplayName(usersById[id]).split(" ")[0]);
  const label = names.length === 1
    ? `${names[0]} is typing`
    : names.length === 2 ? `${names[0]} and ${names[1]} are typing` : "Several people are typing";
  return (
    <div className="h-5 flex items-center gap-1.5 px-1 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
      <span className="flex gap-0.5" aria-hidden="true">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="h-1 w-1 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${dot * 120}ms` }} />
        ))}
      </span>
      <span><b className="font-semibold">{label}</b>…</span>
    </div>
  );
}
