import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { EMOJI_CATEGORIES, getAllEmojis, searchEmojis } from "../../utils/emoji";
import { useDismiss, useRecentEmojis } from "../../hooks/useChatUi";
import { useChat } from "../../../../shared/context/ChatContext";
import EmojiGlyph from "./EmojiGlyph";

/** Flips a popover above its anchor (and/or to the left) when it would overflow the viewport. */
function useAutoPlacement(ref, preferred = "bottom") {
  const [placement, setPlacement] = useState({ vertical: preferred, shiftX: 0 });
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const vertical = preferred === "bottom" && rect.bottom > window.innerHeight - 8 && rect.top - rect.height > 8
      ? "top"
      : preferred === "top" && rect.top < 8 ? "bottom" : preferred;
    let shiftX = 0;
    if (rect.left < 8) shiftX = 8 - rect.left;
    if (rect.right > window.innerWidth - 8) shiftX = window.innerWidth - 8 - rect.right;
    setPlacement({ vertical, shiftX });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return placement;
}

function popoverPosition({ vertical }, align) {
  const v = vertical === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5";
  const h = align === "left" ? "left-0" : "right-0";
  return `${v} ${h}`;
}

export function EmojiPicker({ onSelect, onClose, align = "right", placement: preferred = "bottom", allowCustom = true }) {
  const ref = useRef(null);
  const chat = useChat();
  const workspaceEmoji = chat?.customEmoji;
  const customEmoji = useMemo(() => (allowCustom ? workspaceEmoji || {} : {}), [allowCustom, workspaceEmoji]);
  const customEntries = useMemo(
    () => Object.keys(customEmoji).sort().map((name) => ({ emoji: `:${name}:`, name, custom: true })),
    [customEmoji]
  );
  const [query, setQuery] = useState("");
  const [recent, pushRecent] = useRecentEmojis();
  const [activeCategory, setActiveCategory] = useState(recent.length ? "recent" : EMOJI_CATEGORIES[0].id);
  const gridRef = useRef(null);
  const placement = useAutoPlacement(ref, preferred);
  useDismiss(ref, onClose);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/^:|:$/g, "");
    if (!needle) return null;
    return [...customEntries.filter((entry) => entry.name.includes(needle)), ...searchEmojis(needle, 120)];
  }, [customEntries, query]);
  const sections = useMemo(() => {
    const list = [];
    if (recent.length) list.push({ id: "recent", label: "Frequently used", emojis: recent.map((emoji) => ({ emoji, name: "" })) });
    if (customEntries.length) list.push({ id: "custom", label: "Workspace", emojis: customEntries });
    const all = getAllEmojis();
    EMOJI_CATEGORIES.forEach((category) => {
      list.push({ id: category.id, label: category.label, emojis: all.filter((entry) => entry.category === category.id) });
    });
    return list;
  }, [customEntries, recent]);

  const choose = (emoji) => {
    pushRecent(emoji);
    onSelect(emoji);
  };

  const jumpTo = (id) => {
    setActiveCategory(id);
    setQuery("");
    window.requestAnimationFrame(() => {
      const target = gridRef.current?.querySelector(`[data-emoji-section="${id}"]`);
      if (target && gridRef.current) gridRef.current.scrollTop = target.offsetTop - gridRef.current.offsetTop;
    });
  };

  const renderGrid = (emojis) => (
    <div className="grid grid-cols-8 gap-0.5">
      {emojis.map((entry) => (
        <button
          key={`${entry.emoji}-${entry.name}`}
          type="button"
          title={entry.name ? `:${entry.name}:` : entry.emoji}
          onClick={() => choose(entry.emoji)}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-xl leading-none hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <EmojiGlyph value={entry.emoji} customEmoji={customEmoji} size="1.4rem" />
        </button>
      ))}
    </div>
  );

  return (
    <div
      ref={ref}
      style={{ transform: placement.shiftX ? `translateX(${placement.shiftX}px)` : undefined }}
      className={`absolute z-50 ${popoverPosition(placement, align)} w-[296px] rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] shadow-xl`}
      role="dialog"
      aria-label="Emoji picker"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="p-2 border-b border-slate-100 dark:border-[#2a3044]">
        <div className="relative">
          <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results?.[0]) { event.preventDefault(); choose(results[0].emoji); }
            }}
            placeholder="Search emoji"
            className="w-full h-8 pl-7 pr-2 rounded-lg text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </div>
      </div>
      {!results && (
        <div className="flex items-center gap-0.5 px-2 pt-1.5">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              title={section.label}
              onClick={() => jumpTo(section.id)}
              className={`flex-1 h-7 rounded-md text-base ${activeCategory === section.id ? "bg-blue-50 dark:bg-blue-500/15" : "hover:bg-slate-100 dark:hover:bg-white/5"}`}
            >
              {section.id === "recent" ? "🕘" : section.id === "custom" ? "✨" : EMOJI_CATEGORIES.find((category) => category.id === section.id)?.icon}
            </button>
          ))}
        </div>
      )}
      <div ref={gridRef} className="h-60 overflow-y-auto p-2">
        {results ? (
          results.length ? renderGrid(results) : <p className="py-10 text-center text-sm text-slate-400">No emoji found</p>
        ) : sections.map((section) => (
          <div key={section.id} data-emoji-section={section.id} className="mb-2">
            <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{section.label}</p>
            {renderGrid(section.emojis)}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Dropdown menu. `items`: `{ id, label, icon, onClick, danger, disabled, hint, checked }`,
 * `{ divider: true }` or `{ header: "Label" }`.
 */
export function MenuPopover({ items, onClose, align = "right", placement: preferred = "bottom", width = "w-56" }) {
  const ref = useRef(null);
  const placement = useAutoPlacement(ref, preferred);
  useDismiss(ref, onClose);
  return (
    <div
      ref={ref}
      role="menu"
      style={{ transform: placement.shiftX ? `translateX(${placement.shiftX}px)` : undefined }}
      className={`absolute z-50 ${popoverPosition(placement, align)} ${width} rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] py-1 shadow-xl`}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {items.filter(Boolean).map((item, index) => (item.divider ? (
        <div key={`divider-${index}`} className="my-1 border-t border-slate-100 dark:border-[#2a3044]" />
      ) : item.header ? (
        <p key={`header-${index}`} className="px-3 pt-1.5 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.header}</p>
      ) : (
        <button
          key={item.id || item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => { onClose?.(); item.onClick?.(); }}
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-sm disabled:opacity-40 ${
            item.danger
              ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
              : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
          }`}
        >
          {item.icon && <item.icon className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />}
          <span className="flex-1 truncate">{item.label}</span>
          {item.checked && <span className="text-blue-600 dark:text-blue-400" aria-label="Selected">✓</span>}
          {item.hint && <span className="text-[11px] text-slate-400">{item.hint}</span>}
        </button>
      )))}
    </div>
  );
}
