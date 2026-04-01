import React, { Suspense, lazy } from "react";
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
  setProjectTasks,
  idToGlobalIndex,
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
  newTaskData,
  createTask,
  selectedSprint,
  setSelectedSprint,
  sprintOptions,
  detailModalOpen,
  setDetailModalOpen,
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
  sprintModalOpen,
  setSprintModalOpen,
  sprintModalMode,
  futurePlansOpen,
  setFuturePlansOpen,
  sidePanelOpen,
  setActiveTasks,
}) {
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
            setProjectTasks={setProjectTasks}
            idToGlobalIndex={idToGlobalIndex}
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
            <BacklogTab onTaskClick={handleTaskClick} onPokerClick={handlePokerClick} focusSectionId={backlogFocusSectionId} onFocusHandled={() => setBacklogFocusSectionId(null)} />
          </div>
        )}
        {activeTab === "epics" && <div className="flex-1 overflow-y-auto"><EpicsTab /></div>}
        {activeTab === "refinement" && <div className="flex-1 overflow-y-auto"><RefinementTab onTaskClick={handleTaskClick} onPokerClick={handlePokerClick} /></div>}
        {activeTab === "review" && <div className="flex-1 overflow-y-auto"><SprintReviewTab onTaskClick={handleTaskClick} /></div>}
        {activeTab === "retrospective" && <div className="flex-1 overflow-y-auto"><RetrospectiveTab /></div>}
        {activeTab === "planning" && <div className="flex-1 overflow-y-auto"><PlanningTab /></div>}
        {activeTab === "allsprints" && (
          <div className="flex-1 overflow-y-auto">
            <AllSprintsTab onNavigate={(tab, sectionId) => { if (sectionId) setBacklogFocusSectionId(sectionId); setActiveTab(tab); }} />
          </div>
        )}
        {activeTab === "settings" && <div className="flex-1 overflow-y-auto"><BoardSettingsTab /></div>}
      </div>

      {createModalOpen && (
        <Suspense fallback={null}>
          <TaskDetailModal
            open={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            task={newTaskData}
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
        teamMembers={teamMembers.filter((memberOption) => memberOption.value && memberOption.value !== "unassigned").map((memberOption) => memberOption.label)}
      />

      <SprintModal open={sprintModalOpen} onClose={() => setSprintModalOpen(false)} mode={sprintModalMode} />
      <FuturePlansModal open={futurePlansOpen} onClose={() => setFuturePlansOpen(false)} />

      {sidePanelOpen && (
        <Suspense fallback={null}>
          <TaskSidePanel
            open={sidePanelOpen}
            task={selectedTask}
            onClose={() => setSidePanelOpen(false)}
            onTaskUpdate={(updated) => {
              setActiveTasks((previous) => previous.map((task) => task.id === updated.id ? updated : task));
              setSelectedTask(updated);
            }}
            onOpenModal={(task) => {
              setSidePanelOpen(false);
              setSelectedTask(task);
              setDetailModalOpen(true);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
