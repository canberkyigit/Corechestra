import React, { useState, useRef, useEffect, useMemo } from "react";
import { taskKey } from "../utils/helpers";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBell, FaCog, FaUserCircle, FaChevronLeft, FaChevronRight,
  FaColumns, FaTachometerAlt, FaRocket, FaCalendarAlt,
  FaSearch, FaMoon, FaSun,
  FaShieldAlt, FaLayerGroup, FaBook, FaTag, FaFlask,
  FaTimes, FaArchive, FaPlus,
  FaSignOutAlt, FaBars, FaBuilding, FaStream, FaComments, FaBullseye, FaBriefcase,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";
import { TASK_STATUS_BADGE_STYLES, TASK_STATUS_SHORT_LABELS, TASK_TYPE_ICON_META } from "../constants/taskMeta";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../context/hooks/usePermissions";
import {
  filterNotificationsForUser,
  getNotificationMeta,
  resolveNotificationTarget,
} from "../constants/notificationMeta";
import { useAppNavigationListener } from "./appNavigation";
import { useChatUnread } from "../context/ChatContext";
import Logo from "./Logo";

const SEARCH_PAGES = [
  { id: "dashboard", label: "Dashboard",  icon: FaTachometerAlt },
  { id: "portfolio", label: "Portfolio",  icon: FaBriefcase     },
  { id: "goals",     label: "Goals",      icon: FaBullseye      },
  { id: "board",     label: "Board",      icon: FaColumns       },
  { id: "chats",     label: "Chats",      icon: FaComments      },
  { id: "roadmap",   label: "Roadmap",    icon: FaRocket        },
  { id: "calendar",  label: "Calendar",   icon: FaCalendarAlt   },
  { id: "projects",  label: "Projects",   icon: FaLayerGroup    },
  { id: "docs",      label: "Documentation", icon: FaBook       },
  { id: "releases",  label: "Releases",   icon: FaTag           },
  { id: "tests",     label: "Tests",      icon: FaFlask         },
  { id: "admin",     label: "Admin",      icon: FaShieldAlt     },
  { id: "archive",   label: "Archive",    icon: FaArchive       },
  { id: "for-you",   label: "For You",    icon: FaBell          },
  { id: "activity",  label: "Activity",   icon: FaStream        },
];

function relativeTime(isoStr) {
  const time = new Date(isoStr).getTime();
  if (!isoStr || Number.isNaN(time)) return "";
  const diff = Date.now() - time;
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
  { id: "portfolio",     label: "Portfolio",     icon: FaBriefcase     },
  { id: "goals",         label: "Goals",         icon: FaBullseye      },
  { id: "board",         label: "Board",         icon: FaColumns       },
  { id: "chats",         label: "Chats",         icon: FaComments      },
  { id: "roadmap",       label: "Roadmap",       icon: FaRocket        },
  { id: "calendar",      label: "Calendar",      icon: FaCalendarAlt   },
  { id: "projects",      label: "Projects",      icon: FaLayerGroup    },
  { id: "docs",          label: "Documentation", icon: FaBook          },
  { id: "releases",      label: "Releases",      icon: FaTag           },
  { id: "tests",         label: "Tests",         icon: FaFlask         },
  { id: "archive",       label: "Archive",       icon: FaArchive       },
  { id: "for-you",      label: "For You",       icon: FaBell          },
  { id: "activity",     label: "Activity",      icon: FaStream        },
];

const ADMIN_NAV_ITEMS = [
  { id: "admin", label: "Admin",             icon: FaShieldAlt },
  { id: "hr",    label: "Human Resources",   icon: FaBuilding  },
];

export default function Layout({
  children, activePage, onPageChange,
  darkMode, onToggleDark,
  onCreateClick, onSettingsClick, onProfileClick, onSearchClick, onOpenTask,
}) {
  const {
    sidebarCollapsed: collapsed, setSidebarCollapsed: setCollapsed,
    notifications, markNotifRead, markAllNotifsRead, activeTasks, backlogSections, epics, projects, currentProjectId,
    currentUser, archivedTasks,
  } = useApp();
  const { user, role, profile, logout } = useAuth();
  const { canAccessPage, canPerform } = usePermissions();
  const chatUnread = useChatUnread();
  const displayName = profile?.fullName || user?.email || "User";
  const [notifOpen,       setNotifOpen]       = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [syncBanners, setSyncBanners] = useState([]);
  const profileMenuRef = useRef(null);
  const [isMobile,       setIsMobile]       = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [mobileNavOpen,  setMobileNavOpen]  = useState(false);

  // Inline search state
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [searchCursor, setSearchCursor] = useState(0);
  const searchContainerRef = useRef(null);
  const searchListRef      = useRef(null);

  const { addToast } = useToast();
  const notifRef    = useRef(null);
  const visibleNotifications = useMemo(
    () => filterNotificationsForUser(notifications, currentUser),
    [notifications, currentUser]
  );
  const unreadCount = visibleNotifications.filter((n) => !n.read).length;
  const canCreateTask = typeof onCreateClick === "function" && canPerform("task:create");

  // Feature pages request "open task" / "navigate" through window events.
  useAppNavigationListener({ onOpenTask, onNavigate: onPageChange });

  useEffect(() => {
    const handler = (e) => addToast(e.detail.message, "error");
    window.addEventListener("corechestra:storage-error", handler);
    return () => window.removeEventListener("corechestra:storage-error", handler);
  }, [addToast]);

  useEffect(() => {
    const handler = (e) => {
      const banner = {
        id: Date.now() + Math.random(),
        message: `Sync merged ${e.detail.domain} updates for ${e.detail.fields.join(", ")}`,
      };
      setSyncBanners((prev) => [banner, ...prev].slice(0, 3));
      addToast("Remote changes were merged into your local draft.", "warning");
      window.setTimeout(() => {
        setSyncBanners((prev) => prev.filter((entry) => entry.id !== banner.id));
      }, 5000);
    };
    window.addEventListener("corechestra:storage-conflict", handler);
    return () => window.removeEventListener("corechestra:storage-conflict", handler);
  }, [addToast]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileNavOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const markAllRead = () => markAllNotifsRead(visibleNotifications.filter((n) => !n.read).map((n) => n.id));
  const markRead    = markNotifRead;

  // ── Inline search logic ────────────────────────────────────────────────────
  const allBacklogTasks = useMemo(() =>
    (backlogSections || []).flatMap((s) => s.tasks || []),
  [backlogSections]);

  const visibleSearchPages = useMemo(
    () => SEARCH_PAGES.filter((page) => canAccessPage(page.id)),
    [canAccessPage]
  );

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => canAccessPage(item.id)),
    [canAccessPage]
  );

  const visibleAdminNavItems = useMemo(
    () => ADMIN_NAV_ITEMS.filter((item) => canAccessPage(item.id)),
    [canAccessPage]
  );

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
    const pageHits = visibleSearchPages
      .filter((p) => p.label.toLowerCase().includes(q))
      .map((p) => ({ kind: "page", id: p.id, title: p.label, icon: p.icon }));
    return [...taskHits, ...epicHits, ...pageHits];
  }, [searchQuery, activeTasks, allBacklogTasks, epics, visibleSearchPages]);

  useEffect(() => {
    const handler = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const el = searchListRef.current?.children[searchCursor];
    el?.scrollIntoView?.({ block: "nearest" });
  }, [searchCursor]);

  useEffect(() => { setSearchCursor(0); }, [searchResults]);

  const resolveTarget = (notification) => resolveNotificationTarget(notification, {
    tasks: [...(activeTasks || []), ...allBacklogTasks],
    archivedTasks,
    canAccessPage,
  });

  const handleNotificationClick = (notification) => {
    markRead(notification.id);
    setNotifOpen(false);
    const target = resolveTarget(notification);
    if (target?.kind === "task") onOpenTask?.(target.task);
    else if (target?.kind === "route") onPageChange?.(target.route);
  };

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
      : visibleSearchPages.map((p) => ({ kind: "page", id: p.id, title: p.label, icon: p.icon }));
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
  const bottomRowClass = darkMode
    ? "text-slate-400 hover:bg-white/5 hover:text-slate-200"
    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";

  // ── Nav button (handles collapsed / expanded) ──────────────────────────────
  const renderNavBtn = ({ id, label, Icon }) => {
    const isActive = activePage === id;
    const showLabels = isMobile || !collapsed;
    // Chats: red count for DMs / mentions / thread replies, a dot for other unread channels.
    const badgeCount = id === "chats" ? chatUnread.badge : 0;
    const showDot = id === "chats" && !badgeCount && chatUnread.hasUnread;
    const badgeLabel = badgeCount > 99 ? "99+" : String(badgeCount);
    return (
      <button
        key={id}
        onClick={() => { onPageChange && onPageChange(id); setMobileNavOpen(false); }}
        title={(!isMobile && collapsed) ? (badgeCount ? `${label} (${badgeLabel} unread)` : label) : undefined}
        aria-label={badgeCount ? `${label}, ${badgeLabel} unread` : undefined}
        className={`w-full flex items-center rounded-lg text-sm transition-colors ${
          (!isMobile && collapsed) ? "justify-center p-2.5" : "gap-3 px-3 py-2"
        } ${isActive ? navActive : navInactive}`}
      >
        <span className="relative flex-shrink-0">
          <Icon className="w-4 h-4" />
          {(!showLabels && (badgeCount > 0 || showDot)) && (
            <span className={`absolute -top-1 -right-1 rounded-full bg-red-500 ring-2 ${darkMode ? "ring-[#1a1f2e]" : "ring-white"} ${badgeCount ? "h-2.5 w-2.5" : "h-2 w-2"}`} />
          )}
        </span>
        {showLabels && <span className={`flex-1 text-left ${showDot && !isActive ? "font-semibold" : ""}`}>{label}</span>}
        {showLabels && badgeCount > 0 && (
          <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-[10.5px] font-bold leading-[18px] text-center tabular-nums">
            {badgeLabel}
          </span>
        )}
        {showLabels && showDot && <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />}
      </button>
    );
  };

  return (
    <div className={`flex h-screen overflow-hidden ${outerBg}`}>

      {/* ── Mobile backdrop ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isMobile && mobileNavOpen && (
          <motion.div
            key="mobile-overlay"
            className="fixed inset-0 z-30 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileNavOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <motion.aside
        animate={{
          width: isMobile ? 256 : (collapsed ? 56 : 224),
          x: isMobile ? (mobileNavOpen ? 0 : -280) : 0,
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={`
        ${isMobile ? "fixed top-0 left-0 h-full z-40 shadow-2xl" : "flex-shrink-0"}
        flex flex-col overflow-hidden
        ${sidebarBg}
        border-r ${borderColor}
      `}>

        {/* App branding */}
        <div className={`h-14 flex-shrink-0 border-b ${borderColor} flex items-center ${(!isMobile && collapsed) ? "justify-center px-2" : "justify-center px-4"}`}>
          {(!isMobile && collapsed) ? (
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
        <nav className={`flex-1 overflow-y-auto py-2 ${(!isMobile && collapsed) ? "px-1 space-y-0.5" : "px-2 space-y-0.5"}`}>
          {visibleNavItems.map(({ id, label, icon: Icon }) => (
              <React.Fragment key={id}>{renderNavBtn({ id, label, Icon })}</React.Fragment>
            ))}

          {visibleAdminNavItems.length > 0 && (!isMobile && collapsed ? (
            <div className={`mt-2 pt-2 border-t ${borderColor} space-y-0.5`}>
              {visibleAdminNavItems.map(({ id, label, icon: Icon }) => (
                <React.Fragment key={id}>{renderNavBtn({ id, label, Icon })}</React.Fragment>
              ))}
            </div>
          ) : (
            <div className={`mt-2 pt-2 border-t ${borderColor}`}>
              <p className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${subText}`}>Admin</p>
              {visibleAdminNavItems.map(({ id, label, icon: Icon }) => (
                <React.Fragment key={id}>{renderNavBtn({ id, label, Icon })}</React.Fragment>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className={`border-t ${borderColor} py-2 ${(!isMobile && collapsed) ? "px-1 space-y-0.5" : "px-2 space-y-0.5"}`}>
          {/* Dark mode */}
          <button
            onClick={onToggleDark}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className={`w-full flex items-center rounded-lg text-sm transition-colors ${
              (!isMobile && collapsed) ? "justify-center p-2.5" : "gap-3 px-3 py-2"
            } ${bottomRowClass}`}
          >
            {darkMode ? <FaSun className="w-4 h-4 text-yellow-400 flex-shrink-0" /> : <FaMoon className="w-4 h-4 flex-shrink-0" />}
            {(isMobile || !collapsed) && <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
          </button>

          {canPerform("workspace:manage") && (
            <button
              onClick={onSettingsClick}
              title={(!isMobile && collapsed) ? "Settings" : undefined}
              className={`w-full flex items-center rounded-lg text-sm transition-colors ${
                (!isMobile && collapsed) ? "justify-center p-2.5" : "gap-3 px-3 py-2"
              } ${bottomRowClass}`}
            >
              <FaCog className="w-4 h-4 flex-shrink-0" />
              {(isMobile || !collapsed) && <span>Settings</span>}
            </button>
          )}

          {/* User + collapse toggle */}
          {!isMobile && collapsed ? (
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
              {/* Collapse — desktop only */}
              {!isMobile && (
                <button
                  onClick={toggleCollapsed}
                  title="Collapse sidebar"
                  className={`p-1 rounded-md transition-colors flex-shrink-0 ${bottomRowClass}`}
                >
                  <FaChevronLeft className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </motion.aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar — same bg as sidebar to kill the seam */}
        <header className={`
          h-14 flex items-center px-4 md:px-5 gap-2 md:gap-4 flex-shrink-0 transition-colors
          ${topbarBg} border-b ${borderColor}
        `}>
          {/* Hamburger — mobile only */}
          <button
            className={`flex md:hidden p-2 -ml-1 rounded-lg transition-colors ${bottomRowClass}`}
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Open navigation"
          >
            <FaBars className="w-4 h-4" />
          </button>

          {/* Breadcrumb — desktop only */}
          <div className="hidden md:flex items-center gap-1 text-sm min-w-0">
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

          {/* App name — mobile only */}
          <div className={`flex items-center gap-2 md:hidden min-w-0`}>
            <span className={`text-sm font-bold truncate ${projNameText}`}>
              {projects?.find((p) => p.id === currentProjectId)?.name || "Corechestra"}
            </span>
          </div>

          {/* Search — desktop only */}
          <div className="hidden md:flex flex-1 max-w-md mx-auto relative" ref={searchContainerRef}>
            <FaSearch className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${subText} pointer-events-none z-10`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search tasks, epics, pages…"
              aria-label="Search tasks, epics and pages"
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
                          const typeInfo = TASK_TYPE_ICON_META[r.type] || TASK_TYPE_ICON_META.task;
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
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${TASK_STATUS_BADGE_STYLES[r.status] || TASK_STATUS_BADGE_STYLES.todo}`}>
                                  {TASK_STATUS_SHORT_LABELS[r.status] || r.status}
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
                    {visibleSearchPages.map((p, i) => {
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

          {/* Spacer — mobile only (pushes actions to the right) */}
          <div className="flex-1 md:hidden" />

          {/* Actions */}
          <div className="flex items-center gap-1.5 md:gap-2 md:ml-auto">
            {/* Search icon — mobile only */}
            <button
              className={`flex md:hidden p-2 rounded-lg transition-colors ${bottomRowClass}`}
              onClick={onSearchClick}
              aria-label="Search"
            >
              <FaSearch className="w-3.5 h-3.5" />
            </button>
            {/* Create — hidden for roles without task:create (e.g. viewers) */}
            {canCreateTask && (
              <button
                onClick={onCreateClick}
                title="Create task"
                aria-label="Create task"
                className="flex items-center gap-1.5 p-2 md:px-3 md:py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
              >
                <FaPlus className="w-3 h-3" />
                <span className="hidden md:inline">Create</span>
              </button>
            )}
            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Notifications"
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
                  className={`absolute right-0 top-full mt-2 w-[min(320px,calc(100vw-1rem))] rounded-xl border shadow-xl z-50 overflow-hidden ${
                  darkMode ? "bg-[#1c2030] border-[#252b3b]" : "bg-white border-slate-200"
                }`}>
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${borderColor}`}>
                    <span className={`text-sm font-semibold ${projNameText}`}>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-blue-500 hover:text-blue-400 font-medium">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {visibleNotifications.length === 0 ? (
                      <div className={`py-8 text-center text-xs ${subText}`}>No notifications yet</div>
                    ) : visibleNotifications.map((n) => {
                      const meta = getNotificationMeta(n.type);
                      const NIcon = meta.icon;
                      const target = resolveTarget(n);
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
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
                              {target && (
                                <span className={`text-[10px] opacity-0 group-hover/notif:opacity-100 transition-opacity font-medium text-blue-500`}>
                                  {target.kind === "task" ? "View task →" : "Open →"}
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
                    className={`absolute right-0 top-full mt-2 w-[min(208px,calc(100vw-1rem))] rounded-xl border shadow-xl z-50 overflow-hidden ${
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
            {syncBanners.length > 0 && (
              <div className="sticky top-0 z-20 px-4 md:px-6 pt-3 space-y-2">
                {syncBanners.map((banner) => (
                  <div key={banner.id} className="app-surface-muted border-blue-200 dark:border-blue-900/40 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                    {banner.message}
                  </div>
                ))}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
