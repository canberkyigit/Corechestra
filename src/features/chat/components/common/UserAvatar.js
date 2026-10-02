import React from "react";
import { getPresenceState, getUserDisplayName } from "../../../../shared/services/chat/chatModel";

const SIZES = {
  xs: "w-5 h-5 text-[9px] rounded-md",
  sm: "w-6 h-6 text-[10px] rounded-md",
  md: "w-8 h-8 text-xs rounded-lg",
  lg: "w-9 h-9 text-sm rounded-lg",
  xl: "w-16 h-16 text-xl rounded-2xl",
};

const DOT_SIZES = { xs: "w-2 h-2", sm: "w-2.5 h-2.5", md: "w-3 h-3", lg: "w-3 h-3", xl: "w-4 h-4" };

const PRESENCE_STYLES = {
  active: "bg-emerald-500",
  away: "bg-transparent border-2 border-slate-400",
  dnd: "bg-red-500",
  offline: "bg-transparent border-2 border-slate-400 dark:border-slate-500",
};

export const PRESENCE_LABELS = {
  active: "Active",
  away: "Away",
  dnd: "Do not disturb",
  offline: "Offline",
};

export function initialsFor(user) {
  const name = getUserDisplayName(user, "?");
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function PresenceDot({ presence, size = "sm", className = "" }) {
  const state = getPresenceState(presence);
  return (
    <span
      title={PRESENCE_LABELS[state]}
      className={`inline-block rounded-full flex-shrink-0 ${DOT_SIZES[size] || DOT_SIZES.sm} ${PRESENCE_STYLES[state]} ${className}`}
    />
  );
}

export default function UserAvatar({ user, size = "md", presence, showPresence = false, className = "", onClick }) {
  const color = user?.color || "#6366f1";
  const content = (
    <span
      className={`relative inline-flex items-center justify-center font-semibold text-white flex-shrink-0 select-none ${SIZES[size] || SIZES.md} ${user?.deactivated ? "opacity-50 grayscale" : ""} ${className}`}
      style={{ backgroundColor: color }}
      aria-hidden={onClick ? undefined : "true"}
    >
      {initialsFor(user)}
      {showPresence && (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-white dark:ring-[#1c2030] bg-white dark:bg-[#1c2030] flex">
          <PresenceDot presence={presence} size={size === "xl" ? "md" : "xs"} />
        </span>
      )}
    </span>
  );
  if (!onClick) return content;
  return (
    <button type="button" onClick={onClick} className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label={`Open profile of ${getUserDisplayName(user)}`}>
      {content}
    </button>
  );
}
