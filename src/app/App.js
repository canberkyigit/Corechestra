import React, { Suspense, lazy, useState, useCallback, useMemo, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import AppErrorFallback from "../shared/components/AppErrorFallback";
import Layout from "../shared/components/Layout";
import LoginPage from "../features/auth/pages/LoginPage";
import Logo from "../shared/components/Logo";
import { AppProvider, useApp } from "../shared/context/AppContext";
import { ToastProvider } from "../shared/context/ToastContext";
import { AuthProvider, useAuth } from "../shared/context/AuthContext";
import { HRProvider } from "../shared/context/HRContext";
import { usePermissions } from "../shared/context/hooks/usePermissions";
import { captureException, identifyUser, initializeObservability, trackEvent } from "../shared/services/observability";
import "./styles/app.css";

const BoardPage = lazy(() => import("../features/board/pages/BoardPage"));
const TaskDetailModal = lazy(() => import("../features/board/components/TaskDetailModal"));
const TaskSidePanel = lazy(() => import("../features/board/components/TaskSidePanel"));
const CommandPalette = lazy(() => import("../shared/components/CommandPalette"));
const DashboardPage = lazy(() => import("../features/dashboard/pages/DashboardPage"));
const ActivityPage = lazy(() => import("../features/activity/pages/ActivityPage"));
const RoadmapPage = lazy(() => import("../features/roadmap/pages/RoadmapPage"));
const CalendarPage = lazy(() => import("../features/calendar/pages/CalendarPage"));
const ReportsPage = lazy(() => import("../features/reports/pages/ReportsPage"));
const ProfilePage = lazy(() => import("../features/profile/pages/ProfilePage"));
const AdminPage = lazy(() => import("../features/admin/pages/AdminPage"));
const HRPage = lazy(() => import("../features/hr/pages/HRPage"));
const ProjectsPage = lazy(() => import("../features/projects/pages/ProjectsPage"));
const DocsPage = lazy(() => import("../features/docs/pages/DocsPage"));
const ReleasesPage = lazy(() => import("../features/releases/pages/ReleasesPage"));
const TestsPage = lazy(() => import("../features/tests/pages/TestsPage"));
const ArchivePage = lazy(() => import("../features/archive/pages/ArchivePage"));
const ForYouPage = lazy(() => import("../features/for-you/pages/ForYouPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: Infinity,
    },
  },
});

const PATH_TO_PAGE = {
  "/":          "board",
  "/board":     "board",
  "/dashboard": "dashboard",
  "/roadmap":   "roadmap",
  "/calendar":  "calendar",
  "/reports":   "reports",
  "/profile":   "profile",
  "/admin":     "admin",
  "/projects":  "projects",
  "/docs":      "docs",
  "/releases":  "releases",
  "/tests":     "tests",
  "/archive":   "archive",
  "/for-you":   "for-you",
  "/activity":  "activity",
  "/hr":        "hr",
};

function PageTransition({ children, fullHeight = false }) {
  return (
    <motion.div
      className={fullHeight ? "h-full overflow-hidden" : "min-h-full"}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// Shown while Firebase resolves the auth state on first load
function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
          <Logo size={26} color="white" />
        </div>
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

function RouteLoadingScreen({ fullHeight = false }) {
  return (
    <div className={`${fullHeight ? "h-full" : "min-h-[320px]"} flex items-center justify-center`}>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-[#2a3044] bg-white/90 dark:bg-[#1c2030]/90 px-4 py-3 shadow-sm">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-500 dark:text-slate-400">Loading page...</span>
      </div>
    </div>
  );
}

function LazyPage({ children, fullHeight = false }) {
  return (
    <PageTransition fullHeight={fullHeight}>
      <Suspense fallback={<RouteLoadingScreen fullHeight={fullHeight} />}>
        {children}
      </Suspense>
    </PageTransition>
  );
}

function AppInner() {
  const navigate = useNavigate();
  const location = useLocation();

  const activePage = PATH_TO_PAGE[location.pathname] || "board";

  const {
    createTask,
    updateActiveTask,
    backlogSections,
    darkMode,
    setDarkMode,
    densityMode,
    setDensityMode,
    users,
    createUser,
    updateUser,
    setCurrentUser,
    pushRecentItem,
    dbReady,
  } = useApp();
  const { user: authUser, role } = useAuth();
  const { canAccessPage, canPerform, firstAccessiblePage } = usePermissions();

  // Sync Firebase Auth user → People list + currentUser (runs once after Firestore is ready)
  useEffect(() => {
    if (!dbReady || !authUser || !role) return;
    const prefix = authUser.email.split("@")[0];
    // Always keep currentUser in sync so "My Tasks" filters work correctly
    setCurrentUser(prefix);
    const byUid   = users.find((u) => u.id === authUser.uid);
    const byEmail = users.find((u) => u.email === authUser.email);
    // Already linked by UID — nothing to do
    if (byUid) return;
    // Pre-created via "Invite User" form (matched by email, wrong id) — fix the id
    if (byEmail) {
      updateUser({ ...byEmail, id: authUser.uid, role });
      return;
    }
    // Brand-new user — create the AppContext record
    const name   = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    const COLORS = ["#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899"];
    const color  = COLORS[authUser.uid.charCodeAt(0) % COLORS.length];
    createUser({
      id:       authUser.uid,
      name,
      username: prefix,
      email:    authUser.email,
      color,
      status:   "active",
      role,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbReady, authUser?.uid, role]);

  useEffect(() => {
    if (!authUser) return;
    identifyUser({
      uid: authUser.uid,
      email: authUser.email,
      role,
      fullName: authUser.displayName,
    });
  }, [authUser, role]);

  const [createModalOpen,   setCreateModalOpen]   = useState(false);
  const [cmdPaletteOpen,    setCmdPaletteOpen]    = useState(false);
  const [selectedTask,      setSelectedTask]      = useState(null);
  const [sidePanelOpen,     setSidePanelOpen]     = useState(false);
  const [forcedBoardTab,    setForcedBoardTab]    = useState(null);

  useEffect(() => {
    pushRecentItem({
      id: `page:${activePage}`,
      type: "page",
      title: activePage,
      route: location.pathname,
      viewedAt: new Date().toISOString(),
    });
    trackEvent("route_viewed", {
      page: activePage,
      path: location.pathname,
    });
  }, [activePage, location.pathname, pushRecentItem]);

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen((p) => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const sprintOptions = useMemo(() => [
    { value: "active", label: "Active Sprint" },
    ...backlogSections.map((b) => ({ value: `backlog-${b.id}`, label: b.title })),
  ], [backlogSections]);
  const [selectedSprint, setSelectedSprint] = useState(sprintOptions[0]);

  const toggleDark = () => {
    const next = !darkMode;
    document.documentElement.classList.add("dark-transitioning");
    setDarkMode(next);
    trackEvent("appearance_mode_toggled", { darkMode: next });
    setTimeout(() => document.documentElement.classList.remove("dark-transitioning"), 300);
  };

  const toggleDensity = useCallback(() => {
    const next = densityMode === "comfortable" ? "compact" : "comfortable";
    setDensityMode(next);
    trackEvent("density_mode_changed", { densityMode: next });
  }, [densityMode, setDensityMode]);

  const handleSettingsClick = useCallback(() => {
    navigate("/board");
    setForcedBoardTab("settings");
  }, [navigate]);

  const handleProfileClick  = useCallback(() => navigate("/profile"), [navigate]);
  const handleCreateClick   = useCallback(() => {
    if (!canPerform("task:create")) return;
    setSelectedSprint(sprintOptions[0]);
    setCreateModalOpen(true);
  }, [canPerform, sprintOptions]);

  const renderProtectedPage = useCallback((pageId, element, options = {}) => {
    if (!canAccessPage(pageId)) {
      return <Navigate to={`/${firstAccessiblePage === "board" ? "board" : firstAccessiblePage}`} replace />;
    }
    return options.fullHeight ? <LazyPage fullHeight>{element}</LazyPage> : <LazyPage>{element}</LazyPage>;
  }, [canAccessPage, firstAccessiblePage]);

  const handleOpenTask = useCallback((task) => {
    setSelectedTask(task);
    setSidePanelOpen(true);
    pushRecentItem({
      id: `task:${task.id}`,
      type: "task",
      title: task.title,
      entityId: task.id,
      route: "/board",
      viewedAt: new Date().toISOString(),
    });
    trackEvent("task_opened", { taskId: task.id, source: activePage });
  }, [activePage, pushRecentItem]);

  const boardPage = (
    <LazyPage fullHeight>
      <BoardPage
        forcedTab={forcedBoardTab}
        onForcedTabConsumed={() => setForcedBoardTab(null)}
      />
    </LazyPage>
  );

  return (
    <>
      <Layout
        activePage={activePage}
        onPageChange={(page) => navigate(`/${page === "board" ? "board" : page}`)}
        darkMode={darkMode}
        onToggleDark={toggleDark}
        onCreateClick={handleCreateClick}
        onSettingsClick={handleSettingsClick}
        onProfileClick={handleProfileClick}
        onSearchClick={() => setCmdPaletteOpen(true)}
        onOpenTask={handleOpenTask}
      >
        <Routes>
          <Route path="/"          element={boardPage} />
          <Route path="/board"     element={canAccessPage("board") ? boardPage : <Navigate to={`/${firstAccessiblePage}`} replace />} />
          <Route path="/activity"  element={renderProtectedPage("activity", <ActivityPage />)} />
          <Route path="/dashboard" element={renderProtectedPage("dashboard", <DashboardPage />)} />
          <Route path="/roadmap"   element={renderProtectedPage("roadmap", <RoadmapPage />)} />
          <Route path="/calendar"  element={renderProtectedPage("calendar", <CalendarPage />, { fullHeight: true })} />
          <Route path="/reports"   element={renderProtectedPage("reports", <ReportsPage />)} />
          <Route path="/profile"   element={<LazyPage><ProfilePage /></LazyPage>} />
          <Route path="/admin"     element={renderProtectedPage("admin", <AdminPage />)} />
          <Route path="/projects"  element={renderProtectedPage("projects", <ProjectsPage onNavigate={(p) => navigate(`/${p}`)} />)} />
          <Route path="/docs"      element={renderProtectedPage("docs", <DocsPage />, { fullHeight: true })} />
          <Route path="/releases"  element={renderProtectedPage("releases", <ReleasesPage />, { fullHeight: true })} />
          <Route path="/tests"     element={renderProtectedPage("tests", <TestsPage />, { fullHeight: true })} />
          <Route path="/archive"   element={renderProtectedPage("archive", <ArchivePage />)} />
          <Route path="/for-you"   element={renderProtectedPage("for-you", <ForYouPage />)} />
          <Route path="/hr"        element={renderProtectedPage("hr", <HRPage />)} />
          <Route path="*"          element={<Navigate to={`/${firstAccessiblePage === "board" ? "board" : firstAccessiblePage}`} replace />} />
        </Routes>
      </Layout>

      {cmdPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            open={cmdPaletteOpen}
            onClose={() => setCmdPaletteOpen(false)}
            onOpenTask={handleOpenTask}
            onNavigate={(page) => navigate(`/${page}`)}
            onCreateTask={handleCreateClick}
            onToggleDark={toggleDark}
            onToggleDensity={toggleDensity}
          />
        </Suspense>
      )}

      {sidePanelOpen && (
        <Suspense fallback={null}>
          <TaskSidePanel
            task={selectedTask}
            open={sidePanelOpen}
            onClose={() => setSidePanelOpen(false)}
            onTaskUpdate={(updated) => { updateActiveTask(updated); setSelectedTask(updated); }}
            onOpenModal={(t) => { setSelectedTask(t); setSidePanelOpen(false); }}
          />
        </Suspense>
      )}

      {createModalOpen && (
        <Suspense fallback={null}>
          <TaskDetailModal
            open={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            task={{}}
            onTaskUpdate={(task) => {
              createTask(task, selectedSprint.value);
              setCreateModalOpen(false);
            }}
            allTasks={[]}
            isCreate
            sprintOptions={sprintOptions}
            selectedSprint={selectedSprint}
            setSelectedSprint={setSelectedSprint}
          />
        </Suspense>
      )}
    </>
  );
}

// Gates the entire app behind Firebase Auth
function AuthGate() {
  const { user } = useAuth();

  // Still resolving auth state (Firebase cold start)
  if (user === undefined) return <AuthLoadingScreen />;

  // Not logged in → show login page
  if (!user) return <LoginPage />;

  // Logged in → mount the full app (AppProvider loads Firestore data)
  return (
    <AppProvider>
      <ToastProvider>
        <HRProvider>
          <AppInner />
        </HRProvider>
      </ToastProvider>
    </AppProvider>
  );
}

export default function App() {
  useEffect(() => {
    initializeObservability();
  }, []);

  return (
    <ErrorBoundary
      FallbackComponent={AppErrorFallback}
      onError={(error, info) => captureException(error, { componentStack: info.componentStack })}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AuthGate />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
