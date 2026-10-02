import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBell, FaCog, FaUserCircle, FaChevronLeft, FaChevronRight,
  FaColumns, FaTachometerAlt, FaRocket, FaCalendarAlt,
  FaChartBar, FaSearch, FaMoon, FaSun,
  FaShieldAlt, FaLayerGroup, FaBook, FaTag, FaFlask,
  FaArchive, FaPlus,
  FaSignOutAlt, FaBars, FaBuilding, FaStream,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../context/hooks/usePermissions";
import { useConfirm } from "../context/ConfirmContext";
import { useEscapeKey } from "../hooks/useEscapeKey";
import {
  filterNotificationsForUser,
  getNotificationMeta,
  resolveNotificationTarget,
} from "../constants/notificationMeta";
import { useAppNavigationListener } from "./appNavigation";
import Logo from "./Logo";


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
  { id: "activity",     label: "Activity",      icon: FaStream        },
];

const ADMIN_NAV_ITEMS = [
  { id: "admin", label: "Admin",             icon: FaShieldAlt },
  { id: "hr",    label: "Human Resources",   icon: FaBuilding  },
];


const IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");

export default function Layout({
  children, activePage, onPageChange,
  darkMode, onToggleDark,
  onCreateClick, onSettingsClick, onProfileClick, onSearchClick, onOpenTask,
}) {
  const {
    sidebarCollapsed: collapsed, setSidebarCollapsed: setCollapsed,
    notifications, markNotifRead, markAllNotifsRead, activeTasks, backlogSections, projects, currentProjectId,
    currentUser, archivedTasks,
  } = useApp();
  const { user, role, profile, logout } = useAuth();
  const confirm = useConfirm();
  // Sign-out sits next to other sidebar controls; confirm so a stray click
  // doesn't end the session (and lose unsaved drafts).
  const handleLogout = async () => {
    const ok = await confirm({
      title: "Sign out of Corechestra?",
      description: "Unsaved changes in open editors will be lost.",
      confirmLabel: "Sign out",
      tone: "primary",
    });
    if (ok) logout();
  };
  const { canAccessPage, canPerform } = usePermissions();
  const displayName = profile?.fullName || user?.email || "User";
  const [notifOpen,       setNotifOpen]       = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [syncBanners, setSyncBanners] = useState([]);
  const profileMenuRef = useRef(null);
  const [isMobile,       setIsMobile]       = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [mobileNavOpen,  setMobileNavOpen]  = useState(false);

  // Inline search state

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

  useEscapeKey(() => setNotifOpen(false), notifOpen);
  useEscapeKey(() => setProfileMenuOpen(false), profileMenuOpen);

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

  const visibleNavItems = useMemo(
    () => NAV_ITEMS.filter((item) => canAccessPage(item.id)),
    [canAccessPage]
  );

  const visibleAdminNavItems = useMemo(
    () => ADMIN_NAV_ITEMS.filter((item) => canAccessPage(item.id)),
    [canAccessPage]
  );


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
    return (
      <button
        key={id}
        onClick={() => { onPageChange && onPageChange(id); setMobileNavOpen(false); }}
        title={(!isMobile && collapsed) ? label : undefined}
        className={`w-full flex items-center rounded-lg text-sm transition-colors ${
          (!isMobile && collapsed) ? "justify-center p-2.5" : "gap-3 px-3 py-2"
        } ${isActive ? navActive : navInactive}`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {showLabels && <span>{label}</span>}
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
                type="button"
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
                className={`p-2 rounded-md transition-colors flex-shrink-0 ${bottomRowClass}`}
              >
                <FaSignOutAlt className="w-3.5 h-3.5" />
              </button>
              {/* Collapse — desktop only */}
              {!isMobile && (
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                  className={`p-2 ml-1 rounded-md transition-colors flex-shrink-0 ${bottomRowClass}`}
                >
                  <FaChevronLeft className="w-3.5 h-3.5" />
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

          {/* Search — opens the command palette (tasks, docs, releases, tests, pages) */}
          <button
            type="button"
            onClick={onSearchClick}
            aria-label="Search (Ctrl or Cmd + K)"
            aria-keyshortcuts="Meta+K Control+K"
            className={`hidden md:flex flex-1 max-w-md mx-auto items-center gap-2.5 pl-3 pr-2 py-1.5 text-sm rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
              darkMode
                ? "bg-[#252b3b] text-slate-400 border-[#353d50] hover:border-[#46506a]"
                : "bg-slate-100 text-slate-500 border-transparent hover:border-slate-300"
            }`}
          >
            <FaSearch className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="flex-1 text-left truncate">Search tasks, docs, releases…</span>
            <kbd className={`hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-sans rounded border ${darkMode ? "border-[#3a4258] text-slate-400" : "border-slate-300 text-slate-500 bg-white"}`}>
              {IS_MAC ? "⌘" : "Ctrl"} K
            </kbd>
          </button>

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
                type="button"
                onClick={() => setProfileMenuOpen((v) => !v)}
                title={user?.email || "Profile"}
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
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
                        onClick={() => { setProfileMenuOpen(false); handleLogout(); }}
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
