import React, { useState, useRef, useEffect } from "react";
import {
  FaBell, FaCog, FaUserCircle, FaChevronLeft, FaChevronRight,
  FaColumns, FaTachometerAlt, FaRocket, FaCalendarAlt,
  FaChartBar, FaSearch, FaPlus, FaMoon, FaSun,
  FaCheckCircle, FaExclamationTriangle, FaComment, FaArrowRight,
  FaShieldAlt, FaLayerGroup, FaBook, FaTag, FaFlask,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";

const NOTIF_META = {
  assignment:    { icon: FaArrowRight,          color: "text-blue-500   bg-blue-50   dark:bg-blue-900/20"   },
  status_done:   { icon: FaCheckCircle,         color: "text-green-500  bg-green-50  dark:bg-green-900/20"  },
  status_blocked:{ icon: FaExclamationTriangle, color: "text-red-500    bg-red-50    dark:bg-red-900/20"    },
  status_change: { icon: FaArrowRight,          color: "text-blue-500   bg-blue-50   dark:bg-blue-900/20"   },
  comment:       { icon: FaComment,             color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20" },
  mention:       { icon: FaComment,             color: "text-purple-500 bg-purple-50 dark:bg-purple-900/20" },
};

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
];

const ADMIN_NAV_ITEMS = [
  { id: "admin", label: "Admin", icon: FaShieldAlt },
];

export default function Layout({
  children, activePage, onPageChange,
  darkMode, onToggleDark,
  onCreateClick, onSettingsClick, onProfileClick, onSearchClick,
}) {
  const [collapsed,  setCollapsed]  = useState(() => localStorage.getItem("sidebar_collapsed") === "true");
  const [notifOpen,  setNotifOpen]  = useState(false);

  const { addToast } = useToast();
  const { notifications, markNotifRead, markAllNotifsRead } = useApp();
  const notifRef    = useRef(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e) => addToast(e.detail.message, "error");
    window.addEventListener("corechestra:storage-error", handler);
    return () => window.removeEventListener("corechestra:storage-error", handler);
  }, [addToast]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar_collapsed", String(next));
  };

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = markAllNotifsRead;
  const markRead    = markNotifRead;

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
      <aside className={`
        flex-shrink-0 flex flex-col transition-all duration-200
        ${collapsed ? "w-14" : "w-56"}
        ${sidebarBg}
        border-r ${borderColor}
      `}>

        {/* App branding */}
        <div className={`border-b ${borderColor} ${collapsed ? "px-2 py-3" : "px-3 py-3"}`}>
          {collapsed ? (
            <div className="flex justify-center">
              <div
                className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center cursor-pointer"
                title="Corechestra"
                onClick={() => { setCollapsed(false); localStorage.setItem("sidebar_collapsed","false"); }}
              >
                <span className="text-white text-xs font-bold">CO</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[11px] font-bold">CO</span>
              </div>
              <div>
                <div className={`text-sm font-bold ${projNameText}`}>Corechestra</div>
                <div className={`text-[11px] ${subText}`}>Workspace</div>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto py-2 ${collapsed ? "px-1 space-y-0.5" : "px-2 space-y-0.5"}`}>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <NavBtn key={id} id={id} label={label} Icon={Icon} />
          ))}

          {/* Admin section */}
          {collapsed ? (
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
          )}
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

          {/* Settings */}
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
                className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 hover:ring-2 hover:ring-blue-400 transition-all"
                title="Profile"
              >
                C
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium truncate ${projNameText}`}>Canberk Y.</div>
                <div className={`text-[11px] ${subText}`}>Admin</div>
              </div>
              {/* Collapse button */}
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
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar — same bg as sidebar to kill the seam */}
        <header className={`
          h-14 flex items-center px-5 gap-4 flex-shrink-0 transition-colors
          ${topbarBg} border-b ${borderColor}
        `}>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm min-w-0">
            <span className={`font-medium truncate ${projNameText}`}>Corechestra</span>
            {activePage && (
              <>
                <span className={subText}>/</span>
                <span className={`capitalize ${subText}`}>{activePage}</span>
              </>
            )}
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md mx-auto relative">
            <FaSearch className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${subText}`} />
            <input
              type="text"
              placeholder="Search issues, tasks..."
              className={`w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-blue-400
                ${darkMode
                  ? "bg-[#252b3b] text-slate-200 placeholder-slate-500 border-[#353d50] focus:bg-[#1a1f2e]"
                  : "bg-slate-100 text-slate-700 placeholder-slate-400 border-transparent focus:bg-white"
                }`}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Search button */}
            <button
              onClick={onSearchClick}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:border-blue-400 hover:text-blue-500 transition-colors bg-white dark:bg-[#1c2030]"
              title="Search (Cmd+K)"
            >
              <FaSearch className="w-3 h-3" />
              <span>Search</span>
              <kbd className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-[#232838] px-1 rounded">⌘K</kbd>
            </button>

            <button
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              onClick={onCreateClick}
            >
              <FaPlus className="w-3 h-3" /> Create
            </button>

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

              {notifOpen && (
                <div className={`absolute right-0 top-full mt-2 w-80 rounded-xl border shadow-xl z-50 overflow-hidden ${
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
                          onClick={() => markRead(n.id)}
                          className={`w-full flex items-start gap-3 px-4 py-3 transition-colors text-left border-b last:border-0 ${borderColor} ${
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
                            <p className={`text-xs mt-0.5 ${subText}`}>{relativeTime(n.timestamp)}</p>
                          </div>
                          {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className={`px-4 py-2.5 border-t ${borderColor}`}>
                    <button className="text-xs text-blue-500 hover:text-blue-400 font-medium w-full text-center">View all notifications</button>
                  </div>
                </div>
              )}
            </div>

            {/* Dark toggle */}
            <button
              onClick={onToggleDark}
              title={darkMode ? "Light Mode" : "Dark Mode"}
              className={`p-2 rounded-lg transition-colors ${bottomRowClass}`}
            >
              {darkMode ? <FaSun className="w-4 h-4 text-yellow-400" /> : <FaMoon className="w-4 h-4" />}
            </button>

            {/* Profile avatar */}
            <button
              onClick={onProfileClick}
              title="Profile"
              className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold hover:ring-2 hover:ring-blue-400 transition-all"
            >
              C
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className={`flex-1 overflow-y-auto transition-colors ${contentBg}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
