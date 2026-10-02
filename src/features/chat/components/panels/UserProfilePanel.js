import React from "react";
import { FaIdBadge, FaComment, FaEnvelope, FaBuilding } from "react-icons/fa";
import { useChat } from "../../../../shared/context/ChatContext";
import { getActiveCustomStatus, getPresenceState, getUserDisplayName } from "../../../../shared/services/chat/chatModel";
import { formatListTime } from "../../utils/chatTime";
import UserAvatar, { PRESENCE_LABELS } from "../common/UserAvatar";
import { PanelShell } from "./ThreadPanel";

export default function UserProfilePanel({ userId, onClose, onMessage, onSetStatus }) {
  const chat = useChat();
  const person = chat.usersById[userId];
  const presence = chat.presence[userId];
  const state = getPresenceState(presence);
  const status = getActiveCustomStatus(presence);
  const isMe = userId === chat.uid;

  return (
    <PanelShell title="Profile" onClose={onClose}>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-5 pt-8 pb-5 text-center border-b border-slate-200 dark:border-[#2a3044]">
          <UserAvatar user={person} size="xl" showPresence presence={presence} />
          <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{getUserDisplayName(person)}</h3>
          {person?.title && <p className="text-sm text-slate-500 dark:text-slate-400">{person.title}</p>}
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className={`h-2 w-2 rounded-full ${state === "active" ? "bg-emerald-500" : state === "dnd" ? "bg-red-500" : "bg-slate-400"}`} />
            {PRESENCE_LABELS[state]}
            {state === "offline" && presence?.lastActiveAt ? ` · last seen ${formatListTime(presence.lastActiveAt)}` : ""}
          </p>
          {status && (
            <p className="mt-3 rounded-full border border-slate-200 dark:border-[#2a3044] px-3 py-1 text-sm text-slate-700 dark:text-slate-200">
              {status.emoji} {status.text}
            </p>
          )}
          {person?.deactivated && <p className="mt-3 text-xs font-medium text-red-500">This account is deactivated</p>}
          <div className="mt-4 flex gap-2">
            {!person?.deactivated && (
              <button type="button" onClick={() => onMessage(userId)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500">
                <FaComment className="w-3.5 h-3.5" /> {isMe ? "Notes to self" : "Message"}
              </button>
            )}
            {isMe && (
              <button type="button" onClick={onSetStatus} className="inline-flex h-9 items-center rounded-lg border border-slate-200 dark:border-[#2a3044] px-4 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5">
                Set status
              </button>
            )}
          </div>
        </div>
        <dl className="space-y-3 p-5 text-sm">
          {person?.email && (
            <div className="flex items-center gap-3">
              <FaEnvelope className="w-3.5 h-3.5 text-slate-400" />
              <a href={`mailto:${person.email}`} className="text-blue-600 dark:text-blue-400 hover:underline truncate">{person.email}</a>
            </div>
          )}
          {person?.department && (
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <FaBuilding className="w-3.5 h-3.5 text-slate-400" /> {person.department}
            </div>
          )}
          {person?.role && (
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 capitalize">
              <FaIdBadge className="w-3.5 h-3.5 text-slate-400" /> {person.role}
            </div>
          )}
        </dl>
      </div>
    </PanelShell>
  );
}
