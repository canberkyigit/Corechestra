import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MDEditor from "@uiw/react-md-editor";
import {
  FaTrash, FaPlus, FaStickyNote, FaChevronRight, FaClock,
  FaBold, FaItalic, FaStrikethrough, FaCode, FaListUl, FaListOl, FaQuoteLeft, FaMinus, FaLink,
} from "react-icons/fa";
import { useApp } from "../../../../shared/context/AppContext";

function ToolbarButton({ onClick, title, active, children }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => { event.preventDefault(); onClick(); }}
      title={title}
      className={`px-2 py-1.5 rounded text-xs transition-colors ${
        active
          ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#2a3044] hover:text-slate-700 dark:hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

const Separator = () => <span className="w-px h-4 bg-slate-200 dark:bg-[#2a3044] mx-0.5 flex-shrink-0" />;

export default function RetroNotes() {
  const { notesList: notesListRaw, addNote, deleteNote, darkMode } = useApp();
  const notesList = notesListRaw || [];
  const colorMode = darkMode ? "dark" : "light";
  const [draft, setDraft] = useState("");
  const [openNote, setOpenNote] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef(null);

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // Insert markdown syntax around selection or at cursor
  const insertFormat = useCallback((before, after = "") => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = draft.substring(start, end);
    const replacement = before + (selected || "text") + after;
    const newDraft = draft.substring(0, start) + replacement + draft.substring(end);
    setDraft(newDraft);
    setTimeout(() => {
      ta.focus();
      const cursorPos = selected ? start + replacement.length : start + before.length;
      const selectEnd = selected ? cursorPos : cursorPos + 4; // select "text" placeholder
      ta.setSelectionRange(selected ? cursorPos : start + before.length, selectEnd);
    }, 0);
  }, [draft]);

  const insertLine = useCallback((prefix) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = draft.lastIndexOf("\n", start - 1) + 1;
    const newDraft = draft.substring(0, lineStart) + prefix + draft.substring(lineStart);
    setDraft(newDraft);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + prefix.length, start + prefix.length); }, 0);
  }, [draft]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Editor card */}
      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm overflow-hidden">
        {/* Toolbar + Write/Preview toggle */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-[#232838] bg-slate-50/50 dark:bg-[#161b27]">
          {/* Formatting buttons */}
          <div className="flex items-center gap-0.5 flex-wrap">
            <ToolbarButton onClick={() => insertFormat("**", "**")} title="Bold"><FaBold className="w-3 h-3" /></ToolbarButton>
            <ToolbarButton onClick={() => insertFormat("*", "*")} title="Italic"><FaItalic className="w-3 h-3" /></ToolbarButton>
            <ToolbarButton onClick={() => insertFormat("~~", "~~")} title="Strikethrough"><FaStrikethrough className="w-3 h-3" /></ToolbarButton>
            <ToolbarButton onClick={() => insertFormat("`", "`")} title="Inline code"><FaCode className="w-3 h-3" /></ToolbarButton>
            <Separator />
            <ToolbarButton onClick={() => insertLine("# ")} title="Heading 1"><span className="font-bold text-[11px]">H1</span></ToolbarButton>
            <ToolbarButton onClick={() => insertLine("## ")} title="Heading 2"><span className="font-bold text-[11px]">H2</span></ToolbarButton>
            <ToolbarButton onClick={() => insertLine("### ")} title="Heading 3"><span className="font-bold text-[11px]">H3</span></ToolbarButton>
            <Separator />
            <ToolbarButton onClick={() => insertLine("- ")} title="Bullet list"><FaListUl className="w-3 h-3" /></ToolbarButton>
            <ToolbarButton onClick={() => insertLine("1. ")} title="Ordered list"><FaListOl className="w-3 h-3" /></ToolbarButton>
            <ToolbarButton onClick={() => insertLine("> ")} title="Blockquote"><FaQuoteLeft className="w-3 h-3" /></ToolbarButton>
            <Separator />
            <ToolbarButton onClick={() => insertFormat("[", "](url)")} title="Link"><FaLink className="w-3 h-3" /></ToolbarButton>
            <ToolbarButton onClick={() => insertFormat("\n---\n", "")} title="Horizontal rule"><FaMinus className="w-3 h-3" /></ToolbarButton>
            <ToolbarButton onClick={() => insertFormat("\n```\n", "\n```")} title="Code block"><span className="font-mono text-[10px]">{"```"}</span></ToolbarButton>
          </div>
          {/* Write / Preview toggle */}
          <div className="flex items-center gap-1 ml-3 flex-shrink-0">
            <button
              onClick={() => setShowPreview(false)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${!showPreview ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#232838]"}`}
            >
              Write
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${showPreview ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#232838]"}`}
            >
              Preview
            </button>
          </div>
        </div>

        {/* Editor / Preview area */}
        <div className="p-4">
          {!showPreview ? (
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write your sprint notes here…"
              className="w-full min-h-[160px] bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none font-mono leading-relaxed"
            />
          ) : (
            <div className="min-h-[160px] prose prose-sm dark:prose-invert max-w-none">
              {draft.trim() ? (
                <div data-color-mode={colorMode}>
                  <MDEditor.Markdown source={draft} style={{ background: "transparent", fontSize: 14 }} />
                </div>
              ) : (
                <p className="text-slate-400 dark:text-slate-500 italic text-sm">Nothing to preview yet…</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-[#232838] bg-slate-50/30 dark:bg-[#161b27]">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {draft.length > 0 ? `${draft.length} characters` : ""}
          </span>
          <button
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={() => { addNote(draft); setDraft(""); setShowPreview(false); }}
            disabled={!draft.trim()}
          >
            <FaPlus className="w-3 h-3" />
            Save Note
          </button>
        </div>
      </div>

      {/* Saved notes list */}
      {notesList.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FaStickyNote className="w-3.5 h-3.5 text-slate-400" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Saved Notes
            </h4>
            <span className="text-xs bg-slate-100 dark:bg-[#2a3044] text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">
              {notesList.length}
            </span>
          </div>

          <AnimatePresence>
            {notesList.map((note, i) => {
              const summary = String(note.content || "").replace(/[#*_>\-[\]!`]/g, "").split("\n")[0].slice(0, 100);
              const isOpen = openNote === note.id;
              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
                    onClick={() => setOpenNote(isOpen ? null : note.id)}
                  >
                    <span className="text-slate-400 dark:text-slate-500 flex-shrink-0 transition-transform duration-200" style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
                      <FaChevronRight className="w-2.5 h-2.5" />
                    </span>
                    <span className="text-slate-700 dark:text-slate-200 font-medium text-sm truncate flex-1">{summary || "Untitled note"}</span>
                    {note.author && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0 capitalize">{note.author}</span>
                    )}
                    {note.createdAt && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">
                        <FaClock className="w-2.5 h-2.5" />
                        {formatDate(note.createdAt)}
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                      title="Delete note"
                    >
                      <FaTrash className="w-3 h-3" />
                    </button>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-[#232838]">
                          <div data-color-mode={colorMode} className="prose prose-sm dark:prose-invert max-w-none">
                            <MDEditor.Markdown source={note.content} style={{ background: "transparent", fontSize: 14 }} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state */}
      {notesList.length === 0 && !draft && (
        <div className="text-center py-8">
          <FaStickyNote className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400 dark:text-slate-500">No notes yet. Write your first sprint note above.</p>
        </div>
      )}
    </div>
  );
}
