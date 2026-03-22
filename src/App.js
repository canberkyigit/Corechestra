import React, { useState, useCallback, useMemo, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
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
import TaskDetailModal from "./components/TaskDetailModal";
import TaskSidePanel from "./components/TaskSidePanel";
import CommandPalette from "./components/CommandPalette";
import { AppProvider, useApp } from "./context/AppContext";
import { ToastProvider } from "./context/ToastContext";
import "./App.css";

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
};

function AppInner() {
  const navigate = useNavigate();
  const location = useLocation();

  const activePage = PATH_TO_PAGE[location.pathname] || "board";

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("corechestra_dark") === "true"
  );

  // Global create modal (topbar Create button works from any page)
  const [createModalOpen,   setCreateModalOpen]   = useState(false);
  const [cmdPaletteOpen,    setCmdPaletteOpen]    = useState(false);
  const [selectedTask,      setSelectedTask]      = useState(null);
  const [sidePanelOpen,     setSidePanelOpen]     = useState(false);

  // Settings shortcut → board page at settings tab
  const [forcedBoardTab, setForcedBoardTab] = useState(null);

  const { createTask, updateActiveTask, backlogSections } = useApp();

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
    setDarkMode(next);
    localStorage.setItem("corechestra_dark", String(next));
    document.documentElement.classList.add("dark-transitioning");
    if (next) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    setTimeout(() => document.documentElement.classList.remove("dark-transitioning"), 300);
  };

  const handleSettingsClick = useCallback(() => {
    navigate("/board");
    setForcedBoardTab("settings");
  }, [navigate]);

  const handleProfileClick = useCallback(() => {
    navigate("/profile");
  }, [navigate]);

  const handleCreateClick = useCallback(() => {
    setSelectedSprint(sprintOptions[0]);
    setCreateModalOpen(true);
  }, [sprintOptions]);

  const boardPage = (
    <BoardPage
      forcedTab={forcedBoardTab}
      onForcedTabConsumed={() => setForcedBoardTab(null)}
    />
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
      >
        <Routes>
          <Route path="/"          element={boardPage} />
          <Route path="/board"     element={boardPage} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/roadmap"   element={<TimelinePage />} />
          <Route path="/calendar"  element={<CalendarPage />} />
          <Route path="/reports"   element={<ReportsPage />} />
          <Route path="/profile"   element={<ProfilePage />} />
          <Route path="/admin"     element={<AdminPage />} />
          <Route path="/projects"  element={<ProjectsPage onNavigate={(p) => navigate(`/${p}`)} />} />
          <Route path="/docs"      element={<DocsPage />} />
          <Route path="/releases"  element={<ReleasesPage />} />
          <Route path="/tests"     element={<TestsPage />} />
          <Route path="*"          element={boardPage} />
        </Routes>
      </Layout>

      {/* Command Palette */}
      <CommandPalette
        open={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        onOpenTask={(task) => { setSelectedTask(task); setSidePanelOpen(true); }}
        onNavigate={(page) => navigate(`/${page}`)}
      />

      {/* Global task side panel (opened from search) */}
      <TaskSidePanel
        task={selectedTask}
        open={sidePanelOpen}
        onClose={() => setSidePanelOpen(false)}
        onTaskUpdate={(updated) => { updateActiveTask(updated); setSelectedTask(updated); }}
        onOpenModal={(t) => { setSelectedTask(t); setSidePanelOpen(false); }}
      />

      {/* Global Create Task Modal */}
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

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <ToastProvider>
          <AppInner />
        </ToastProvider>
      </AppProvider>
    </BrowserRouter>
  );
}
