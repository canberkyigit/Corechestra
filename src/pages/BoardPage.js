import React, { useState, useMemo, useEffect, useCallback } from "react";
import KanbanBoard from "../components/KanbanBoard";
import TaskDetailModal from "../components/TaskDetailModal";
import TaskSidePanel from "../components/TaskSidePanel";
import PlanningPoker from "../components/PlanningPoker";
import SprintModal from "../components/SprintModal";
import BacklogTab from "../components/tabs/BacklogTab";
import RefinementTab from "../components/tabs/RefinementTab";
import RetrospectiveTab from "../components/tabs/RetrospectiveTab";
import PlanningTab from "../components/tabs/PlanningTab";
import BoardSettingsTab from "../components/tabs/BoardSettingsTab";
import EpicsTab from "../components/tabs/EpicsTab";
import SprintReviewTab from "../components/tabs/SprintReviewTab";
import { Listbox } from "@headlessui/react";
import {
  FaChevronDown, FaTags, FaFlag, FaHashtag, FaBars,
  FaPlay, FaCheckCircle, FaEdit, FaColumns, FaList, FaTable,
  FaCheck, FaTrash,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";
import { TYPE_OPTIONS, TEAM_MEMBERS } from "../constants";
import { parseISO, differenceInDays, format } from "date-fns";

const TABS = [
  { id: "active", label: "Active Sprint" },
  { id: "backlog", label: "Backlog" },
  { id: "epics", label: "Epics" },
  { id: "refinement", label: "Refinement" },
  { id: "review", label: "Sprint Review" },
  { id: "retrospective", label: "Retrospective" },
  { id: "planning", label: "Planning" },
  { id: "settings", label: "Board Settings" },
];

const VIEW_MODES = [
  { id: "kanban", icon: FaColumns, title: "Kanban" },
  { id: "list",   icon: FaList,    title: "List"   },
  { id: "table",  icon: FaTable,   title: "Table"  },
];

const STATUS_LABELS = {
  todo: "To Do", inprogress: "In Progress", review: "Review",
  awaiting: "Awaiting", blocked: "Blocked", done: "Done",
};
const STATUS_COLORS = {
  todo: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  inprogress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  review: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  awaiting: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  blocked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  done: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

function ListView({ tasks, onTaskClick, selectedIds, onToggleSelect, bulkMode }) {
  const grouped = useMemo(() => {
    const map = {};
    ["todo","inprogress","review","awaiting","blocked","done"].forEach((s) => {
      const g = tasks.filter((t) => t.status === s);
      if (g.length > 0) map[s] = g;
    });
    return map;
  }, [tasks]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {Object.entries(grouped).map(([status, grpTasks]) => (
        <div key={status}>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>
              {STATUS_LABELS[status]}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">{grpTasks.length}</span>
          </div>
          <div className="space-y-1">
            {grpTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                  selectedIds.has(task.id)
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] hover:border-blue-300 dark:hover:border-blue-600"
                }`}
                onClick={() => bulkMode ? onToggleSelect(task.id) : onTaskClick(task)}
              >
                {bulkMode && (
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                    selectedIds.has(task.id) ? "bg-blue-500 border-blue-500" : "border-slate-300 dark:border-slate-600"
                  }`}>
                    {selectedIds.has(task.id) && <FaCheck className="w-2.5 h-2.5 text-white" />}
                  </div>
                )}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  task.priority === "critical" ? "bg-red-500" :
                  task.priority === "high" ? "bg-orange-400" :
                  task.priority === "medium" ? "bg-yellow-400" : "bg-green-400"
                }`} />
                <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 truncate font-medium">{task.title}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 capitalize hidden md:block">{task.assignedTo || "—"}</span>
                {task.dueDate && (
                  <span className="text-xs text-slate-400 dark:text-slate-500 hidden lg:block">{format(parseISO(task.dueDate), "MMM d")}</span>
                )}
                <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">{task.storyPoint || 0}pt</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TableView({ tasks, onTaskClick, selectedIds, onToggleSelect, bulkMode, onSelectAll }) {
  return (
    <div className="flex-1 overflow-auto p-4">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-[#2a3044]">
            {bulkMode && (
              <th className="pb-2 pr-3 text-left">
                <button
                  onClick={onSelectAll}
                  className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center"
                >
                  {selectedIds.size === tasks.length && tasks.length > 0 && (
                    <FaCheck className="w-2.5 h-2.5 text-blue-500" />
                  )}
                </button>
              </th>
            )}
            <th className="pb-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pr-4">Title</th>
            <th className="pb-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pr-4">Status</th>
            <th className="pb-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pr-4">Priority</th>
            <th className="pb-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pr-4">Assignee</th>
            <th className="pb-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pr-4">Due Date</th>
            <th className="pb-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Points</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              key={task.id}
              onClick={() => bulkMode ? onToggleSelect(task.id) : onTaskClick(task)}
              className={`border-b border-slate-100 dark:border-[#232838] cursor-pointer transition-colors ${
                selectedIds.has(task.id) ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-slate-50 dark:hover:bg-[#232838]"
              }`}
            >
              {bulkMode && (
                <td className="py-2.5 pr-3">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    selectedIds.has(task.id) ? "bg-blue-500 border-blue-500" : "border-slate-300 dark:border-slate-600"
                  }`}>
                    {selectedIds.has(task.id) && <FaCheck className="w-2.5 h-2.5 text-white" />}
                  </div>
                </td>
              )}
              <td className="py-2.5 pr-4">
                <span className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-xs block">{task.title}</span>
              </td>
              <td className="py-2.5 pr-4">
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status]}`}>
                  {STATUS_LABELS[task.status] || task.status}
                </span>
              </td>
              <td className="py-2.5 pr-4">
                <span className={`text-xs font-medium capitalize ${
                  task.priority === "critical" ? "text-red-500" :
                  task.priority === "high" ? "text-orange-500" :
                  task.priority === "medium" ? "text-yellow-500" : "text-green-500"
                }`}>{task.priority}</span>
              </td>
              <td className="py-2.5 pr-4">
                <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{task.assignedTo || "—"}</span>
              </td>
              <td className="py-2.5 pr-4">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {task.dueDate ? format(parseISO(task.dueDate), "MMM d, yyyy") : "—"}
                </span>
              </td>
              <td className="py-2.5">
                <span className="text-xs text-slate-500 dark:text-slate-400">{task.storyPoint || 0}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tasks.length === 0 && (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">No tasks match the current filters.</div>
      )}
    </div>
  );
}

export default function BoardPage({ forcedTab, onForcedTabConsumed }) {
  const {
    activeTasks, setActiveTasks,
    allTasks, idToGlobalIndex,
    boardSettings, createTask, savePokerResult,
    sprint, columns,
    updateBoardSettings,
    currentProjectId,
  } = useApp();

  const projectActiveTasks = activeTasks.filter(
    (t) => (t.projectId || "proj-1") === currentProjectId
  );

  const [activeTab, setActiveTab] = useState("active");

  useEffect(() => {
    if (forcedTab) {
      setActiveTab(forcedTab);
      if (onForcedTabConsumed) onForcedTabConsumed();
    }
  }, [forcedTab]); // eslint-disable-line

  // Filter persistence — load from localStorage per project
  const filterKey = `board_filters_${currentProjectId}`;
  const savedFilters = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(filterKey)) || {}; } catch { return {}; }
  }, [filterKey]);

  const [filter, setFilter] = useState(() =>
    TYPE_OPTIONS.find((o) => o.value === savedFilters.filterValue) || TYPE_OPTIONS[0]
  );
  const [member, setMember] = useState(() =>
    TEAM_MEMBERS.find((o) => o.value === savedFilters.memberValue) || TEAM_MEMBERS[0]
  );
  const [search, setSearch] = useState(savedFilters.search || "");
  const [viewMode, setViewMode] = useState(savedFilters.viewMode || "kanban");

  // Persist filters whenever they change
  useEffect(() => {
    localStorage.setItem(filterKey, JSON.stringify({
      filterValue: filter.value,
      memberValue: member.value,
      search,
      viewMode,
    }));
  }, [filter, member, search, viewMode, filterKey]);

  // Bulk selection
  const [bulkMode, setBulkMode] = useState(false);
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

  const sprintDaysLeft = sprint?.endDate
    ? Math.max(0, differenceInDays(parseISO(sprint.endDate), new Date()))
    : null;

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

  const doneTasks = projectActiveTasks.filter((t) => t.status === "done").length;
  const sprintPct = projectActiveTasks.length > 0 ? Math.round((doneTasks / projectActiveTasks.length) * 100) : 0;

  const openSprintModal = (mode) => { setSprintModalMode(mode); setSprintModalOpen(true); };

  // Filtered tasks for list/table views
  const filteredTasks = useMemo(() => {
    let result = projectActiveTasks;
    if (filter.value) result = result.filter((t) => t.type === filter.value);
    if (member.value) result = result.filter((t) => t.assignedTo === member.value);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q));
    }
    return result;
  }, [projectActiveTasks, filter, member, search]);

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-[#141720] flex flex-col transition-colors">
      {/* Sprint header banner */}
      {sprint && (
        <div className="bg-white dark:bg-[#1c2030] border-b border-slate-200 dark:border-[#2a3044] px-6 py-2.5 flex items-center gap-4 transition-colors">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${sprint.status === "active" ? "bg-green-500" : sprint.status === "completed" ? "bg-slate-400" : "bg-yellow-400"}`} />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{sprint.name}</span>
            {sprint.status === "active" && sprint.endDate && (
              <span className={`text-xs flex items-center gap-1 ${
                sprintDaysLeft <= 2
                  ? "text-red-500 font-semibold"
                  : "text-slate-400 dark:text-slate-500"
              }`}>
                · {sprintDaysLeft <= 2 && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                {sprintDaysLeft} day{sprintDaysLeft !== 1 ? "s" : ""} left
              </span>
            )}
            {sprint.goal && (
              <span className="text-xs text-slate-400 dark:text-slate-500 hidden md:inline truncate max-w-xs">· {sprint.goal}</span>
            )}
          </div>

          {projectActiveTasks.length > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-24 h-1.5 bg-slate-100 dark:bg-[#232838] rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${sprintPct}%` }} />
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500">{doneTasks}/{projectActiveTasks.length}</span>
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
                  className="flex items-center gap-1.5 px-3 py-1 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
                  onClick={() => openSprintModal("edit")}
                >
                  <FaEdit className="w-2.5 h-2.5" /> Edit Sprint
                </button>
                <button
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-700 dark:bg-slate-600 text-white text-xs font-medium rounded-lg hover:bg-slate-800 dark:hover:bg-slate-500 transition-colors"
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
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#232838]"
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
        <div className="flex items-center justify-between px-6 py-3 gap-4 bg-white dark:bg-[#1c2030] border-b border-slate-100 dark:border-[#232838] transition-colors flex-wrap">
          <div className="flex gap-2 items-center flex-wrap">
            {/* Type filter */}
            <Listbox value={filter} onChange={setFilter}>
              <div className="relative w-36">
                <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] py-1.5 pl-3 pr-8 text-left text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-slate-300 dark:hover:border-slate-500">
                  <span className="block truncate">{filter.label}</span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <FaChevronDown className="h-3 w-3 text-slate-400" />
                  </span>
                </Listbox.Button>
                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-[#1c2030] py-1 text-sm shadow-lg ring-1 ring-black/5 z-50 border border-slate-100 dark:border-[#2a3044]">
                  {TYPE_OPTIONS.map((opt) => (
                    <Listbox.Option key={opt.value} value={opt}
                      className={({ active, selected }) =>
                        `cursor-pointer select-none py-1.5 pl-4 pr-4 ${active ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"} ${selected ? "font-semibold" : ""}`
                      }
                    >{opt.label}</Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>

            {/* Member filter */}
            <Listbox value={member} onChange={setMember}>
              <div className="relative w-36">
                <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] py-1.5 pl-3 pr-8 text-left text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-slate-300 dark:hover:border-slate-500">
                  <span className="block truncate">{member.label}</span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <FaChevronDown className="h-3 w-3 text-slate-400" />
                  </span>
                </Listbox.Button>
                <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-[#1c2030] py-1 text-sm shadow-lg ring-1 ring-black/5 z-50 border border-slate-100 dark:border-[#2a3044]">
                  {TEAM_MEMBERS.map((opt) => (
                    <Listbox.Option key={opt.value} value={opt}
                      className={({ active, selected }) =>
                        `cursor-pointer select-none py-1.5 pl-4 pr-4 ${active ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"} ${selected ? "font-semibold" : ""}`
                      }
                    >{opt.label}</Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>

            {/* Toggle buttons */}
            {[
              { key: "showBadges", icon: FaTags, title: "Toggle badges", val: showBadges },
              { key: "showPriorityColors", icon: FaFlag, title: "Toggle priority colors", val: showPriorityColors },
              { key: "showTaskIds", icon: FaHashtag, title: "Toggle task IDs", val: showTaskIds },
              { key: "showSubtaskButtons", icon: FaBars, title: "Toggle subtask buttons", val: showSubtaskButtons },
            ].map(({ key, icon: Icon, title, val }) => (
              <button
                key={key}
                className={`flex items-center justify-center p-1.5 rounded-lg border transition-all ${
                  val ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400" : "border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-500"
                }`}
                onClick={() => updateBoardSettings({ [key]: !val })}
                title={title}
                style={{ minWidth: 32, minHeight: 32 }}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}

            {/* Bulk mode toggle */}
            {viewMode !== "kanban" && <button
              onClick={() => { setBulkMode((v) => !v); setSelectedIds(new Set()); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                bulkMode ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400" : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
              }`}
              title="Bulk select"
            >
              <FaCheck className="w-3 h-3" /> Bulk
            </button>}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
            />

            {/* View mode toggle */}
            <div className="flex items-center border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
              {VIEW_MODES.map(({ id, icon: Icon, title }) => (
                <button
                  key={id}
                  title={title}
                  onClick={() => setViewMode(id)}
                  className={`p-1.5 transition-colors ${
                    viewMode === id
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-[#1c2030] text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-[#232838]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {activeTab === "active" && bulkMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-6 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{selectedIds.size} selected</span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="">Change status…</option>
            {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            onClick={handleBulkStatusChange}
            disabled={!bulkStatus}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            Apply
          </button>
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            <FaTrash className="w-3 h-3" /> Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 ml-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "active" && viewMode === "kanban" && (
          <KanbanBoard
            filter={filter.value}
            member={member.value}
            search={search}
            tasks={projectActiveTasks}
            setTasks={setProjectTasks}
            idToGlobalIndex={idToGlobalIndex}
            allBadgesOpen={showBadges}
            priorityColorsOpen={showPriorityColors}
            taskIdsOpen={showTaskIds}
            subtaskButtonsOpen={showSubtaskButtons}
            onTaskClick={handleTaskClick}
            columns={columns}
          />
        )}
        {activeTab === "active" && viewMode === "list" && (
          <ListView
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            bulkMode={bulkMode}
          />
        )}
        {activeTab === "active" && viewMode === "table" && (
          <TableView
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            bulkMode={bulkMode}
            onSelectAll={selectAll}
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
        {activeTab === "planning" && <PlanningTab />}
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
      />

      {/* Task Detail Modal */}
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
