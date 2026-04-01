import React, { useState, useMemo, useEffect, useCallback } from "react";
import { BoardSprintBanner } from "../components/BoardSprintBanner";
import { BoardTopBar } from "../components/BoardTopBar";
import { BoardActiveFiltersBar } from "../components/BoardActiveFiltersBar";
import { BoardBulkActionBar } from "../components/BoardBulkActionBar";
import { BoardTabContent } from "../components/BoardTabContent";
import { useApp } from "../../../shared/context/AppContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { BoardSkeleton } from "../../../shared/components/Skeleton";
import { useBoardState } from "../../../shared/context/hooks/useBoardState";
import { useBoardFilters } from "../hooks/useBoardFilters";
import { BOARD_STATUS_OPTIONS, BOARD_TABS, BOARD_VIEW_MODES } from "../constants/boardPageConfig";

export default function BoardPage({ forcedTab, onForcedTabConsumed }) {
  const {
    activeTasks, setActiveTasks,
    allTasks, idToGlobalIndex,
    boardSettings, createTask, savePokerResult,
    columns,
    updateBoardSettings,
    currentProjectId,
    perProjectBoardFilters, setPerProjectBoardFilters,
    teamMembers, dbReady,
  } = useApp();

  // Only show members who are in this project (via memberUsernames or task assignment)
  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    if (forcedTab) {
      setActiveTab(forcedTab);
      if (onForcedTabConsumed) onForcedTabConsumed();
    }
  }, [forcedTab]); // eslint-disable-line

  const {
    projectActiveTasks,
    projectMembers,
    sprint,
    doneTasks,
    sprintPct,
    sprintDaysLeft,
  } = useBoardState({
    projectId: currentProjectId,
    filterValue: "",
    memberValue: "",
    search: "",
  });

  const {
    filter,
    setFilter,
    member,
    setMember,
    search,
    setSearch,
    viewMode,
    setViewMode,
    activeFilterCount,
    hasActiveFilters,
    clearFilters,
  } = useBoardFilters({
    currentProjectId,
    projectMembers,
    perProjectBoardFilters,
    setPerProjectBoardFilters,
  });

  const { filteredTasks } = useBoardState({
    projectId: currentProjectId,
    filterValue: filter.value,
    memberValue: member.value,
    search,
  });

  // Bulk selection
  const [bulkMode, setBulkMode] = useState(false);
  const [swimlaneMode, setSwimlaneMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("");

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === filteredTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map((t) => t.id)));
    }
  }, [selectedIds]); // eslint-disable-line

  const handleBulkStatusChange = useCallback(() => {
    if (!bulkStatus) return;
    setActiveTasks((prev) =>
      prev.map((t) => selectedIds.has(t.id) ? { ...t, status: bulkStatus } : t)
    );
    setSelectedIds(new Set());
    setBulkStatus("");
  }, [bulkStatus, selectedIds, setActiveTasks]);

  const handleBulkDelete = useCallback(() => {
    if (!window.confirm(`Delete ${selectedIds.size} task(s)?`)) return;
    setActiveTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)));
    setSelectedIds(new Set());
  }, [selectedIds, setActiveTasks]);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTaskData] = useState({});
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const [pokerOpen, setPokerOpen] = useState(false);
  const [pokerTask, setPokerTask] = useState(null);

  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [sprintModalMode, setSprintModalMode] = useState("start");
  const [futurePlansOpen, setFuturePlansOpen] = useState(false);
  const [backlogFocusSectionId, setBacklogFocusSectionId] = useState(null);

  const { backlogSections } = useApp();
  const { isAdmin } = useAuth();
  const sprintOptions = useMemo(() => [
    { value: "active", label: "Active Sprint" },
    ...backlogSections.map((b) => ({ value: `backlog-${b.id}`, label: b.title })),
  ], [backlogSections]);
  const [selectedSprint, setSelectedSprint] = useState(sprintOptions[0]);

  const handleTaskClick = (task) => {
    const enriched = { ...task, index: idToGlobalIndex[task.id] };
    setSelectedTask(enriched);
    if (boardSettings.taskViewMode === "panel") {
      setSidePanelOpen(true);
      setDetailModalOpen(false);
    } else {
      setDetailModalOpen(true);
      setSidePanelOpen(false);
    }
  };

  const handleTaskUpdate = (updatedTask) => {
    setActiveTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setSelectedTask(updatedTask);
  };

  useEffect(() => {
    if (!selectedTask || (!sidePanelOpen && !detailModalOpen)) return;
    const updated = activeTasks.find((t) => t.id === selectedTask.id);
    if (updated && updated !== selectedTask) {
      setSelectedTask({ ...updated, index: idToGlobalIndex[updated.id] });
    }
  }, [activeTasks]); // eslint-disable-line

  const handlePokerClick = (task) => { setPokerTask(task); setPokerOpen(true); };
  const handleEstimationComplete = (data) => {
    savePokerResult({ ...data, taskTitle: pokerTask?.title });
    setPokerOpen(false); setPokerTask(null);
  };

  const { showBadges, showPriorityColors, showTaskIds, showSubtaskButtons } = boardSettings;

  const setProjectTasks = (updaterOrArray) => {
    setActiveTasks((fullPrev) => {
      const projIds = new Set(projectActiveTasks.map((t) => t.id));
      const others  = fullPrev.filter((t) => !projIds.has(t.id));
      const updated = typeof updaterOrArray === "function"
        ? updaterOrArray(projectActiveTasks)
        : updaterOrArray;
      return [...others, ...updated];
    });
  };

  const openSprintModal = (mode) => { setSprintModalMode(mode); setSprintModalOpen(true); };
  const handleCreateTask = () => { setSelectedSprint(sprintOptions[0]); setCreateModalOpen(true); };

  if (!dbReady) return <BoardSkeleton />;
  return (
    <div className="h-full bg-slate-50 dark:bg-[#141720] flex flex-col transition-colors">
      <BoardSprintBanner
        sprint={sprint}
        sprintDaysLeft={sprintDaysLeft}
        projectActiveTasks={projectActiveTasks}
        sprintPct={sprintPct}
        doneTasks={doneTasks}
        isAdmin={isAdmin}
        onOpenSprintModal={openSprintModal}
        onOpenFuturePlans={() => setFuturePlansOpen(true)}
      />

      <BoardTopBar tabs={BOARD_TABS} activeTab={activeTab} onTabChange={setActiveTab} onCreateTask={handleCreateTask} />

      {activeTab === "active" && (
        <>
          <BoardActiveFiltersBar
            filter={filter}
            setFilter={setFilter}
            member={member}
            setMember={setMember}
            projectMembers={projectMembers}
            showBadges={showBadges}
            showPriorityColors={showPriorityColors}
            showTaskIds={showTaskIds}
            showSubtaskButtons={showSubtaskButtons}
            updateBoardSettings={updateBoardSettings}
            viewMode={viewMode}
            swimlaneMode={swimlaneMode}
            setSwimlaneMode={setSwimlaneMode}
            bulkMode={bulkMode}
            setBulkMode={setBulkMode}
            setSelectedIds={setSelectedIds}
            search={search}
            setSearch={setSearch}
            viewModes={BOARD_VIEW_MODES}
            setViewMode={setViewMode}
            activeFilterCount={activeFilterCount}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        </>
      )}

      {activeTab === "active" && bulkMode && (
        <BoardBulkActionBar
          selectedCount={selectedIds.size}
          bulkStatus={bulkStatus}
          setBulkStatus={setBulkStatus}
          statusOptions={BOARD_STATUS_OPTIONS}
          onApply={handleBulkStatusChange}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      <BoardTabContent
        activeTab={activeTab}
        viewMode={viewMode}
        filteredTasks={filteredTasks}
        projectActiveTasks={projectActiveTasks}
        filter={filter}
        member={member}
        search={search}
        setProjectTasks={setProjectTasks}
        idToGlobalIndex={idToGlobalIndex}
        showBadges={showBadges}
        showPriorityColors={showPriorityColors}
        showTaskIds={showTaskIds}
        showSubtaskButtons={showSubtaskButtons}
        swimlaneMode={swimlaneMode}
        handleTaskClick={handleTaskClick}
        columns={columns}
        selectedIds={selectedIds}
        toggleSelect={toggleSelect}
        bulkMode={bulkMode}
        selectAll={selectAll}
        handleCreateTask={handleCreateTask}
        hasActiveFilters={hasActiveFilters}
        clearFilters={clearFilters}
        handlePokerClick={handlePokerClick}
        backlogFocusSectionId={backlogFocusSectionId}
        setBacklogFocusSectionId={setBacklogFocusSectionId}
        setActiveTab={setActiveTab}
        createModalOpen={createModalOpen}
        setCreateModalOpen={setCreateModalOpen}
        newTaskData={newTaskData}
        createTask={createTask}
        selectedSprint={selectedSprint}
        setSelectedSprint={setSelectedSprint}
        sprintOptions={sprintOptions}
        detailModalOpen={detailModalOpen}
        setDetailModalOpen={setDetailModalOpen}
        selectedTask={selectedTask}
        handleTaskUpdate={handleTaskUpdate}
        allTasks={allTasks}
        setSidePanelOpen={setSidePanelOpen}
        setSelectedTask={setSelectedTask}
        pokerOpen={pokerOpen}
        setPokerOpen={setPokerOpen}
        pokerTask={pokerTask}
        setPokerTask={setPokerTask}
        handleEstimationComplete={handleEstimationComplete}
        teamMembers={teamMembers}
        sprintModalOpen={sprintModalOpen}
        setSprintModalOpen={setSprintModalOpen}
        sprintModalMode={sprintModalMode}
        futurePlansOpen={futurePlansOpen}
        setFuturePlansOpen={setFuturePlansOpen}
        sidePanelOpen={sidePanelOpen}
        setActiveTasks={setActiveTasks}
      />
    </div>
  );
}
