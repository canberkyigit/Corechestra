import React, { useState, useMemo, useEffect } from "react";
import KanbanBoard from "../components/KanbanBoard";
import TaskDetailModal from "../components/TaskDetailModal";
import TaskSidePanel from "../components/TaskSidePanel";
import PlanningPoker from "../components/PlanningPoker";
import SprintModal from "../components/SprintModal";
import BacklogTab from "../components/tabs/BacklogTab";
import RefinementTab from "../components/tabs/RefinementTab";
import RetrospectiveTab from "../components/tabs/RetrospectiveTab";
import BoardSettingsTab from "../components/tabs/BoardSettingsTab";
import EpicsTab from "../components/tabs/EpicsTab";
import SprintReviewTab from "../components/tabs/SprintReviewTab";
import { Listbox } from "@headlessui/react";
import {
  FaChevronDown, FaTags, FaFlag, FaHashtag, FaBars,
  FaPlay, FaCheckCircle, FaEdit,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";
import { TYPE_OPTIONS, TEAM_MEMBERS } from "../constants";
import { parseISO, differenceInDays } from "date-fns";

const TABS = [
  { id: "active", label: "Active Sprint" },
  { id: "backlog", label: "Backlog" },
  { id: "epics", label: "Epics" },
  { id: "refinement", label: "Refinement" },
  { id: "review", label: "Sprint Review" },
  { id: "retrospective", label: "Retrospective" },
  { id: "settings", label: "Board Settings" },
];

export default function BoardPage({ forcedTab, onForcedTabConsumed }) {
  const {
    activeTasks, setActiveTasks,
    allTasks, idToGlobalIndex,
    boardSettings, createTask, savePokerResult,
    sprint, columns,
    updateBoardSettings,
  } = useApp();

  const [activeTab, setActiveTab] = useState("active");

  // Consume forcedTab from parent (e.g. Settings nav click)
  useEffect(() => {
    if (forcedTab) {
      setActiveTab(forcedTab);
      if (onForcedTabConsumed) onForcedTabConsumed();
    }
  }, [forcedTab]);
  const [filter, setFilter] = useState(TYPE_OPTIONS[0]);
  const [member, setMember] = useState(TEAM_MEMBERS[0]);
  const [search, setSearch] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTaskData] = useState({});
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const [pokerOpen, setPokerOpen] = useState(false);
  const [pokerTask, setPokerTask] = useState(null);

  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [sprintModalMode, setSprintModalMode] = useState("start");

  const { backlogSections } = useApp();
  const sprintOptions = useMemo(() => [
    { value: "active", label: "Active Sprint" },
    ...backlogSections.map((b) => ({ value: `backlog-${b.id}`, label: b.title })),
  ], [backlogSections]);
  const [selectedSprint, setSelectedSprint] = useState(sprintOptions[0]);

  const statusOptions = [
    { value: "todo", label: "To Do" },
    { value: "inprogress", label: "In Progress" },
    { value: "review", label: "Review" },
    { value: "awaiting", label: "Awaiting Customer" },
    { value: "blocked", label: "Blocked" },
    { value: "done", label: "Done" },
  ];

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

  const handlePokerClick = (task) => { setPokerTask(task); setPokerOpen(true); };
  const handleEstimationComplete = (data) => {
    savePokerResult({ ...data, taskTitle: pokerTask?.title });
    setPokerOpen(false); setPokerTask(null);
  };

  const { showBadges, showPriorityColors, showTaskIds, showSubtaskButtons } = boardSettings;

  const sprintDaysLeft = sprint?.endDate
    ? Math.max(0, differenceInDays(parseISO(sprint.endDate), new Date()))
    : null;

  const doneTasks = activeTasks.filter((t) => t.status === "done").length;
  const sprintPct = activeTasks.length > 0 ? Math.round((doneTasks / activeTasks.length) * 100) : 0;

  const openSprintModal = (mode) => { setSprintModalMode(mode); setSprintModalOpen(true); };

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-[#141720] flex flex-col transition-colors">
      {/* Sprint header banner */}
      {sprint && (
        <div className="bg-white dark:bg-[#1c2030] border-b border-slate-200 dark:border-[#2a3044] px-6 py-2.5 flex items-center gap-4 transition-colors">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${sprint.status === "active" ? "bg-green-500" : sprint.status === "completed" ? "bg-slate-400" : "bg-yellow-400"}`} />
            <span className="text-sm font-semibold text-slate-700">{sprint.name}</span>
            {sprint.status === "active" && sprint.endDate && (
              <span className="text-xs text-slate-400">
                · {sprintDaysLeft} day{sprintDaysLeft !== 1 ? "s" : ""} left
              </span>
            )}
            {sprint.goal && (
              <span className="text-xs text-slate-400 hidden md:inline truncate max-w-xs">· {sprint.goal}</span>
            )}
          </div>

          {/* Mini progress */}
          {activeTasks.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${sprintPct}%` }} />
              </div>
              <span className="text-xs text-slate-400">{doneTasks}/{activeTasks.length}</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {sprint.status !== "active" && (
              <button
                className="flex items-center gap-1.5 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                onClick={() => openSprintModal("start")}
              >
                <FaPlay className="w-2.5 h-2.5" /> Start Sprint
              </button>
            )}
            {sprint.status === "active" && (
              <>
                <button
                  className="flex items-center gap-1.5 px-3 py-1 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  onClick={() => openSprintModal("edit")}
                >
                  <FaEdit className="w-2.5 h-2.5" /> Edit Sprint
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-700 text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors"
                  onClick={() => openSprintModal("complete")}
                >
                  <FaCheckCircle className="w-2.5 h-2.5" /> Complete Sprint
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tab bar + Create button */}
      <div className="flex items-center gap-2 px-6 pt-4 pb-0 border-b border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] transition-colors">
        <div className="flex gap-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 font-medium text-sm transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          className="mb-1 px-4 py-1.5 rounded-lg bg-blue-600 text-white font-medium shadow-sm hover:bg-blue-700 transition-all text-sm flex items-center gap-1.5"
          onClick={() => { setSelectedSprint(sprintOptions[0]); setCreateModalOpen(true); }}
        >
          + Create Task
        </button>
      </div>

      {/* Active Sprint filters */}
      {activeTab === "active" && (
        <div className="flex items-center justify-between px-6 py-3 gap-4 bg-white dark:bg-[#1c2030] border-b border-slate-100 dark:border-[#232838] transition-colors">
          <div className="flex gap-2 items-center flex-wrap">
            <Listbox value={filter} onChange={setFilter}>
              <div className="relative w-36">
                <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-left text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-slate-300">
                  <span className="block truncate">{filter.label}</span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <FaChevronDown className="h-3 w-3 text-slate-400" />
                  </span>
                </Listbox.Button>
                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 z-50 border border-slate-100">
                  {TYPE_OPTIONS.map((opt) => (
                    <Listbox.Option key={opt.value} value={opt}
                      className={({ active, selected }) =>
                        `cursor-pointer select-none py-1.5 pl-4 pr-4 ${active ? "bg-blue-50 text-blue-700" : "text-slate-700"} ${selected ? "font-semibold" : ""}`
                      }
                    >{opt.label}</Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>

            <Listbox value={member} onChange={setMember}>
              <div className="relative w-36">
                <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-left text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-slate-300">
                  <span className="block truncate">{member.label}</span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <FaChevronDown className="h-3 w-3 text-slate-400" />
                  </span>
                </Listbox.Button>
                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black/5 z-50 border border-slate-100">
                  {TEAM_MEMBERS.map((opt) => (
                    <Listbox.Option key={opt.value} value={opt}
                      className={({ active, selected }) =>
                        `cursor-pointer select-none py-1.5 pl-4 pr-4 ${active ? "bg-blue-50 text-blue-700" : "text-slate-700"} ${selected ? "font-semibold" : ""}`
                      }
                    >{opt.label}</Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>

            {[
              { key: "showBadges", icon: FaTags, title: "Toggle badges", val: showBadges },
              { key: "showPriorityColors", icon: FaFlag, title: "Toggle priority colors", val: showPriorityColors },
              { key: "showTaskIds", icon: FaHashtag, title: "Toggle task IDs", val: showTaskIds },
              { key: "showSubtaskButtons", icon: FaBars, title: "Toggle subtask buttons", val: showSubtaskButtons },
            ].map(({ key, icon: Icon, title, val }) => (
              <button
                key={key}
                className={`flex items-center justify-center p-1.5 rounded-lg border transition-all ${
                  val ? "bg-blue-50 border-blue-300 text-blue-600" : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
                }`}
                onClick={() => updateBoardSettings({ [key]: !val })}
                title={title}
                style={{ minWidth: 32, minHeight: 32 }}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-56"
          />
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "active" && (
          <KanbanBoard
            filter={filter.value}
            member={member.value}
            search={search}
            tasks={activeTasks}
            setTasks={setActiveTasks}
            idToGlobalIndex={idToGlobalIndex}
            allBadgesOpen={showBadges}
            priorityColorsOpen={showPriorityColors}
            taskIdsOpen={showTaskIds}
            subtaskButtonsOpen={showSubtaskButtons}
            onTaskClick={handleTaskClick}
            columns={columns}
          />
        )}
        {activeTab === "backlog" && (
          <BacklogTab onTaskClick={handleTaskClick} onPokerClick={handlePokerClick} />
        )}
        {activeTab === "epics" && <EpicsTab />}
        {activeTab === "refinement" && (
          <RefinementTab onTaskClick={handleTaskClick} onPokerClick={handlePokerClick} />
        )}
        {activeTab === "review" && <SprintReviewTab onTaskClick={handleTaskClick} />}
        {activeTab === "retrospective" && <RetrospectiveTab />}
        {activeTab === "settings" && <BoardSettingsTab />}
      </div>

      {/* Create Task Modal */}
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
        statusOptions={statusOptions}
      />

      {/* Task Detail Modal */}
      <TaskDetailModal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        task={selectedTask}
        onTaskUpdate={handleTaskUpdate}
        allTasks={allTasks}
        isCreate={false}
        statusOptions={statusOptions}
        onOpenPanel={(task) => {
          setDetailModalOpen(false);
          setSelectedTask(task);
          setSidePanelOpen(true);
        }}
      />

      {/* Planning Poker */}
      <PlanningPoker
        isOpen={pokerOpen}
        onClose={() => { setPokerOpen(false); setPokerTask(null); }}
        currentTask={pokerTask}
        onEstimationComplete={handleEstimationComplete}
        teamMembers={TEAM_MEMBERS.filter((m) => m.value && m.value !== "unassigned").map((m) => m.label)}
      />

      {/* Sprint Modal */}
      <SprintModal
        open={sprintModalOpen}
        onClose={() => setSprintModalOpen(false)}
        mode={sprintModalMode}
      />

      {/* Task Side Panel */}
      <TaskSidePanel
        open={sidePanelOpen}
        task={selectedTask}
        onClose={() => setSidePanelOpen(false)}
        onTaskUpdate={(updated) => {
          setActiveTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
          setSelectedTask(updated);
        }}
        onOpenModal={(task) => {
          setSidePanelOpen(false);
          setSelectedTask(task);
          setDetailModalOpen(true);
        }}
      />
    </div>
  );
}
