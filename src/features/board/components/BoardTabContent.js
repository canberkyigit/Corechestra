import React, { Suspense, lazy, useMemo } from "react";
import PlanningPoker from "./PlanningPoker";
import SprintModal from "../../projects/components/SprintModal";
import FuturePlansModal from "../../projects/components/FuturePlansModal";
import BacklogTab from "../tabs/BacklogTab";
import RefinementTab from "../tabs/RefinementTab";
import RetrospectiveTab from "../tabs/RetrospectiveTab";
import PlanningTab from "../tabs/PlanningTab";
import BoardSettingsTab from "../tabs/BoardSettingsTab";
import AllSprintsTab from "../tabs/AllSprintsTab";
import EpicsTab from "../tabs/EpicsTab";
import SprintReviewTab from "../tabs/SprintReviewTab";
import { BoardActiveContent } from "./BoardActiveContent";

const AutomationTab = lazy(() => import("../../automation/components/AutomationTab"));

const TaskDetailModal = lazy(() => import("./TaskDetailModal"));
const TaskSidePanel = lazy(() => import("./TaskSidePanel"));

export function BoardTabContent({
  activeTab,
  viewMode,
  filteredTasks,
  projectActiveTasks,
  filter,
  member,
  search,
  showBadges,
  showPriorityColors,
  showTaskIds,
  showSubtaskButtons,
  swimlaneMode,
  handleTaskClick,
  columns,
  selectedIds,
  toggleSelect,
  bulkMode,
  selectAll,
  handleCreateTask,
  hasActiveFilters,
  clearFilters,
  handlePokerClick,
  backlogFocusSectionId,
  setBacklogFocusSectionId,
  setActiveTab,
  createModalOpen,
  setCreateModalOpen,
  createTask,
  selectedSprint,
  setSelectedSprint,
  sprintOptions,
  detailModalOpen,
  setDetailModalOpen,
  detailInitialDirty,
  setDetailInitialDirty,
  selectedTask,
  handleTaskUpdate,
  allTasks,
  setSidePanelOpen,
  setSelectedTask,
  pokerOpen,
  setPokerOpen,
  pokerTask,
  setPokerTask,
  handleEstimationComplete,
  teamMembers,
  currentUser,
  sprintModalOpen,
  setSprintModalOpen,
  sprintModalMode,
  futurePlansOpen,
  setFuturePlansOpen,
  sidePanelOpen,
}) {
  // Real team for Planning Poker: active people (minus the "All"/"Unassigned" pseudo options).
  const pokerTeam = useMemo(
    () => (teamMembers || [])
      .filter((option) => option.value && option.value !== "unassigned")
      .map((option) => option.label),
    [teamMembers]
  );
  const currentPlayer = (teamMembers || []).find((option) => option.value === currentUser)?.label || currentUser || "You";

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "active" && (
          <BoardActiveContent
            viewMode={viewMode}
            filteredTasks={filteredTasks}
            projectActiveTasks={projectActiveTasks}
            filterValue={filter.value}
            memberValue={member.value}
            search={search}
            showBadges={showBadges}
            showPriorityColors={showPriorityColors}
            showTaskIds={showTaskIds}
            showSubtaskButtons={showSubtaskButtons}
            swimlaneMode={swimlaneMode}
            onTaskClick={handleTaskClick}
            columns={columns}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            bulkMode={bulkMode}
            onSelectAll={selectAll}
            onCreateTask={handleCreateTask}
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          />
        )}
        {activeTab === "backlog" && (
          <div className="flex-1 overflow-y-auto">
            <BacklogTab
              onTaskClick={handleTaskClick}
              onPokerClick={handlePokerClick}
              focusSectionId={backlogFocusSectionId}
              onFocusHandled={() => setBacklogFocusSectionId(null)}
            />
          </div>
        )}
        {activeTab === "epics" && <div className="flex-1 overflow-y-auto"><EpicsTab /></div>}
        {activeTab === "refinement" && <div className="flex-1 overflow-y-auto"><RefinementTab onTaskClick={handleTaskClick} onPokerClick={handlePokerClick} /></div>}
        {activeTab === "review" && <div className="flex-1 overflow-y-auto"><SprintReviewTab onTaskClick={handleTaskClick} /></div>}
        {activeTab === "retrospective" && <div className="flex-1 overflow-y-auto"><RetrospectiveTab /></div>}
        {activeTab === "planning" && <div className="flex-1 overflow-y-auto"><PlanningTab onTaskClick={handleTaskClick} onPokerClick={handlePokerClick} /></div>}
        {activeTab === "allsprints" && (
          <div className="flex-1 overflow-y-auto">
            <AllSprintsTab onNavigate={(tab, sectionId) => { if (sectionId) setBacklogFocusSectionId(sectionId); setActiveTab(tab); }} />
          </div>
        )}
        {activeTab === "automation" && (
          <div className="flex-1 overflow-y-auto">
            <Suspense fallback={null}><AutomationTab /></Suspense>
          </div>
        )}
        {activeTab === "settings" && <div className="flex-1 overflow-y-auto"><BoardSettingsTab /></div>}
      </div>

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
            allTasks={allTasks}
            isCreate
            sprintOptions={sprintOptions}
            selectedSprint={selectedSprint}
            setSelectedSprint={setSelectedSprint}
          />
        </Suspense>
      )}

      {detailModalOpen && (
        <Suspense fallback={null}>
          <TaskDetailModal
            open={detailModalOpen}
            onClose={() => setDetailModalOpen(false)}
            task={selectedTask}
            initialDirty={detailInitialDirty}
            onTaskUpdate={handleTaskUpdate}
            allTasks={allTasks}
            isCreate={false}
            onOpenPanel={(task) => {
              setDetailModalOpen(false);
              setSelectedTask(task);
              setSidePanelOpen(true);
            }}
          />
        </Suspense>
      )}

      <PlanningPoker
        isOpen={pokerOpen}
        onClose={() => { setPokerOpen(false); setPokerTask(null); }}
        currentTask={pokerTask}
        onEstimationComplete={handleEstimationComplete}
        teamMembers={pokerTeam}
        currentPlayer={currentPlayer}
      />

      <SprintModal open={sprintModalOpen} onClose={() => setSprintModalOpen(false)} mode={sprintModalMode} />
      <FuturePlansModal open={futurePlansOpen} onClose={() => setFuturePlansOpen(false)} />

      {sidePanelOpen && (
        <Suspense fallback={null}>
          <TaskSidePanel
            open={sidePanelOpen}
            task={selectedTask}
            onClose={() => setSidePanelOpen(false)}
            onTaskUpdate={handleTaskUpdate}
            onOpenModal={(task, meta) => {
              setSidePanelOpen(false);
              setSelectedTask(task);
              setDetailInitialDirty(Boolean(meta?.hasChanges));
              setDetailModalOpen(true);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
