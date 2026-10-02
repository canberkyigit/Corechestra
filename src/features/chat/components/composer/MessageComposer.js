import React, {
  forwardRef, lazy, Suspense, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState,
} from "react";
import {
  FaAt, FaBold, FaBook, FaCode, FaFileAlt, FaItalic, FaLink, FaListOl, FaListUl, FaPaperPlane, FaPaperclip, FaPlus,
  FaQuoteRight, FaRegSmile, FaStrikethrough, FaTerminal, FaTimes, FaFont, FaPoll, FaRegClock, FaChevronDown, FaTag, FaTasks,
  FaQuoteLeft,
} from "react-icons/fa";
import { CHANNEL_TYPES, MAX_MESSAGE_LENGTH, getUserDisplayName } from "../../../../shared/services/chat/chatModel";
import { filterMentionCandidates, getActiveTrigger } from "../../utils/chatMentions";
import { prefixLines, wrapSelection } from "../../utils/chatMarkdown";
import { searchEmojis } from "../../utils/emoji";
import { filterSlashCommands } from "../../utils/slashCommands";
import { formatBytes, isImageAttachment, prepareAttachments } from "../../utils/chatAttachments";
import { getSchedulePresets } from "../../utils/chatSchedule";
import { gifToAttachment } from "../../utils/chatGifs";
import { EmojiPicker, MenuPopover } from "../common/Popovers";
import EmojiGlyph from "../common/EmojiGlyph";
import UserAvatar from "../common/UserAvatar";
import GifPicker from "./GifPicker";

const RichComposerInput = lazy(() => import("./RichComposerInput"));

const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || "");
const MOD = IS_MAC ? "⌘" : "Ctrl";

function ToolbarButton({ icon: Icon, label, onClick, active = false, testId }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      data-testid={testId}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors ${
        active
          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-white/5 dark:hover:text-slate-200"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

const SUGGESTION_TITLES = {
  mention: "People",
  channel: "Channels",
  emoji: "Emoji",
  command: "Commands",
  reference: "Tasks, docs & releases",
};

const REFERENCE_ICONS = { task: FaTasks, doc: FaBook, release: FaTag };

function SuggestionList({ trigger, items, cursor, onPick, presence, customEmoji }) {
  if (!trigger || !items.length) return null;
  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 z-40 max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] shadow-xl py-1" role="listbox" data-testid="chat-suggestions">
      <p className="px-3 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{SUGGESTION_TITLES[trigger.type]}</p>
      {items.map((item, index) => {
        const active = index === cursor;
        const RefIcon = REFERENCE_ICONS[item.refKind];
        return (
          <button
            key={`${item.kind}-${item.id}`}
            type="button"
            role="option"
            aria-selected={active}
            onMouseDown={(event) => { event.preventDefault(); onPick(item); }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-sm ${active ? "bg-blue-600 text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"}`}
          >
            {item.kind === "user" && <UserAvatar user={item.user} size="xs" showPresence presence={presence?.[item.id]} />}
            {item.kind === "special" && <FaAt className="w-3.5 h-3.5 opacity-70" />}
            {item.kind === "channel" && <span className="w-4 text-center opacity-70">#</span>}
            {item.kind === "emoji" && <span className="w-5 text-lg leading-none"><EmojiGlyph value={item.emoji} customEmoji={customEmoji} size="1.2rem" /></span>}
            {item.kind === "command" && <FaTerminal className="w-3 h-3 opacity-70" />}
            {item.kind === "reference" && (item.emoji ? <span className="w-4 text-center">{item.emoji}</span> : RefIcon && <RefIcon className="w-3 h-3 opacity-70" />)}
            <span className="font-medium truncate">{item.kind === "command" ? item.usage : item.kind === "emoji" ? `:${item.label}:` : item.label}</span>
            {(item.description || item.sublabel) && (
              <span className={`ml-auto truncate text-xs ${active ? "text-blue-100" : "text-slate-400"}`}>{item.description || item.sublabel}</span>
            )}
            {item.kind === "user" && item.user?.title && !item.description && (
              <span className={`ml-auto truncate text-xs ${active ? "text-blue-100" : "text-slate-400"}`}>{item.user.title}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Message composer. Plain markdown textarea, or a WYSIWYG TipTap editor
 * (`rich`), both behind the same adapter. Calls `onSubmit({ text,
 * attachments })` with raw markdown (encoding happens in the conversation);
 * return `false` to keep the text.
 */
const MessageComposer = forwardRef(function MessageComposer({
  placeholder = "Write a message…",
  initialText = "",
  mode = "compose",
  rich = false,
  disabled = false,
  disabledReason = "",
  users = [],
  memberIds = null,
  channels = [],
  presence = {},
  customEmoji = {},
  searchEntities = null,
  enterToSend = true,
  autoFocus = false,
  allowAttachments = true,
  footerSlot = null,
  quote = null,
  quoteLabel = null,
  gifKey = "",
  onClearQuote,
  onCreatePoll,
  onSchedule,
  onSubmit,
  onCancel,
  onDraftChange,
  onTyping,
  onEditLast,
  onError,
}, ref) {
  const textareaRef = useRef(null);
  const richRef = useRef(null);
  const fileInputRef = useRef(null);
  const [text, setText] = useState(initialText);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [trigger, setTrigger] = useState(null);
  const [cursor, setCursor] = useState(0);
  const [popover, setPopover] = useState(null); // "emoji" | "gif" | "plus" | "schedule"
  const [showFormatting, setShowFormatting] = useState(true);
  const [, forceToolbar] = useState(0);
  const isEdit = mode === "edit";
  const useRich = rich && !isEdit;

  // ── Adapter over the active input ────────────────────────────────────────
  const textarea = useMemo(() => ({
    kind: "plain",
    focus: () => textareaRef.current?.focus(),
    textBeforeCaret: () => {
      const node = textareaRef.current;
      return node ? node.value.slice(0, node.selectionStart) : "";
    },
    inCodeBlock: () => {
      const node = textareaRef.current;
      if (!node) return false;
      return ((node.value.slice(0, node.selectionStart).match(/```/g) || []).length % 2) === 1;
    },
    isActive: () => false,
  }), []);
  const input = useCallback(() => (useRich ? richRef.current : textarea), [textarea, useRich]);

  useLayoutEffect(() => {
    if (useRich) return;
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 260)}px`;
  }, [text, useRich]);

  useEffect(() => {
    if (!autoFocus || useRich) return;
    const node = textareaRef.current;
    if (!node) return;
    node.focus();
    const end = node.value.length;
    node.setSelectionRange(end, end);
  }, [autoFocus, useRich]);

  const setPlainText = useCallback((value, caret) => {
    setText(value);
    if (typeof caret === "number") {
      window.requestAnimationFrame(() => {
        const node = textareaRef.current;
        if (!node) return;
        node.focus();
        node.setSelectionRange(caret, caret);
      });
    }
  }, []);

  const handleChange = useCallback((value) => {
    setText(value);
    onDraftChange?.(value);
    if (value.trim()) onTyping?.(true);
  }, [onDraftChange, onTyping]);

  const refreshTrigger = useCallback(() => {
    const before = input()?.textBeforeCaret?.() || "";
    setTrigger(getActiveTrigger(before, before.length));
  }, [input]);

  const memberSet = useMemo(() => (memberIds ? new Set(memberIds) : null), [memberIds]);

  const suggestions = useMemo(() => {
    if (!trigger) return [];
    if (trigger.type === "mention") {
      const ranked = memberSet
        ? [...users].sort((a, b) => Number(memberSet.has(b.id)) - Number(memberSet.has(a.id)))
        : users;
      return filterMentionCandidates(ranked, trigger.query).map((item) => (
        item.kind === "user" && memberSet && !memberSet.has(item.id)
          ? { ...item, description: "Not in this conversation" }
          : item
      ));
    }
    if (trigger.type === "channel") {
      const needle = trigger.query.toLowerCase();
      return channels
        .filter((channel) => channel.type !== CHANNEL_TYPES.DM && !channel.archived && channel.name.toLowerCase().includes(needle))
        .slice(0, 8)
        .map((channel) => ({ kind: "channel", id: channel.id, label: channel.name, description: channel.isPrivate ? "Private" : "" }));
    }
    if (trigger.type === "emoji") {
      const needle = trigger.query.toLowerCase();
      const custom = Object.keys(customEmoji || {})
        .filter((name) => name.includes(needle))
        .slice(0, 4)
        .map((name) => ({ kind: "emoji", id: `c-${name}`, label: name, emoji: `:${name}:`, custom: true }));
      return [...custom, ...searchEmojis(trigger.query, 8 - custom.length).map((entry) => ({ kind: "emoji", id: entry.name, label: entry.name, emoji: entry.emoji }))];
    }
    if (trigger.type === "command" && !isEdit) {
      return filterSlashCommands(trigger.query).map((command) => ({ kind: "command", id: command.id, usage: command.usage, description: command.description }));
    }
    if (trigger.type === "reference" && searchEntities) {
      return searchEntities(trigger.query, 8).map((entry) => ({
        kind: "reference", id: `${entry.kind}-${entry.id}`, refKind: entry.kind, entityId: entry.id, label: entry.label, sublabel: entry.sublabel, insert: entry.insert, emoji: entry.emoji,
      }));
    }
    return [];
  }, [channels, customEmoji, isEdit, memberSet, searchEntities, trigger, users]);

  useEffect(() => { setCursor(0); }, [trigger?.type, trigger?.query]);

  const replaceTrigger = useCallback((replacement) => {
    const active = input();
    if (!trigger || !active) return;
    const before = active.textBeforeCaret();
    const count = before.length - trigger.start;
    if (active.kind === "rich") {
      active.replaceBeforeCaret(count, replacement);
      return;
    }
    const node = textareaRef.current;
    const caret = node.selectionStart;
    const value = node.value;
    const next = `${value.slice(0, caret - count)}${replacement}${value.slice(caret)}`;
    setPlainText(next, caret - count + replacement.length);
    handleChange(next);
  }, [handleChange, input, setPlainText, trigger]);

  const pick = (item) => {
    if (!trigger) return;
    if (item.kind === "reference" && useRich && item.refKind !== "task") {
      // Rich mode inserts docs/releases as links to their pages (rendered as cards).
      const route = item.refKind === "doc" ? `docs?page=${encodeURIComponent(item.entityId)}` : `releases?release=${encodeURIComponent(item.entityId)}`;
      const active = input();
      const before = active.textBeforeCaret();
      active.replaceBeforeCaret(before.length - trigger.start, "");
      active.insertLink(item.label, `${window.location.origin}/${route}`);
      setTrigger(null);
      return;
    }
    let replacement = "";
    if (item.kind === "user") replacement = `@${getUserDisplayName(item.user)} `;
    else if (item.kind === "special") replacement = `@${item.id} `;
    else if (item.kind === "channel") replacement = `#${item.label} `;
    else if (item.kind === "emoji") replacement = `${item.emoji} `;
    else if (item.kind === "command") replacement = `/${item.id} `;
    else if (item.kind === "reference") replacement = item.insert;
    setTrigger(null);
    replaceTrigger(replacement);
  };

  const applyFormat = (kind) => {
    const active = input();
    if (active?.kind === "rich") {
      active.applyFormat(kind);
      forceToolbar((value) => value + 1);
      return;
    }
    const node = textareaRef.current;
    if (!node) return;
    const { selectionStart: start, selectionEnd: end } = node;
    let result;
    switch (kind) {
      case "bold": result = wrapSelection(text, start, end, "**", "**", "bold text"); break;
      case "italic": result = wrapSelection(text, start, end, "_", "_", "italic text"); break;
      case "strike": result = wrapSelection(text, start, end, "~~", "~~", "strikethrough"); break;
      case "code": result = wrapSelection(text, start, end, "`", "`", "code"); break;
      case "codeblock": result = wrapSelection(text, start, end, "```\n", "\n```", "code"); break;
      case "link": {
        const selected = text.slice(start, end);
        result = /^https?:\/\//i.test(selected)
          ? wrapSelection(text, start, end, "[link](", ")")
          : wrapSelection(text, start, end, "[", "](https://)", "link text");
        break;
      }
      case "bullet": result = prefixLines(text, start, end, "- "); break;
      case "ordered": result = prefixLines(text, start, end, (index) => `${index + 1}. `); break;
      case "quote": result = prefixLines(text, start, end, "> "); break;
      default: return;
    }
    setText(result.text);
    onDraftChange?.(result.text);
    window.requestAnimationFrame(() => {
      node.focus();
      node.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  };

  const insertAtCaret = useCallback((value) => {
    const active = input();
    if (active?.kind === "rich") {
      active.insertText(value);
      return;
    }
    const node = textareaRef.current;
    const start = node ? node.selectionStart : text.length;
    const end = node ? node.selectionEnd : text.length;
    const next = `${text.slice(0, start)}${value}${text.slice(end)}`;
    setPlainText(next, start + value.length);
    handleChange(next);
  }, [handleChange, input, setPlainText, text]);

  const addFiles = useCallback(async (files) => {
    if (!allowAttachments || !files?.length) return;
    setUploading(true);
    const { attachments: prepared, errors } = await prepareAttachments(files, attachments);
    setUploading(false);
    if (prepared.length) setAttachments((prev) => [...prev, ...prepared]);
    if (errors.length) onError?.(errors[0]);
  }, [allowAttachments, attachments, onError]);

  const resetInput = useCallback(() => {
    setText("");
    setAttachments([]);
    setTrigger(null);
    if (useRich) richRef.current?.clear();
    onDraftChange?.("");
    onTyping?.(false);
  }, [onDraftChange, onTyping, useRich]);

  useImperativeHandle(ref, () => ({
    focus: () => input()?.focus(),
    addFiles,
    insertText: insertAtCaret,
    setText: (value) => {
      if (useRich) richRef.current?.setMarkdown(value);
      setText(value);
      onDraftChange?.(value);
    },
  }));

  const currentText = () => (useRich ? richRef.current?.getMarkdown() ?? text : text);
  const canSend = !disabled && !uploading && (text.trim().length > 0 || attachments.length > 0) && text.length <= MAX_MESSAGE_LENGTH;

  const submit = async () => {
    if (!canSend) return;
    const payload = { text: currentText().replace(/\s+$/, ""), attachments };
    const keep = await Promise.resolve(onSubmit?.(payload));
    if (keep === false) return;
    resetInput();
  };

  const schedule = async (at) => {
    setPopover(null);
    const value = currentText().replace(/\s+$/, "");
    if (!value.trim() || !onSchedule) return;
    const keep = await Promise.resolve(onSchedule({ text: value, at }));
    if (keep === false) return;
    resetInput();
  };

  /** Shared key handling for both inputs. Returns true when the key was consumed. */
  const handleKey = (event) => {
    const native = event.nativeEvent || event;
    if (native.isComposing) return false;
    const consume = () => { event.preventDefault(); return true; };
    if (trigger && suggestions.length) {
      if (event.key === "ArrowDown") { setCursor((value) => (value + 1) % suggestions.length); return consume(); }
      if (event.key === "ArrowUp") { setCursor((value) => (value - 1 + suggestions.length) % suggestions.length); return consume(); }
      if (event.key === "Enter" || event.key === "Tab") { pick(suggestions[cursor]); return consume(); }
      if (event.key === "Escape") { event.stopPropagation(); setTrigger(null); return consume(); }
    }
    const mod = event.metaKey || event.ctrlKey;
    const lower = String(event.key || "").toLowerCase();
    if (mod && !event.shiftKey && lower === "b") { applyFormat("bold"); return consume(); }
    if (mod && !event.shiftKey && lower === "i") { applyFormat("italic"); return consume(); }
    if (mod && event.shiftKey && lower === "x") { applyFormat("strike"); return consume(); }
    if (mod && event.shiftKey && lower === "c") { applyFormat("codeblock"); return consume(); }
    if (event.key === "Escape" && isEdit) { event.stopPropagation(); onCancel?.(); return consume(); }
    if (event.key === "Escape" && quote) { event.stopPropagation(); onClearQuote?.(); return consume(); }
    if (event.key === "ArrowUp" && !text && !isEdit && onEditLast) { onEditLast(); return consume(); }
    if (event.key === "Enter") {
      const sendCombo = enterToSend ? !event.shiftKey && !event.altKey : mod;
      if (sendCombo && (!input()?.inCodeBlock?.() || mod)) {
        submit();
        return consume();
      }
    }
    return false;
  };

  const handlePlainPaste = (event) => {
    const files = Array.from(event.clipboardData?.files || []);
    if (files.length && allowAttachments) {
      event.preventDefault();
      addFiles(files);
    }
  };

  const remaining = MAX_MESSAGE_LENGTH - text.length;
  const activeInput = input();
  const formatActive = (kind) => Boolean(activeInput?.isActive?.(kind));

  if (disabled && disabledReason) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-[#2a3044] px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
        {disabledReason}
      </div>
    );
  }

  const plusItems = [
    allowAttachments && { id: "attach", label: "Upload a file", icon: FaPaperclip, onClick: () => fileInputRef.current?.click() },
    onCreatePoll && { id: "poll", label: "Create a poll", icon: FaPoll, onClick: onCreatePoll },
    gifKey && { id: "gif", label: "Add a GIF", icon: FaRegSmile, onClick: () => setPopover("gif") },
    searchEntities && { id: "ref", label: "Reference a task, doc or release", icon: FaTasks, hint: "[[", onClick: () => insertAtCaret("[[") },
    onSchedule && { id: "schedule", label: "Schedule message…", icon: FaRegClock, onClick: () => setPopover("schedule") },
  ].filter(Boolean);

  return (
    <div className="relative">
      <SuggestionList trigger={trigger} items={suggestions} cursor={cursor} onPick={pick} presence={presence} customEmoji={customEmoji} />
      <div className={`rounded-xl border bg-white dark:bg-[#1c2030] transition-shadow ${isEdit ? "border-blue-400 dark:border-blue-500/60" : "border-slate-300 dark:border-[#2a3044] focus-within:border-slate-400 dark:focus-within:border-slate-500 focus-within:shadow-sm"}`}>
        {quote && (
          <div className="flex items-start gap-2 border-b border-slate-100 dark:border-[#2a3044] px-3 py-2" data-testid="chat-quote-bar">
            <FaQuoteLeft className="mt-0.5 w-3 h-3 text-blue-500 flex-shrink-0" />
            <div className="min-w-0 flex-1 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-200">Replying to {quoteLabel || "message"}</p>
              <p className="truncate text-slate-500 dark:text-slate-400">{quote.preview}</p>
            </div>
            <button type="button" onClick={onClearQuote} aria-label="Cancel quote" className="h-5 w-5 inline-flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-white/10">
              <FaTimes className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
        {showFormatting && !isEdit && (
          <div className="flex items-center gap-0.5 px-2 pt-1.5 overflow-x-auto scrollbar-none">
            <ToolbarButton icon={FaBold} label={`Bold (${MOD}+B)`} active={formatActive("bold")} onClick={() => applyFormat("bold")} />
            <ToolbarButton icon={FaItalic} label={`Italic (${MOD}+I)`} active={formatActive("italic")} onClick={() => applyFormat("italic")} />
            <ToolbarButton icon={FaStrikethrough} label={`Strikethrough (${MOD}+Shift+X)`} active={formatActive("strike")} onClick={() => applyFormat("strike")} />
            <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-[#2a3044]" />
            <ToolbarButton icon={FaLink} label="Link" active={formatActive("link")} onClick={() => applyFormat("link")} />
            <ToolbarButton icon={FaListUl} label="Bulleted list" active={formatActive("bullet")} onClick={() => applyFormat("bullet")} />
            <ToolbarButton icon={FaListOl} label="Numbered list" active={formatActive("ordered")} onClick={() => applyFormat("ordered")} />
            <ToolbarButton icon={FaQuoteRight} label="Quote" active={formatActive("quote")} onClick={() => applyFormat("quote")} />
            <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-[#2a3044]" />
            <ToolbarButton icon={FaCode} label="Inline code" active={formatActive("code")} onClick={() => applyFormat("code")} />
            <ToolbarButton icon={FaTerminal} label={`Code block (${MOD}+Shift+C)`} active={formatActive("codeblock")} onClick={() => applyFormat("codeblock")} />
          </div>
        )}

        {useRich ? (
          <Suspense fallback={<div className="h-[44px]" />}>
            <RichComposerInput
              ref={richRef}
              initialText={initialText}
              placeholder={placeholder}
              disabled={disabled}
              autoFocus={autoFocus}
              onChange={handleChange}
              onKeyDown={handleKey}
              onSelectionChange={() => { refreshTrigger(); forceToolbar((value) => value + 1); }}
              onPasteFiles={allowAttachments ? addFiles : null}
              onBlur={() => { window.setTimeout(() => setTrigger(null), 120); onTyping?.(false); }}
            />
          </Suspense>
        ) : (
          <textarea
            ref={textareaRef}
            value={text}
            rows={1}
            disabled={disabled}
            placeholder={placeholder}
            aria-label={placeholder}
            data-testid={isEdit ? "chat-edit-input" : "chat-composer-input"}
            onChange={(event) => {
              handleChange(event.target.value);
              setTrigger(getActiveTrigger(event.target.value, event.target.selectionStart));
            }}
            onSelect={(event) => setTrigger(getActiveTrigger(event.currentTarget.value, event.currentTarget.selectionStart))}
            onKeyDown={handleKey}
            onPaste={handlePlainPaste}
            onBlur={() => { window.setTimeout(() => setTrigger(null), 120); onTyping?.(false); }}
            className="block w-full resize-none bg-transparent dark:bg-transparent px-3.5 py-2.5 text-[14.5px] leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none max-h-[260px] overflow-y-auto"
          />
        )}

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pb-2">
            {attachments.map((file) => (
              <div key={file.id} className="relative group">
                {isImageAttachment(file) ? (
                  <img src={file.url || file.dataUrl} alt={file.name} className="h-16 w-16 rounded-lg object-cover border border-slate-200 dark:border-[#2a3044]" />
                ) : (
                  <div className="h-16 w-44 flex items-center gap-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] px-2.5">
                    <FaFileAlt className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                      <p className="text-[11px] text-slate-400">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((entry) => entry.id !== file.id))}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-slate-800 text-white flex items-center justify-center shadow opacity-90 hover:opacity-100"
                  aria-label={`Remove ${file.name}`}
                >
                  <FaTimes className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-0.5 px-2 pb-1.5">
          {!isEdit && plusItems.length > 0 && (
            <div className="relative">
              <ToolbarButton icon={FaPlus} label="More actions" testId="chat-composer-plus" active={popover === "plus"} onClick={() => setPopover((value) => (value === "plus" ? null : "plus"))} />
              {popover === "plus" && <MenuPopover items={plusItems} align="left" placement="top" onClose={() => setPopover(null)} />}
            </div>
          )}
          {!isEdit && allowAttachments && (
            <>
              <ToolbarButton icon={FaPaperclip} label="Attach files" onClick={() => fileInputRef.current?.click()} />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(event) => { addFiles(Array.from(event.target.files || [])); event.target.value = ""; }}
              />
            </>
          )}
          <div className="relative">
            <ToolbarButton icon={FaRegSmile} label="Emoji" active={popover === "emoji"} onClick={() => setPopover((value) => (value === "emoji" ? null : "emoji"))} />
            {popover === "emoji" && (
              <EmojiPicker
                align="left"
                placement="top"
                onClose={() => setPopover(null)}
                onSelect={(emoji) => { insertAtCaret(/^:.+:$/.test(emoji) ? `${emoji} ` : emoji); setPopover(null); }}
              />
            )}
          </div>
          {!isEdit && gifKey && (
            <div className="relative">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setPopover((value) => (value === "gif" ? null : "gif"))}
                className={`h-7 px-1.5 rounded-md text-[10px] font-black tracking-wide ${popover === "gif" ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"}`}
                aria-label="GIF"
                title="GIF"
              >
                GIF
              </button>
              {popover === "gif" && (
                <GifPicker
                  apiKey={gifKey}
                  onClose={() => setPopover(null)}
                  onSelect={(gif) => {
                    setPopover(null);
                    setAttachments((prev) => [...prev, gifToAttachment(gif)].slice(0, 4));
                  }}
                />
              )}
            </div>
          )}
          <ToolbarButton icon={FaAt} label="Mention someone" onClick={() => insertAtCaret(text && !/\s$/.test(text) ? " @" : "@")} />
          {!isEdit && (
            <ToolbarButton icon={FaFont} label={showFormatting ? "Hide formatting" : "Show formatting"} active={showFormatting} onClick={() => setShowFormatting((value) => !value)} />
          )}
          {footerSlot}
          <div className="ml-auto flex items-center gap-2">
            {uploading && <span className="text-xs text-slate-400">Processing…</span>}
            {remaining < 300 && (
              <span className={`text-xs tabular-nums ${remaining < 0 ? "text-red-500" : "text-slate-400"}`}>{remaining}</span>
            )}
            {isEdit ? (
              <>
                <button type="button" onClick={onCancel} className="h-7 px-2.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5">
                  Cancel
                </button>
                <button type="button" disabled={!canSend} onClick={submit} className="h-7 px-3 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50">
                  Save
                </button>
              </>
            ) : (
              <div className="relative flex">
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={submit}
                  title={enterToSend ? "Send (Enter)" : `Send (${MOD}+Enter)`}
                  aria-label="Send message"
                  data-testid="chat-send"
                  className={`h-7 w-8 inline-flex items-center justify-center ${onSchedule ? "rounded-l-md" : "rounded-md"} transition-colors ${canSend ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-slate-100 dark:bg-[#232838] text-slate-400"}`}
                >
                  <FaPaperPlane className="w-3 h-3" />
                </button>
                {onSchedule && (
                  <button
                    type="button"
                    disabled={!text.trim() || attachments.length > 0}
                    onClick={() => setPopover((value) => (value === "schedule" ? null : "schedule"))}
                    title={attachments.length ? "Messages with attachments can't be scheduled" : "Schedule for later"}
                    aria-label="Schedule message"
                    data-testid="chat-schedule"
                    className={`h-7 w-5 inline-flex items-center justify-center rounded-r-md border-l transition-colors ${canSend && !attachments.length ? "bg-blue-600 text-white hover:bg-blue-500 border-blue-500" : "bg-slate-100 dark:bg-[#232838] text-slate-400 border-slate-200 dark:border-[#2a3044]"}`}
                  >
                    <FaChevronDown className="w-2 h-2" />
                  </button>
                )}
                {popover === "schedule" && (
                  <MenuPopover
                    placement="top"
                    width="w-64"
                    onClose={() => setPopover(null)}
                    items={[
                      { header: "Schedule message" },
                      ...getSchedulePresets().map((preset) => ({ id: preset.id, label: preset.label, icon: FaRegClock, onClick: () => schedule(preset.at) })),
                      { divider: true },
                      { id: "custom", label: "Custom time…", icon: FaRegClock, onClick: () => schedule(null) },
                    ]}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {!isEdit && (
        <p className="hidden md:block mt-1 px-1 text-[11px] text-slate-400">
          {enterToSend ? <><b className="font-semibold">Enter</b> to send · <b className="font-semibold">Shift+Enter</b> new line</> : <><b className="font-semibold">{MOD}+Enter</b> to send · <b className="font-semibold">Enter</b> new line</>}
          {" · "}<b className="font-semibold">@</b> mention · <b className="font-semibold">#</b> channel · <b className="font-semibold">[[</b> task/doc · <b className="font-semibold">/</b> commands · <b className="font-semibold">:</b> emoji
        </p>
      )}
    </div>
  );
});

export default MessageComposer;
