import React, { useState, useRef, useEffect, useMemo } from "react";
import Layout from "../components/Layout";
import KanbanBoard from "../components/KanbanBoard";
import { Listbox } from "@headlessui/react";
import { FaChevronDown, FaBug, FaExclamationCircle, FaUser, FaSearch, FaCheckSquare, FaPlusSquare, FaRegEye, FaRegEyeSlash, FaFlag, FaHashtag, FaBars, FaTags, FaPencilAlt, FaPlay, FaArrowRight, FaTrash } from "react-icons/fa";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { parse, format } from "date-fns";
import TaskDetailModal from "../components/TaskDetailModal";
import PlanningPoker from "../components/PlanningPoker";
import MDEditor from '@uiw/react-md-editor';
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const typeOptions = [
  { value: "", label: "All Types" },
  { value: "feature", label: "Feature" },
  { value: "task", label: "Task" },
  { value: "defect", label: "Defect" },
  { value: "test", label: "Test" },
  { value: "testset", label: "Test Set" },
  { value: "testexecution", label: "Test Execution" },
  { value: "precondition", label: "Precondition" },
];

const teamMembers = [
  { value: "", label: "All Members" },
  { value: "unassigned", label: "Unassigned" },
  { value: "alice", label: "Alice" },
  { value: "bob", label: "Bob" },
  { value: "carol", label: "Carol" },
  { value: "dave", label: "Dave" },
];

const backlogTasks = [
  { id: 'b1', title: 'Refactor authentication', description: 'Improve login security and UX.' },
  { id: 'b2', title: 'Add dark mode', description: 'Theme support for dark mode.' },
  { id: 'b3', title: 'Mobile responsive UI', description: 'Make app fully responsive.' },
  { id: 'b4', title: 'Integrate Google Calendar', description: 'Sync events with Google Calendar.' },
  { id: 'b5', title: 'Bulk task actions', description: 'Allow multi-select and bulk actions.' },
  { id: 'b6', title: 'Export tasks to CSV', description: 'Download board as CSV.' },
  { id: 'b7', title: 'Add notifications panel', description: 'Centralize all notifications.' },
  { id: 'b8', title: 'Custom fields for tasks', description: 'Support custom fields per project.' },
  { id: 'b9', title: 'Recurring tasks', description: 'Allow tasks to repeat on schedule.' },
  { id: 'b10', title: 'API rate limiting', description: 'Protect backend from abuse.' },
];

const columnsData = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "review", title: "Review" },
  { id: "awaiting", title: "Awaiting Customer" },
  { id: "blocked", title: "Blocked" },
  { id: "done", title: "Done" },
];

const statusStyles = {
  done: 'bg-green-100 text-green-700 border-green-200',
  inprogress: 'bg-blue-100 text-blue-700 border-blue-200',
  review: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  blocked: 'bg-red-100 text-red-700 border-red-200',
  awaiting: 'bg-purple-100 text-purple-700 border-purple-200',
  todo: 'bg-gray-100 text-gray-600 border-gray-200',
};

// Dummy subtask generator
function generateSubtasks(title, min = 3, max = 5) {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  return Array.from({ length: count }, (_, i) => ({
    id: `${title.replace(/\s+/g, '_').toLowerCase()}_sub_${i+1}`,
    title: `Subtask ${i+1}`,
    done: Math.random() < 0.5
  }));
}

const initialTasks = [
  { id: "1", title: "Login bug fix", description: "Fix double SSO login.", status: "blocked", priority: "critical", type: "defect", assignedTo: "alice", storyPoint: 3, dueDate: "2024-06-18" },
  { id: "2", title: "UWP Regression Test", description: "APAC UWP regression test.", status: "review", priority: "high", type: "defect", assignedTo: "bob", storyPoint: 5, dueDate: "2024-06-20" },
  { id: "3", title: "Translation update", description: "Essity Finland translations.", status: "inprogress", priority: "medium", type: "task", assignedTo: "carol", storyPoint: 2, dueDate: "2024-06-22" },
  { id: "4", title: "Mail Scroll", description: "Fix email preview scroll.", status: "done", priority: "low", type: "feature", assignedTo: "dave", storyPoint: 1, dueDate: "2024-06-10" },
  { id: "5", title: "Test Payment Flow", description: "Test the new payment integration.", status: "todo", priority: "medium", type: "test", assignedTo: "alice", storyPoint: 8, dueDate: "2024-06-25" },
  { id: "6", title: "Set Up Test Set", description: "Create a test set for regression.", status: "awaiting", priority: "low", type: "testset", assignedTo: "bob", storyPoint: 3, dueDate: "2024-06-28" },
  { id: "7", title: "Execute Regression Suite", description: "Run all regression tests.", status: "inprogress", priority: "high", type: "testexecution", assignedTo: "carol", storyPoint: 13, dueDate: "2024-06-30" },
  { id: "8", title: "Precondition Setup", description: "Prepare preconditions for E2E.", status: "todo", priority: "medium", type: "precondition", assignedTo: "dave", storyPoint: 2, dueDate: "2024-07-01" },
  { id: "9", title: "UI Polish", description: "Polish UI for better UX.", status: "review", priority: "low", type: "feature", assignedTo: "alice", storyPoint: 1, dueDate: "2024-07-05" },
].map(task => ({ ...task, subtasks: generateSubtasks(task.title) }));

const typeMap = {
  bug: { label: "Bug", color: "bg-red-100 text-red-700", icon: <FaBug /> },
  defect: { label: "Defect", color: "bg-orange-100 text-orange-700", icon: <FaExclamationCircle /> },
  userstory: { label: "User Story", color: "bg-blue-100 text-blue-700", icon: <FaUser /> },
  investigation: { label: "Investigation", color: "bg-purple-100 text-purple-700", icon: <FaSearch /> },
  task: { label: "Task", color: "bg-green-100 text-green-700", icon: <FaCheckSquare /> },
  feature: { label: "Feature", color: "bg-cyan-100 text-cyan-700", icon: <FaPlusSquare /> },
};

// TaskRow: Active Sprint satırı için ortak component
function TaskRow({ task, columnsData, statusStyles, teamMembers, setActiveTasks, showDescription = true, iconCircle = true, index, onClick, onPokerClick, showArrow = false, onToggleSubtasks, isExpanded = false }) {
  const { id, title, description, status, storyPoint, dueDate, assignedTo, type, priority } = task;
  const typeInfo = typeMap[type] || typeMap["task"];
  
  // Priority color mapping
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  return (
    <li
      key={id}
      className={`py-3 flex items-center text-sm gap-6`}
    >
      <div className="flex flex-col min-w-0 flex-1">
        <div className="font-medium text-gray-800 truncate flex items-center">
          {showArrow && (
            <button
              onClick={() => onToggleSubtasks && onToggleSubtasks(id)}
              className="mr-2 p-1 hover:bg-gray-100 rounded transition-colors"
              title={isExpanded ? "Hide subtasks" : "Show subtasks"}
            >
              <FaArrowRight className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          )}
          <span className={`mr-2 flex items-center justify-center w-7 h-7 rounded-full ${typeInfo.color}`}>
            <span className="text-base flex items-center justify-center w-full h-full">{typeInfo.icon}</span>
          </span>
          <span 
            className="cursor-pointer hover:text-blue-600 transition-colors"
            onClick={() => onClick && onClick(task)}
          >
            {title}
          </span>
          <span className="ml-3 text-xs text-gray-400 font-mono align-middle whitespace-nowrap">CY-{index + 1}</span>
        </div>
        {showDescription && (
          <div className="text-xs text-gray-500 truncate mt-1">{description}</div>
        )}
      </div>
      <div className="flex items-center flex-shrink-0" style={{ minWidth: '520px' }}>
        <div className="w-40 mr-4">
          <Listbox value={status} onChange={newStatus => {
            setActiveTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
          }}>
            <div className="relative w-40">
              <Listbox.Button className={`w-full px-2 py-0.5 rounded text-xs font-bold border text-left justify-start ${statusStyles[status]}`}>
                {columnsData.find(c => c.id === status)?.title || status.replace(/\b\w/g, l => l.toUpperCase())}
              </Listbox.Button>
              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black/10 focus:outline-none z-50 space-y-1">
                {columnsData.map((col, idx2) => (
                  <Listbox.Option
                    key={col.id}
                    value={col.id}
                    className={({ active, selected }) =>
                      `relative cursor-pointer select-none py-2 pl-4 pr-10 rounded-lg font-bold border text-xs ${statusStyles[col.id]} ${active ? 'ring-2 ring-blue-300' : ''} ${selected ? '' : ''}` + (idx2 !== columnsData.length - 1 ? ' mb-1' : '')
                    }
                  >
                    {col.title}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>
        <div className="w-20 mr-4">
          <Listbox value={priority?.toLowerCase() || 'medium'} onChange={newPriority => {
            setActiveTasks(prev => prev.map(t => t.id === id ? { ...t, priority: newPriority } : t));
          }}>
            <div className="relative w-full">
              <Listbox.Button className={`w-full px-2 py-0.5 rounded text-xs font-bold border text-center ${getPriorityColor(priority)}`}>
                {(priority || 'medium').toUpperCase()}
              </Listbox.Button>
              <Listbox.Options className="absolute mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white py-2 text-xs shadow-2xl ring-1 ring-black/10 focus:outline-none z-50">
                {['critical', 'high', 'medium', 'low'].map((option, idx) => (
                  <Listbox.Option
                    key={option}
                    value={option}
                    className={({ active, selected }) =>
                      `relative cursor-pointer select-none py-2 pl-4 pr-10 rounded-lg font-bold border text-xs transition-all
                      ${getPriorityColor(option)}
                      ${active ? 'bg-blue-50 ring-2 ring-blue-300' : ''}
                      ${selected ? 'bg-opacity-80' : ''}
                      ${idx !== 3 ? 'mb-2' : ''}`
                    }
                  >
                    {option.toUpperCase()}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>
        <input
          type="number"
          min={0}
          value={storyPoint}
          onChange={e => {
            const val = Math.max(0, parseInt(e.target.value) || 0);
            setActiveTasks(prev => prev.map(t => t.id === id ? { ...t, storyPoint: val } : t));
          }}
          className="w-12 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs border border-gray-200 font-semibold ml-4 text-center focus:ring-2 focus:ring-blue-300 outline-none transition-all"
        />
        <div className="ml-4">
          <ReactDatePicker
            selected={dueDate ? parse(dueDate, 'yyyy-MM-dd', new Date()) : null}
            onChange={date => {
              setActiveTasks(prev => prev.map(t => t.id === id ? { ...t, dueDate: date ? format(date, 'yyyy-MM-dd') : '' } : t));
            }}
            dateFormat="dd.MM.yyyy"
            className="w-32 px-2 py-0.5 rounded bg-gray-50 text-gray-500 text-xs border border-gray-200 text-center focus:ring-2 focus:ring-blue-300 outline-none transition-all"
            calendarClassName="!border-gray-300 !shadow-lg !rounded-lg"
            popperPlacement="bottom"
            placeholderText="Select date"
            showPopperArrow={false}
          />
        </div>
        <div className="ml-4 w-24">
          <Listbox value={assignedTo} onChange={newAssignedTo => {
            setActiveTasks(prev => prev.map(t => t.id === id ? { ...t, assignedTo: newAssignedTo } : t));
          }}>
            <div className="relative w-24">
              <Listbox.Button className="w-full px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs border border-blue-200 font-semibold text-left">
                {assignedTo === 'unassigned' ? 'Unassigned' : assignedTo.charAt(0).toUpperCase() + assignedTo.slice(1)}
              </Listbox.Button>
              <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-xs shadow-lg ring-1 ring-black/10 focus:outline-none z-50">
                {teamMembers.filter(m => m.value).map(member => (
                  <Listbox.Option
                    key={member.value}
                    value={member.value}
                    className={({ active, selected }) =>
                      `relative cursor-pointer select-none py-2 pl-4 pr-10 rounded-lg ${active ? 'bg-blue-50 text-blue-700' : 'text-blue-700'} ${selected ? 'font-bold bg-blue-100' : ''}`
                    }
                  >
                    {member.label}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </div>
          </Listbox>
        </div>

      </div>
    </li>
  );
}

// ReadOnlyTaskRow: Backlog için sadece gösterim amaçlı badge'li satır
function ReadOnlyTaskRow({ task, index }) {
  return (
    <li className="py-3 flex items-center text-sm gap-6">
      <div className="flex flex-col min-w-0 flex-1">
        <div className="font-medium text-gray-800 truncate flex items-center">
          <span>{task.title}</span>
          <span className="ml-3 text-xs text-gray-400 font-mono align-middle whitespace-nowrap">CY-{index + 1}</span>
        </div>
      </div>
      <div className="flex items-center flex-shrink-0" style={{ minWidth: '420px' }}>
        <span className="w-40 mr-4 px-2 py-0.5 rounded text-xs font-bold border bg-gray-100 text-gray-600 border-gray-200 text-left">To Do</span>
        <span className="w-12 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs border border-gray-200 font-semibold ml-4 text-center">-</span>
        <span className="w-32 px-2 py-0.5 rounded bg-gray-50 text-gray-500 text-xs border border-gray-200 ml-4 text-center">-</span>
        <span className="ml-4 w-24 px-2 py-0.5 rounded bg-blue-50 text-blue-400 text-xs border border-blue-200 font-semibold text-left">-</span>
      </div>
    </li>
  );
}

const getDefaultBacklogTasks = () => backlogTasks.map((t, i) => ({
  ...t,
  status: 'todo',
  storyPoint: 1,
  dueDate: '',
  assignedTo: 'unassigned',
  priority: 'medium',
  id: t.id || `b${i+1}`,
  subtasks: generateSubtasks(t.title)
}));

// getRetroItemColor returns an HSL color string
const getRetroItemColor = (score) => {
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const s = clamp(score, -10, 10);
  if (s === 0) return 'white';
  if (s < 0) {
    const pct = Math.abs(s) / 10;
    const h = 120;
    const sat = 70 * (1 - pct);
    const l = 90 + 10 * (1 - pct);
    return `hsl(${h},${sat}%,${l}%)`;
  } else {
    const pct = s / 10;
    const h = 0;
    const sat = 70 * pct;
    const l = 100 - 10 * pct;
    return `hsl(${h},${sat}%,${l}%)`;
  }
};

export default function BoardPage() {
  const [activeTab, setActiveTab] = useState("active");
  const [filter, setFilter] = useState(typeOptions[0]);
  const [member, setMember] = useState(teamMembers[0]);
  const [search, setSearch] = useState("");
  const [activeTasks, setActiveTasks] = useState(initialTasks);
  const [backlogEditable, setBacklogEditable] = useState(getDefaultBacklogTasks());
  const [allBadgesOpen, setAllBadgesOpen] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState({});
  // Add modal state for backlog tasks
  const [backlogModalOpen, setBacklogModalOpen] = useState(false);
  const [selectedBacklogTask, setSelectedBacklogTask] = useState(null);
  // Add state for priority color strips
  const [priorityColorsOpen, setPriorityColorsOpen] = useState(true);
  // Add state for task IDs
  const [taskIdsOpen, setTaskIdsOpen] = useState(true);
  // Add state for subtask buttons
  const [subtaskButtonsOpen, setSubtaskButtonsOpen] = useState(true);
  const [notes, setNotes] = useState("");
  // Add state for expanded subtasks in backlog
  const [expandedSubtasks, setExpandedSubtasks] = useState({});
  
  // Retrospective states
  const [retrospectiveTab, setRetrospectiveTab] = useState("retro-checks");
  const [chartType, setChartType] = useState("burndown");
  const [retrospectiveItems, setRetrospectiveItems] = useState({
    wentWell: [
      { id: 1, text: "Team collaboration was excellent", checked: false, score: 0 },
      { id: 2, text: "Sprint goals were achieved on time", checked: false, score: 0 },
      { id: 3, text: "Code quality improved significantly", checked: false, score: 0 }
    ],
    wentWrong: [
      { id: 1, text: "Some bugs were not caught in testing", checked: false, score: 0 },
      { id: 2, text: "Communication gaps between team members", checked: false, score: 0 }
    ],
    canImprove: [
      { id: 1, text: "Implement better testing practices", checked: false, score: 0 },
      { id: 2, text: "Improve daily standup efficiency", checked: false, score: 0 },
      { id: 3, text: "Better documentation practices", checked: false, score: 0 }
    ],
    actionItems: [
      { id: 1, text: "Set up automated testing pipeline", checked: false, score: 0 },
      { id: 2, text: "Schedule team communication workshop", checked: false, score: 0 }
    ]
  });

  // 1. Notes için ek state
  const [notesList, setNotesList] = useState([]);

  // 1. State: Açık notlar için
  const [notesListOpen, setNotesListOpen] = useState({});

  // 2. Toggle fonksiyonu
  const handleToggleNote = (id) => {
    setNotesListOpen(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const allTasks = [...activeTasks, ...backlogEditable];
  const idToGlobalIndex = {};
  allTasks.forEach((task, idx) => { idToGlobalIndex[task.id] = idx; });

  // 1. State: Backlog bölümlerini yönet
  const [backlogSections, setBacklogSections] = useState([
    { id: 1, title: 'Backlog', tasks: backlogEditable }
  ]);
  // 2. Sprint seçenekleri (her zaman güncel olsun)
  const sprintOptions = useMemo(() => [
    { value: 'active', label: 'Active Sprint' },
    ...backlogSections.map((b) => ({ value: `backlog-${b.id}`, label: b.title }))
  ], [backlogSections]);
  // 2. Seçili sprint state'i
  const [selectedSprint, setSelectedSprint] = useState(sprintOptions[0]);
  // 3. Modal açıldığında default sprint ve sprintOptions değişince selectedSprint'i güncel tut
  useEffect(() => {
    if (createModalOpen) {
      setSelectedSprint(sprintOptions[0]);
    }
  }, [createModalOpen, sprintOptions.length]);
  useEffect(() => {
    // Eğer selectedSprint artık sprintOptions içinde yoksa, ilk sprinti seç
    if (!sprintOptions.find(opt => opt.value === selectedSprint?.value)) {
      setSelectedSprint(sprintOptions[0]);
    }
  }, [sprintOptions, selectedSprint]);

  // Modal açıldığında sprint seçimini task'ın bulunduğu gruba göre ayarla
  useEffect(() => {
    if (createModalOpen) {
      setSelectedSprint(sprintOptions[0]);
    } else if (backlogModalOpen && selectedBacklogTask) {
      const inActive = activeTasks.some(t => t.id === selectedBacklogTask.id);
      if (inActive) {
        setSelectedSprint(sprintOptions[0]);
      } else {
        const found = backlogSections.find(b => b.tasks.some(t => t.id === selectedBacklogTask.id));
        if (found) {
          const opt = sprintOptions.find(opt => opt.label === found.title);
          setSelectedSprint(opt || sprintOptions[0]);
        } else {
          setSelectedSprint(sprintOptions[0]);
        }
      }
    }
  }, [createModalOpen, backlogModalOpen, selectedBacklogTask, sprintOptions, activeTasks, backlogSections, activeTab]);

  // 4. handleCreateTask: task'ı seçilen gruba ekle
  const handleCreateTask = (task) => {
    if (selectedSprint.value === 'active') {
      setActiveTasks(prev => [...prev, { ...task, id: `CY-${Math.floor(Math.random()*100000)}`, status: 'todo' }]);
    } else if (selectedSprint.value.startsWith('backlog-')) {
      const backlogId = parseInt(selectedSprint.value.replace('backlog-', ''));
      setBacklogSections(prev => prev.map((b) =>
        b.id === backlogId
          ? { ...b, tasks: [...b.tasks, { ...task, id: `CY-${Math.floor(Math.random()*100000)}`, status: 'todo' }] }
          : b
      ));
    }
    setCreateModalOpen(false);
  };

  // Add handler for backlog task updates
  const handleBacklogTaskUpdate = (updatedTask) => {
    // Update backlog tasks
    setBacklogEditable(prev => 
      prev.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    );
    
    // Also update active tasks if the task exists there
    setActiveTasks(prev => 
      prev.map(task => 
        task.id === updatedTask.id ? updatedTask : task
      )
    );
    
    setSelectedBacklogTask(updatedTask);
  };

  // Add handler for clicking on backlog tasks
  const handleBacklogTaskClick = (task) => {
    const index = idToGlobalIndex ? idToGlobalIndex[task.id] : undefined;
    setSelectedBacklogTask({ ...task, index });
    setBacklogModalOpen(true);
  };

  // Add handler for toggling subtasks in backlog
  const handleToggleSubtasks = (taskId) => {
    setExpandedSubtasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Retrospective handlers
  const handleRetrospectiveItemToggle = (category, itemId) => {
    setRetrospectiveItems(prev => ({
      ...prev,
      [category]: prev[category].map(item => 
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    }));
  };

  const handleAddRetrospectiveItem = (category) => {
    const newId = Date.now();
    const newItem = {
      id: newId,
      text: "",
      checked: false,
      isEditing: true,
      score: 0
    };
    setRetrospectiveItems(prev => ({
      ...prev,
      [category]: [...prev[category], newItem]
    }));
    setEditingRetro({ category, id: newId });
    setEditText("");
  };

  const handleUpdateRetrospectiveItem = (category, itemId, newText) => {
    setRetrospectiveItems(prev => ({
      ...prev,
      [category]: prev[category].map(item => 
        item.id === itemId ? { ...item, text: newText, isEditing: false } : item
      )
    }));
  };

  const handleDeleteRetrospectiveItem = (category, itemId) => {
    setRetrospectiveItems(prev => ({
      ...prev,
      [category]: prev[category].filter(item => item.id !== itemId)
    }));
  };

  // Retro item'larının state'ine score ekle
  const handleRetroItemVote = (category, itemId, delta) => {
    setRetrospectiveItems(prev => ({
      ...prev,
      [category]: prev[category].map(item =>
        item.id === itemId ? { ...item, score: (item.score || 0) + delta } : item
      )
    }));
  };

  // State for editText and editing item
  const [editingRetro, setEditingRetro] = useState({ category: null, id: null });
  const [editText, setEditText] = useState("");

  // handleRetroItemEdit
  const handleRetroItemEdit = (category, id) => {
    setEditingRetro({ category, id });
    const item = retrospectiveItems[category].find(i => i.id === id);
    setEditText(item ? item.text : "");
    setRetrospectiveItems(prev => ({
      ...prev,
      [category]: prev[category].map(item =>
        item.id === id ? { ...item, isEditing: true } : { ...item, isEditing: false }
      )
    }));
  };

  // handleRetroItemSave
  const handleRetroItemSave = (category, id) => {
    setRetrospectiveItems(prev => ({
      ...prev,
      [category]: prev[category].map(item =>
        item.id === id ? { ...item, text: editText, isEditing: false } : item
      )
    }));
    setEditingRetro({ category: null, id: null });
    setEditText("");
  };

  // 2. Save Note handler
  const handleSaveNote = () => {
    if (notes && notes.trim() !== '') {
      setNotesList(prev => [{ id: Date.now(), content: notes }, ...prev]);
      setNotes('');
    }
  };

  // Planning Poker states
  const [pokerOpen, setPokerOpen] = useState(false);
  const [selectedTaskForPoker, setSelectedTaskForPoker] = useState(null);
  const [pokerHistory, setPokerHistory] = useState([]);
  const [refinementSearch, setRefinementSearch] = useState("");

  // Planning Poker handlers
  const handleOpenPoker = (task) => {
    setSelectedTaskForPoker(task);
    setPokerOpen(true);
  };

  const handleClosePoker = () => {
    setPokerOpen(false);
    setSelectedTaskForPoker(null);
  };

  const handleEstimationComplete = (estimationData) => {
    // Update task with new estimation
    setActiveTasks(prev => prev.map(task => 
      task.id === estimationData.taskId 
        ? { ...task, storyPoint: estimationData.estimation }
        : task
    ));

    // Save to history
    setPokerHistory(prev => [...prev, {
      id: Date.now(),
      taskId: estimationData.taskId,
      taskTitle: selectedTaskForPoker?.title,
      estimation: estimationData.estimation,
      votes: estimationData.votes,
      discussion: estimationData.discussion,
      date: new Date().toISOString()
    }]);

    setPokerOpen(false);
    setSelectedTaskForPoker(null);
  };

  // Backlog drag & drop handlers
  const handleBacklogDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Helper: find section index by droppableId
    const getSectionIdx = (droppableId) => {
      if (droppableId.startsWith('backlog-')) {
        const id = parseInt(droppableId.replace('backlog-', ''));
        return backlogSections.findIndex(s => s.id === id);
      }
      return null;
    };

    // Find source/destination section
    const sourceSectionIdx = getSectionIdx(source.droppableId);
    const destSectionIdx = getSectionIdx(destination.droppableId);

    // Find the dragged task
    let draggedTask = null;
    if (source.droppableId === 'active-sprint') {
      draggedTask = activeTasks.find(t => t.id === draggableId);
    } else if (sourceSectionIdx !== null && sourceSectionIdx >= 0) {
      draggedTask = backlogSections[sourceSectionIdx].tasks.find(t => t.id === draggableId);
    }
    if (!draggedTask) return;

    // 1. Backlogdan active sprint'e taşıma
    if (destination.droppableId === 'active-sprint' && sourceSectionIdx !== null && sourceSectionIdx >= 0) {
      // Remove from backlog section
      const newBacklogSections = backlogSections.map((section, idx) => {
        if (idx !== sourceSectionIdx) return section;
        return { ...section, tasks: section.tasks.filter(t => t.id !== draggableId) };
      });
      setBacklogSections(newBacklogSections);
      setActiveTasks(prev => [...prev, { ...draggedTask, status: 'todo', priority: draggedTask.priority || 'medium' }]);
      return;
    }
    // 2. Active sprintten backlog'a taşıma
    if (destination.droppableId.startsWith('backlog-') && source.droppableId === 'active-sprint') {
      // Remove from active sprint
      setActiveTasks(prev => prev.filter(t => t.id !== draggableId));
      // Add to destination backlog section
      const newBacklogSections = backlogSections.map((section, idx) => {
        if (idx !== destSectionIdx) return section;
        const newTasks = [...section.tasks];
        newTasks.splice(destination.index, 0, { ...draggedTask, status: 'todo', priority: draggedTask.priority || 'medium' });
        return { ...section, tasks: newTasks };
      });
      setBacklogSections(newBacklogSections);
      return;
    }
    // 3. Backloglar arası taşıma
    if (sourceSectionIdx !== null && destSectionIdx !== null && sourceSectionIdx !== destSectionIdx) {
      // Remove from source, add to dest
      let taskToMove = null;
      const newBacklogSections = backlogSections.map((section, idx) => {
        if (idx === sourceSectionIdx) {
          taskToMove = section.tasks.find(t => t.id === draggableId);
          return { ...section, tasks: section.tasks.filter(t => t.id !== draggableId) };
        }
        return section;
      }).map((section, idx) => {
        if (idx === destSectionIdx && taskToMove) {
          const newTasks = [...section.tasks];
          newTasks.splice(destination.index, 0, taskToMove);
          return { ...section, tasks: newTasks };
        }
        return section;
      });
      setBacklogSections(newBacklogSections);
      return;
    }
    // 4. Aynı backlog içinde reorder
    if (sourceSectionIdx !== null && destSectionIdx !== null && sourceSectionIdx === destSectionIdx) {
      const section = backlogSections[sourceSectionIdx];
      const newTasks = section.tasks.filter(t => t.id !== draggableId);
      newTasks.splice(destination.index, 0, draggedTask);
      const newBacklogSections = backlogSections.map((s, idx) => idx === sourceSectionIdx ? { ...s, tasks: newTasks } : s);
      setBacklogSections(newBacklogSections);
      return;
    }
    // 5. Active sprint içinde reorder
    if (destination.droppableId === 'active-sprint' && source.droppableId === 'active-sprint') {
      const newActiveTasks = activeTasks.filter(t => t.id !== draggableId);
      newActiveTasks.splice(destination.index, 0, draggedTask);
      setActiveTasks(newActiveTasks);
      return;
    }
  };

  // 2. Yeni backlog ekleme fonksiyonu
  const handleCreateNewBacklog = () => {
    setBacklogSections(prev => [
      ...prev,
      { id: prev.length + 1, title: `Backlog ${prev.length + 1}`, tasks: [] }
    ]);
  };

  // 3. Mevcut backlogEditable değişince ilk backlog'u güncelle
  useEffect(() => {
    setBacklogSections(prev => prev.map((section, idx) => idx === 0 ? { ...section, tasks: backlogEditable } : section));
  }, [backlogEditable]);

  // State for editing backlog title and delete modal
  const [editingBacklogIdx, setEditingBacklogIdx] = useState(null);
  const [editingBacklogTitle, setEditingBacklogTitle] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTargetIdx, setDeleteTargetIdx] = useState(null);

  // Backlog başlığı edit fonksiyonları
  const handleEditBacklogTitle = (idx, title) => {
    setEditingBacklogIdx(idx);
    setEditingBacklogTitle(title);
  };
  const handleSaveBacklogTitle = (idx) => {
    setBacklogSections(prev => prev.map((s, i) => i === idx ? { ...s, title: editingBacklogTitle.trim() || s.title } : s));
    setEditingBacklogIdx(null);
    setEditingBacklogTitle("");
  };

  // Backlog silme fonksiyonu
  const handleDeleteBacklog = (idx) => {
    setBacklogSections(prev => prev.filter((_, i) => i !== idx));
    setDeleteModalOpen(false);
    setDeleteTargetIdx(null);
  };

  const statusOptions = columnsData.map(col => ({ value: col.id, label: col.title }));

  return (
    <Layout>
      <div className="w-full min-h-screen h-full bg-gray-50 flex flex-col pb-20">
        {/* Tab Menu + Create Task */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("backlog")}
              className={`px-6 py-2 rounded-t-lg font-medium transition-all border-b-2 ${activeTab === "backlog" ? "border-blue-500 bg-white text-blue-600 shadow" : "border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              Backlog
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`px-6 py-2 rounded-t-lg font-medium transition-all border-b-2 ${activeTab === "active" ? "border-blue-500 bg-white text-blue-600 shadow" : "border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              Active Sprint
            </button>
            <button
              onClick={() => setActiveTab("refinement")}
              className={`px-6 py-2 rounded-t-lg font-medium transition-all border-b-2 ${activeTab === "refinement" ? "border-blue-500 bg-white text-blue-600 shadow" : "border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              Refinement
            </button>
            <button
              onClick={() => setActiveTab("retrospective")}
              className={`px-6 py-2 rounded-t-lg font-medium transition-all border-b-2 ${activeTab === "retrospective" ? "border-blue-500 bg-white text-blue-600 shadow" : "border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              Retrospective
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-6 py-2 rounded-t-lg font-medium transition-all border-b-2 ${activeTab === "settings" ? "border-blue-500 bg-white text-blue-600 shadow" : "border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              Board Settings
            </button>
          </div>
          <div className="flex-1"></div>
          <button
            className="ml-auto px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition-all"
            onClick={() => { setNewTaskData({}); setCreateModalOpen(true); }}
          >
            + Create Task
          </button>
        </div>
        {/* Filter & Search */}
        {activeTab === "active" && (
          <div className="flex items-center justify-between mb-4 gap-4 px-1">
            <div className="flex gap-2 items-center">
              <Listbox value={filter} onChange={setFilter}>
                <div className="relative w-44">
                  <Listbox.Button className="relative w-full cursor-pointer rounded-lg border-2 border-blue-400 bg-white py-2 pl-3 pr-10 text-left shadow font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 caret-blue-500 transition-all">
                    <span className="block truncate">{filter.label}</span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <FaChevronDown className="h-4 w-4 text-blue-400" />
                    </span>
                  </Listbox.Button>
                  <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black/10 focus:outline-none z-50">
                    {typeOptions.map((option) => (
                      <Listbox.Option
                        key={option.value}
                        value={option}
                        className={({ active, selected }) =>
                          `relative cursor-pointer select-none py-2 pl-4 pr-10 rounded-lg ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} ${selected ? 'font-bold bg-blue-100' : ''}`
                        }
                      >
                        {option.label}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
              <Listbox value={member} onChange={setMember}>
                <div className="relative w-44">
                  <Listbox.Button className="relative w-full cursor-pointer rounded-lg border-2 border-blue-400 bg-white py-2 pl-3 pr-10 text-left shadow font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 caret-blue-500 transition-all">
                    <span className="block truncate">{member.label}</span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <FaChevronDown className="h-4 w-4 text-blue-400" />
                    </span>
                  </Listbox.Button>
                  <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black/10 focus:outline-none z-50">
                    {teamMembers.map((option) => (
                      <Listbox.Option
                        key={option.value}
                        value={option}
                        className={({ active, selected }) =>
                          `relative cursor-pointer select-none py-2 pl-4 pr-10 rounded-lg ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} ${selected ? 'font-bold bg-blue-100' : ''}`
                        }
                      >
                        {option.label}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
              {/* Badge toggle */}
              <button
                className={`ml-2 flex items-center justify-center p-1.5 rounded border ${allBadgesOpen ? 'border-gray-400 bg-gray-50 text-gray-700' : 'border-gray-300 bg-gray-100 text-gray-500'} transition-all`}
                onClick={() => setAllBadgesOpen(v => !v)}
                type="button"
                aria-label={allBadgesOpen ? 'Hide badges' : 'Show badges'}
                title={allBadgesOpen ? 'Hide badges' : 'Show badges'}
                style={{ minWidth: 32, minHeight: 32 }}
              >
                {allBadgesOpen ? <FaTags className="w-5 h-5" /> : <FaTags className="w-5 h-5" style={{opacity: 0.5}} />}
              </button>
              {/* Priority color strips toggle */}
              <button
                className={`ml-2 flex items-center justify-center p-1.5 rounded border ${priorityColorsOpen ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-300 bg-gray-100 text-gray-500'} transition-all`}
                onClick={() => setPriorityColorsOpen(v => !v)}
                type="button"
                aria-label={priorityColorsOpen ? 'Hide priority colors' : 'Show priority colors'}
                title={priorityColorsOpen ? 'Hide priority colors' : 'Show priority colors'}
                style={{ minWidth: 32, minHeight: 32 }}
              >
                {priorityColorsOpen ? <FaFlag className="w-5 h-5" /> : <FaFlag className="w-5 h-5" style={{opacity: 0.5}} />}
              </button>
              {/* Task IDs toggle */}
              <button
                className={`ml-2 flex items-center justify-center p-1.5 rounded border ${taskIdsOpen ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-300 bg-gray-100 text-gray-500'} transition-all`}
                onClick={() => setTaskIdsOpen(v => !v)}
                type="button"
                aria-label={taskIdsOpen ? 'Hide task IDs' : 'Show task IDs'}
                title={taskIdsOpen ? 'Hide task IDs' : 'Show task IDs'}
                style={{ minWidth: 32, minHeight: 32 }}
              >
                {taskIdsOpen ? <FaHashtag className="w-5 h-5" /> : <FaHashtag className="w-5 h-5" style={{opacity: 0.5}} />}
              </button>
              {/* Subtask buttons toggle */}
              <button
                className={`ml-2 flex items-center justify-center p-1.5 rounded border ${subtaskButtonsOpen ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-300 bg-gray-100 text-gray-500'} transition-all`}
                onClick={() => setSubtaskButtonsOpen(v => !v)}
                type="button"
                aria-label={subtaskButtonsOpen ? 'Hide subtask buttons' : 'Show subtask buttons'}
                title={subtaskButtonsOpen ? 'Hide subtask buttons' : 'Show subtask buttons'}
                style={{ minWidth: 32, minHeight: 32 }}
              >
                {subtaskButtonsOpen ? <FaBars className="w-5 h-5" /> : <FaBars className="w-5 h-5" style={{opacity: 0.5}} />}
              </button>
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="px-3 py-2 rounded border border-gray-300 bg-white text-gray-700 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-72"
            />
          </div>
        )}
        {/* Board or Backlog */}
        <div className="flex-1 h-full min-h-[calc(100vh-10rem)] flex flex-col">
          {activeTab === "active" && (
            <KanbanBoard filter={filter.value} member={member.value} search={search} tasks={activeTasks} setTasks={setActiveTasks} idToGlobalIndex={idToGlobalIndex} allBadgesOpen={allBadgesOpen} priorityColorsOpen={priorityColorsOpen} taskIdsOpen={taskIdsOpen} subtaskButtonsOpen={subtaskButtonsOpen} />
          )}
          {activeTab === "backlog" && (
            <>
              <div className="flex justify-end w-full max-w-5xl mx-auto mt-4">
                <button
                  onClick={handleCreateNewBacklog}
                  className="px-4 py-1.5 rounded bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-700 transition-colors"
                >
                  Create New Backlog
                </button>
              </div>
              <DragDropContext onDragEnd={handleBacklogDragEnd}>
                <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 mt-4 mb-12">
                  {/* Active Sprint Group */}
                  <div>
                    <div className="text-lg font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <span>Active Sprint</span>
                      <span className="text-sm text-gray-500">({activeTasks.length} tasks)</span>
                    </div>
                    <Droppable droppableId="active-sprint">
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`bg-white rounded-lg border-2 shadow-md p-4 mb-4 transition-colors ${
                            snapshot.isDraggingOver 
                              ? 'border-blue-400 bg-blue-50' 
                              : 'border-gray-400'
                          }`}
                        >
                          {activeTasks.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              <FaArrowRight className="mx-auto mb-2 text-2xl text-gray-300" />
                              <p>Drag tasks from Backlog to add to Active Sprint</p>
                            </div>
                          ) : (
                            <ul>
                              {activeTasks.map((task, idx) => (
                                <Draggable key={task.id} draggableId={task.id} index={idx}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`${snapshot.isDragging ? 'opacity-75' : ''}`}
                                    >
                                      <TaskRow
                                        task={task}
                                        columnsData={columnsData}
                                        statusStyles={statusStyles}
                                        teamMembers={teamMembers}
                                        setActiveTasks={setActiveTasks}
                                        showDescription={false}
                                        iconCircle={true}
                                        index={idToGlobalIndex[task.id]}
                                        onClick={handleBacklogTaskClick}
                                        onPokerClick={handleOpenPoker}
                                        showArrow={true}
                                        onToggleSubtasks={handleToggleSubtasks}
                                        isExpanded={expandedSubtasks[task.id]}
                                      />
                                      {/* Show subtasks when expanded */}
                                      {expandedSubtasks[task.id] && task.subtasks && task.subtasks.length > 0 && (
                                        <div className="ml-8 bg-gray-50 border-l-2 border-blue-200 p-3">
                                          <div className="text-sm font-medium text-gray-700 mb-2">Subtasks:</div>
                                          <ul className="space-y-2">
                                            {task.subtasks.map((subtask, subIdx) => (
                                              <li key={subtask.id} className="flex items-center space-x-2">
                                                <input
                                                  type="checkbox"
                                                  checked={subtask.done}
                                                  onChange={() => {
                                                    const updatedSubtasks = task.subtasks.map((sub, idx) => 
                                                      idx === subIdx ? { ...sub, done: !sub.done } : sub
                                                    );
                                                    setActiveTasks(prev => 
                                                      prev.map(t => 
                                                        t.id === task.id ? { ...t, subtasks: updatedSubtasks } : t
                                                      )
                                                    );
                                                  }}
                                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className={`text-sm ${subtask.done ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                                                  {subtask.title}
                                                </span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {idx !== activeTasks.length - 1 && (
                                        <div className="border-b-2 border-gray-300 -mx-4" />
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              ))}
                            </ul>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>

                  {/* Backlog Group */}
                  <div>
                    {backlogSections.map((section, sectionIdx) => (
                      <div key={section.id} className="mt-8 mb-12">
                        <div className="text-lg font-bold text-gray-700 mb-2 flex items-center gap-2">
                          {editingBacklogIdx === sectionIdx ? (
                            <input
                              className="px-2 py-1 rounded border border-gray-300 text-lg font-bold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                              value={editingBacklogTitle}
                              autoFocus
                              onChange={e => setEditingBacklogTitle(e.target.value)}
                              onBlur={() => handleSaveBacklogTitle(sectionIdx)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveBacklogTitle(sectionIdx); }}
                              style={{ minWidth: 120 }}
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:underline"
                              onClick={() => handleEditBacklogTitle(sectionIdx, section.title)}
                            >
                              {section.title}
                            </span>
                          )}
                          <span className="text-sm text-gray-500">({section.tasks.length} tasks)</span>
                          <button
                            className="ml-2 p-2 rounded hover:bg-red-100 text-red-600"
                            title="Backlog'u sil"
                            onClick={() => { setDeleteModalOpen(true); setDeleteTargetIdx(sectionIdx); }}
                          >
                            <FaTrash />
                          </button>
                        </div>
                        <Droppable droppableId={`backlog-${section.id}`}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`bg-white rounded-lg border-2 shadow-md p-4 pb-8 transition-colors ${
                                snapshot.isDraggingOver 
                                  ? 'border-green-400 bg-green-50' 
                                  : 'border-gray-400'
                              }`}
                            >
                              {section.tasks.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                  <p>No tasks in {section.title.toLowerCase()}</p>
                                </div>
                              ) : (
                                <ul>
                                  {section.tasks.map((task, idx) => (
                                    <Draggable key={task.id} draggableId={task.id} index={idx}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`${snapshot.isDragging ? 'opacity-75' : ''}`}
                                        >
                                          <TaskRow
                                            task={task}
                                            columnsData={columnsData}
                                            statusStyles={statusStyles}
                                            teamMembers={teamMembers}
                                            setActiveTasks={tasks => {
                                              setBacklogSections(prev => prev.map((s, i) => i === sectionIdx ? { ...s, tasks } : s));
                                            }}
                                            showDescription={false}
                                            iconCircle={true}
                                            index={idToGlobalIndex[task.id]}
                                            onClick={handleBacklogTaskClick}
                                            onPokerClick={handleOpenPoker}
                                            showArrow={true}
                                            onToggleSubtasks={handleToggleSubtasks}
                                            isExpanded={expandedSubtasks[task.id]}
                                          />
                                          {/* Show subtasks when expanded */}
                                          {expandedSubtasks[task.id] && task.subtasks && task.subtasks.length > 0 && (
                                            <div className="ml-8 bg-gray-50 border-l-2 border-blue-200 p-3">
                                              <div className="text-sm font-medium text-gray-700 mb-2">Subtasks:</div>
                                              <ul className="space-y-2">
                                                {task.subtasks.map((subtask, subIdx) => (
                                                  <li key={subtask.id} className="flex items-center space-x-2">
                                                    <input
                                                      type="checkbox"
                                                      checked={subtask.done}
                                                      onChange={() => {
                                                        const updatedSubtasks = task.subtasks.map((sub, idx) => 
                                                          idx === subIdx ? { ...sub, done: !sub.done } : sub
                                                        );
                                                        const newTasks = section.tasks.map((t, i) => 
                                                          i === idx ? { ...t, subtasks: updatedSubtasks } : t
                                                        );
                                                        setBacklogSections(prev => prev.map((s, i) => i === sectionIdx ? { ...s, tasks: newTasks } : s));
                                                      }}
                                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className={`text-sm ${subtask.done ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                                                      {subtask.title}
                                                    </span>
                                                  </li>
                                                ))}
                                              </ul>
                                            </div>
                                          )}
                                          {idx !== section.tasks.length - 1 && (
                                            <div className="border-b-2 border-gray-300 mx-0" />
                                          )}
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                </ul>
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    ))}
                  </div>
                </div>
              </DragDropContext>
            </>
          )}
          {activeTab === "refinement" && (
            <div className="w-full max-w-6xl mx-auto flex flex-col gap-8 mt-4 mb-12">
              {/* Refinement Header */}
              <div className="bg-white rounded-lg border-2 border-gray-400 shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">Story Refinement</h2>
                    <p className="text-gray-600 mt-1">Use Planning Poker for story point estimation</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Team:</span> Alice, Bob, Carol, Dave
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Total Tasks:</span> {backlogEditable.length + activeTasks.length}
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">
                      {backlogEditable.filter(t => !t.storyPoint || t.storyPoint === 0).length}
                    </div>
                    <div className="text-sm text-blue-700">Pending Estimation</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      {backlogEditable.filter(t => t.storyPoint && t.storyPoint > 0).length}
                    </div>
                    <div className="text-sm text-green-700">Estimated</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {pokerHistory.length}
                    </div>
                    <div className="text-sm text-purple-700">Poker Games</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.round((backlogEditable.filter(t => t.storyPoint && t.storyPoint > 0).length / backlogEditable.length) * 100) || 0}%
                    </div>
                    <div className="text-sm text-orange-700">Completion Rate</div>
                  </div>
                </div>
              </div>

              {/* Tasks for Estimation */}
              <div className="bg-white rounded-lg border-2 border-gray-400 shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-800">Tasks for Estimation</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setFilter(typeOptions[0])}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        filter.value === "" ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    {typeOptions.slice(1).map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setFilter(type)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          filter.value === type.value ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="flex justify-center mb-6">
                    <div className="relative w-full max-w-md">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search tasks by title or description..."
                        value={refinementSearch}
                        onChange={(e) => setRefinementSearch(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Backlog Tasks */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-700 mb-3">Backlog Tasks</h4>
                    <div className="space-y-2">
                      {backlogEditable
                        .filter(task => !filter.value || task.type === filter.value)
                        .filter(task => 
                          !refinementSearch || 
                          task.title.toLowerCase().includes(refinementSearch.toLowerCase()) ||
                          (task.description && task.description.toLowerCase().includes(refinementSearch.toLowerCase()))
                        )
                        .map((task, idx) => (
                          <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                            <div 
                              className="flex items-center space-x-4 flex-1 cursor-pointer"
                              onClick={() => handleBacklogTaskClick(task)}
                            >
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  task.type === 'feature' ? 'bg-cyan-100 text-cyan-700' :
                                  task.type === 'task' ? 'bg-green-100 text-green-700' :
                                  task.type === 'defect' ? 'bg-orange-100 text-orange-700' :
                                  task.type === 'test' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {task.type || 'task'}
                                </span>
                                <span className="text-sm font-medium text-gray-800">{task.title}</span>
                              </div>
                              <div className="text-sm text-gray-600 max-w-md truncate">{task.description}</div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-center">
                                <div className="text-lg font-bold text-gray-800">{task.storyPoint || '?'}</div>
                                <div className="text-xs text-gray-500">Story Point</div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPoker(task);
                                }}
                                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                              >
                                <FaPlay size={14} />
                                <span>Planning Poker</span>
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Active Sprint Tasks */}
                  <div>
                    <h4 className="text-lg font-medium text-gray-700 mb-3">Active Sprint Tasks</h4>
                    <div className="space-y-2">
                      {activeTasks
                        .filter(task => !filter.value || task.type === filter.value)
                        .filter(task => 
                          !refinementSearch || 
                          task.title.toLowerCase().includes(refinementSearch.toLowerCase()) ||
                          (task.description && task.description.toLowerCase().includes(refinementSearch.toLowerCase()))
                        )
                        .map((task, idx) => (
                          <div key={task.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                            <div 
                              className="flex items-center space-x-4 flex-1 cursor-pointer"
                              onClick={() => handleBacklogTaskClick(task)}
                            >
                              <div className="flex items-center space-x-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  task.type === 'feature' ? 'bg-cyan-100 text-cyan-700' :
                                  task.type === 'task' ? 'bg-green-100 text-green-700' :
                                  task.type === 'defect' ? 'bg-orange-100 text-orange-700' :
                                  task.type === 'test' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {task.type || 'task'}
                                </span>
                                <span className="text-sm font-medium text-gray-800">{task.title}</span>
                              </div>
                              <div className="text-sm text-gray-600 max-w-md truncate">{task.description}</div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-center">
                                <div className="text-lg font-bold text-gray-800">{task.storyPoint || '?'}</div>
                                <div className="text-xs text-gray-500">Story Point</div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPoker(task);
                                }}
                                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                              >
                                <FaPlay size={14} />
                                <span>Planning Poker</span>
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Poker History */}
              {pokerHistory.length > 0 && (
                <div className="bg-white rounded-lg border-2 border-gray-400 shadow-md p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Poker History</h3>
                  <div className="space-y-3">
                    {pokerHistory.slice(0, 5).map((history) => (
                      <div key={history.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm text-gray-600">
                            {new Date(history.date).toLocaleDateString('tr-TR')}
                          </div>
                          <div className="font-medium text-gray-800">{history.taskTitle}</div>
                          <div className="text-sm text-gray-600">
                            Estimation: <span className="font-bold text-purple-600">{history.estimation}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {Object.keys(history.votes).length} votes
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === "retrospective" && (
            <div className="w-full max-w-6xl mx-auto flex flex-col gap-8 mt-4 mb-12">
              {/* Retrospective Sub-tabs */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setRetrospectiveTab("retro-checks")}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    retrospectiveTab === "retro-checks" 
                      ? "bg-blue-600 text-white shadow-md" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Retro Checks
                </button>
                <button
                  onClick={() => setRetrospectiveTab("statistics")}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    retrospectiveTab === "statistics" 
                      ? "bg-blue-600 text-white shadow-md" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Statistics & Metrics
                </button>
                <button
                  onClick={() => setRetrospectiveTab("charts")}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    retrospectiveTab === "charts" 
                      ? "bg-blue-600 text-white shadow-md" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Charts
                </button>
                <button
                  onClick={() => setRetrospectiveTab("notes")}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    retrospectiveTab === "notes" 
                      ? "bg-blue-600 text-white shadow-md" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Notes
                </button>
              </div>

              {retrospectiveTab === "notes" && (
                <div className="bg-white rounded-lg border border-gray-400 shadow-md p-6 max-w-2xl w-full mx-auto">
                  <div className="text-xl font-semibold text-gray-800 mb-4">Notes</div>
                  <div data-color-mode="light">
                    <MDEditor
                      value={notes}
                      onChange={setNotes}
                      height={260}
                      preview="edit"
                      textareaProps={{
                        placeholder: 'Write your notes here...',
                        style: { fontSize: 16, padding: 16 }
                      }}
                      style={{ borderRadius: 10, fontSize: 16, width: '100%', minHeight: 260 }}
                    />
                  </div>
                  <button
                    className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg shadow hover:bg-blue-700 transition-all"
                    onClick={handleSaveNote}
                  >
                    Save Note
                  </button>
                  {notesList.length > 0 && (
                    <div className="mt-8">
                      <div className="text-lg font-semibold text-gray-700 mb-3">Saved Notes</div>
                      <ul className="space-y-4">
                        {notesList.map(note => {
                          const isOpen = notesListOpen[note.id];
                          const summary = note.content.replace(/[#*_>\-\[\]!`>]/g, '').split('\n')[0].slice(0, 100) + (note.content.length > 100 ? '...' : '');
                          return (
                            <li
                              key={note.id}
                              className={`bg-gray-50 border border-gray-200 rounded-lg p-4 shadow-sm cursor-pointer transition-all`}
                              onClick={() => handleToggleNote(note.id)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-800">
                                  {isOpen ? '▼' : '▶'}
                                </span>
                                <span className="ml-2 text-gray-700 text-base font-semibold flex-1 truncate">
                                  {summary}
                                </span>
                              </div>
                              {isOpen && (
                                <div className="mt-4">
                                  <MDEditor.Markdown source={note.content} style={{ background: 'transparent', fontSize: 15 }} />
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {retrospectiveTab === "retro-checks" && (
                <div className="bg-white rounded-lg border-2 border-gray-400 shadow-md p-6">
                  <div className="text-2xl font-bold text-gray-800 mb-6">Sprint Retrospective</div>
                
                {/* What Went Well */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-bold text-lg">✓</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">What Went Well</h3>
                  </div>
                  <div className="space-y-3">
                    {retrospectiveItems.wentWell.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-green-200"
                        style={{ backgroundColor: getRetroItemColor(item.score || 0) }}
                      >
                        <div className="flex flex-col items-center mr-2">
                          <button
                            className="text-gray-500 hover:text-red-600"
                            onClick={() => handleRetroItemVote('wentWell', item.id, 1)}
                            type="button"
                          >
                            ▲
                          </button>
                          <span className="text-xs font-bold text-gray-500">{item.score || 0}</span>
                          <button
                            className="text-gray-500 hover:text-green-600"
                            onClick={() => handleRetroItemVote('wentWell', item.id, -1)}
                            type="button"
                          >
                            ▼
                          </button>
                        </div>
                        {item.isEditing && editingRetro.category === 'wentWell' && editingRetro.id === item.id ? (
                          <input
                            type="text"
                            className="flex-1 bg-white border border-green-300 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onBlur={() => handleRetroItemSave('wentWell', item.id)}
                            onKeyDown={e => e.key === 'Enter' && handleRetroItemSave('wentWell', item.id)}
                            autoFocus
                          />
                        ) : (
                          <span className={`flex-1 text-gray-700 ${item.checked ? 'line-through opacity-60' : ''}`}>
                            {item.text}
                          </span>
                        )}
                        <button
                          className="mr-1 text-yellow-500 hover:text-yellow-600"
                          onClick={() => handleRetroItemEdit('wentWell', item.id)}
                          type="button"
                          aria-label="Edit"
                        >
                          <FaPencilAlt className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRetrospectiveItem('wentWell', item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button 
                      className="mt-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                      onClick={() => handleAddRetrospectiveItem('wentWell')}
                    >
                      + Add Item
                    </button>
                  </div>
                </div>

                {/* What Went Wrong */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 font-bold text-lg">✗</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">What Went Wrong</h3>
                  </div>
                  <div className="space-y-3">
                    {retrospectiveItems.wentWrong.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-red-200"
                        style={{ backgroundColor: getRetroItemColor(item.score || 0) }}
                      >
                        <div className="flex flex-col items-center mr-2">
                          <button
                            className="text-gray-500 hover:text-red-600"
                            onClick={() => handleRetroItemVote('wentWrong', item.id, 1)}
                            type="button"
                          >
                            ▲
                          </button>
                          <span className="text-xs font-bold text-gray-500">{item.score || 0}</span>
                          <button
                            className="text-gray-500 hover:text-green-600"
                            onClick={() => handleRetroItemVote('wentWrong', item.id, -1)}
                            type="button"
                          >
                            ▼
                          </button>
                        </div>
                        {item.isEditing && editingRetro.category === 'wentWrong' && editingRetro.id === item.id ? (
                          <input
                            type="text"
                            className="flex-1 bg-white border border-red-300 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onBlur={() => handleRetroItemSave('wentWrong', item.id)}
                            onKeyDown={e => e.key === 'Enter' && handleRetroItemSave('wentWrong', item.id)}
                            autoFocus
                          />
                        ) : (
                          <span className={`flex-1 text-gray-700 ${item.checked ? 'line-through opacity-60' : ''}`}>
                            {item.text}
                          </span>
                        )}
                        <button
                          className="mr-1 text-yellow-500 hover:text-yellow-600"
                          onClick={() => handleRetroItemEdit('wentWrong', item.id)}
                          type="button"
                          aria-label="Edit"
                        >
                          <FaPencilAlt className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRetrospectiveItem('wentWrong', item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button 
                      className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                      onClick={() => handleAddRetrospectiveItem('wentWrong')}
                    >
                      + Add Item
                    </button>
                  </div>
                </div>

                {/* What Can We Improve */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-lg">💡</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">What Can We Improve</h3>
                  </div>
                  <div className="space-y-3">
                    {retrospectiveItems.canImprove.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-blue-200"
                        style={{ backgroundColor: getRetroItemColor(item.score || 0) }}
                      >
                        <div className="flex flex-col items-center mr-2">
                          <button
                            className="text-gray-500 hover:text-red-600"
                            onClick={() => handleRetroItemVote('canImprove', item.id, 1)}
                            type="button"
                          >
                            ▲
                          </button>
                          <span className="text-xs font-bold text-gray-500">{item.score || 0}</span>
                          <button
                            className="text-gray-500 hover:text-green-600"
                            onClick={() => handleRetroItemVote('canImprove', item.id, -1)}
                            type="button"
                          >
                            ▼
                          </button>
                        </div>
                        {item.isEditing && editingRetro.category === 'canImprove' && editingRetro.id === item.id ? (
                          <input
                            type="text"
                            className="flex-1 bg-white border border-blue-300 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onBlur={() => handleRetroItemSave('canImprove', item.id)}
                            onKeyDown={e => e.key === 'Enter' && handleRetroItemSave('canImprove', item.id)}
                            autoFocus
                          />
                        ) : (
                          <span className={`flex-1 text-gray-700 ${item.checked ? 'line-through opacity-60' : ''}`}>
                            {item.text}
                          </span>
                        )}
                        <button
                          className="mr-1 text-yellow-500 hover:text-yellow-600"
                          onClick={() => handleRetroItemEdit('canImprove', item.id)}
                          type="button"
                          aria-label="Edit"
                        >
                          <FaPencilAlt className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRetrospectiveItem('canImprove', item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button 
                      className="mt-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                      onClick={() => handleAddRetrospectiveItem('canImprove')}
                    >
                      + Add Item
                    </button>
                  </div>
                </div>

                {/* Action Items */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-bold text-lg">🎯</span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">Action Items</h3>
                  </div>
                  <div className="space-y-3">
                    {retrospectiveItems.actionItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-purple-200"
                        style={{ backgroundColor: getRetroItemColor(item.score || 0) }}
                      >
                        <div className="flex flex-col items-center mr-2">
                          <button
                            className="text-gray-500 hover:text-red-600"
                            onClick={() => handleRetroItemVote('actionItems', item.id, 1)}
                            type="button"
                          >
                            ▲
                          </button>
                          <span className="text-xs font-bold text-gray-500">{item.score || 0}</span>
                          <button
                            className="text-gray-500 hover:text-green-600"
                            onClick={() => handleRetroItemVote('actionItems', item.id, -1)}
                            type="button"
                          >
                            ▼
                          </button>
                        </div>
                        {item.isEditing && editingRetro.category === 'actionItems' && editingRetro.id === item.id ? (
                          <input
                            type="text"
                            className="flex-1 bg-white border border-purple-300 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            value={editText}
                            onChange={e => setEditText(e.target.value)}
                            onBlur={() => handleRetroItemSave('actionItems', item.id)}
                            onKeyDown={e => e.key === 'Enter' && handleRetroItemSave('actionItems', item.id)}
                            autoFocus
                          />
                        ) : (
                          <span className={`flex-1 text-gray-700 ${item.checked ? 'line-through opacity-60' : ''}`}>
                            {item.text}
                          </span>
                        )}
                        <button
                          className="mr-1 text-yellow-500 hover:text-yellow-600"
                          onClick={() => handleRetroItemEdit('actionItems', item.id)}
                          type="button"
                          aria-label="Edit"
                        >
                          <FaPencilAlt className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRetrospectiveItem('actionItems', item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button 
                      className="mt-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
                      onClick={() => handleAddRetrospectiveItem('actionItems')}
                    >
                      + Add Item
                    </button>
                  </div>
                </div>
              </div>
              )}

              {retrospectiveTab === "statistics" && (
                <div className="bg-white rounded-lg border-2 border-gray-400 shadow-md p-6">
                  <div className="text-2xl font-bold text-gray-800 mb-6">Statistics & Metrics</div>
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {retrospectiveItems.wentWell.length}
                      </div>
                      <div className="text-sm text-green-700">What Went Well</div>
                      <div className="text-xs text-green-600 mt-1">
                        {retrospectiveItems.wentWell.filter(item => item.checked).length} completed
                      </div>
                    </div>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-red-600">
                        {retrospectiveItems.wentWrong.length}
                      </div>
                      <div className="text-sm text-red-700">What Went Wrong</div>
                      <div className="text-xs text-red-600 mt-1">
                        {retrospectiveItems.wentWrong.filter(item => item.checked).length} addressed
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {retrospectiveItems.canImprove.length}
                      </div>
                      <div className="text-sm text-blue-700">Can Improve</div>
                      <div className="text-xs text-blue-600 mt-1">
                        {retrospectiveItems.canImprove.filter(item => item.checked).length} in progress
                      </div>
                    </div>
                    
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-purple-600">
                        {retrospectiveItems.actionItems.length}
                      </div>
                      <div className="text-sm text-purple-700">Action Items</div>
                      <div className="text-xs text-purple-600 mt-1">
                        {retrospectiveItems.actionItems.filter(item => item.checked).length} completed
                      </div>
                    </div>
                  </div>

                  {/* Progress Bars */}
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-700">What Went Well</span>
                        <span className="text-sm text-gray-500">
                          {retrospectiveItems.wentWell.filter(item => item.checked).length}/{retrospectiveItems.wentWell.length}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${retrospectiveItems.wentWell.length > 0 
                              ? (retrospectiveItems.wentWell.filter(item => item.checked).length / retrospectiveItems.wentWell.length) * 100 
                              : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-700">What Went Wrong</span>
                        <span className="text-sm text-gray-500">
                          {retrospectiveItems.wentWrong.filter(item => item.checked).length}/{retrospectiveItems.wentWrong.length}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${retrospectiveItems.wentWrong.length > 0 
                              ? (retrospectiveItems.wentWrong.filter(item => item.checked).length / retrospectiveItems.wentWrong.length) * 100 
                              : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-700">Can Improve</span>
                        <span className="text-sm text-gray-500">
                          {retrospectiveItems.canImprove.filter(item => item.checked).length}/{retrospectiveItems.canImprove.length}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${retrospectiveItems.canImprove.length > 0 
                              ? (retrospectiveItems.canImprove.filter(item => item.checked).length / retrospectiveItems.canImprove.length) * 100 
                              : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-700">Action Items</span>
                        <span className="text-sm text-gray-500">
                          {retrospectiveItems.actionItems.filter(item => item.checked).length}/{retrospectiveItems.actionItems.length}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${retrospectiveItems.actionItems.length > 0 
                              ? (retrospectiveItems.actionItems.filter(item => item.checked).length / retrospectiveItems.actionItems.length) * 100 
                              : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                                     {/* Total Statistics */}
                   <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                     <h3 className="text-lg font-semibold text-gray-800 mb-3">Overall Progress</h3>
                     <div className="grid grid-cols-2 gap-4 text-sm">
                       <div>
                         <span className="text-gray-600">Total Items:</span>
                         <span className="ml-2 font-medium">
                           {retrospectiveItems.wentWell.length + retrospectiveItems.wentWrong.length + retrospectiveItems.canImprove.length + retrospectiveItems.actionItems.length}
                         </span>
                       </div>
                       <div>
                         <span className="text-gray-600">Completed:</span>
                         <span className="ml-2 font-medium">
                           {retrospectiveItems.wentWell.filter(item => item.checked).length + 
                            retrospectiveItems.wentWrong.filter(item => item.checked).length + 
                            retrospectiveItems.canImprove.filter(item => item.checked).length + 
                            retrospectiveItems.actionItems.filter(item => item.checked).length}
                         </span>
                       </div>
                       <div>
                         <span className="text-gray-600">Completion Rate:</span>
                         <span className="ml-2 font-medium">
                           {(() => {
                             const total = retrospectiveItems.wentWell.length + retrospectiveItems.wentWrong.length + retrospectiveItems.canImprove.length + retrospectiveItems.actionItems.length;
                             const completed = retrospectiveItems.wentWell.filter(item => item.checked).length + 
                                            retrospectiveItems.wentWrong.filter(item => item.checked).length + 
                                            retrospectiveItems.canImprove.filter(item => item.checked).length + 
                                            retrospectiveItems.actionItems.filter(item => item.checked).length;
                             return total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%';
                           })()}
                         </span>
                       </div>
                       <div>
                         <span className="text-gray-600">Most Active Category:</span>
                         <span className="ml-2 font-medium">
                           {(() => {
                             const categories = [
                               { name: 'Went Well', count: retrospectiveItems.wentWell.length },
                               { name: 'Went Wrong', count: retrospectiveItems.wentWrong.length },
                               { name: 'Can Improve', count: retrospectiveItems.canImprove.length },
                               { name: 'Action Items', count: retrospectiveItems.actionItems.length }
                             ];
                             const maxCategory = categories.reduce((max, current) => 
                               current.count > max.count ? current : max
                             );
                             return maxCategory.count > 0 ? maxCategory.name : 'None';
                           })()}
                         </span>
                       </div>
                     </div>
                   </div>

                   {/* Sprint Task Statistics */}
                   <div className="mt-12 mb-12 p-8 bg-white rounded-2xl border border-blue-100 shadow-lg">
                     <h3 className="text-lg font-semibold text-blue-800 mb-4">Sprint Task Statistics</h3>
                     
                     {/* Task Summary Cards */}
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                       <div className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
                         <div className="text-2xl font-bold text-blue-600">
                           {activeTasks.length}
                         </div>
                         <div className="text-sm text-blue-700">Total Tasks</div>
                         <div className="text-xs text-blue-600 mt-1">
                           Active Sprint
                         </div>
                       </div>
                       
                       <div className="bg-white border border-green-200 rounded-lg p-4 shadow-sm">
                         <div className="text-2xl font-bold text-green-600">
                           {activeTasks.filter(task => task.status === 'Done').length}
                         </div>
                         <div className="text-sm text-green-700">Completed</div>
                         <div className="text-xs text-green-600 mt-1">
                           {activeTasks.length > 0 ? `${Math.round((activeTasks.filter(task => task.status === 'Done').length / activeTasks.length) * 100)}%` : '0%'} of total
                         </div>
                       </div>
                       
                       <div className="bg-white border border-yellow-200 rounded-lg p-4 shadow-sm">
                         <div className="text-2xl font-bold text-yellow-600">
                           {activeTasks.filter(task => task.status === 'In Progress').length}
                         </div>
                         <div className="text-sm text-yellow-700">In Progress</div>
                         <div className="text-xs text-yellow-600 mt-1">
                           {activeTasks.length > 0 ? `${Math.round((activeTasks.filter(task => task.status === 'In Progress').length / activeTasks.length) * 100)}%` : '0%'} of total
                         </div>
                       </div>
                       
                       <div className="bg-white border border-red-200 rounded-lg p-4 shadow-sm">
                         <div className="text-2xl font-bold text-red-600">
                           {activeTasks.filter(task => task.status === 'To Do').length}
                         </div>
                         <div className="text-sm text-red-700">To Do</div>
                         <div className="text-xs text-red-600 mt-1">
                           {activeTasks.length > 0 ? `${Math.round((activeTasks.filter(task => task.status === 'To Do').length / activeTasks.length) * 100)}%` : '0%'} of total
                         </div>
                       </div>
                     </div>

                     {/* Task Status Progress */}
                     <div className="space-y-4">
                       <div>
                         <div className="flex justify-between items-center mb-2">
                           <span className="font-medium text-gray-700">Task Completion</span>
                           <span className="text-sm text-gray-500">
                             {activeTasks.filter(task => task.status === 'Done').length}/{activeTasks.length}
                           </span>
                         </div>
                         <div className="w-full bg-gray-200 rounded-full h-3">
                           <div 
                             className="bg-green-500 h-3 rounded-full transition-all duration-300"
                             style={{ 
                               width: `${activeTasks.length > 0 
                                 ? (activeTasks.filter(task => task.status === 'Done').length / activeTasks.length) * 100 
                                 : 0}%` 
                             }}
                           ></div>
                         </div>
                       </div>

                       <div>
                         <div className="flex justify-between items-center mb-2">
                           <span className="font-medium text-gray-700">In Progress</span>
                           <span className="text-sm text-gray-500">
                             {activeTasks.filter(task => task.status === 'In Progress').length}/{activeTasks.length}
                           </span>
                         </div>
                         <div className="w-full bg-gray-200 rounded-full h-3">
                           <div 
                             className="bg-yellow-500 h-3 rounded-full transition-all duration-300"
                             style={{ 
                               width: `${activeTasks.length > 0 
                                 ? (activeTasks.filter(task => task.status === 'In Progress').length / activeTasks.length) * 100 
                                 : 0}%` 
                             }}
                           ></div>
                         </div>
                       </div>

                       <div>
                         <div className="flex justify-between items-center mb-2">
                           <span className="font-medium text-gray-700">To Do</span>
                           <span className="text-sm text-gray-500">
                             {activeTasks.filter(task => task.status === 'To Do').length}/{activeTasks.length}
                           </span>
                         </div>
                         <div className="w-full bg-gray-200 rounded-full h-3">
                           <div 
                             className="bg-red-500 h-3 rounded-full transition-all duration-300"
                             style={{ 
                               width: `${activeTasks.length > 0 
                                 ? (activeTasks.filter(task => task.status === 'To Do').length / activeTasks.length) * 100 
                                 : 0}%` 
                             }}
                           ></div>
                         </div>
                       </div>
                     </div>

                     {/* Task Details */}
                     <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                       <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                         <h4 className="font-semibold text-gray-800 mb-2">Task Distribution</h4>
                         <div className="space-y-1">
                           <div className="flex justify-between">
                             <span className="text-gray-600">High Priority:</span>
                             <span className="font-medium">{activeTasks.filter(task => task.priority === 'High').length}</span>
                           </div>
                           <div className="flex justify-between">
                             <span className="text-gray-600">Medium Priority:</span>
                             <span className="font-medium">{activeTasks.filter(task => task.priority === 'Medium').length}</span>
                           </div>
                           <div className="flex justify-between">
                             <span className="text-gray-600">Low Priority:</span>
                             <span className="font-medium">{activeTasks.filter(task => task.priority === 'Low').length}</span>
                           </div>
                         </div>
                       </div>

                       <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                         <h4 className="font-semibold text-gray-800 mb-2">Story Points</h4>
                         <div className="space-y-1">
                           <div className="flex justify-between">
                             <span className="text-gray-600">Total Points:</span>
                             <span className="font-medium">
                               {activeTasks.reduce((sum, task) => sum + (task.storyPoint || 0), 0)}
                             </span>
                           </div>
                           <div className="flex justify-between">
                             <span className="text-gray-600">Completed Points:</span>
                             <span className="font-medium">
                               {activeTasks.filter(task => task.status === 'Done').reduce((sum, task) => sum + (task.storyPoint || 0), 0)}
                             </span>
                           </div>
                           <div className="flex justify-between">
                             <span className="text-gray-600">Average per Task:</span>
                             <span className="font-medium">
                               {activeTasks.length > 0 ? Math.round(activeTasks.reduce((sum, task) => sum + (task.storyPoint || 0), 0) / activeTasks.length * 10) / 10 : 0}
                             </span>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>
               )}

               {retrospectiveTab === "charts" && (
                 <div className="bg-white rounded-lg border-2 border-gray-400 shadow-md p-6">
                   <div className="text-2xl font-bold text-gray-800 mb-6">Sprint Charts</div>
                   
                   {/* Chart Type Selector */}
                   <div className="flex gap-2 mb-6">
                     <button
                       onClick={() => setChartType("burndown")}
                       className={`px-4 py-2 rounded-lg font-medium transition-all ${
                         chartType === "burndown" 
                           ? "bg-orange-600 text-white shadow-md" 
                           : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                       }`}
                     >
                       Burndown Chart
                     </button>
                     <button
                       onClick={() => setChartType("burnup")}
                       className={`px-4 py-2 rounded-lg font-medium transition-all ${
                         chartType === "burnup" 
                           ? "bg-green-600 text-white shadow-md" 
                           : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                       }`}
                     >
                       Burnup Chart
                     </button>
                     <button
                       onClick={() => setChartType("velocity")}
                       className={`px-4 py-2 rounded-lg font-medium transition-all ${
                         chartType === "velocity" 
                           ? "bg-blue-600 text-white shadow-md" 
                           : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                       }`}
                     >
                       Velocity Chart
                     </button>
                     <button
                       onClick={() => setChartType("sprint-report")}
                       className={`px-4 py-2 rounded-lg font-medium transition-all ${
                         chartType === "sprint-report" 
                           ? "bg-purple-600 text-white shadow-md" 
                           : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                       }`}
                     >
                       Sprint Report
                     </button>
                   </div>

                   {/* Chart Content */}
                   <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                     {chartType === "burndown" && (
                       <div>
                         <h3 className="text-xl font-semibold text-gray-800 mb-4">Burndown Chart</h3>
                         <div className="bg-white p-4 rounded-lg border border-gray-300">
                           <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                             <div className="text-center">
                               <div className="text-4xl mb-2">📊</div>
                               <div className="text-lg font-medium text-gray-600">Burndown Chart</div>
                               <div className="text-sm text-gray-500 mt-1">Shows remaining work over time</div>
                               <div className="text-xs text-gray-400 mt-2">
                                 Total Story Points: {activeTasks.reduce((sum, task) => sum + (task.storyPoint || 0), 0)}<br/>
                                 Completed: {activeTasks.filter(task => task.status === 'Done').reduce((sum, task) => sum + (task.storyPoint || 0), 0)}<br/>
                                 Remaining: {activeTasks.filter(task => task.status !== 'Done').reduce((sum, task) => sum + (task.storyPoint || 0), 0)}
                               </div>
                             </div>
                           </div>
                         </div>
                       </div>
                     )}

                     {chartType === "burnup" && (
                       <div>
                         <h3 className="text-xl font-semibold text-gray-800 mb-4">Burnup Chart</h3>
                         <div className="bg-white p-4 rounded-lg border border-gray-300">
                           <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                             <div className="text-center">
                               <div className="text-4xl mb-2">📈</div>
                               <div className="text-lg font-medium text-gray-600">Burnup Chart</div>
                               <div className="text-sm text-gray-500 mt-1">Shows completed work over time</div>
                               <div className="text-xs text-gray-400 mt-2">
                                 Sprint Goal: {activeTasks.reduce((sum, task) => sum + (task.storyPoint || 0), 0)} Story Points<br/>
                                 Completed: {activeTasks.filter(task => task.status === 'Done').reduce((sum, task) => sum + (task.storyPoint || 0), 0)}<br/>
                                 Progress: {activeTasks.length > 0 ? `${Math.round((activeTasks.filter(task => task.status === 'Done').length / activeTasks.length) * 100)}%` : '0%'}
                               </div>
                             </div>
                           </div>
                         </div>
                       </div>
                     )}

                     {chartType === "velocity" && (
                       <div>
                         <h3 className="text-xl font-semibold text-gray-800 mb-4">Velocity Chart</h3>
                         <div className="bg-white p-4 rounded-lg border border-gray-300">
                           <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                             <div className="text-center">
                               <div className="text-4xl mb-2">🚀</div>
                               <div className="text-lg font-medium text-gray-600">Velocity Chart</div>
                               <div className="text-sm text-gray-500 mt-1">Shows team velocity over sprints</div>
                               <div className="text-xs text-gray-400 mt-2">
                                 Current Sprint Velocity: {activeTasks.filter(task => task.status === 'Done').reduce((sum, task) => sum + (task.storyPoint || 0), 0)}<br/>
                                 Average Velocity: {activeTasks.filter(task => task.status === 'Done').reduce((sum, task) => sum + (task.storyPoint || 0), 0)}<br/>
                                 Team Capacity: {activeTasks.reduce((sum, task) => sum + (task.storyPoint || 0), 0)}
                               </div>
                             </div>
                           </div>
                         </div>
                       </div>
                     )}

                     {chartType === "sprint-report" && (
                       <div>
                         <h3 className="text-xl font-semibold text-gray-800 mb-4">Sprint Report</h3>
                         <div className="bg-white p-4 rounded-lg border border-gray-300">
                           <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                             <div className="text-center">
                               <div className="text-4xl mb-2">📋</div>
                               <div className="text-lg font-medium text-gray-600">Sprint Report</div>
                               <div className="text-sm text-gray-500 mt-1">Comprehensive sprint summary</div>
                               <div className="text-xs text-gray-400 mt-2">
                                 Tasks: {activeTasks.length} | Completed: {activeTasks.filter(task => task.status === 'Done').length}<br/>
                                 Story Points: {activeTasks.reduce((sum, task) => sum + (task.storyPoint || 0), 0)} | Completed: {activeTasks.filter(task => task.status === 'Done').reduce((sum, task) => sum + (task.storyPoint || 0), 0)}<br/>
                                 Completion Rate: {activeTasks.length > 0 ? `${Math.round((activeTasks.filter(task => task.status === 'Done').length / activeTasks.length) * 100)}%` : '0%'}
                               </div>
                             </div>
                           </div>
                         </div>
                       </div>
                     )}
                   </div>

                   {/* Chart Legend */}
                   <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                     <h4 className="font-semibold text-blue-800 mb-2">Chart Information</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                       <div>
                         <span className="font-medium text-blue-700">Burndown Chart:</span>
                         <span className="ml-2 text-blue-600">Shows remaining work decreasing over time</span>
                       </div>
                       <div>
                         <span className="font-medium text-blue-700">Burnup Chart:</span>
                         <span className="ml-2 text-blue-600">Shows completed work increasing over time</span>
                       </div>
                       <div>
                         <span className="font-medium text-blue-700">Velocity Chart:</span>
                         <span className="ml-2 text-blue-600">Shows team's work capacity over sprints</span>
                       </div>
                       <div>
                         <span className="font-medium text-blue-700">Sprint Report:</span>
                         <span className="ml-2 text-blue-600">Comprehensive sprint performance summary</span>
                       </div>
                     </div>
                   </div>
                 </div>
               )}
             </div>
           )}
          <TaskDetailModal
            open={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            task={newTaskData}
            onTaskUpdate={handleCreateTask}
            allTasks={allTasks}
            isCreate={true}
            sprintOptions={sprintOptions}
            selectedSprint={selectedSprint}
            setSelectedSprint={setSelectedSprint}
            statusOptions={statusOptions}
          />
          <TaskDetailModal
            open={backlogModalOpen}
            onClose={() => setBacklogModalOpen(false)}
            task={selectedBacklogTask}
            onTaskUpdate={handleBacklogTaskUpdate}
            allTasks={allTasks}
            isCreate={false}
          />
          
          {/* Planning Poker Modal */}
          <PlanningPoker
            isOpen={pokerOpen}
            onClose={handleClosePoker}
            currentTask={selectedTaskForPoker}
            onEstimationComplete={handleEstimationComplete}
            teamMembers={teamMembers.filter(m => m.value).map(m => m.label)}
          />
        </div>
      </div>
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 min-w-[320px] flex flex-col items-center">
            <div className="text-lg font-semibold mb-4 text-gray-800">Silmek istediğine emin misin?</div>
            <div className="flex gap-4 mt-2">
              <button
                className="px-4 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                onClick={() => handleDeleteBacklog(deleteTargetIdx)}
              >
                Evet, Sil
              </button>
              <button
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
                onClick={() => { setDeleteModalOpen(false); setDeleteTargetIdx(null); }}
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
} 