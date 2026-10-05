import React, { useState, useEffect, useRef, useMemo } from "react";
import { taskKey } from "../utils/helpers";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaSearch, FaTimes, FaPlusSquare, FaRocket, FaColumns,
  FaTachometerAlt, FaCalendarAlt, FaShieldAlt, FaLayerGroup, FaStream, FaMoon, FaBook,
  FaTag, FaFlask, FaArchive, FaBell, FaBuilding, FaHistory, FaComments, FaMagic,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";
import { TASK_STATUS_BADGE_STYLES, TASK_STATUS_SHORT_LABELS, TASK_TYPE_ICON_META } from "../constants/taskMeta";
import { usePermissions } from "../context/hooks/usePermissions";

const PAGES = [
  { id: "dashboard", label: "Dashboard",  icon: FaTachometerAlt },
  { id: "board",     label: "Board",      icon: FaColumns       },
  { id: "chats",     label: "Chats",      icon: FaComments      },
  { id: "roadmap",   label: "Roadmap",    icon: FaRocket        },
  { id: "calendar",  label: "Calendar",   icon: FaCalendarAlt   },
  { id: "projects",  label: "Projects",   icon: FaLayerGroup    },
  { id: "maestro",   label: "Maestro",    icon: FaMagic         },
  { id: "docs",      label: "Documentation", icon: FaBook       },
  { id: "releases",  label: "Releases",   icon: FaTag           },
  { id: "tests",     label: "Tests",      icon: FaFlask         },
  { id: "for-you",   label: "For You",    icon: FaBell          },
  { id: "activity",  label: "Activity",   icon: FaStream        },
  { id: "archive",   label: "Archive",    icon: FaArchive       },
  { id: "admin",     label: "Admin",      icon: FaShieldAlt     },
  { id: "hr",        label: "Human Resources", icon: FaBuilding },
];

function routePageId(route) {
  return String(route || "").replace(/^\//, "").split(/[?#]/)[0] || "board";
}

export default function CommandPalette({ open, onClose, onOpenTask, onNavigate, onCreateTask, onToggleDark }) {
  const { activeTasks, backlogSections, epics, docPages, releases, testSuites, recentItems, darkMode, currentProjectId } = useApp();
  const { canAccessPage, canPerform } = usePermissions();
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

  const canOpen = (pageId) => (typeof canAccessPage === "function" ? canAccessPage(pageId) : true);
  const canCreate = typeof canPerform === "function" ? canPerform("task:create") : true;
  const visiblePages = PAGES.filter((page) => canOpen(page.id));
  const allTasks = useMemo(() => [...(activeTasks || []), ...allBacklogTasks], [activeTasks, allBacklogTasks]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    const taskHits = allTasks
      .filter((t) => t.title?.toLowerCase().includes(q) || taskKey(t.id).toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
      .slice(0, 8)
      .map((t) => ({ kind: "task", id: t.id, title: t.title, status: t.status, type: t.type || "task", item: t }));

    const epicHits = (canOpen("roadmap") ? (epics || []) : [])
      .filter((e) => e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q))
      .slice(0, 3)
      .map((e) => ({ kind: "epic", id: e.id, title: e.title, color: e.color, item: e }));

    const docHits = (canOpen("docs") ? (docPages || []) : [])
      .filter((page) => page.title?.toLowerCase().includes(q))
      .slice(0, 4)
      .map((page) => ({ kind: "doc", id: page.id, title: page.title, item: page }));

    const releaseHits = (canOpen("releases") ? (releases || []) : [])
      .filter((release) => !release.projectId || !currentProjectId || release.projectId === currentProjectId)
      .filter((release) => `${release.version || ""} ${(release.name || "")}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map((release) => ({ kind: "release", id: release.id, title: release.name || release.version, item: release }));

    const suiteHits = (canOpen("tests") ? (testSuites || []) : [])
      .filter((suite) => suite.name?.toLowerCase().includes(q))
      .slice(0, 4)
      .map((suite) => ({ kind: "test-suite", id: suite.id, title: suite.name, item: suite }));

    const pageHits = visiblePages
      .filter((p) => p.label.toLowerCase().includes(q) || p.id.includes(q))
      .map((p) => ({ kind: "page", id: p.id, title: p.label, icon: p.icon }));

    const actionHits = [
      ...(canCreate && onCreateTask ? [{ kind: "action", id: "create-task", title: "Create task", icon: FaPlusSquare, run: onCreateTask }] : []),
      { kind: "action", id: "toggle-dark", title: darkMode ? "Switch to light mode" : "Switch to dark mode", icon: FaMoon, run: onToggleDark },
    ].filter((action) => action.title.toLowerCase().includes(q));

    return [...actionHits, ...taskHits, ...docHits, ...releaseHits, ...suiteHits, ...epicHits, ...pageHits];
  }, [query, allTasks, epics, docPages, releases, testSuites, onCreateTask, darkMode, onToggleDark, canCreate, visiblePages, currentProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Empty query: recent items + permitted pages, all keyboard-selectable.
  const quickItems = useMemo(() => {
    const recents = (recentItems || [])
      .filter((item) => {
        if (item?.type === "page") return item.route && canOpen(routePageId(item.route));
        if (item?.type === "task") return allTasks.some((task) => String(task.id) === String(item.entityId));
        return false;
      })
      .slice(0, 4)
      .map((item) => ({ kind: "recent", id: item.id, title: item.title, item }));
    const pages = visiblePages.map((p) => ({ kind: "page", id: p.id, title: p.label, icon: p.icon }));
    return [...recents, ...pages];
  }, [recentItems, allTasks, visiblePages]); // eslint-disable-line react-hooks/exhaustive-deps

  const navItems = query.trim() ? results : quickItems;

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, navItems.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      if (e.key === "Enter" && navItems[cursor]) { e.preventDefault(); handleSelect(navItems[cursor]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, cursor, navItems]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll cursor into view
  useEffect(() => {
    const el = listRef.current?.querySelectorAll("button")[cursor];
    el?.scrollIntoView?.({ block: "nearest" });
  }, [cursor]);

  // Reset cursor when the query changes
  useEffect(() => { setCursor(0); }, [query]);

  const handleSelect = (result) => {
    if (result.kind === "action") { result.run?.(); }
    if (result.kind === "task") { onOpenTask(result.item); }
    if (result.kind === "epic") { onNavigate("roadmap"); }
    if (result.kind === "doc") { onNavigate(`docs?page=${encodeURIComponent(result.id)}`); }
    if (result.kind === "release") { onNavigate("releases"); }
    if (result.kind === "test-suite") { onNavigate("tests"); }
    if (result.kind === "page") { onNavigate(result.id); }
    if (result.kind === "recent") {
      const { item } = result;
      if (item.type === "page" && item.route) onNavigate(item.route.replace(/^\//, ""));
      else if (item.type === "task" && item.entityId) {
        const task = allTasks.find((entry) => String(entry.id) === String(item.entityId));
        if (task) onOpenTask(task);
      }
    }
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
                  const typeInfo = TASK_TYPE_ICON_META[r.type] || TASK_TYPE_ICON_META.task;
                  const TypeIcon = typeInfo.icon;
                  return (
                    <button
                      key={`task-${r.id}`}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isFocused ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-[#232838]"}`}
                      onClick={() => handleSelect(r)}
                      onMouseEnter={() => setCursor(i)}
                    >
                      <TypeIcon className={`w-3.5 h-3.5 flex-shrink-0 ${typeInfo.color}`} />
                      <span className="text-xs font-mono text-slate-400 flex-shrink-0">{taskKey(r.id)}</span>
                      <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">{highlight(r.title)}</span>
                      {r.status && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${TASK_STATUS_BADGE_STYLES[r.status] || TASK_STATUS_BADGE_STYLES.todo}`}>
                          {TASK_STATUS_SHORT_LABELS[r.status] || r.status}
                        </span>
                      )}
                    </button>
                  );
                }
                if (r.kind === "action") {
                  const Icon = r.icon;
                  return (
                    <button
                      key={`action-${r.id}`}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isFocused ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-[#232838]"}`}
                      onClick={() => handleSelect(r)}
                      onMouseEnter={() => setCursor(i)}
                    >
                      <Icon className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">{highlight(r.title)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">Action</span>
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
                if (r.kind === "doc" || r.kind === "release" || r.kind === "test-suite") {
                  return (
                    <button
                      key={`${r.kind}-${r.id}`}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isFocused ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-[#232838]"}`}
                      onClick={() => handleSelect(r)}
                      onMouseEnter={() => setCursor(i)}
                    >
                      <FaSearch className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                      <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate">{highlight(r.title)}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#232838] text-slate-500 dark:text-slate-400 font-medium flex-shrink-0 capitalize">{r.kind.replace("-", " ")}</span>
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
          <div ref={listRef} className="py-4 px-4 space-y-1 max-h-80 overflow-y-auto">
            {quickItems.map((entry, i) => {
              const isFocused = cursor === i;
              const isFirstRecent = entry.kind === "recent" && i === 0;
              const isFirstPage = entry.kind === "page" && (i === 0 || quickItems[i - 1].kind !== "page");
              const Icon = entry.kind === "recent" ? FaHistory : entry.icon;
              return (
                <React.Fragment key={`${entry.kind}-${entry.id}`}>
                  {isFirstRecent && <p className="text-xs text-slate-400 dark:text-slate-500 mb-1 px-1">Recent</p>}
                  {isFirstPage && <p className={`text-xs text-slate-400 dark:text-slate-500 mb-1 px-1 ${i > 0 ? "mt-3" : ""}`}>Quick navigation</p>}
                  <button
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${isFocused ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-[#232838]"}`}
                    onClick={() => handleSelect(entry)}
                    onMouseEnter={() => setCursor(i)}
                  >
                    <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className={`text-sm text-slate-700 dark:text-slate-200 truncate ${entry.kind === "recent" && entry.item?.type === "page" ? "capitalize" : ""}`}>{entry.title}</span>
                  </button>
                </React.Fragment>
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
