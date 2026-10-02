import React, { useState, useMemo, useEffect, useCallback } from "react";
import { BoardSprintBanner } from "../components/BoardSprintBanner";
import { BoardTopBar } from "../components/BoardTopBar";
import { BoardActiveFiltersBar } from "../components/BoardActiveFiltersBar";
import { BoardBulkActionBar } from "../components/BoardBulkActionBar";
import { BoardTabContent } from "../components/BoardTabContent";
import { useApp } from "../../../shared/context/AppContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import { BoardSkeleton } from "../../../shared/components/Skeleton";
import { useBoardState } from "../../../shared/context/hooks/useBoardState";
import { stripTransientTaskFields } from "../../../shared/context/hooks/actions/useBoardActions";
import { useBoardFilters } from "../hooks/useBoardFilters";
import { useWorkflowGuard } from "../hooks/useWorkflowGuard";
import { useBoardPermissions } from "../hooks/useBoardPermissions";
import { BOARD_TABS, BOARD_VIEW_MODES } from "../constants/boardPageConfig";
import { buildStatusOptions } from "../utils/boardColumns";
import { useSearchParamState } from "../../../shared/hooks/useSearchParamState";
import { useConfirm } from "../../../shared/context/ConfirmContext";

const BOARD_TAB_IDS = BOARD_TABS.map((tab) => tab.id);

export default function BoardPage() {
  const {
    activeTasks,
    allTasks,
    boardSettings,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    restoreTask,
    savePokerResult,
    columns,
    updateBoardSettings,
    currentProjectId,
    perProjectBoardFilters,
    setPerProjectBoardFilters,
    teamMembers,
    currentUser,
    dbReady,
    backlogSections,
  } = useApp();
  const { isAdmin } = useAuth();
  const { addToast } = useToast();
  const { canCreateTask, canEditTask, canArchiveTask } = useBoardPermissions();

  const confirm = useConfirm();
  // ?tab=backlog etc. — survives refresh/Back and can be linked.
  const [activeTab, setActiveTab] = useSearchParamState("tab", "active", { allowed: BOARD_TAB_IDS });

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

  // ── Bulk selection (list / table views) ─────────────────────────────────────
  const [bulkMode, setBulkMode] = useState(false);
  const [swimlaneMode, setSwimlaneMode] = useState("none");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const { guardStatusChange, dialog: workflowDialog } = useWorkflowGuard();

  useEffect(() => { setSelectedIds(new Set()); }, [currentProjectId]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds((prev) => (
      prev.size === filteredTasks.length && filteredTasks.length > 0
        ? new Set()
        : new Set(filteredTasks.map((task) => task.id))
    ));
  }, [filteredTasks]);

  const statusOptions = useMemo(() => buildStatusOptions(columns), [columns]);

  const handleBulkStatusChange = useCallback(async () => {
    if (!canEditTask || !bulkStatus || selectedIds.size === 0) return;
    const selectedTasks = projectActiveTasks.filter((task) => selectedIds.has(task.id) && task.status !== bulkStatus);
    if (selectedTasks.length > 0) {
      // One prompt (e.g. blocker reason) covers the whole selection.
      const verdict = await guardStatusChange(selectedTasks[0], bulkStatus);
      if (!verdict.ok) return;
      let failed = 0;
      selectedTasks.forEach((task) => {
        const result = moveTask(task.id, { status: bulkStatus, blockReason: verdict.patch.blockReason });
        if (result && result.ok === false) failed += 1;
      });
      if (failed > 0) {
        addToast(`${failed} task${failed === 1 ? "" : "s"} could not be moved because of workflow rules`, "error");
      }
    }
    setSelectedIds(new Set());
    setBulkStatus("");
  }, [addToast, bulkStatus, canEditTask, guardStatusChange, moveTask, projectActiveTasks, selectedIds]);

  const handleBulkDelete = useCallback(async () => {
    if (!canArchiveTask) return;
    const ok = await confirm({
      title: `Archive ${selectedIds.size} task${selectedIds.size === 1 ? "" : "s"}?`,
      description: "Archived tasks leave the board. You can restore them from the Archive page.",
      confirmLabel: "Archive",
      tone: "warning",
    });
    if (!ok) return;
    const archivedIds = [...selectedIds].filter((id) => deleteTask(id));
    addToast(`${archivedIds.length} task${archivedIds.length === 1 ? "" : "s"} archived`, "info", restoreTask && archivedIds.length ? {
      action: { label: "Undo", onClick: () => archivedIds.forEach((id) => restoreTask(id)) },
    } : undefined);
    setSelectedIds(new Set());
  }, [addToast, canArchiveTask, confirm, deleteTask, restoreTask, selectedIds]);

  // ── Task detail surfaces ────────────────────────────────────────────────────
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailInitialDirty, setDetailInitialDirty] = useState(false);

  const [pokerOpen, setPokerOpen] = useState(false);
  const [pokerTask, setPokerTask] = useState(null);

  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [sprintModalMode, setSprintModalMode] = useState("start");
  const [futurePlansOpen, setFuturePlansOpen] = useState(false);
  const [backlogFocusSectionId, setBacklogFocusSectionId] = useState(null);

  const sprintOptions = useMemo(() => [
    { value: "active", label: "Active Sprint" },
    ...(backlogSections || []).map((section) => ({ value: `backlog-${section.id}`, label: section.title })),
  ], [backlogSections]);
  const [selectedSprint, setSelectedSprint] = useState(sprintOptions[0]);

  const handleTaskClick = useCallback((task) => {
    setSelectedTask(stripTransientTaskFields(task));
    setDetailInitialDirty(false);
    if (boardSettings.taskViewMode === "panel") {
      setSidePanelOpen(true);
      setDetailModalOpen(false);
    } else {
      setDetailModalOpen(true);
      setSidePanelOpen(false);
    }
  }, [boardSettings.taskViewMode]);

  // Edits from the modal / side panel go through updateTask so backlog tasks
  // persist too and status / assignment notifications + workflow rules apply.
  const handleTaskUpdate = useCallback((updatedTask) => {
    const result = updateTask(updatedTask);
    if (result && result.ok === false) {
      if (result.message) addToast(result.message, "error");
      return result;
    }
    setSelectedTask(result?.task || stripTransientTaskFields(updatedTask));
    return result;
  }, [addToast, updateTask]);

  // Keep the open task in sync with remote / drag-and-drop changes.
  useEffect(() => {
    if (!selectedTask || (!sidePanelOpen && !detailModalOpen)) return;
    const updated = (allTasks || []).find((task) => task.id === selectedTask.id)
      || (activeTasks || []).find((task) => task.id === selectedTask.id);
    if (updated && updated !== selectedTask) setSelectedTask(updated);
  }, [allTasks, activeTasks]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePokerClick = useCallback((task) => { setPokerTask(task); setPokerOpen(true); }, []);
  const handleEstimationComplete = (data) => {
    savePokerResult({ ...data, taskTitle: pokerTask?.title });
    setPokerOpen(false);
    setPokerTask(null);
  };

  const { showBadges, showPriorityColors, showTaskIds, showSubtaskButtons } = boardSettings;

  const openSprintModal = (mode) => { setSprintModalMode(mode); setSprintModalOpen(true); };
  const handleCreateTask = useCallback(() => {
    if (!canCreateTask) return;
    setSelectedSprint(sprintOptions[0]);
    setCreateModalOpen(true);
  }, [canCreateTask, sprintOptions]);

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

      <BoardTopBar tabs={BOARD_TABS} activeTab={activeTab} onTabChange={setActiveTab} onCreateTask={canCreateTask ? handleCreateTask : null} />

      {activeTab === "active" && (
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
          canBulkEdit={canEditTask || canArchiveTask}
          setSelectedIds={setSelectedIds}
          search={search}
          setSearch={setSearch}
          viewModes={BOARD_VIEW_MODES}
          setViewMode={setViewMode}
          activeFilterCount={activeFilterCount}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />
      )}

      {activeTab === "active" && bulkMode && viewMode !== "kanban" && (
        <BoardBulkActionBar
          selectedCount={selectedIds.size}
          bulkStatus={bulkStatus}
          setBulkStatus={setBulkStatus}
          statusOptions={statusOptions}
          onApply={canEditTask ? handleBulkStatusChange : null}
          onDelete={canArchiveTask ? handleBulkDelete : null}
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
        handleCreateTask={canCreateTask ? handleCreateTask : null}
        hasActiveFilters={hasActiveFilters}
        clearFilters={clearFilters}
        handlePokerClick={handlePokerClick}
        backlogFocusSectionId={backlogFocusSectionId}
        setBacklogFocusSectionId={setBacklogFocusSectionId}
        setActiveTab={setActiveTab}
        createModalOpen={createModalOpen}
        setCreateModalOpen={setCreateModalOpen}
        createTask={createTask}
        selectedSprint={selectedSprint}
        setSelectedSprint={setSelectedSprint}
        sprintOptions={sprintOptions}
        detailModalOpen={detailModalOpen}
        setDetailModalOpen={setDetailModalOpen}
        detailInitialDirty={detailInitialDirty}
        setDetailInitialDirty={setDetailInitialDirty}
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
        currentUser={currentUser}
        sprintModalOpen={sprintModalOpen}
        setSprintModalOpen={setSprintModalOpen}
        sprintModalMode={sprintModalMode}
        futurePlansOpen={futurePlansOpen}
        setFuturePlansOpen={setFuturePlansOpen}
        sidePanelOpen={sidePanelOpen}
      />
      {workflowDialog}
    </div>
  );
}
