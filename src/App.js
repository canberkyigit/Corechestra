import React, { useState, useCallback, useMemo, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import AppErrorFallback from "./components/AppErrorFallback";
import Layout from "./components/Layout";
import BoardPage from "./pages/BoardPage";
import DashboardPage from "./pages/DashboardPage";
import TimelinePage from "./pages/TimelinePage";
import CalendarPage from "./pages/CalendarPage";
import ReportsPage from "./pages/ReportsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import ProjectsPage from "./pages/ProjectsPage";
import DocsPage from "./pages/DocsPage";
import ReleasesPage from "./pages/ReleasesPage";
import TestsPage from "./pages/TestsPage";
import ArchivePage from "./pages/ArchivePage";
import ForYouPage from "./pages/ForYouPage";
import LoginPage from "./pages/LoginPage";
import TaskDetailModal from "./components/TaskDetailModal";
import TaskSidePanel from "./components/TaskSidePanel";
import CommandPalette from "./components/CommandPalette";
import Logo from "./components/Logo";
import { AppProvider, useApp } from "./context/AppContext";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import "./App.css";

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
};

function PageTransition({ children }) {
  return (
    <motion.div
      className="h-full overflow-hidden"
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

function AppInner() {
  const navigate = useNavigate();
  const location = useLocation();

  const activePage = PATH_TO_PAGE[location.pathname] || "board";

  const { createTask, updateActiveTask, backlogSections, darkMode, setDarkMode, users, createUser, dbReady } = useApp();
  const { user: authUser, role } = useAuth();

  // Sync Firebase Auth user → People list (runs once after Firestore is ready)
  useEffect(() => {
    if (!dbReady || !authUser || !role) return;
    const alreadyExists = users.some((u) => u.email === authUser.email || u.id === authUser.uid);
    if (alreadyExists) return;
    const prefix = authUser.email.split("@")[0];
    const name   = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    const COLORS  = ["#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899"];
    const color   = COLORS[authUser.uid.charCodeAt(0) % COLORS.length];
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

  const [createModalOpen,   setCreateModalOpen]   = useState(false);
  const [cmdPaletteOpen,    setCmdPaletteOpen]    = useState(false);
  const [selectedTask,      setSelectedTask]      = useState(null);
  const [sidePanelOpen,     setSidePanelOpen]     = useState(false);
  const [forcedBoardTab,    setForcedBoardTab]    = useState(null);

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
    setTimeout(() => document.documentElement.classList.remove("dark-transitioning"), 300);
  };

  const handleSettingsClick = useCallback(() => {
    navigate("/board");
    setForcedBoardTab("settings");
  }, [navigate]);

  const handleProfileClick  = useCallback(() => navigate("/profile"), [navigate]);
  const handleCreateClick   = useCallback(() => {
    setSelectedSprint(sprintOptions[0]);
    setCreateModalOpen(true);
  }, [sprintOptions]);

  const boardPage = (
    <PageTransition>
      <BoardPage
        forcedTab={forcedBoardTab}
        onForcedTabConsumed={() => setForcedBoardTab(null)}
      />
    </PageTransition>
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
        onOpenTask={(task) => { setSelectedTask(task); setSidePanelOpen(true); }}
      >
        <Routes>
          <Route path="/"          element={boardPage} />
          <Route path="/board"     element={boardPage} />
          <Route path="/dashboard" element={<PageTransition><DashboardPage /></PageTransition>} />
          <Route path="/roadmap"   element={<PageTransition><TimelinePage /></PageTransition>} />
          <Route path="/calendar"  element={<PageTransition><CalendarPage /></PageTransition>} />
          <Route path="/reports"   element={<PageTransition><ReportsPage /></PageTransition>} />
          <Route path="/profile"   element={<PageTransition><ProfilePage /></PageTransition>} />
          <Route path="/admin"     element={<PageTransition><AdminPage /></PageTransition>} />
          <Route path="/projects"  element={<PageTransition><ProjectsPage onNavigate={(p) => navigate(`/${p}`)} /></PageTransition>} />
          <Route path="/docs"      element={<PageTransition><DocsPage /></PageTransition>} />
          <Route path="/releases"  element={<PageTransition><ReleasesPage /></PageTransition>} />
          <Route path="/tests"     element={<PageTransition><TestsPage /></PageTransition>} />
          <Route path="/archive"   element={<PageTransition><ArchivePage /></PageTransition>} />
          <Route path="/for-you"   element={<PageTransition><ForYouPage /></PageTransition>} />
          <Route path="*"          element={boardPage} />
        </Routes>
      </Layout>

      <CommandPalette
        open={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        onOpenTask={(task) => { setSelectedTask(task); setSidePanelOpen(true); }}
        onNavigate={(page) => navigate(`/${page}`)}
      />

      <TaskSidePanel
        task={selectedTask}
        open={sidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
        onTaskUpdate={(updated) => { updateActiveTask(updated); setSelectedTask(updated); }}
        onOpenModal={(t) => { setSelectedTask(t); setSidePanelOpen(false); }}
      />

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
        <AppInner />
      </ToastProvider>
    </AppProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={AppErrorFallback}>
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
