import React, { useState, useRef, useMemo } from "react";
import { taskKey } from "../../../shared/utils/helpers";
import { useApp } from "../../../shared/context/AppContext";
import { format, parseISO } from "date-fns";
import {
  FaComment, FaTrash, FaEdit, FaPaperPlane, FaBold, FaItalic,
  FaStrikethrough, FaCode, FaQuoteLeft, FaListUl, FaListOl,
  FaAt, FaHashtag, FaThumbtack, FaReply, FaCheck,
  FaTimes, FaChevronDown, FaChevronRight,
} from "react-icons/fa";

// ─── Constants ───────────────────────────────────────────────────────────────

const AVATAR_COLORS = {
  You: "bg-indigo-600",
};

const QUICK_EMOJIS = ["👍", "✅", "🎉", "💡", "🔥"];

const EMOJI_CATEGORIES = [
  { name: "Smileys", icon: "😊", emojis: ["😀","😂","😊","😍","🤔","😅","😢","😡","🥳","🤩","😎","🙄","😴","🤯","🥺","😬","🫡"] },
  { name: "Gestures", icon: "👍", emojis: ["👍","👎","👋","🙌","👏","🤝","💪","🙏","✌️","🤞","👌","🤙","🫶","🤜","🤛","💅"] },
  { name: "Objects", icon: "💡", emojis: ["💡","🔥","⚡","🎉","🎊","✅","❌","⚠️","🚀","💯","🎯","🏆","🔑","💎","🌟","❤️","💔"] },
  { name: "Tech",    icon: "💻", emojis: ["💻","🐛","🔧","📝","📋","🔍","📌","🏷️","🔒","🔓","📊","📈","🗑️","⚙️","🛠️","🧪","📡"] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(isoString) {
  try {
    const date = parseISO(isoString);
    const diffSecs = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSecs < 60)     return "just now";
    if (diffSecs < 3600)   return `${Math.floor(diffSecs / 60)}m ago`;
    if (diffSecs < 86400)  return `${Math.floor(diffSecs / 3600)}h ago`;
    if (diffSecs < 172800) return "yesterday";
    return format(date, "MMM d");
  } catch { return ""; }
}

// Inline markdown: **bold**, *italic*, ~~strike~~, `code`, @mention, CY-123
function renderInline(text, allTasks, onTaskClick) {
  const tokens = text.split(/(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|~~[^~\n]+?~~|`[^`\n]+?`|@\w+|CY-\d+)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith("**") && tok.endsWith("**") && tok.length > 4)
      return <strong key={i} className="font-bold text-slate-800 dark:text-slate-100">{tok.slice(2,-2)}</strong>;
    if (tok.startsWith("*") && tok.endsWith("*") && tok.length > 2)
      return <em key={i} className="italic">{tok.slice(1,-1)}</em>;
    if (tok.startsWith("~~") && tok.endsWith("~~") && tok.length > 4)
      return <del key={i} className="line-through text-slate-400">{tok.slice(2,-2)}</del>;
    if (tok.startsWith("`") && tok.endsWith("`") && tok.length > 2)
      return <code key={i} className="px-1 py-0.5 bg-slate-100 dark:bg-[#141720] text-rose-600 dark:text-rose-400 rounded text-[11px] font-mono">{tok.slice(1,-1)}</code>;
    if (tok.startsWith("@"))
      return <span key={i} className="inline-flex items-center px-1 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">@{tok.slice(1)}</span>;
    if (/^CY-\d+$/i.test(tok)) {
      const id = parseInt(tok.slice(3));
      const task = allTasks?.find(t => t.id === id);
      return (
        <button key={i} onClick={() => onTaskClick?.(id)}
          className="inline-flex items-center px-1 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-[#1a1f2e] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] hover:border-blue-400 hover:text-blue-600 transition-colors"
          title={task?.title}
        >{tok}</button>
      );
    }
    return tok;
  });
}

// Block-level markdown renderer
function renderMarkdown(text, allTasks, onTaskClick) {
  if (!text) return null;
  const parts = [];
  const codeRe = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0, m;
  while ((m = codeRe.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: "text", content: text.slice(last, m.index) });
    parts.push({ type: "code", lang: m[1], content: m[2].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", content: text.slice(last) });

  return parts.map((part, pi) => {
    if (part.type === "code") {
      return (
        <div key={pi} className="my-2 rounded-lg overflow-hidden border border-slate-200 dark:border-[#2a3044]">
          {part.lang && (
            <div className="px-3 py-1 bg-slate-100 dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-[#2a3044] text-[10px] font-mono text-slate-400">{part.lang}</div>
          )}
          <pre className="text-[11px] font-mono bg-slate-50 dark:bg-[#141720] text-slate-700 dark:text-[#a6e3a1] p-3 overflow-x-auto leading-relaxed whitespace-pre">{part.content}</pre>
        </div>
      );
    }
    const lines = part.content.split("\n");
    const els = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith("> ")) {
        const qLines = [];
        while (i < lines.length && lines[i].startsWith("> ")) { qLines.push(lines[i].slice(2)); i++; }
        els.push(
          <blockquote key={`q${i}`} className="border-l-2 border-blue-400 dark:border-blue-500 pl-3 my-1 text-slate-500 dark:text-slate-400 italic space-y-0.5">
            {qLines.map((l, j) => <div key={j}>{renderInline(l, allTasks, onTaskClick)}</div>)}
          </blockquote>
        );
        continue;
      }
      if (/^[-*+] /.test(line)) {
        const items = [];
        while (i < lines.length && /^[-*+] /.test(lines[i])) { items.push(lines[i].slice(2)); i++; }
        els.push(
          <ul key={`ul${i}`} className="list-disc list-inside my-1 space-y-0.5 pl-1">
            {items.map((item, j) => <li key={j} className="text-xs text-slate-700 dark:text-slate-300">{renderInline(item, allTasks, onTaskClick)}</li>)}
          </ul>
        );
        continue;
      }
      if (/^\d+\. /.test(line)) {
        const items = [];
        while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, "")); i++; }
        els.push(
          <ol key={`ol${i}`} className="list-decimal list-inside my-1 space-y-0.5 pl-1">
            {items.map((item, j) => <li key={j} className="text-xs text-slate-700 dark:text-slate-300">{renderInline(item, allTasks, onTaskClick)}</li>)}
          </ol>
        );
        continue;
      }
      if (line.trim() === "") { els.push(<div key={`br${i}`} className="h-1" />); i++; continue; }
      els.push(
        <div key={`l${i}`} className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {renderInline(line, allTasks, onTaskClick)}
        </div>
      );
      i++;
    }
    return <div key={pi}>{els}</div>;
  });
}

// ─── ToolbarBtn ───────────────────────────────────────────────────────────────

function ToolbarBtn({ icon: Icon, label, onClick, title, active }) {
  return (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1 rounded transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#2a3044] ${active ? "bg-slate-200 dark:bg-[#2a3044] text-slate-700 dark:text-slate-200" : ""}`}
    >
      {Icon ? <Icon className="w-3 h-3" /> : <span className="text-[10px] font-mono leading-none font-bold">{label}</span>}
    </button>
  );
}

// ─── CommentEditor ────────────────────────────────────────────────────────────

function CommentEditor({ value, onChange, onSubmit, onCancel, placeholder, autoFocus, allTasks, replyTo, onCancelReply }) {
  const { teamMembers } = useApp();
  const taRef = useRef(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiCat, setEmojiCat] = useState(0);
  const [mentionQ, setMentionQ] = useState(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [taskQ, setTaskQ] = useState(null);
  const [taskStart, setTaskStart] = useState(0);

  const applyFormat = (prefix, suffix = prefix) => {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const selected = value.slice(s, e);
    onChange(value.slice(0, s) + prefix + selected + suffix + value.slice(e));
    setTimeout(() => { ta.selectionStart = s + prefix.length; ta.selectionEnd = e + prefix.length; ta.focus(); }, 0);
  };

  const applyCodeBlock = () => {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const selected = value.slice(s, e);
    const before = value.slice(0, s);
    const after = value.slice(e);
    const nl = (before && !before.endsWith("\n")) ? "\n" : "";
    const inner = selected || "code here";
    const block = `${nl}\`\`\`\n${inner}\n\`\`\`\n`;
    onChange(before + block + after);
    const cur = before.length + nl.length + 4;
    setTimeout(() => { ta.selectionStart = cur; ta.selectionEnd = cur + inner.length; ta.focus(); }, 0);
  };

  const applyBlockquote = () => {
    const ta = taRef.current; if (!ta) return;
    const s = ta.selectionStart, e = ta.selectionEnd;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const chunk = value.slice(lineStart, e || lineStart + 1);
    const quoted = chunk.split("\n").map(l => `> ${l}`).join("\n");
    onChange(value.slice(0, lineStart) + quoted + value.slice(e || lineStart + 1));
  };

  const applyList = (ordered) => {
    const ta = taRef.current; if (!ta) return;
    const pos = ta.selectionStart;
    const before = value.slice(0, pos);
    const nl = (before && !before.endsWith("\n")) ? "\n" : "";
    const items = ordered ? "1. \n2. \n3. " : "- \n- \n- ";
    onChange(before + nl + items + value.slice(pos));
    setTimeout(() => { const np = before.length + nl.length + (ordered ? 3 : 2); ta.selectionStart = ta.selectionEnd = np; ta.focus(); }, 0);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    const pos = e.target.selectionStart;
    const before = v.slice(0, pos);
    const mentionM = before.match(/@(\w*)$/);
    if (mentionM) {
      setMentionQ(mentionM[1]); setMentionStart(pos - mentionM[0].length); setTaskQ(null);
    } else {
      setMentionQ(null);
      const taskM = before.match(/(?:#|CY-)(\w*)$/i);
      if (taskM) { setTaskQ(taskM[1]); setTaskStart(pos - taskM[0].length); }
      else setTaskQ(null);
    }
  };

  const insertMention = (name) => {
    const end = taRef.current?.selectionStart ?? mentionStart;
    onChange(value.slice(0, mentionStart) + `@${name} ` + value.slice(end));
    setMentionQ(null);
    setTimeout(() => { const np = mentionStart + name.length + 2; taRef.current.selectionStart = taRef.current.selectionEnd = np; taRef.current.focus(); }, 0);
  };

  const insertTaskRef = (id) => {
    const end = taRef.current?.selectionStart ?? taskStart;
    onChange(value.slice(0, taskStart) + `CY-${id} ` + value.slice(end));
    setTaskQ(null);
    setTimeout(() => { const np = taskStart + `CY-${id} `.length; taRef.current.selectionStart = taRef.current.selectionEnd = np; taRef.current.focus(); }, 0);
  };

  const insertEmoji = (emoji) => {
    const ta = taRef.current; if (!ta) return;
    const pos = ta.selectionStart;
    onChange(value.slice(0, pos) + emoji + value.slice(pos));
    setShowEmoji(false);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = pos + emoji.length; ta.focus(); }, 0);
  };

  const handleKeyDown = (e) => {
    if (mentionQ !== null || taskQ !== null) {
      if (e.key === "Escape") { e.stopPropagation(); setMentionQ(null); setTaskQ(null); }
      return;
    }
    if (e.key === "Escape") { setShowEmoji(false); onCancel?.(); return; }
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") { e.preventDefault(); applyFormat("**"); }
      if (e.key === "i") { e.preventDefault(); applyFormat("*"); }
      if (e.key === "Enter") { e.preventDefault(); onSubmit?.(); }
    }
  };

  const mentionResults = mentionQ !== null ? teamMembers.filter(m => m.value && m.value !== "unassigned" && m.label.toLowerCase().startsWith(mentionQ.toLowerCase())).map(m => m.value) : [];
  const taskResults = taskQ !== null
    ? (allTasks || []).filter(t => t.id?.toString().includes(taskQ) || t.title?.toLowerCase().includes(taskQ.toLowerCase())).slice(0, 6)
    : [];

  return (
    <div className="relative space-y-0">
      {replyTo && (
        <div className="flex items-center gap-1.5 px-2 py-1 mb-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700">
          <FaReply className="w-2.5 h-2.5 flex-shrink-0" />
          <span>Replying to <strong>@{replyTo.user}</strong>: <span className="opacity-60 truncate">{replyTo.text?.slice(0, 40)}{(replyTo.text?.length ?? 0) > 40 ? "…" : ""}</span></span>
          <button onMouseDown={(e) => { e.preventDefault(); onCancelReply?.(); }} className="ml-auto flex-shrink-0 hover:text-blue-700"><FaTimes className="w-2.5 h-2.5" /></button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-1.5 py-1 bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-[#2a3044] rounded-t-lg">
        <ToolbarBtn icon={FaBold}          onClick={() => applyFormat("**")}     title="Bold (Ctrl+B)" />
        <ToolbarBtn icon={FaItalic}        onClick={() => applyFormat("*")}      title="Italic (Ctrl+I)" />
        <ToolbarBtn icon={FaStrikethrough} onClick={() => applyFormat("~~")}     title="Strikethrough" />
        <div className="w-px h-3.5 bg-slate-200 dark:bg-[#2a3044] mx-0.5 flex-shrink-0" />
        <ToolbarBtn icon={FaCode}          onClick={() => applyFormat("`")}      title="Inline code" />
        <ToolbarBtn label="```"            onClick={applyCodeBlock}              title="Code block" />
        <div className="w-px h-3.5 bg-slate-200 dark:bg-[#2a3044] mx-0.5 flex-shrink-0" />
        <ToolbarBtn icon={FaQuoteLeft}     onClick={applyBlockquote}             title="Blockquote" />
        <ToolbarBtn icon={FaListUl}        onClick={() => applyList(false)}      title="Bullet list" />
        <ToolbarBtn icon={FaListOl}        onClick={() => applyList(true)}       title="Numbered list" />
        <div className="w-px h-3.5 bg-slate-200 dark:bg-[#2a3044] mx-0.5 flex-shrink-0" />
        <ToolbarBtn icon={FaAt} onClick={() => {
          const ta = taRef.current; if (!ta) return;
          const pos = ta.selectionStart;
          onChange(value.slice(0, pos) + "@" + value.slice(pos));
          setTimeout(() => { ta.selectionStart = ta.selectionEnd = pos + 1; ta.focus(); }, 0);
        }} title="Mention (@)" />
        <ToolbarBtn icon={FaHashtag} onClick={() => {
          const ta = taRef.current; if (!ta) return;
          const pos = ta.selectionStart;
          onChange(value.slice(0, pos) + "#" + value.slice(pos));
          setTimeout(() => { ta.selectionStart = ta.selectionEnd = pos + 1; ta.focus(); }, 0);
        }} title="Task reference (#)" />
        <div className="w-px h-3.5 bg-slate-200 dark:bg-[#2a3044] mx-0.5 flex-shrink-0" />
        <button
          onMouseDown={(e) => { e.preventDefault(); setShowEmoji(p => !p); }}
          className={`px-1 py-0.5 rounded transition-colors text-base leading-none ${showEmoji ? "bg-slate-200 dark:bg-[#2a3044]" : "hover:bg-slate-200 dark:hover:bg-[#2a3044]"}`}
          title="Emoji"
        >😊</button>
      </div>

      {/* Textarea */}
      <textarea
        ref={taRef}
        autoFocus={autoFocus}
        className="w-full border border-slate-200 dark:border-[#2a3044] border-t-0 rounded-b-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1c2030] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-slate-400 dark:placeholder-slate-600"
        rows={value ? 4 : 3}
        placeholder={placeholder || "Add a comment… (Ctrl+Enter to submit)"}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />

      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute z-50 bottom-full right-0 mb-1 w-56 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-xl overflow-hidden">
          <div className="flex border-b border-slate-100 dark:border-[#2a3044]">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button key={i} onMouseDown={(e) => { e.preventDefault(); setEmojiCat(i); }}
                className={`flex-1 py-1.5 text-base transition-colors ${emojiCat === i ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-[#232838]"}`}
                title={cat.name}
              >{cat.icon}</button>
            ))}
          </div>
          <div className="p-2 grid grid-cols-9 gap-0.5 max-h-28 overflow-y-auto">
            {EMOJI_CATEGORIES[emojiCat].emojis.map((emoji, i) => (
              <button key={i} onMouseDown={(e) => { e.preventDefault(); insertEmoji(emoji); }}
                className="p-0.5 text-base rounded hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors leading-tight"
              >{emoji}</button>
            ))}
          </div>
        </div>
      )}

      {/* @mention dropdown */}
      {mentionQ !== null && mentionResults.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-0.5 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg shadow-lg overflow-hidden min-w-36">
          {mentionResults.map(name => (
            <button key={name} onMouseDown={(e) => { e.preventDefault(); insertMention(name); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors"
            >
              <div className={`w-5 h-5 rounded-full ${AVATAR_COLORS[name] || "bg-slate-500"} flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0`}>
                {name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-slate-700 dark:text-slate-300 capitalize">{name}</span>
            </button>
          ))}
        </div>
      )}

      {/* #task ref dropdown */}
      {taskQ !== null && taskResults.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-0.5 w-full max-h-44 overflow-y-auto bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg shadow-lg">
          {taskResults.map(t => (
            <button key={t.id} onMouseDown={(e) => { e.preventDefault(); insertTaskRef(t.id); }}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-colors"
            >
              <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">{taskKey(t.id)}</span>
              <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{t.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Submit row */}
      {value.trim() && (
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-slate-400">{value.length} chars · Ctrl+Enter</span>
          <div className="flex gap-1.5">
            {onCancel && (
              <button onClick={onCancel} className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Cancel</button>
            )}
            <button onClick={onSubmit} className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors">
              <FaPaperPlane className="w-2.5 h-2.5" />Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CommentBubble ────────────────────────────────────────────────────────────

function CommentBubble({ comment: c, allTasks, isOwn, isEditing, editingText, onEditTextChange, onStartEdit, onSaveEdit, onCancelEdit, onDelete, onReact, onPin, onReply, onTaskClick, isReply }) {
  const { users } = useApp();
  const initial  = c.user === "You" ? "Y" : c.user.charAt(0).toUpperCase();
  const reactions = c.reactions || {};
  const userObj  = c.user !== "You" ? users?.find((u) => u.username === c.user) : null;
  const avatarColor = c.user === "You" ? "#4f46e5" : (userObj?.color || "#64748b");

  return (
    <div className="flex gap-2 group/bubble">
      {/* Avatar */}
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: avatarColor }}>{initial}</div>

      <div className="flex-1 min-w-0">
        {/* Meta row */}
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{c.user}</span>
          {isOwn && <span className="text-[9px] px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded font-medium">You</span>}
          {c.pinned && (
            <span className="text-[9px] flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded font-medium">
              <FaThumbtack className="w-2 h-2" />Pinned
            </span>
          )}
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{formatRelativeTime(c.timestamp)}</span>
          {c.edited && <span className="text-[9px] text-slate-400 dark:text-slate-500 italic">(edited)</span>}
        </div>

        {isEditing ? (
          <div className="space-y-1.5">
            <textarea
              autoFocus
              className="w-full border border-blue-300 dark:border-blue-500 rounded-lg px-3 py-2 text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-[#1c2030] resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
              rows={3}
              value={editingText}
              onChange={(e) => onEditTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); onSaveEdit(); }
                if (e.key === "Escape") onCancelEdit();
              }}
            />
            <div className="flex gap-1.5 justify-end">
              <button onClick={onCancelEdit} className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
              <button onClick={onSaveEdit} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
                <FaCheck className="w-2.5 h-2.5" />Save
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="bg-slate-50 dark:bg-[#232838] rounded-lg px-3 py-2 text-xs">
              {renderMarkdown(c.text, allTasks, onTaskClick)}
            </div>

            {/* Hover action toolbar */}
            <div className="absolute -top-3 right-1 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-0.5 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg px-1 py-0.5 shadow-md z-10">
              {QUICK_EMOJIS.map(emoji => (
                <button key={emoji} onClick={() => onReact(emoji)}
                  className={`text-xs px-0.5 rounded transition-all leading-none hover:scale-125 ${(reactions[emoji] || []).includes("You") ? "opacity-100" : "opacity-40 hover:opacity-100"}`}
                  title={`React with ${emoji}`}
                >{emoji}</button>
              ))}
              <div className="w-px h-3 bg-slate-200 dark:bg-[#2a3044] mx-0.5" />
              <button
                onClick={onPin}
                className={`p-0.5 transition-colors ${c.pinned ? "text-amber-500" : "text-slate-400 hover:text-amber-500"}`}
                title={c.pinned ? "Unpin" : "Pin"}
              >
                <FaThumbtack className="w-2.5 h-2.5" />
              </button>
              {isOwn && (
                <>
                  <div className="w-px h-3 bg-slate-200 dark:bg-[#2a3044] mx-0.5" />
                  <button onClick={onStartEdit} className="p-0.5 text-slate-400 hover:text-blue-500 transition-colors" title="Edit">
                    <FaEdit className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={onDelete} className="p-0.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                    <FaTrash className="w-2.5 h-2.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Reaction chips */}
        {Object.keys(reactions).length > 0 && !isEditing && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(reactions).map(([emoji, users]) =>
              users.length > 0 ? (
                <button key={emoji} onClick={() => onReact(emoji)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-all ${
                    users.includes("You")
                      ? "bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                      : "bg-slate-50 border-slate-200 dark:bg-[#232838] dark:border-[#2a3044] text-slate-600 dark:text-slate-400 hover:border-blue-300"
                  }`}
                  title={users.join(", ")}
                >
                  <span>{emoji}</span><span>{users.length}</span>
                </button>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CommentSection ───────────────────────────────────────────────────────────

export default function CommentSection({ savedComments = [], allTasks = [], onUpdate, onTaskRefClick, taskTitle, taskId }) {
  const { addNotification } = useApp();
  const [localNew,       setLocalNew]       = useState([]);
  const [compose,        setCompose]        = useState("");
  const [editingId,      setEditingId]      = useState(null);
  const [editingText,    setEditingText]    = useState("");
  const [collapsed,      setCollapsed]      = useState(new Set());
  const [inlineReplyId,  setInlineReplyId]  = useState(null);
  const [inlineReplyText,setInlineReplyText]= useState("");

  const savedIds    = useMemo(() => new Set(savedComments.map(c => c.id)), [savedComments]);
  const allComments = useMemo(() => [
    ...localNew.filter(c => !savedIds.has(c.id)),
    ...savedComments,
  ], [localNew, savedComments, savedIds]);

  const { topLevel, repliesMap } = useMemo(() => {
    const pinned   = allComments.filter(c =>  c.pinned && !c.replyTo);
    const unpinned = allComments.filter(c => !c.pinned && !c.replyTo);
    const topLevel = [...pinned, ...unpinned];
    const repliesMap = {};
    allComments.filter(c => c.replyTo).forEach(c => {
      repliesMap[c.replyTo] = [...(repliesMap[c.replyTo] || []), c];
    });
    return { topLevel, repliesMap };
  }, [allComments]);

  const pushUpdate = (newAll) => onUpdate?.(newAll);

  const mutate = (updater) => {
    const newAll = allComments.map(updater);
    setLocalNew(p => p.map(updater));
    pushUpdate(newAll);
  };

  const handlePost = () => {
    if (!compose.trim()) return;
    const c = {
      id: Date.now(),
      text: compose.trim(),
      user: "You",
      timestamp: new Date().toISOString(),
      replyTo: null,
      reactions: {},
      pinned: false,
    };
    const newAll = [c, ...allComments];
    setLocalNew(p => [c, ...p]);
    setCompose("");
    pushUpdate(newAll);
    if (taskTitle) {
      addNotification({ type: "comment", taskId, taskTitle, text: `You commented on "${taskTitle}"` });
      // Fire mention notifications for each @username in the comment
      const mentions = [...new Set((compose.trim().match(/@(\w+)/g) || []).map(m => m.slice(1)))];
      mentions.forEach(username => {
        addNotification({ type: "mention", taskId, taskTitle, text: `@${username} was mentioned in "${taskTitle}"` });
      });
    }
  };

  const handlePostReply = (parentId) => {
    if (!inlineReplyText.trim()) return;
    const c = {
      id: Date.now(),
      text: inlineReplyText.trim(),
      user: "You",
      timestamp: new Date().toISOString(),
      replyTo: parentId,
      reactions: {},
      pinned: false,
    };
    const newAll = [...allComments, c];
    setLocalNew(p => [...p, c]);
    setInlineReplyText("");
    setInlineReplyId(null);
    // Auto-expand replies for this comment
    setCollapsed(p => { const s = new Set(p); s.delete(parentId); return s; });
    pushUpdate(newAll);
  };

  const handleDelete = (id) => {
    const newAll = allComments.filter(c => c.id !== id && c.replyTo !== id);
    setLocalNew(p => p.filter(c => c.id !== id && c.replyTo !== id));
    pushUpdate(newAll);
  };

  const handleSaveEdit = () => {
    if (!editingText.trim()) return;
    const text = editingText.trim();
    mutate(c => c.id === editingId ? { ...c, text, edited: true } : c);
    setEditingId(null);
    setEditingText("");
  };

  const handleReaction = (commentId, emoji) => {
    mutate(c => {
      if (c.id !== commentId) return c;
      const reactions = { ...(c.reactions || {}) };
      const cur = reactions[emoji] || [];
      reactions[emoji] = cur.includes("You") ? cur.filter(u => u !== "You") : [...cur, "You"];
      if (!reactions[emoji].length) delete reactions[emoji];
      return { ...c, reactions };
    });
  };

  const handlePin = (commentId) => mutate(c => c.id === commentId ? { ...c, pinned: !c.pinned } : c);

  const totalCount = allComments.length;

  return (
    <div className="border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-[#232838] border-b border-slate-200 dark:border-[#2a3044]">
        <FaComment className="w-3 h-3 text-slate-400" />
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Comments</span>
        {totalCount > 0 && (
          <span className="text-xs text-slate-400 bg-slate-200 dark:bg-[#2a3044] px-1.5 rounded-full">{totalCount}</span>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Compose area — top-level only */}
        <CommentEditor
          value={compose}
          onChange={setCompose}
          onSubmit={handlePost}
          allTasks={allTasks}
        />

        {/* Comment list */}
        {topLevel.length === 0 ? (
          <div className="py-5 text-center border-t border-slate-100 dark:border-[#2a3044]">
            <FaComment className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
            <p className="text-xs text-slate-400 dark:text-slate-500">No comments yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-[#2a3044]">
            {topLevel.map(c => {
              const replies    = repliesMap[c.id] || [];
              const isCollapsed = collapsed.has(c.id);
              const isReplying  = inlineReplyId === c.id;
              return (
                <div key={c.id}>
                  <CommentBubble
                    comment={c}
                    allTasks={allTasks}
                    isOwn={c.user === "You"}
                    isEditing={editingId === c.id}
                    editingText={editingText}
                    onEditTextChange={setEditingText}
                    onStartEdit={() => { setEditingId(c.id); setEditingText(c.text); }}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={() => { setEditingId(null); setEditingText(""); }}
                    onDelete={() => handleDelete(c.id)}
                    onReact={(emoji) => handleReaction(c.id, emoji)}
                    onPin={() => handlePin(c.id)}
                    onReply={() => { setInlineReplyId(c.id); setInlineReplyText(""); }}
                    onTaskClick={onTaskRefClick}
                  />

                  {/* Thread: replies + inline reply box */}
                  <div className="ml-8 mt-2 space-y-2">
                    {/* Collapse / expand toggle */}
                    {replies.length > 0 && (
                      <button
                        onClick={() => setCollapsed(p => { const s = new Set(p); s.has(c.id) ? s.delete(c.id) : s.add(c.id); return s; })}
                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        {isCollapsed ? <FaChevronRight className="w-2 h-2" /> : <FaChevronDown className="w-2 h-2" />}
                        {replies.length} {replies.length === 1 ? "reply" : "replies"}
                      </button>
                    )}

                    {/* Existing replies */}
                    {!isCollapsed && replies.length > 0 && (
                      <div className="space-y-2 border-l-2 border-slate-100 dark:border-[#2a3044] pl-3">
                        {replies.map(r => (
                          <CommentBubble
                            key={r.id}
                            comment={r}
                            allTasks={allTasks}
                            isOwn={r.user === "You"}
                            isEditing={editingId === r.id}
                            editingText={editingText}
                            onEditTextChange={setEditingText}
                            onStartEdit={() => { setEditingId(r.id); setEditingText(r.text); }}
                            onSaveEdit={handleSaveEdit}
                            onCancelEdit={() => { setEditingId(null); setEditingText(""); }}
                            onDelete={() => handleDelete(r.id)}
                            onReact={(emoji) => handleReaction(r.id, emoji)}
                            onPin={() => handlePin(r.id)}
                            onTaskClick={onTaskRefClick}
                            isReply
                          />
                        ))}
                      </div>
                    )}

                    {/* Inline reply editor */}
                    {isReplying && (
                      <div className="border-l-2 border-blue-300 dark:border-blue-600 pl-3">
                        <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-blue-500 dark:text-blue-400 font-medium">
                          <FaReply className="w-2.5 h-2.5" />
                          Replying to <span className="font-semibold">@{c.user}</span>
                          <button
                            onClick={() => { setInlineReplyId(null); setInlineReplyText(""); }}
                            className="ml-auto p-0.5 text-blue-400 hover:text-blue-600 dark:hover:text-blue-200 transition-colors"
                            title="Cancel reply"
                          >
                            <FaTimes className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <CommentEditor
                          value={inlineReplyText}
                          onChange={setInlineReplyText}
                          onSubmit={() => handlePostReply(c.id)}
                          onCancel={() => { setInlineReplyId(null); setInlineReplyText(""); }}
                          placeholder={`Reply to @${c.user}… (Ctrl+Enter)`}
                          autoFocus
                          allTasks={allTasks}
                        />
                      </div>
                    )}

                    {/* "Reply" link when not already open */}
                    {!isReplying && (
                      <button
                        onClick={() => { setInlineReplyId(c.id); setInlineReplyText(""); }}
                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-500 transition-colors"
                      >
                        <FaReply className="w-2.5 h-2.5" />
                        Reply
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
