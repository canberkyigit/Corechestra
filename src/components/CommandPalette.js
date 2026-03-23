import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaSearch, FaTimes, FaCheckSquare, FaBug, FaPlusSquare, FaExclamationCircle,
  FaUser, FaRocket, FaFlag, FaPlay, FaRegDotCircle, FaColumns,
  FaTachometerAlt, FaChartBar, FaCalendarAlt, FaShieldAlt, FaLayerGroup,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";

const TYPE_ICONS = {
  task:          { icon: FaCheckSquare,       color: "text-green-500"  },
  bug:           { icon: FaBug,               color: "text-red-500"    },
  feature:       { icon: FaPlusSquare,        color: "text-cyan-500"   },
  defect:        { icon: FaExclamationCircle, color: "text-orange-500" },
  userstory:     { icon: FaUser,              color: "text-blue-500"   },
  investigation: { icon: FaSearch,            color: "text-purple-500" },
  epic:          { icon: FaRocket,            color: "text-violet-500" },
  test:          { icon: FaSearch,            color: "text-teal-500"   },
  testset:       { icon: FaFlag,              color: "text-indigo-500" },
  testexecution: { icon: FaPlay,              color: "text-lime-600"   },
  precondition:  { icon: FaRegDotCircle,      color: "text-sky-500"    },
};

const STATUS_COLORS = {
  todo:       "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  inprogress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  review:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  awaiting:   "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  blocked:    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  done:       "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const STATUS_LABELS = {
  todo: "To Do", inprogress: "In Progress", review: "Review",
  awaiting: "Awaiting", blocked: "Blocked", done: "Done",
};

const PAGES = [
  { id: "dashboard", label: "Dashboard",  icon: FaTachometerAlt },
  { id: "board",     label: "Board",      icon: FaColumns       },
  { id: "roadmap",   label: "Roadmap",    icon: FaRocket        },
  { id: "reports",   label: "Reports",    icon: FaChartBar      },
  { id: "calendar",  label: "Calendar",   icon: FaCalendarAlt   },
  { id: "projects",  label: "Projects",   icon: FaLayerGroup    },
  { id: "admin",     label: "Admin",      icon: FaShieldAlt     },
];

export default function CommandPalette({ open, onClose, onOpenTask, onNavigate }) {
  const { activeTasks, backlogSections, epics } = useApp();
  const [query, setQuery]       = useState("");
  const [cursor, setCursor]     = useState(0);
  const inputRef                = useRef(null);
  const listRef                 = useRef(null);

  // Reset on open
  useEffect(() => {
    if (open) { setQuery(""); setCursor(0); setTimeout(() => inputRef.current?.focus(), 0); }
  }, [open]);

  const allBacklogTasks = useMemo(() =>
    (backlogSections || []).flatMap((s) => s.tasks || []),
  [backlogSections]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    const taskHits = [...(activeTasks || []), ...allBacklogTasks]
      .filter((t) => t.title?.toLowerCase().includes(q) || `cy-${t.id}`.includes(q) || t.description?.toLowerCase().includes(q))
      .slice(0, 8)
      .map((t) => ({ kind: "task", id: t.id, title: t.title, status: t.status, type: t.type || "task", item: t }));

    const epicHits = (epics || [])
      .filter((e) => e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q))
      .slice(0, 3)
      .map((e) => ({ kind: "epic", id: e.id, title: e.title, color: e.color, item: e }));

    const pageHits = PAGES
      .filter((p) => p.label.toLowerCase().includes(q))
      .map((p) => ({ kind: "page", id: p.id, title: p.label, icon: p.icon }));

    return [...taskHits, ...epicHits, ...pageHits];
  }, [query, activeTasks, allBacklogTasks, epics]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      if (e.key === "Enter" && results[cursor]) { e.preventDefault(); handleSelect(results[cursor]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, cursor, results]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll cursor into view
  useEffect(() => {
    const el = listRef.current?.children[cursor];
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  // Reset cursor on new results
  useEffect(() => { setCursor(0); }, [results]);

  const handleSelect = (result) => {
    if (result.kind === "task") { onOpenTask(result.item); }
    if (result.kind === "epic") { onNavigate("roadmap"); }
    if (result.kind === "page") { onNavigate(result.id); }
    onClose();
  };

  const highlight = (text) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((p, i) =>
      p.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/50 text-inherit rounded">{p}</mark>
        : p
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="command-palette-backdrop"
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-xl bg-white dark:bg-[#1c2030] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a3044] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
          >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-[#232838]">
          <FaSearch className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 text-sm text-slate-800 dark:text-slate-200 bg-transparent border-none outline-none placeholder-slate-400 dark:placeholder-slate-500"
            placeholder="Search tasks, epics, pages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
              <FaTimes className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        {query.trim() ? (
          results.length > 0 ? (
            <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
              {results.map((r, i) => {
                const isFocused = i === cursor;
                if (r.kind === "task") {
                  const typeInfo = TYPE_ICONS[r.type] || TYPE_ICONS.task;
                  const TypeIcon = typeInfo.icon;
                  return (
                    <button
                      key={`task-${r.id}`}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isFocused ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-[#232838]"}`}
                      onClick={() => handleSelect(r)}
                      onMouseEnter={() => setCursor(i)}
                    >
                      <TypeIcon className={`w-3.5 h-3.5 flex-shrink-0 ${typeInfo.color}`} />
                      <span className="text-xs font-mono text-slate-400 flex-shrink-0">CY-{r.id}</span>
                      <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">{highlight(r.title)}</span>
                      {r.status && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[r.status] || STATUS_COLORS.todo}`}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                      )}
                    </button>
                  );
                }
                if (r.kind === "epic") {
                  return (
                    <button
                      key={`epic-${r.id}`}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isFocused ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-[#232838]"}`}
                      onClick={() => handleSelect(r)}
                      onMouseEnter={() => setCursor(i)}
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                      <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">{highlight(r.title)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-medium flex-shrink-0">Epic</span>
                    </button>
                  );
                }
                if (r.kind === "page") {
                  const Icon = r.icon;
                  return (
                    <button
                      key={`page-${r.id}`}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isFocused ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-[#232838]"}`}
                      onClick={() => handleSelect(r)}
                      onMouseEnter={() => setCursor(i)}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-200 flex-1">{highlight(r.title)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#232838] text-slate-500 dark:text-slate-400 font-medium flex-shrink-0">Page</span>
                    </button>
                  );
                }
                return null;
              })}
            </div>
          ) : (
            <div className="py-10 text-center">
              <FaSearch className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-400 dark:text-slate-500">No results for <strong>"{query}"</strong></p>
            </div>
          )
        ) : (
          <div className="py-6 px-4 space-y-1">
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-2 px-1">Quick navigation</p>
            {PAGES.map((p, i) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${cursor === i ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-[#232838]"}`}
                  onClick={() => { onNavigate(p.id); onClose(); }}
                  onMouseEnter={() => setCursor(i)}
                >
                  <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-200">{p.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 dark:border-[#232838] bg-slate-50 dark:bg-[#141720]">
          <span className="text-[10px] text-slate-400 flex items-center gap-1"><kbd className="font-mono border border-slate-200 dark:border-[#2a3044] rounded px-1">↑↓</kbd> navigate</span>
          <span className="text-[10px] text-slate-400 flex items-center gap-1"><kbd className="font-mono border border-slate-200 dark:border-[#2a3044] rounded px-1">↵</kbd> select</span>
          <span className="text-[10px] text-slate-400 flex items-center gap-1"><kbd className="font-mono border border-slate-200 dark:border-[#2a3044] rounded px-1">ESC</kbd> close</span>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
