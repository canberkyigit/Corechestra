import React from "react";
import { format, parseISO } from "date-fns";
import { findTaskByRef } from "../../utils/commentModel";

export const QUICK_EMOJIS = ["👍", "✅", "🎉", "💡", "🔥"];

export const EMOJI_CATEGORIES = [
  { name: "Smileys", icon: "😊", emojis: ["😀","😂","😊","😍","🤔","😅","😢","😡","🥳","🤩","😎","🙄","😴","🤯","🥺","😬","🫡"] },
  { name: "Gestures", icon: "👍", emojis: ["👍","👎","👋","🙌","👏","🤝","💪","🙏","✌️","🤞","👌","🤙","🫶","🤜","🤛","💅"] },
  { name: "Objects", icon: "💡", emojis: ["💡","🔥","⚡","🎉","🎊","✅","❌","⚠️","🚀","💯","🎯","🏆","🔑","💎","🌟","❤️","💔"] },
  { name: "Tech",    icon: "💻", emojis: ["💻","🐛","🔧","📝","📋","🔍","📌","🏷️","🔒","🔓","📊","📈","🗑️","⚙️","🛠️","🧪","📡"] },
];

export function formatRelativeTime(isoString) {
  if (!isoString) return "";
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
      const task = findTaskByRef(allTasks, tok);
      const chipClass = "inline-flex items-center px-1 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-[#1a1f2e] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044]";
      if (!onTaskClick || !task) {
        return <span key={i} className={chipClass} title={task?.title || "Task not found in this project"}>{tok.toUpperCase()}</span>;
      }
      return (
        <button key={i} type="button" onClick={() => onTaskClick(task)}
          className={`${chipClass} hover:border-blue-400 hover:text-blue-600 transition-colors`}
          title={task.title}
        >{tok.toUpperCase()}</button>
      );
    }
    return tok;
  });
}

// Block-level markdown renderer
export function renderMarkdown(text, allTasks, onTaskClick) {
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
