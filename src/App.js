import React, { useState, useCallback, useMemo } from "react";
import Layout from "./components/Layout";
import BoardPage from "./pages/BoardPage";
import DashboardPage from "./pages/DashboardPage";
import TimelinePage from "./pages/TimelinePage";
import CalendarPage from "./pages/CalendarPage";
import ReportsPage from "./pages/ReportsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import ProjectsPage from "./pages/ProjectsPage";
import TaskDetailModal from "./components/TaskDetailModal";
import { AppProvider, useApp } from "./context/AppContext";
import { ToastProvider } from "./context/ToastContext";
import "./App.css";

function AppInner() {
  const [activePage, setActivePage] = useState("board");
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("corechestra_dark") === "true"
  );

  // Global create modal (topbar Create button works from any page)
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Settings shortcut → board page at settings tab
  const [forcedBoardTab, setForcedBoardTab] = useState(null);

  const { createTask, backlogSections } = useApp();

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
    setActivePage("board");
    setForcedBoardTab("settings");
  }, []);

  const handleProfileClick = useCallback(() => {
    setActivePage("profile");
  }, []);

  const handleCreateClick = useCallback(() => {
    setSelectedSprint(sprintOptions[0]);
    setCreateModalOpen(true);
  }, [sprintOptions]);

  const renderPage = () => {
    switch (activePage) {
      case "dashboard": return <DashboardPage />;
      case "roadmap": return <TimelinePage />;
      case "calendar": return <CalendarPage />;
      case "reports": return <ReportsPage />;
      case "profile": return <ProfilePage />;
      case "admin": return <AdminPage />;
      case "projects": return <ProjectsPage onNavigate={setActivePage} />;
      case "board":
      default:
        return (
          <BoardPage
            forcedTab={forcedBoardTab}
            onForcedTabConsumed={() => setForcedBoardTab(null)}
          />
        );
    }
  };

  return (
    <>
      <Layout
        activePage={activePage}
        onPageChange={setActivePage}
        darkMode={darkMode}
        onToggleDark={toggleDark}
        onCreateClick={handleCreateClick}
        onSettingsClick={handleSettingsClick}
        onProfileClick={handleProfileClick}
      >
        {renderPage()}
      </Layout>

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
    <AppProvider>
      <ToastProvider>
        <AppInner />
      </ToastProvider>
    </AppProvider>
  );
}
