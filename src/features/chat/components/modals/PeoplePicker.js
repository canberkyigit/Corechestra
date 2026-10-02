import React, { useMemo, useRef, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { getUserDisplayName } from "../../../../shared/services/chat/chatModel";
import UserAvatar from "../common/UserAvatar";

/** Token input + filtered list for picking people. */
export default function PeoplePicker({ users, selectedIds, onChange, excludeIds = [], presence = {}, placeholder = "Type a name or email", autoFocus = false, maxHeight = "max-h-60" }) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const byId = useMemo(() => Object.fromEntries(users.map((user) => [user.id, user])), [users]);

  const options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users
      .filter((user) => !excluded.has(user.id) && !selected.has(user.id))
      .filter((user) => !needle
        || getUserDisplayName(user).toLowerCase().includes(needle)
        || String(user.email || "").toLowerCase().includes(needle)
        || String(user.username || "").toLowerCase().includes(needle))
      .slice(0, 50);
  }, [excluded, query, selected, users]);

  const add = (id) => {
    onChange([...selectedIds, id]);
    setQuery("");
    setCursor(0);
    inputRef.current?.focus();
  };

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] px-2 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/40"
        onClick={() => inputRef.current?.focus()}
      >
        {selectedIds.map((id) => (
          <span key={id} className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-500/15 py-0.5 pl-1 pr-1.5 text-sm text-blue-800 dark:text-blue-200">
            <UserAvatar user={byId[id]} size="xs" />
            {getUserDisplayName(byId[id])}
            <button type="button" aria-label={`Remove ${getUserDisplayName(byId[id])}`} onClick={() => onChange(selectedIds.filter((entry) => entry !== id))} className="opacity-60 hover:opacity-100">
              <FaTimes className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setCursor(0); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setCursor((value) => Math.min(value + 1, options.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setCursor((value) => Math.max(value - 1, 0)); }
            if (event.key === "Enter" && options[cursor]) { event.preventDefault(); add(options[cursor].id); }
            if (event.key === "Backspace" && !query && selectedIds.length) onChange(selectedIds.slice(0, -1));
          }}
          placeholder={selectedIds.length ? "" : placeholder}
          className="min-w-[120px] flex-1 bg-transparent py-1 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          aria-label="Search people"
        />
      </div>
      <ul className={`mt-2 ${maxHeight} overflow-y-auto rounded-lg border border-slate-100 dark:border-[#2a3044] divide-y divide-slate-100 dark:divide-[#232838]`}>
        {options.length === 0 && <li className="px-3 py-3 text-sm text-slate-400">No people found</li>}
        {options.map((user, index) => (
          <li key={user.id}>
            <button
              type="button"
              onMouseEnter={() => setCursor(index)}
              onClick={() => add(user.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left ${index === cursor ? "bg-slate-100 dark:bg-white/5" : ""}`}
            >
              <UserAvatar user={user} size="md" showPresence presence={presence[user.id]} />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-slate-900 dark:text-white truncate">{getUserDisplayName(user)}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">{[user.title, user.email].filter(Boolean).join(" · ")}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
