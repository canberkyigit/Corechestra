import React, { useState, useEffect, useRef } from 'react';
import './TaskDetailModal.css';
import { FaPaperclip, FaFileAlt, FaChevronRight, FaChevronDown, FaChevronUp, FaUserCircle, FaLink, FaFlag, FaCalendarAlt, FaRocket, FaCheckCircle, FaExclamationTriangle, FaSearch, FaPlusSquare, FaCheckSquare, FaExclamationCircle, FaRegDotCircle, FaPlay } from 'react-icons/fa';
import { Listbox } from '@headlessui/react';

const dummyTask = {
  id: 'TS-5831',
  title: 'Boston APAC update the body for Share via Attachment',
  description: 'For Share via Attachment, change message template to "Please find the attached <filename> as with this email"',
  additionalNotes: '',
  attachments: [
    { id: 1, name: 'specs.pdf', url: '#', type: 'pdf' },
    { id: 2, name: 'design.png', url: '#', type: 'image' },
    { id: 3, name: 'notes.txt', url: '#', type: 'txt' },
    { id: 4, name: 'api.json', url: '#', type: 'json' },
  ],
  status: 'In Progress',
  assignee: { name: 'Canberk Yiğit', avatar: 'https://ui-avatars.com/api/?name=Canberk+Yiğit' },
  reporter: { name: 'Ram Kanna', avatar: 'https://ui-avatars.com/api/?name=Ram+Kanna' },
  development: { branches: 2, commits: 5, prs: 3, buildFailing: true, merged: true, lastCommit: '6 days ago' },
  releases: ['Add feature flag'],
  sprint: 'Team Eagles Sprint 86',
  priority: 'High',
  dueDate: '2025-05-22',
  checklist: [
    { id: 1, text: 'Code peer-reviewed', done: false },
  ],
  comments: [
    { id: 1, author: 'Rinat Shaipov', date: 'July 7, 2025 at 3:51 PM', text: 'hey @Canberk Yiğit strange thing, i see this white screen at anz endo test' },
  ],
  linkedItems: [
    { id: 'TS-5870', title: 'APAC UWP Regression Test', status: 'In Progress', assignee: { name: 'Canberk Yiğit', avatar: 'https://ui-avatars.com/api/?name=Canberk+Yiğit' } }
  ],
  confluence: { url: '#', title: 'Create a document for this project without leaving this issue' },
  testCoverage: { covered: false },
};

// Constants
const assigneeOptions = [
  { name: 'Dave', avatar: 'https://ui-avatars.com/api/?name=Dave' },
  { name: 'Carol', avatar: 'https://ui-avatars.com/api/?name=Carol' },
  { name: 'Alice', avatar: 'https://ui-avatars.com/api/?name=Alice' },
  { name: 'Bob', avatar: 'https://ui-avatars.com/api/?name=Bob' },
  { name: 'Unassigned', avatar: 'https://ui-avatars.com/api/?name=Unassigned' },
];

export default function TaskDetailModal({ open, onClose, task = dummyTask, onTaskUpdate, allTasks = [], isCreate = false, onTaskRemove, statusOptions: statusOptionsProp, sprintOptions = [], selectedSprint, setSelectedSprint }) {
  // Varsayılan statusOptions
  const defaultStatusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'inprogress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'awaiting', label: 'Awaiting Customer' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'done', label: 'Done' },
  ];
  const statusOptions = statusOptionsProp || defaultStatusOptions;

  // Refs
  const fileInputRef = useRef(null);
  
  // Helper to normalize and match status
  function normalizeStatus(val) {
    return (val || '').toLowerCase().replace(/\s|-/g, '');
  }
  function getStatusOption(val) {
    const norm = normalizeStatus(val);
    return statusOptions.find(opt => opt.value === norm || normalizeStatus(opt.label) === norm) || statusOptions[0];
  }

  // All useState calls at the top level, unconditionally
  const [status, setStatus] = useState(getStatusOption(task?.status));
  const [assignee, setAssignee] = useState(task?.assignee ?? { name: 'Unassigned', avatar: 'https://ui-avatars.com/api/?name=Unassigned' });
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [additionalNotes, setAdditionalNotes] = useState(task?.additionalNotes ?? '');
  const [checklist, setChecklist] = useState(Array.isArray(task?.checklist) ? task.checklist : []);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskPriority, setNewSubtaskPriority] = useState('Medium');
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState('Unassigned');
  const [subtasks, setSubtasks] = useState(Array.isArray(task?.subtasks) ? task.subtasks : []);
  const [subtaskToDelete, setSubtaskToDelete] = useState(null);
  const [localAttachments, setLocalAttachments] = useState(Array.isArray(task?.attachments) ? task.attachments : []);
  const [description, setDescription] = useState(task?.description ?? '');
  const [hasChanges, setHasChanges] = useState(false);
  const [linkedSearch, setLinkedSearch] = useState('');
  const [linkedItemsState, setLinkedItemsState] = useState(task?.linkedItems ?? []);
  const [storyPoints, setStoryPoints] = useState(task?.storyPoints ?? task?.storyPoint ?? '');
  const [title, setTitle] = useState(task?.title ?? '');
  const [priority, setPriority] = useState(task?.priority ?? 'Medium');
  const typeOptions = [
    { value: 'epic', label: 'Epic', icon: <FaRocket style={{color:'#a259ff',marginRight:6}}/> },
    { value: 'feature', label: 'Feature', icon: <FaPlusSquare style={{color:'#38a169',marginRight:6}}/> },
    { value: 'task', label: 'Task', icon: <FaCheckSquare style={{color:'#3578e5',marginRight:6}}/> },
    { value: 'bug', label: 'Bug', icon: <FaExclamationTriangle style={{color:'#e53e3e',marginRight:6}}/> },
    { value: 'test', label: 'Test', icon: <FaSearch style={{color:'#008b8b',marginRight:6}}/> },
    { value: 'testset', label: 'Test Set', icon: <FaFlag style={{color:'#6c63ff',marginRight:6}}/> },
    { value: 'testexecution', label: 'Test Execution', icon: <FaPlay style={{color:'#8bc34a',marginRight:6}}/> },
    { value: 'precondition', label: 'Precondition', icon: <FaRegDotCircle style={{color:'#00bcd4',marginRight:6}}/> },
    { value: 'defect', label: 'Defect', icon: <FaExclamationCircle style={{color:'#ff9800',marginRight:6}}/> },
  ];
  const priorityOptions = [
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
    { value: 'Critical', label: 'Critical' },
  ];
  const [type, setType] = useState(task?.type || 'task');
  const [activeTab, setActiveTab] = useState('comments');
  const [refNotes, setRefNotes] = useState(task?.refNotes || '');

  // Type map for icon and label
  const typeMap = {
    bug: { label: 'Bug', icon: <FaExclamationTriangle style={{color:'#e53e3e',marginRight:6}}/> },
    defect: { label: 'Defect', icon: <FaExclamationTriangle style={{color:'#e53e3e',marginRight:6}}/> },
    userstory: { label: 'User Story', icon: <FaUserCircle style={{color:'#3578e5',marginRight:6}}/> },
    investigation: { label: 'Investigation', icon: <FaSearch style={{color:'#805ad5',marginRight:6}}/> },
    task: { label: 'Task', icon: <FaCheckCircle style={{color:'#38a169',marginRight:6}}/> },
    feature: { label: 'Feature', icon: <FaRocket style={{color:'#3182ce',marginRight:6}}/> },
    test: { label: 'Test', icon: <FaFlag style={{color:'#805ad5',marginRight:6}}/> },
    testset: { label: 'Test Set', icon: <FaFlag style={{color:'#805ad5',marginRight:6}}/> },
    testexecution: { label: 'Test Execution', icon: <FaFlag style={{color:'#805ad5',marginRight:6}}/> },
    precondition: { label: 'Precondition', icon: <FaFlag style={{color:'#805ad5',marginRight:6}}/> },
  };
  const typeInfo = typeMap[(task?.type || '').toLowerCase()] || typeMap['task'];

  // Safe data access
  const reporter = task?.reporter ?? { name: 'Unknown', avatar: 'https://ui-avatars.com/api/?name=Unknown' };
  const linkedItems = Array.isArray(task?.linkedItems) ? task.linkedItems : [];
  const development = task?.development ?? {};
  const checklistSafe = Array.isArray(checklist) ? checklist : [];
  const commentsSafe = Array.isArray(task?.comments) ? task.comments : [];
  const subtasksSafe = Array.isArray(subtasks) ? subtasks : [];

  // Update tracking function
  const markAsChanged = () => {
    if (!hasChanges) setHasChanges(true);
  };

  // Checklist handlers
  const handleChecklistToggle = (idx) => {
    setChecklist(cl => cl.map((item, i) => i === idx ? { ...item, done: !item.done } : item));
    markAsChanged();
  };

  const handleChecklistAdd = (e) => {
    e.preventDefault();
    if (newChecklistItem.trim()) {
      setChecklist(cl => [...cl, { id: Date.now(), text: newChecklistItem, done: false }]);
      setNewChecklistItem('');
      markAsChanged();
    }
  };

  const handleChecklistDelete = (idx) => {
    setChecklist(cl => cl.filter((_, i) => i !== idx));
    markAsChanged();
  };

  // Subtask handlers
  const handleSubtaskAdd = (e) => {
    e.preventDefault();
    if (newSubtaskTitle.trim()) {
      setSubtasks(sts => [...sts, {
        id: Date.now(),
        title: newSubtaskTitle,
        status: 'To Do',
        priority: newSubtaskPriority,
        assignee: assigneeOptions.find(a => a.name === newSubtaskAssignee)
      }]);
      setNewSubtaskTitle('');
      setNewSubtaskPriority('Medium');
      setNewSubtaskAssignee('Unassigned');
      markAsChanged();
    }
  };

  const handleSubtaskDelete = (idx) => {
    setSubtaskToDelete(idx);
  };

  const confirmSubtaskDelete = () => {
    setSubtasks(sts => sts.filter((_, i) => i !== subtaskToDelete));
    setSubtaskToDelete(null);
    markAsChanged();
  };

  const cancelSubtaskDelete = () => {
    setSubtaskToDelete(null);
  };

  const handleSubtaskAssigneeChange = (idx, newAssigneeName) => {
    setSubtasks(sts => sts.map((st, i) => i === idx ? { ...st, assignee: assigneeOptions.find(a => a.name === newAssigneeName) } : st));
    markAsChanged();
  };

  const handleSubtaskStatusChange = (idx, newStatus) => {
    setSubtasks(sts => sts.map((st, i) => i === idx ? { ...st, status: newStatus } : st));
    markAsChanged();
  };

  // Attachment handlers
  const handleAttachmentAdd = (e) => {
    const files = Array.from(e.target.files || []);
    const mapped = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      url: URL.createObjectURL(file)
    }));
    setLocalAttachments(prev => [...prev, ...mapped]);
    e.target.value = '';
    markAsChanged();
  };

  const handleAttachmentDelete = (idx) => {
    setLocalAttachments(prev => prev.filter((_, i) => i !== idx));
    markAsChanged();
  };

  // Update local linkedItemsState when task changes
  useEffect(() => {
    setLinkedItemsState(Array.isArray(task?.linkedItems) ? task.linkedItems : []);
  }, [task]);

  // Search results: exclude already linked and self
  const linkedSearchResults = linkedSearch.length > 0
    ? allTasks.filter(t =>
        t.id !== task.id &&
        !linkedItemsState.some(li => li.id === t.id) &&
        (t.title.toLowerCase().includes(linkedSearch.toLowerCase()) || t.id.toLowerCase().includes(linkedSearch.toLowerCase()))
      )
    : [];

  const handleAddLinkedItem = (t) => {
    const assigneeObj = (t.assignee && typeof t.assignee === 'object' && t.assignee.name) ? t.assignee : { name: 'Unassigned', avatar: 'https://ui-avatars.com/api/?name=Unassigned' };
    setLinkedItemsState(prev => [...prev, { id: t.id, title: t.title, status: t.status, assignee: assigneeObj }]);
    setHasChanges(true);
    setLinkedSearch('');
  };

  // Save changes: include linkedItemsState
  const handleSave = () => {
    if (onTaskUpdate) {
      const statusForKanban = status.value;
      const updatedTask = {
        ...task,
        title,
        type,
        status: statusForKanban,
        assignee,
        assignedTo: assignee.name,
        dueDate,
        description,
        additionalNotes,
        checklist,
        subtasks,
        attachments: localAttachments,
        linkedItems: linkedItemsState,
        storyPoint: storyPoints,
        priority: priority,
        refNotes: refNotes
      };
      onTaskUpdate(updatedTask);
      setHasChanges(false);
    }
  };

  // Reset state when task changes
  useEffect(() => {
    setTitle(task?.title ?? '');
    setType(task?.type || 'task');
    setDescription(task?.description ?? '');
    setAdditionalNotes(task?.additionalNotes ?? '');
    setStatus(getStatusOption(task?.status));
    // Case-insensitive, trimmed match for assignee
    const assignedName = (task?.assignee?.name || task?.assignedTo || '').trim().toLowerCase();
    const found = assigneeOptions.find(a => a.name.toLowerCase() === assignedName);
    setAssignee(found || assigneeOptions.find(a => a.name === 'Unassigned'));
    setDueDate(task?.dueDate ?? '');
    setChecklist(Array.isArray(task?.checklist) ? task.checklist : []);
    setLocalAttachments(Array.isArray(task?.attachments) ? task.attachments : []);
    setSubtasks(Array.isArray(task?.subtasks) ? task.subtasks : []);
    setLinkedItemsState(Array.isArray(task?.linkedItems) ? task.linkedItems : []);
    setStoryPoints(task?.storyPoints ?? task?.storyPoint ?? '');
    setPriority(task?.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1).toLowerCase() : 'Medium');
    setRefNotes(task?.refNotes || '');
    setActiveTab('comments');
    setHasChanges(false);
  }, [task]);

  // Handler for Create Doc button
  const handleCreateDoc = () => {
    alert('Create Doc clicked!');
  };

  // Collapsible section states
  const [openSections, setOpenSections] = useState({
    description: true,
    additionalNotes: true,
    documentation: true,
    checklist: true,
    subtasks: true,
    attachments: true,
    linked: true,
    comments: true,
  });
  const toggleSection = (key) => setOpenSections(s => ({ ...s, [key]: !s[key] }));

  // Early return after all hooks
  if (!open) return null;

  return (
    <div className="task-modal-backdrop light" onClick={onClose}>
      <div className="task-modal jira-modal" onClick={e => e.stopPropagation()} style={{position:'relative'}}>
        <div style={{
          position: 'absolute',
          top: 18,
          right: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 3,
          justifyContent: 'flex-end'
        }}>
          <button
            className="task-modal-close"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: '2rem',
              cursor: 'pointer',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              lineHeight: 1
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className="jira-modal-content jira-modal-grid">
          {/* LEFT SIDEBAR */}
          <div className="jira-modal-sidebar" style={{position:'relative', minHeight: 500}}>
            {hasChanges && onTaskUpdate && (
              <button
                onClick={handleSave}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: 8,
                  border: 'none',
                  background: '#3578e5',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '1em',
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px 0 rgba(30,40,90,0.04)',
                  marginBottom: 24
                }}
              >
                Save
              </button>
            )}
            {/* Remove Task Button */}
            {!isCreate && task?.id && (
              <button
                onClick={() => { if (onTaskRemove) onTaskRemove(task); if (onClose) onClose(); }}
                style={{
                  width: '90%',
                  padding: '7px 0',
                  borderRadius: 8,
                  border: '2px solid #e53e3e',
                  background: '#fff',
                  color: '#e53e3e',
                  fontWeight: 700,
                  fontSize: '0.98em',
                  cursor: 'pointer',
                  marginTop: 24,
                  marginBottom: 0,
                  position: 'absolute',
                  left: '5%',
                  right: '5%',
                  bottom: 18
                }}
              >
                Remove Task
              </button>
            )}
            <div className="jira-sidebar-section">
              <div className="jira-sidebar-label">Status</div>
              <Listbox value={status} onChange={val => { setStatus(val); markAsChanged(); }}>
                <div className="relative w-full">
                  <Listbox.Button className="relative w-full cursor-pointer rounded-lg border-2 border-blue-400 bg-white py-2 pl-3 pr-10 text-left shadow font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 caret-blue-500 transition-all flex items-center">
                    <span className="flex items-center">{status?.label}</span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <FaChevronDown className="h-4 w-4 text-blue-400" />
                    </span>
                  </Listbox.Button>
                  <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black/10 focus:outline-none z-50">
                    {statusOptions.map(opt => (
                      <Listbox.Option key={opt.value} value={opt} className={({ active, selected }) => `relative cursor-pointer select-none py-2 pl-4 pr-10 rounded-lg flex items-center gap-2 ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} ${selected ? 'font-bold bg-blue-100' : ''}` }>
                        {opt.label}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>
            <div className="jira-sidebar-section">
              <div className="jira-sidebar-label">Assignee</div>
              <Listbox value={assignee} onChange={val => { setAssignee(val); markAsChanged(); }}>
                <div className="relative w-full">
                  <Listbox.Button className="relative w-full cursor-pointer rounded-lg border-2 border-blue-400 bg-white py-2 pl-3 pr-10 text-left shadow font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 caret-blue-500 transition-all flex items-center">
                    <span className="flex items-center">
                      <img src={assignee.avatar} alt={assignee.name} className="jira-sidebar-avatar" style={{width:20,height:20,borderRadius:'50%',marginRight:6}}/>
                      {assignee.name}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <FaChevronDown className="h-4 w-4 text-blue-400" />
                    </span>
                  </Listbox.Button>
                  <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black/10 focus:outline-none z-50">
                    {assigneeOptions.map(opt => (
                      <Listbox.Option key={opt.name} value={opt} className={({ active, selected }) => `relative cursor-pointer select-none py-2 pl-4 pr-10 rounded-lg flex items-center gap-2 ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} ${selected ? 'font-bold bg-blue-100' : ''}` }>
                        <img src={opt.avatar} alt={opt.name} className="jira-sidebar-avatar" style={{width:20,height:20,borderRadius:'50%',marginRight:6}}/>
                        {opt.name}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>
            <div className="jira-sidebar-section">
              <div className="jira-sidebar-label">Reporter</div>
              <div className="jira-sidebar-user">
                <img src={reporter.avatar} alt={reporter.name} className="jira-sidebar-avatar" />
                <span>{reporter.name}</span>
              </div>
            </div>
            <div className="jira-sidebar-section">
              <div className="jira-sidebar-label">Type</div>
              <Listbox value={type} onChange={val => { setType(val); markAsChanged(); }}>
                <div className="relative w-full">
                  <Listbox.Button className="relative w-full cursor-pointer rounded-lg border-2 border-blue-400 bg-white py-2 pl-3 pr-10 text-left shadow font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 caret-blue-500 transition-all flex items-center">
                    <span className="flex items-center">{typeOptions.find(opt => opt.value === type)?.icon}{typeOptions.find(opt => opt.value === type)?.label}</span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <FaChevronDown className="h-4 w-4 text-blue-400" />
                    </span>
                  </Listbox.Button>
                  <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black/10 focus:outline-none z-50">
                    {typeOptions.map(opt => (
                      <Listbox.Option key={opt.value} value={opt.value} className={({ active, selected }) => `relative cursor-pointer select-none py-2 pl-4 pr-10 rounded-lg flex items-center gap-2 ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} ${selected ? 'font-bold bg-blue-100' : ''}` }>
                        {opt.icon}{opt.label}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>
            <div className="jira-sidebar-section">
              <div className="jira-sidebar-label">Priority</div>
              <Listbox value={priority} onChange={val => { setPriority(val); markAsChanged(); }}>
                <div className="relative w-full">
                  <Listbox.Button className={`relative w-full cursor-pointer rounded-lg border-2 py-2 pl-3 pr-10 text-left shadow font-semibold focus:outline-none focus:ring-2 transition-all flex items-center ${
                    priority === 'Critical' ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-400' :
                    priority === 'High' ? 'border-orange-400 bg-orange-50 text-orange-700 focus:ring-orange-400' :
                    priority === 'Medium' ? 'border-yellow-400 bg-yellow-50 text-yellow-700 focus:ring-yellow-400' :
                    'border-green-400 bg-green-50 text-green-700 focus:ring-green-400'
                  }`}>
                    <span className="flex items-center">
                      <FaFlag style={{
                        color: priority === 'Critical' ? '#dc2626' :
                               priority === 'High' ? '#ea580c' :
                               priority === 'Medium' ? '#d97706' :
                               '#16a34a',
                        marginRight: 6
                      }}/>
                      {priority}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <FaChevronDown className="h-4 w-4" style={{
                        color: priority === 'Critical' ? '#dc2626' :
                               priority === 'High' ? '#ea580c' :
                               priority === 'Medium' ? '#d97706' :
                               '#16a34a'
                      }} />
                    </span>
                  </Listbox.Button>
                  <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black/10 focus:outline-none z-50">
                    {priorityOptions.map(opt => (
                      <Listbox.Option key={opt.value} value={opt.value} className={({ active, selected }) => `relative cursor-pointer select-none py-2 pl-4 pr-10 rounded-lg flex items-center gap-2 ${
                        opt.value === 'Critical' ? 'text-red-700' :
                        opt.value === 'High' ? 'text-orange-700' :
                        opt.value === 'Medium' ? 'text-yellow-700' :
                        'text-green-700'
                      } ${active ? 'bg-gray-50' : ''} ${selected ? 'font-bold bg-gray-100' : ''}` }>
                        <FaFlag style={{
                          color: opt.value === 'Critical' ? '#dc2626' :
                                 opt.value === 'High' ? '#ea580c' :
                                 opt.value === 'Medium' ? '#d97706' :
                                 '#16a34a',
                          marginRight: 6
                        }}/>
                        {opt.label}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>
            <div className="jira-sidebar-section">
              <div className="jira-sidebar-label">Sprint</div>
              <Listbox value={selectedSprint} onChange={val => setSelectedSprint(val)}>
                <div className="relative w-full">
                  <Listbox.Button className="relative w-full cursor-pointer rounded-lg border-2 border-blue-400 bg-white py-2 pl-3 pr-10 text-left shadow font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 caret-blue-500 transition-all flex items-center">
                    <span className="flex items-center">{selectedSprint?.label || '-'}</span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <FaChevronDown className="h-4 w-4 text-blue-400" />
                    </span>
                  </Listbox.Button>
                  <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black/10 focus:outline-none z-50">
                    {sprintOptions.map(opt => (
                      <Listbox.Option key={opt.value} value={opt} className={({ active, selected }) => `relative cursor-pointer select-none py-2 pl-4 pr-10 rounded-lg flex items-center gap-2 ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'} ${selected ? 'font-bold bg-blue-100' : ''}` }>
                        {opt.label}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>
            <div className="jira-sidebar-section">
              <div className="jira-sidebar-label">Story Points</div>
              <input
                type="number"
                min="0"
                value={storyPoints}
                onChange={e => { setStoryPoints(e.target.value); setHasChanges(true); }}
                style={{width:'100%',padding:'10px',borderRadius:8,border:'1px solid #e5e7eb',fontSize:'1em',marginBottom:0}}
                placeholder="Enter story points"
              />
            </div>
            <div className="jira-sidebar-section">
              <div className="jira-sidebar-label">Due Date</div>
              <input 
                type="date" 
                value={dueDate} 
                onChange={e => { setDueDate(e.target.value); markAsChanged(); }} 
                style={{padding:'6px',borderRadius:8,border:'1px solid #e5e7eb',fontSize:'1em'}} 
              />
            </div>
            <div className="jira-sidebar-section">
              <div className="jira-sidebar-label">Release</div>
              <span>{Array.isArray(task?.releases) && task.releases.length > 0 ? task.releases.join(', ') : '-'}</span>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="jira-modal-main">
            {/* ID badge ve başlık aynı container'da, tam soldan hizalı */}
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginBottom: '18px'}}>
              {typeof task.index === 'number' ? (
                <span className="jira-id" style={{marginLeft:0, paddingLeft:0}}>{`CY-${task.index + 1}`}</span>
              ) : task.id ? (
                <span className="jira-id" style={{marginLeft:0, paddingLeft:0}}>{task.id}</span>
              ) : null}
              <input
                className="jira-title"
                style={{margin:0, marginLeft:0, paddingLeft:0, fontWeight:700, fontSize:'1.45rem', border:'none', outline:'none', background:'transparent', color:'#172b4d', width:'100%'}}
                type="text"
                value={title}
                onChange={e => { setTitle(e.target.value); markAsChanged(); }}
                placeholder="Task title..."
                maxLength={120}
                required
              />
            </div>

            <div className="jira-section">
              <div className="jira-section-title" style={{fontWeight:600, fontSize:'1.08em', marginBottom:6, display:'flex', alignItems:'center', cursor:'pointer'}} onClick={() => toggleSection('description')}>
                <span style={{marginRight:6}}>{openSections.description ? <FaChevronDown/> : <FaChevronRight/>}</span>
                Description
              </div>
              <div style={{maxHeight: openSections.description ? 500 : 0, overflow:'hidden', transition:'max-height 0.35s cubic-bezier(.4,2,.6,1)'}}>
                <textarea
                  className="jira-section-content"
                  value={description}
                  onChange={e => { setDescription(e.target.value); markAsChanged(); }}
                  rows={4}
                  style={{width:'100%',resize:'vertical',marginTop:4}}
                />
              </div>
            </div>

            <div className="jira-section">
              <div className="jira-section-title" style={{fontWeight:600, fontSize:'1.08em', marginBottom:6, display:'flex', alignItems:'center', cursor:'pointer'}} onClick={() => toggleSection('additionalNotes')}>
                <span style={{marginRight:6}}>{openSections.additionalNotes ? <FaChevronDown/> : <FaChevronRight/>}</span>
                Additional Notes
              </div>
              <div style={{maxHeight: openSections.additionalNotes ? 500 : 0, overflow:'hidden', transition:'max-height 0.35s cubic-bezier(.4,2,.6,1)'}}>
                <textarea
                  className="jira-section-content"
                  value={additionalNotes}
                  onChange={e => { setAdditionalNotes(e.target.value); markAsChanged(); }}
                  rows={3}
                  style={{width:'100%',resize:'vertical',marginTop:4}}
                />
              </div>
            </div>

            <div className="jira-section">
              <div className="jira-section-title" style={{fontWeight:600, fontSize:'1.08em', marginBottom:6, display:'flex', alignItems:'center', cursor:'pointer'}} onClick={() => toggleSection('attachments')}>
                <span style={{marginRight:6}}>{openSections.attachments ? <FaChevronDown/> : <FaChevronRight/>}</span>
                Attachments
              </div>
              <div style={{maxHeight: openSections.attachments ? 800 : 0, overflow:'hidden', transition:'max-height 0.35s cubic-bezier(.4,2,.6,1)'}}>
                <div className="jira-section-content" style={{background:'none',padding:'0 0 8px 0'}}>
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    style={{marginBottom:10,marginTop:2,padding:'6px 14px',borderRadius:6,border:'none',background:'#3578e5',color:'#fff',fontWeight:600,fontSize:'1em',cursor:'pointer',display:'block'}}
                  >
                    Upload
                  </button>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*,video/*" 
                    multiple 
                    onChange={handleAttachmentAdd} 
                    style={{display:'none'}} 
                  />
                  {(Array.isArray(localAttachments) && localAttachments.length > 0) ? (
                    <ul style={{padding:0,margin:0,listStyle:'none'}}>
                      {localAttachments.map((att, idx) => (
                        <li key={att.id || `att-${idx}`} className="flex items-center gap-2 mb-1 text-sm" style={{marginBottom:10,padding:'7px 0'}}>
                          {att.type && att.type.startsWith('image') ? (
                            <FaFileAlt style={{color:'#3578e5',opacity:0.7}}/>
                          ) : att.type && att.type.startsWith('video') ? (
                            <FaFileAlt style={{color:'#e53e3e',opacity:0.7}}/>
                          ) : (
                            <FaFileAlt style={{opacity:0.6}}/>
                          )}
                          <span>{att.name}</span>
                          <span style={{color:'#888',fontSize:'0.93em'}}>{(att.size/1024).toFixed(1)} KB</span>
                          <button 
                            type="button" 
                            onClick={() => handleAttachmentDelete(idx)} 
                            style={{background:'none',border:'none',color:'#e53e3e',fontWeight:700,fontSize:'1.1em',cursor:'pointer',padding:'0 6px',lineHeight:1}}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="jira-empty">No attachments</span>
                  )}
                </div>
              </div>
            </div>

            <div className="jira-section">
              <div className="jira-section-title" style={{fontWeight:600, fontSize:'1.08em', marginBottom:6, display:'flex', alignItems:'center', cursor:'pointer'}} onClick={() => toggleSection('linked')}>
                <span style={{marginRight:6}}>{openSections.linked ? <FaChevronDown/> : <FaChevronRight/>}</span>
                Linked work items
              </div>
              <div style={{maxHeight: openSections.linked ? 800 : 0, overflow:'hidden', transition:'max-height 0.35s cubic-bezier(.4,2,.6,1)'}}>
                {/* Search bar for linking tasks */}
                <input
                  type="text"
                  value={linkedSearch}
                  onChange={e => setLinkedSearch(e.target.value)}
                  placeholder="Search tasks to link..."
                  style={{width:'100%',marginBottom:10,padding:'7px 10px',borderRadius:6,border:'1px solid #e5e7eb',fontSize:'1em'}}
                />
                {/* Search results */}
                {linkedSearch && linkedSearchResults.length > 0 && (
                  <ul style={{listStyle:'none',padding:0,marginBottom:10}}>
                    {linkedSearchResults.map(t => (
                      <li key={t.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <span className="jira-id">{t.id}</span>
                        <span style={{flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.title}</span>
                        <button type="button" onClick={() => handleAddLinkedItem(t)} style={{background:'#3578e5',color:'#fff',border:'none',borderRadius:6,padding:'4px 12px',fontWeight:600,cursor:'pointer'}}>Add</button>
                      </li>
                    ))}
                  </ul>
                )}
                {/* Linked items list */}
                {linkedItemsState.length === 0 && <span className="jira-empty">No linked items</span>}
                {linkedItemsState.map((item, idx) => (
                  <div key={item?.id ?? `linked-${Math.random()}`} className="flex items-center gap-2 mb-1 text-sm">
                    <span className="jira-id">{item?.id ?? '-'}</span>
                    <span style={{flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item?.title ?? '-'}</span>
                    <span className="jira-status" style={{fontSize:'0.85rem'}}>{item?.status ?? '-'}</span>
                    <span style={{display:'flex',alignItems:'center',gap:4}}>
                      <img src={item?.assignee?.avatar ?? 'https://ui-avatars.com/api/?name=Unknown'} alt={item?.assignee?.name ?? 'Unknown'} style={{width:22,height:22,borderRadius:'50%'}}/>
                      <span style={{fontWeight:500, fontSize:'0.97em', color:'#555'}}>{item?.assignee?.name || 'Unassigned'}</span>
                    </span>
                    <button type="button" onClick={() => {
                      setLinkedItemsState(prev => prev.filter((_, i) => i !== idx));
                      setHasChanges(true);
                    }}
                      style={{background:'none',border:'none',color:'#e53e3e',fontWeight:700,fontSize:'1.1em',cursor:'pointer',padding:'0 6px',lineHeight:1,marginLeft:4}}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Documentation Links section above checklist */}
            <div className="jira-section" style={{marginBottom: '18px'}}>
              <div className="jira-section-title" style={{fontWeight:600, fontSize:'1.08em', marginBottom:6, display:'flex', alignItems:'center', cursor:'pointer'}} onClick={() => toggleSection('documentation')}>
                <span style={{marginRight:6}}>{openSections.documentation ? <FaChevronDown/> : <FaChevronRight/>}</span>
                Documentation Links
              </div>
              <div style={{marginBottom:8, maxHeight: openSections.documentation ? 500 : 0, overflow:'hidden', transition:'max-height 0.35s cubic-bezier(.4,2,.6,1)'}}>
                {(Array.isArray(task?.documentationLinks) && task.documentationLinks.length > 0) && (
                  <ul style={{paddingLeft:18, margin:0}}>
                    {task.documentationLinks.map((doc, idx) => (
                      <li key={doc.url || idx} style={{marginBottom:3}}>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{color:'#3578e5',textDecoration:'underline',fontWeight:500}}>{doc.title || doc.url}</a>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={handleCreateDoc} style={{background:'#3578e5',color:'#fff',border:'none',borderRadius:6,padding:'7px 16px',fontWeight:600,fontSize:'0.98em',cursor:'pointer',marginBottom:16}}>
                  + Create Doc
                </button>
              </div>
            </div>

            <div className="jira-section">
              <div className="jira-section-title" style={{fontWeight:600, fontSize:'1.08em', marginBottom:6, display:'flex', alignItems:'center', cursor:'pointer'}} onClick={() => toggleSection('checklist')}>
                <span style={{marginRight:6}}>{openSections.checklist ? <FaChevronDown/> : <FaChevronRight/>}</span>
                Checklist
              </div>
              <div style={{maxHeight: openSections.checklist ? 500 : 0, overflow:'hidden', transition:'max-height 0.35s cubic-bezier(.4,2,.6,1)'}}>
                {/* Progress Bar */}
                {subtasksSafe.length > 0 && (
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <div style={{flex:1,background:'#e5e7eb',borderRadius:8,height:8,overflow:'hidden',marginRight:8}}>
                      <div style={{height:8,background:'#3578e5',width:`${(subtasksSafe.filter(st=>st?.status?.toLowerCase()==='done').length/subtasksSafe.length)*100}%`,transition:'width 0.3s'}}></div>
                    </div>
                    <span style={{fontSize:'0.95em',color:'#888'}}>{Math.round((subtasksSafe.filter(st=>st?.status?.toLowerCase()==='done').length/subtasksSafe.length)*100)}% Done</span>
                  </div>
                )}
                {/* Checklist content as before */}
                <form onSubmit={handleChecklistAdd} style={{display:'flex',gap:8,marginBottom:8}}>
                  <input
                    type="text"
                    value={newChecklistItem}
                    onChange={e => setNewChecklistItem(e.target.value)}
                    placeholder="Add checklist item..."
                    style={{flex:1,padding:'7px 10px',borderRadius:6,border:'1px solid #e5e7eb',fontSize:'0.97em'}}
                  />
                  <button type="submit" style={{background:'#3578e5',color:'#fff',border:'none',borderRadius:6,padding:'7px 16px',fontWeight:600,fontSize:'0.98em',cursor:'pointer'}}>Add</button>
                </form>
                <ul style={{paddingLeft:0,margin:0}}>
                  {checklistSafe.map((item, idx) => (
                    <li key={item.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <input type="checkbox" checked={item.done} onChange={() => handleChecklistToggle(idx)} />
                      <span style={{textDecoration:item.done?'line-through':'none',color:item.done?'#888':'#222'}}>{item.text}</span>
                      <button type="button" onClick={() => handleChecklistDelete(idx)} style={{background:'none',border:'none',color:'#e53e3e',fontWeight:700,fontSize:'1.1em',cursor:'pointer',marginLeft:4}}>×</button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Subtasks section */}
            <div className="jira-section">
              <div className="jira-section-title" style={{fontWeight:600, fontSize:'1.08em', marginBottom:6, display:'flex', alignItems:'center', cursor:'pointer'}} onClick={() => toggleSection('subtasks')}>
                <span style={{marginRight:6}}>{openSections.subtasks ? <FaChevronDown/> : <FaChevronRight/>}</span>
                Subtasks
              </div>
              <div style={{maxHeight: openSections.subtasks ? 800 : 0, overflow:'hidden', transition:'max-height 0.35s cubic-bezier(.4,2,.6,1)'}}>
                {/* Progress Bar */}
                {subtasksSafe.length > 0 && (
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                    <div style={{flex:1,background:'#e5e7eb',borderRadius:8,height:8,overflow:'hidden',marginRight:8}}>
                      <div style={{height:8,background:'#3578e5',width:`${(subtasksSafe.filter(st=>st?.status?.toLowerCase()==='done').length/subtasksSafe.length)*100}%`,transition:'width 0.3s'}}></div>
                    </div>
                    <span style={{fontSize:'0.95em',color:'#888'}}>{Math.round((subtasksSafe.filter(st=>st?.status?.toLowerCase()==='done').length/subtasksSafe.length)*100)}% Done</span>
                  </div>
                )}
                
                {/* Add subtask form */}
                <form onSubmit={handleSubtaskAdd} style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap',alignItems:'center'}}>
                  <input 
                    value={newSubtaskTitle} 
                    onChange={e => setNewSubtaskTitle(e.target.value)} 
                    placeholder="Add subtask title..." 
                    style={{flex:2,minWidth:120,padding:'7px 10px',borderRadius:6,border:'1px solid #e5e7eb',fontSize:'1em'}} 
                  />
                  <select 
                    value={newSubtaskPriority} 
                    onChange={e => setNewSubtaskPriority(e.target.value)} 
                    style={{flex:1,minWidth:90,padding:'7px 8px',borderRadius:6,border:'1px solid #e5e7eb',fontSize:'1em'}}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  <select 
                    value={newSubtaskAssignee} 
                    onChange={e => setNewSubtaskAssignee(e.target.value)} 
                    style={{flex:1,minWidth:110,padding:'7px 8px',borderRadius:6,border:'1px solid #e5e7eb',fontSize:'1em'}}
                  >
                    {assigneeOptions.map(opt => <option key={opt.name} value={opt.name}>{opt.name}</option>)}
                  </select>
                  <button 
                    type="submit" 
                    style={{padding:'0 14px',borderRadius:6,border:'none',background:'#3578e5',color:'#fff',fontWeight:700,fontSize:'1.2em',cursor:'pointer'}}
                  >
                    +
                  </button>
                </form>

                {/* Subtasks table */}
                {(subtasksSafe.length > 0) ? (
                  <div style={{overflowX:'auto'}}>
                    <table className="jira-subtasks-table" style={{width:'100%',borderCollapse:'separate',borderSpacing:0}}>
                      <thead>
                        <tr style={{background:'#f7f8fa',fontWeight:600,color:'#555',fontSize:'0.98em'}}>
                          <th style={{padding:'8px 8px',textAlign:'left'}}>Title</th>
                          <th style={{padding:'8px 8px',textAlign:'left'}}>Priority</th>
                          <th style={{padding:'8px 8px',textAlign:'left'}}>Assignee</th>
                          <th style={{padding:'8px 8px',textAlign:'left'}}>Status</th>
                          <th style={{padding:'8px 8px',textAlign:'center'}}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subtasksSafe.map((st, idx) => (
                          <tr key={st?.id ?? `subtask-${idx}`} style={{borderBottom:'1px solid #ececec', fontSize:'0.97em', height: '38px'}}>
                            <td style={{padding:'4px 6px',display:'flex',alignItems:'center',gap:7,verticalAlign:'middle'}}>
                              <FaFileAlt style={{color:'#ff9900',fontSize:'1em'}}/>
                              <span style={{fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth: '180px', display: 'inline-block'}}>{st?.title?.length > 32 ? st.title.slice(0,32)+'...' : st?.title ?? '-'}</span>
                            </td>
                            <td style={{padding:'4px 6px',verticalAlign:'middle'}}>
                              <span className={`jira-priority-badge priority-${st?.priority?.toLowerCase() ?? 'unknown'}`} style={{fontSize:'0.93em',padding:'2px 10px'}}>{st?.priority ?? '-'}</span>
                            </td>
                            <td style={{padding:'4px 6px',verticalAlign:'middle'}}>
                              <select 
                                value={st?.assignee?.name ?? 'Unassigned'} 
                                onChange={e => handleSubtaskAssigneeChange(idx, e.target.value)} 
                                style={{padding:'2px 8px',borderRadius:6,border:'1px solid #e5e7eb',fontSize:'0.97em',width:'100%'}}
                              >
                                {assigneeOptions.map(opt => <option key={opt.name} value={opt.name}>{opt.name}</option>)}
                              </select>
                            </td>
                            <td style={{padding:'4px 6px',verticalAlign:'middle'}}>
                              <select 
                                value={st?.status ?? 'To Do'} 
                                onChange={e => handleSubtaskStatusChange(idx, e.target.value)} 
                                style={{padding:'2px 8px',borderRadius:6,border:'1px solid #e5e7eb',fontSize:'0.97em',width:'100%'}}
                              >
                                {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              </select>
                            </td>
                            <td style={{padding:'4px 6px',textAlign:'center',verticalAlign:'middle'}}>
                              <button 
                                type="button" 
                                onClick={() => handleSubtaskDelete(idx)} 
                                style={{background:'none',border:'none',color:'#e53e3e',fontWeight:700,fontSize:'1.1em',cursor:'pointer',padding:'0 6px',lineHeight:1}}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <span className="jira-empty">No subtasks</span>
                )}
              </div>
            </div>

            <div className="jira-section">
              <div className="jira-section-title flex items-center gap-2">
                <FaUserCircle style={{opacity:0.7}}/> Activity
              </div>
              <div className="jira-activity-tabs">
                <button 
                  className={activeTab === 'comments' ? 'active' : ''}
                  onClick={() => setActiveTab('comments')}
                >
                  Comments
                </button>
                <button 
                  className={activeTab === 'history' ? 'active' : ''}
                  onClick={() => setActiveTab('history')}
                >
                  History
                </button>
                <button 
                  className={activeTab === 'checklist' ? 'active' : ''}
                  onClick={() => setActiveTab('checklist')}
                >
                  Checklist history
                </button>
                <button 
                  className={activeTab === 'refnotes' ? 'active' : ''}
                  onClick={() => setActiveTab('refnotes')}
                >
                  Ref Notes
                </button>
              </div>
              
              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <div className="jira-activity-list">
                  {commentsSafe.length === 0 && <div className="jira-empty">No comments</div>}
                  {commentsSafe.map(c => (
                    <div key={c?.id ?? `comment-${Math.random()}`} className="jira-comment flex items-start gap-2">
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(c?.author ?? 'Unknown')}`}
                        alt={c?.author ?? 'Unknown'}
                        style={{width:28, height:28, borderRadius:'50%', marginTop:2}}
                      />
                      <div>
                        <span className="jira-comment-author">{c?.author ?? '-'}</span>
                        <span className="jira-comment-date">{c?.date ?? '-'}</span>
                        <div className="jira-comment-text">{c?.text ?? '-'}</div>
                        <div className="flex gap-2 mt-1">
                          <button className="jira-release" style={{padding:'2px 8px',fontSize:'0.9em'}}>🎉</button>
                          <button className="jira-release" style={{padding:'2px 8px',fontSize:'0.9em'}}>❓</button>
                          <button className="jira-release" style={{padding:'2px 8px',fontSize:'0.9em'}}>🚩</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="jira-activity-list">
                  <div className="jira-empty">No history available</div>
                </div>
              )}

              {/* Checklist History Tab */}
              {activeTab === 'checklist' && (
                <div className="jira-activity-list">
                  <div className="jira-empty">No checklist history available</div>
                </div>
              )}

              {/* Ref Notes Tab */}
              {activeTab === 'refnotes' && (
                <div className="jira-activity-list">
                  <div style={{padding: '16px 0'}}>
                    <textarea
                      value={refNotes}
                      onChange={(e) => {
                        setRefNotes(e.target.value);
                        markAsChanged();
                      }}
                      placeholder="Add refinement notes here... (Acceptance criteria, assumptions, risks, etc.)"
                      style={{
                        width: '100%',
                        minHeight: '200px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        lineHeight: '1.5'
                      }}
                    />
                    <div style={{marginTop: '12px', fontSize: '12px', color: '#666'}}>
                      💡 Use this space to document refinement discussions, acceptance criteria, assumptions, and risks.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subtask delete confirmation dialog */}
        {subtaskToDelete !== null && (
          <div 
            style={{
              position:'absolute',
              left:'50%',
              top:'50%',
              transform:'translate(-50%,-50%)',
              zIndex:200,
              background:'rgba(30,40,60,0.18)',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              width:'100%',
              height:'100%'
            }}
            onClick={cancelSubtaskDelete}
          >
            <div 
              style={{
                background:'#fff',
                borderRadius:12,
                padding:'32px 32px 24px 32px',
                boxShadow:'0 8px 32px rgba(0,0,0,0.13)',
                minWidth:320,
                maxWidth: '90vw',
                textAlign:'center',
                margin:'auto'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{fontWeight:700,fontSize:'1.13em',marginBottom:18}}>Are you sure you want to delete this subtask?</div>
              <div style={{display:'flex',gap:16,justifyContent:'center'}}>
                <button 
                  onClick={cancelSubtaskDelete} 
                  style={{padding:'8px 22px',borderRadius:7,border:'1px solid #e5e7eb',background:'#f7f8fa',color:'#222',fontWeight:600,cursor:'pointer'}}
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmSubtaskDelete} 
                  style={{padding:'8px 22px',borderRadius:7,border:'none',background:'#e53e3e',color:'#fff',fontWeight:700,cursor:'pointer'}}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}