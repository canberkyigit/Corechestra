import React, { useState, useRef, useEffect, useMemo } from "react";
import { taskKey } from "../utils/helpers";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBell, FaCog, FaUserCircle, FaChevronLeft, FaChevronRight,
  FaColumns, FaTachometerAlt, FaRocket, FaCalendarAlt,
  FaChartBar, FaSearch, FaMoon, FaSun,
  FaCheckCircle, FaExclamationTriangle, FaComment, FaArrowRight,
  FaShieldAlt, FaLayerGroup, FaBook, FaTag, FaFlask,
  FaCheckSquare, FaBug, FaPlusSquare, FaExclamationCircle,
  FaUser, FaFlag, FaPlay, FaRegDotCircle, FaTimes, FaArchive, FaUndo, FaBolt,
  FaSignOutAlt,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import Logo from "./Logo";

const NOTIF_META = {
  assignment:      { icon: FaArrowRight,          color: "text-blue-500   bg-blue-50   dark:bg-blue-900/20"   },
  status_done:     { icon: FaCheckCircle,         color: "text-green-500  bg-green-50  dark:bg-green-900/20"  },
  status_blocked:  { icon: FaExclamationTriangle, color: "text-red-500    bg-red-50    dark:bg-red-900/20"    },
  status_change:   { icon: FaArrowRight,          color: "text-blue-500   bg-blue-50   dark:bg-blue-900/20"   },
  comment:         { icon: FaComment,             color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20" },
  mention:         { icon: FaComment,             color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20" },
  task_created:    { icon: FaCheckCircle,         color: "text-green-500  bg-green-50  dark:bg-green-900/20"  },
  task_archived:   { icon: FaArchive,             color: "text-amber-500  bg-amber-50  dark:bg-amber-900/20"  },
  task_restored:   { icon: FaUndo,                color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" },
  task_deleted:    { icon: FaExclamationTriangle, color: "text-red-500    bg-red-50    dark:bg-red-900/20"    },
  sprint_started:  { icon: FaPlay,                color: "text-blue-500   bg-blue-50   dark:bg-blue-900/20"   },
  sprint_completed:{ icon: FaCheckCircle,         color: "text-green-500  bg-green-50  dark:bg-green-900/20"  },
  project_created: { icon: FaLayerGroup,          color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20" },
  project_deleted: { icon: FaExclamationTriangle, color: "text-red-500    bg-red-50    dark:bg-red-900/20"    },
  epic_created:    { icon: FaBolt,                color: "text-violet-500 bg-violet-50 dark:bg-violet-900/20" },
  epic_deleted:    { icon: FaExclamationTriangle, color: "text-red-500    bg-red-50    dark:bg-red-900/20"    },
  archive_emptied: { icon: FaArchive,             color: "text-red-500    bg-red-50    dark:bg-red-900/20"    },
};

const SEARCH_TYPE_ICONS = {
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

const SEARCH_STATUS_COLORS = {
  todo:       "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  inprogress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  review:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  awaiting:   "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  blocked:    "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  done:       "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const SEARCH_STATUS_LABELS = {
  todo: "To Do", inprogress: "In Progress", review: "Review",
  awaiting: "Awaiting", blocked: "Blocked", done: "Done",
};

const SEARCH_PAGES = [
  { id: "dashboard", label: "Dashboard",  icon: FaTachometerAlt },
  { id: "board",     label: "Board",      icon: FaColumns       },
  { id: "roadmap",   label: "Roadmap",    icon: FaRocket        },
  { id: "reports",   label: "Reports",    icon: FaChartBar      },
  { id: "calendar",  label: "Calendar",   icon: FaCalendarAlt   },
  { id: "projects",  label: "Projects",   icon: FaLayerGroup    },
  { id: "admin",     label: "Admin",      icon: FaShieldAlt     },
  { id: "archive",   label: "Archive",    icon: FaArchive       },
  { id: "for-you",   label: "For You",    icon: FaBell          },
];

function relativeTime(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

const NAV_ITEMS = [
  { id: "dashboard",     label: "Dashboard",     icon: FaTachometerAlt },
  { id: "board",         label: "Board",         icon: FaColumns       },
  { id: "roadmap",       label: "Roadmap",       icon: FaRocket        },
  { id: "reports",       label: "Reports",       icon: FaChartBar      },
  { id: "calendar",      label: "Calendar",      icon: FaCalendarAlt   },
  { id: "projects",      label: "Projects",      icon: FaLayerGroup    },
  { id: "docs",          label: "Documentation", icon: FaBook          },
  { id: "releases",      label: "Releases",      icon: FaTag           },
  { id: "tests",         label: "Tests",         icon: FaFlask         },
  { id: "archive",       label: "Archive",       icon: FaArchive       },
  { id: "for-you",      label: "For You",       icon: FaBell          },
];

const ADMIN_NAV_ITEMS = [
  { id: "admin", label: "Admin", icon: FaShieldAlt },
];

export default function Layout({
  children, activePage, onPageChange,
  darkMode, onToggleDark,
  onCreateClick, onSettingsClick, onProfileClick, onSearchClick, onOpenTask,
}) {
  const {
    sidebarCollapsed: collapsed, setSidebarCollapsed: setCollapsed,
    notifications, markNotifRead, markAllNotifsRead, activeTasks, backlogSections, epics, projects, currentProjectId,
    users,
  } = useApp();
  const { user, role, profile, logout, isAdmin } = useAuth();
  const appUser     = users?.find((u) => u.id === user?.uid || u.email === user?.email);
  const displayName = profile?.fullName || user?.email || "User";
  const [notifOpen,       setNotifOpen]       = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);

  // Inline search state
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [searchCursor, setSearchCursor] = useState(0);
  const searchContainerRef = useRef(null);
  const searchListRef      = useRef(null);

  const { addToast } = useToast();
  const notifRef    = useRef(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e) => addToast(e.detail.message, "error");
    window.addEventListener("corechestra:storage-error", handler);
    return () => window.removeEventListener("corechestra:storage-error", handler);
  }, [addToast]);

  const toggleCollapsed = () => setCollapsed(!collapsed);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = markAllNotifsRead;
  const markRead    = markNotifRead;

  // ── Inline search logic ────────────────────────────────────────────────────
  const allBacklogTasks = useMemo(() =>
    (backlogSections || []).flatMap((s) => s.tasks || []),
  [backlogSections]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const taskHits = [...(activeTasks || []), ...allBacklogTasks]
      .filter((t) => t.title?.toLowerCase().includes(q) || taskKey(t.id).toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
      .slice(0, 8)
      .map((t) => ({ kind: "task", id: t.id, title: t.title, status: t.status, type: t.type || "task", item: t }));
    const epicHits = (epics || [])
      .filter((e) => e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q))
      .slice(0, 3)
      .map((e) => ({ kind: "epic", id: e.id, title: e.title, color: e.color, item: e }));
    const pageHits = SEARCH_PAGES
      .filter((p) => p.label.toLowerCase().includes(q))
      .map((p) => ({ kind: "page", id: p.id, title: p.label, icon: p.icon }));
    return [...taskHits, ...epicHits, ...pageHits];
  }, [searchQuery, activeTasks, allBacklogTasks, epics]);

  useEffect(() => {
    const handler = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const el = searchListRef.current?.children[searchCursor];
    el?.scrollIntoView({ block: "nearest" });
  }, [searchCursor]);

  useEffect(() => { setSearchCursor(0); }, [searchResults]);

  const handleSearchSelect = (result) => {
    if (result.kind === "task") { onOpenTask?.(result.item); }
    if (result.kind === "epic") { onPageChange?.("roadmap"); }
    if (result.kind === "page") { onPageChange?.(result.id); }
    setSearchOpen(false);
    setSearchQuery("");
  };

  const handleSearchKeyDown = (e) => {
    const items = searchQuery.trim()
      ? searchResults
      : SEARCH_PAGES.map((p) => ({ kind: "page", id: p.id, title: p.label, icon: p.icon }));
    if (e.key === "Escape") { setSearchOpen(false); e.target.blur(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setSearchCursor((c) => Math.min(c + 1, items.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSearchCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && items[searchCursor]) { e.preventDefault(); handleSearchSelect(items[searchCursor]); }
  };

  const highlightMatch = (text) => {
    if (!searchQuery.trim()) return text;
    const q = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${q})`, "gi"));
    return parts.map((p, i) =>
      p.toLowerCase() === searchQuery.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/50 text-inherit rounded">{p}</mark>
        : p
    );
  };

  // ── Colour tokens ──────────────────────────────────────────────────────────
  // Sidebar + Topbar share the same background in dark mode → no seam
  const sidebarBg      = darkMode ? "bg-[#1a1f2e]" : "bg-white";
  const topbarBg       = darkMode ? "bg-[#1a1f2e]" : "bg-white";
  const outerBg        = darkMode ? "bg-[#141720]" : "bg-slate-100";
  const contentBg      = darkMode ? "bg-[#141720]" : "bg-slate-50";
  const borderColor    = darkMode ? "border-[#252b3b]" : "border-slate-200";
  const navActive      = "bg-blue-600 text-white";
  const navInactive    = darkMode
    ? "text-slate-400 hover:bg-white/5 hover:text-slate-200"
    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
  const subText        = darkMode ? "text-slate-500" : "text-slate-400";
  const projNameText   = darkMode ? "text-white"     : "text-slate-900";
  const itemHover      = darkMode ? "hover:bg-white/5" : "hover:bg-slate-50";
  const bottomRowClass = darkMode
    ? "text-slate-400 hover:bg-white/5 hover:text-slate-200"
    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";

  // ── Nav button (handles collapsed / expanded) ──────────────────────────────
  const NavBtn = ({ id, label, Icon }) => {
    const isActive = activePage === id;
    return (
      <button
        key={id}
        onClick={() => onPageChange && onPageChange(id)}
        title={collapsed ? label : undefined}
        className={`w-full flex items-center rounded-lg text-sm transition-colors ${
          collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
        } ${isActive ? navActive : navInactive}`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span>{label}</span>}
      </button>
    );
  };

  return (
    <div className={`flex h-screen overflow-hidden ${outerBg}`}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 56 : 224 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={`
        flex-shrink-0 flex flex-col overflow-hidden
        ${sidebarBg}
        border-r ${borderColor}
      `}>

        {/* App branding */}
        <div className={`h-14 flex-shrink-0 border-b ${borderColor} flex items-center ${collapsed ? "justify-center px-2" : "justify-center px-4"}`}>
          {collapsed ? (
            <div
              className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center cursor-pointer"
              title="Corechestra"
              onClick={() => setCollapsed(false)}
            >
              <Logo size={20} color="white" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-indigo-900/30">
                <Logo size={20} color="white" />
              </div>
              <div className={`text-[17px] font-bold ${projNameText}`}>Corechestra</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto py-2 ${collapsed ? "px-1 space-y-0.5" : "px-2 space-y-0.5"}`}>
          {NAV_ITEMS
            .filter(({ id }) => isAdmin || (id !== "archive"))
            .map(({ id, label, icon: Icon }) => (
              <NavBtn key={id} id={id} label={label} Icon={Icon} />
            ))}

          {/* Admin section — admin only */}
          {isAdmin && (collapsed ? (
            <div className={`mt-2 pt-2 border-t ${borderColor} space-y-0.5`}>
              {ADMIN_NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <NavBtn key={id} id={id} label={label} Icon={Icon} />
              ))}
            </div>
          ) : (
            <div className={`mt-2 pt-2 border-t ${borderColor}`}>
              <p className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${subText}`}>Admin</p>
              {ADMIN_NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                <NavBtn key={id} id={id} label={label} Icon={Icon} />
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className={`border-t ${borderColor} py-2 ${collapsed ? "px-1 space-y-0.5" : "px-2 space-y-0.5"}`}>
          {/* Dark mode */}
          <button
            onClick={onToggleDark}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className={`w-full flex items-center rounded-lg text-sm transition-colors ${
              collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
            } ${bottomRowClass}`}
          >
            {darkMode ? <FaSun className="w-4 h-4 text-yellow-400 flex-shrink-0" /> : <FaMoon className="w-4 h-4 flex-shrink-0" />}
            {!collapsed && <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
          </button>

          {/* Settings — admin only */}
          {isAdmin && (
            <button
              onClick={onSettingsClick}
              title={collapsed ? "Settings" : undefined}
              className={`w-full flex items-center rounded-lg text-sm transition-colors ${
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2"
              } ${bottomRowClass}`}
            >
              <FaCog className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Settings</span>}
            </button>
          )}

          {/* User + collapse toggle */}
          {collapsed ? (
            <button
              onClick={toggleCollapsed}
              title="Expand sidebar"
              className={`w-full flex justify-center p-2.5 rounded-lg text-sm transition-colors ${bottomRowClass}`}
            >
              <FaChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2">
              <button
                onClick={onProfileClick}
                className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 hover:ring-2 hover:ring-indigo-400 transition-all uppercase"
                title="Profile"
              >
                {(profile?.fullName || user?.email || "U")[0].toUpperCase()}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium truncate ${projNameText}`}>{displayName}</div>
                <div className={`text-[11px] capitalize ${subText}`}>{role || "Member"}</div>
              </div>
              {/* Sign out */}
              <button
                onClick={logout}
                title="Sign out"
                className={`p-1 rounded-md transition-colors flex-shrink-0 ${bottomRowClass}`}
              >
                <FaSignOutAlt className="w-3 h-3" />
              </button>
              {/* Collapse */}
              <button
                onClick={toggleCollapsed}
                title="Collapse sidebar"
                className={`p-1 rounded-md transition-colors flex-shrink-0 ${bottomRowClass}`}
              >
                <FaChevronLeft className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar — same bg as sidebar to kill the seam */}
        <header className={`
          h-14 flex items-center px-5 gap-4 flex-shrink-0 transition-colors
          ${topbarBg} border-b ${borderColor}
        `}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm min-w-0">
            <span className={`font-medium truncate ${projNameText}`}>
              {projects?.find((p) => p.id === currentProjectId)?.name || "Corechestra"}
            </span>
            {activePage && (
              <>
                <span className={subText}>/</span>
                <span className={`capitalize ${subText}`}>{activePage}</span>
              </>
            )}
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md mx-auto relative" ref={searchContainerRef}>
            <FaSearch className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${subText} pointer-events-none z-10`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search issues, tasks, pages… (⌘K)"
              className={`w-full pl-9 pr-8 py-1.5 text-sm rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-blue-400
                ${darkMode
                  ? "bg-[#252b3b] text-slate-200 placeholder-slate-500 border-[#353d50] focus:bg-[#1a1f2e]"
                  : "bg-slate-100 text-slate-700 placeholder-slate-400 border-transparent focus:bg-white"
                }`}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 ${subText} hover:text-slate-600 dark:hover:text-slate-300`}
              >
                <FaTimes className="w-3 h-3" />
              </button>
            )}

            {/* Dropdown */}
            <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className={`absolute top-full left-0 right-0 mt-1.5 rounded-xl border shadow-2xl z-50 overflow-hidden ${
                darkMode ? "bg-[#1c2030] border-[#2a3044]" : "bg-white border-slate-200"
              }`}>
                {searchQuery.trim() ? (
                  searchResults.length > 0 ? (
                    <div ref={searchListRef} className="max-h-72 overflow-y-auto py-1">
                      {searchResults.map((r, i) => {
                        const isFocused = i === searchCursor;
                        if (r.kind === "task") {
                          const typeInfo = SEARCH_TYPE_ICONS[r.type] || SEARCH_TYPE_ICONS.task;
                          const TypeIcon = typeInfo.icon;
                          return (
                            <button
                              key={`task-${r.id}`}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${isFocused ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-[#232838]"}`}
                              onClick={() => handleSearchSelect(r)}
                              onMouseEnter={() => setSearchCursor(i)}
                            >
                              <TypeIcon className={`w-3.5 h-3.5 flex-shrink-0 ${typeInfo.color}`} />
                              <span className="text-xs font-mono text-slate-400 flex-shrink-0">{taskKey(r.id)}</span>
                              <span className={`text-sm flex-1 truncate ${darkMode ? "text-slate-200" : "text-slate-700"}`}>{highlightMatch(r.title)}</span>
                              {r.status && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${SEARCH_STATUS_COLORS[r.status] || SEARCH_STATUS_COLORS.todo}`}>
                                  {SEARCH_STATUS_LABELS[r.status] || r.status}
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
                              onClick={() => handleSearchSelect(r)}
                              onMouseEnter={() => setSearchCursor(i)}
                            >
                              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                              <span className={`text-sm flex-1 truncate ${darkMode ? "text-slate-200" : "text-slate-700"}`}>{highlightMatch(r.title)}</span>
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
                              onClick={() => handleSearchSelect(r)}
                              onMouseEnter={() => setSearchCursor(i)}
                            >
                              <Icon className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                              <span className={`text-sm flex-1 ${darkMode ? "text-slate-200" : "text-slate-700"}`}>{highlightMatch(r.title)}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${darkMode ? "bg-[#232838] text-slate-400" : "bg-slate-100 text-slate-500"}`}>Page</span>
                            </button>
                          );
                        }
                        return null;
                      })}
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <FaSearch className={`w-5 h-5 mx-auto mb-2 ${subText}`} />
                      <p className={`text-xs ${subText}`}>No results for "<strong>{searchQuery}</strong>"</p>
                    </div>
                  )
                ) : (
                  <div className="py-3 px-2">
                    <p className={`text-xs ${subText} mb-1.5 px-2`}>Quick navigation</p>
                    {SEARCH_PAGES.map((p, i) => {
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.id}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${searchCursor === i ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-[#232838]"}`}
                          onClick={() => { onPageChange?.(p.id); setSearchOpen(false); }}
                          onMouseEnter={() => setSearchCursor(i)}
                        >
                          <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className={`text-sm ${darkMode ? "text-slate-200" : "text-slate-700"}`}>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className={`flex items-center gap-4 px-4 py-2 border-t ${borderColor} ${darkMode ? "bg-[#141720]" : "bg-slate-50"}`}>
                  <span className={`text-[10px] ${subText} flex items-center gap-1`}><kbd className={`font-mono border rounded px-1 ${darkMode ? "border-[#2a3044]" : "border-slate-200"}`}>↑↓</kbd> navigate</span>
                  <span className={`text-[10px] ${subText} flex items-center gap-1`}><kbd className={`font-mono border rounded px-1 ${darkMode ? "border-[#2a3044]" : "border-slate-200"}`}>↵</kbd> select</span>
                  <span className={`text-[10px] ${subText} flex items-center gap-1`}><kbd className={`font-mono border rounded px-1 ${darkMode ? "border-[#2a3044]" : "border-slate-200"}`}>ESC</kbd> close</span>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className={`relative p-2 rounded-lg transition-colors ${bottomRowClass}`}
              >
                <FaBell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center px-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute right-0 top-full mt-2 w-80 rounded-xl border shadow-xl z-50 overflow-hidden ${
                  darkMode ? "bg-[#1c2030] border-[#252b3b]" : "bg-white border-slate-200"
                }`}>
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${borderColor}`}>
                    <span className={`text-sm font-semibold ${projNameText}`}>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-blue-500 hover:text-blue-400 font-medium">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className={`py-8 text-center text-xs ${subText}`}>No notifications yet</div>
                    ) : notifications.map((n) => {
                      const meta = NOTIF_META[n.type] || NOTIF_META.status_change;
                      const NIcon = meta.icon;
                      return (
                        <button
                          key={n.id}
                          onClick={() => {
                            markRead(n.id);
                            setNotifOpen(false);
                            if (n.taskId) {
                              const task = [...activeTasks, ...allBacklogTasks].find((t) => t.id === n.taskId);
                              if (task) {
                                onPageChange?.("board");
                                onOpenTask?.(task);
                              }
                            } else if (n.type === "sprint_start" || n.type === "sprint_end") {
                              onPageChange?.("board");
                            }
                          }}
                          className={`w-full flex items-start gap-3 px-4 py-3 transition-colors text-left border-b last:border-0 ${borderColor} group/notif ${
                            !n.read
                              ? darkMode ? "bg-blue-900/10 hover:bg-blue-900/20" : "bg-blue-50/40 hover:bg-blue-50"
                              : darkMode ? "hover:bg-white/5" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${meta.color}`}>
                            <NIcon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-snug ${!n.read ? projNameText + " font-medium" : subText}`}>{n.text}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className={`text-xs ${subText}`}>{relativeTime(n.timestamp)}</p>
                              {n.taskId && (
                                <span className={`text-[10px] opacity-0 group-hover/notif:opacity-100 transition-opacity font-medium text-blue-500`}>
                                  View task →
                                </span>
                              )}
                            </div>
                          </div>
                          {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className={`px-4 py-2.5 border-t ${borderColor}`}>
                    <button
                      onClick={() => { setNotifOpen(false); onPageChange?.("for-you"); }}
                      className="text-xs text-blue-500 hover:text-blue-400 font-medium w-full text-center"
                    >
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>



            {/* Profile dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setProfileMenuOpen((v) => !v)}
                title={user?.email || "Profile"}
                className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold hover:ring-2 hover:ring-indigo-400 transition-all uppercase"
              >
                {(profile?.fullName || user?.email || "U")[0].toUpperCase()}
              </button>

              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0,  scale: 1    }}
                    exit={{    opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className={`absolute right-0 top-full mt-2 w-52 rounded-xl border shadow-xl z-50 overflow-hidden ${
                      darkMode ? "bg-[#1c2030] border-[#252b3b]" : "bg-white border-slate-200"
                    }`}
                  >
                    {/* Name / email header */}
                    <div className={`px-4 py-3 border-b ${borderColor}`}>
                      {profile?.fullName && (
                        <p className={`text-xs font-semibold truncate ${projNameText}`}>{profile.fullName}</p>
                      )}
                      <p className={`text-[11px] truncate ${subText}`}>{user?.email}</p>
                    </div>

                    {/* Actions */}
                    <div className="py-1">
                      <button
                        onClick={() => { setProfileMenuOpen(false); onProfileClick?.(); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                          darkMode ? "text-slate-300 hover:bg-white/5" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <FaUserCircle className="w-3.5 h-3.5 opacity-60" />
                        Go to profile
                      </button>
                      <button
                        onClick={() => { setProfileMenuOpen(false); logout(); }}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left text-red-500 ${
                          darkMode ? "hover:bg-red-500/10" : "hover:bg-red-50"
                        }`}
                      >
                        <FaSignOutAlt className="w-3.5 h-3.5 opacity-70" />
                        Log out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 min-h-0 relative overflow-hidden transition-colors ${contentBg}`}>
          <div className="absolute inset-0 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
