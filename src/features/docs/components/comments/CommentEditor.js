import React, { useRef, useState } from "react";
import {
  FaAt, FaBold, FaCode, FaHashtag, FaItalic, FaListOl, FaListUl, FaPaperPlane, FaQuoteLeft, FaStrikethrough,
} from "react-icons/fa";
import { taskKey } from "../../../../shared/utils/helpers";
import { useApp } from "../../../../shared/context/AppContext";
import { EMOJI_CATEGORIES } from "./commentMarkdown";

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

export default function CommentEditor({ value, onChange, onSubmit, onCancel, placeholder, autoFocus, allTasks }) {
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
    setTimeout(() => { const np = mentionStart + name.length + 2; if (!taRef.current) return; taRef.current.selectionStart = taRef.current.selectionEnd = np; taRef.current.focus(); }, 0);
  };

  const insertTaskRef = (id) => {
    const ref = taskKey(id);
    const end = taRef.current?.selectionStart ?? taskStart;
    onChange(value.slice(0, taskStart) + `${ref} ` + value.slice(end));
    setTaskQ(null);
    setTimeout(() => { const np = taskStart + `${ref} `.length; if (!taRef.current) return; taRef.current.selectionStart = taRef.current.selectionEnd = np; taRef.current.focus(); }, 0);
  };

  const insertEmoji = (emoji) => {
    const ta = taRef.current; if (!ta) return;
    const pos = ta.selectionStart;
    onChange(value.slice(0, pos) + emoji + value.slice(pos));
    setShowEmoji(false);
    setTimeout(() => { ta.selectionStart = ta.selectionEnd = pos + emoji.length; ta.focus(); }, 0);
  };

  const handleKeyDown = (e) => {
    // Typing in a comment: ⌘K / Ctrl+K must not toggle the global command palette.
    if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === "k") e.stopPropagation();
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

  const mentionResults = mentionQ !== null
    ? (teamMembers || [])
        .filter(m => m.value && m.value !== "unassigned" && (
          String(m.label || "").toLowerCase().startsWith(mentionQ.toLowerCase())
          || String(m.value).toLowerCase().startsWith(mentionQ.toLowerCase())
        ))
        .map(m => m.value)
        .slice(0, 8)
    : [];
  const taskResults = taskQ !== null
    ? (allTasks || []).filter(t => {
        const q = taskQ.toLowerCase();
        return taskKey(t.id).toLowerCase().includes(q) || String(t.id ?? "").toLowerCase().includes(q) || t.title?.toLowerCase().includes(q);
      }).slice(0, 6)
    : [];

  return (
    <div className="relative space-y-0">
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
              <div className="w-5 h-5 rounded-full bg-slate-500 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
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
