import React, { useState } from "react";
import {
  FaTimes, FaCheck, FaCog, FaUsers, FaColumns, FaRocket,
  FaTag, FaBell, FaExclamationTriangle, FaPlus, FaTrash, FaEdit,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";

const PROJECT_COLORS = [
  "#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4f46e5",
];

const ROLES = ["admin", "member", "viewer"];

const TABS = [
  { id: "general",       label: "General",       icon: FaCog },
  { id: "members",       label: "Members",        icon: FaUsers },
  { id: "workflow",      label: "Workflow",       icon: FaColumns },
  { id: "sprint",        label: "Sprint",         icon: FaRocket },
  { id: "labels",        label: "Labels",         icon: FaTag },
  { id: "notifications", label: "Notifications",  icon: FaBell },
  { id: "danger",        label: "Danger Zone",    icon: FaExclamationTriangle },
];

const NOTIF_ITEMS = [
  { key: "onAssignment",   label: "Task assigned to you",  desc: "When a task is assigned to you" },
  { key: "onStatusChange", label: "Status changes",        desc: "When a task status is updated" },
  { key: "onComment",      label: "Comments",              desc: "When someone comments on a task" },
  { key: "onMention",      label: "Mentions",              desc: "When you're mentioned in a comment" },
  { key: "onSprintStart",  label: "Sprint started",        desc: "When a new sprint begins" },
  { key: "onSprintEnd",    label: "Sprint completed",      desc: "When a sprint is completed" },
];

function Toggle({ on, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex-shrink-0 rounded-full transition-colors ${on ? "bg-blue-600" : "bg-slate-200 dark:bg-[#2a3044]"}`}
      style={{ width: 40, height: 22 }}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}

export default function ProjectSettingsModal({ project, onClose }) {
  const { updateProject, deleteProject, users, projectColumns, updateProjectColumns } = useApp();
  const { addToast } = useToast();
  const [tab, setTab] = useState("general");

  // ── General ────────────────────────────────────────────────────────────────
  const [genName,  setGenName]  = useState(project.name || "");
  const [genDesc,  setGenDesc]  = useState(project.description || "");
  const [genColor, setGenColor] = useState(project.color || PROJECT_COLORS[0]);

  const saveGeneral = () => {
    if (!genName.trim()) return;
    updateProject({ ...project, name: genName.trim(), description: genDesc, color: genColor });
    addToast("General settings saved", "success");
  };

  // ── Members ────────────────────────────────────────────────────────────────
  const [members, setMembers] = useState(
    () => project.members || users.slice(0, 2).map((u) => ({ userId: u.id, role: "member" }))
  );

  const addMember    = (uid)  => setMembers((p) => [...p, { userId: uid, role: "member" }]);
  const removeMember = (uid)  => setMembers((p) => p.filter((m) => m.userId !== uid));
  const changeRole   = (uid, role) => setMembers((p) => p.map((m) => m.userId === uid ? { ...m, role } : m));
  const availableUsers = users.filter((u) => !members.some((m) => m.userId === u.id));

  const saveMembers = () => {
    updateProject({ ...project, members });
    addToast("Members saved", "success");
  };

  // ── Workflow ───────────────────────────────────────────────────────────────
  const [cols, setCols]       = useState(() =>
    (projectColumns[project.id] || []).map((c) => ({ ...c, color: c.color || "#64748b" }))
  );
  const [newColName, setNewColName] = useState("");
  const [editColId,  setEditColId]  = useState(null);

  const addCol    = () => { if (!newColName.trim()) return; setCols((p) => [...p, { id: `col-${Date.now()}`, title: newColName.trim(), color: "#64748b" }]); setNewColName(""); };
  const removeCol = (id) => setCols((p) => p.filter((c) => c.id !== id));
  const updateCol = (id, patch) => setCols((p) => p.map((c) => c.id === id ? { ...c, ...patch } : c));

  const saveWorkflow = () => {
    updateProjectColumns(project.id, cols);
    addToast("Workflow saved", "success");
  };

  // ── Sprint ─────────────────────────────────────────────────────────────────
  const [sprintDuration, setSprintDuration] = useState(project.sprintDefaults?.duration || 14);
  const [sprintVelocity, setSprintVelocity] = useState(project.sprintDefaults?.velocityTarget || 0);
  const [sprintNaming,   setSprintNaming]   = useState(project.sprintDefaults?.namingFormat || "Sprint {n}");

  const saveSprint = () => {
    updateProject({ ...project, sprintDefaults: { duration: sprintDuration, velocityTarget: sprintVelocity, namingFormat: sprintNaming } });
    addToast("Sprint defaults saved", "success");
  };

  // ── Labels ─────────────────────────────────────────────────────────────────
  const [projectLabels, setProjectLabels] = useState(project.projectLabels || []);
  const [newLabelName,  setNewLabelName]  = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6");

  const addLabel    = () => { if (!newLabelName.trim()) return; setProjectLabels((p) => [...p, { id: `lbl-${Date.now()}`, name: newLabelName.trim(), color: newLabelColor }]); setNewLabelName(""); };
  const removeLabel = (id) => setProjectLabels((p) => p.filter((l) => l.id !== id));

  const saveLabels = () => {
    updateProject({ ...project, projectLabels });
    addToast("Labels saved", "success");
  };

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState({
    onAssignment: true, onStatusChange: true, onComment: true,
    onMention: true, onSprintStart: false, onSprintEnd: false,
    ...(project.notifications || {}),
  });

  const saveNotifs = () => {
    updateProject({ ...project, notifications: notifs });
    addToast("Notification settings saved", "success");
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inputCls = "w-full px-3 py-2 border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#141720] text-slate-800 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";
  const saveBtnCls = "flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors";
  const cardCls = "flex items-center justify-between px-4 py-3 rounded-lg border border-slate-100 dark:border-[#2a3044] bg-white dark:bg-[#141720]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-[#2a3044] rounded-2xl shadow-2xl w-full max-w-3xl mx-4 flex flex-col"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#252b3b] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: genColor }}
            >
              {project.key}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">{project.name}</h2>
              <p className="text-xs text-slate-400">Project Settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838]"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Sidebar */}
          <div className="w-44 flex-shrink-0 border-r border-slate-100 dark:border-[#252b3b] py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                  id === "danger"
                    ? tab === id
                      ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                      : "text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
                    : tab === id
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] hover:text-slate-700 dark:hover:text-slate-200"
                } ${id === "danger" ? "mt-auto" : ""}`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">

            {/* ── General ──────────────────────────────────────────────────── */}
            {tab === "general" && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">General</h3>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Project Name</label>
                  <input value={genName} onChange={(e) => setGenName(e.target.value)} className={inputCls} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Project Key</label>
                  <input value={project.key} disabled className="w-full px-3 py-2 border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#141720] text-slate-400 rounded-lg text-sm font-mono cursor-not-allowed" />
                  <p className="text-[11px] text-slate-400 mt-1">Key cannot be changed after creation.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Description</label>
                  <textarea value={genDesc} onChange={(e) => setGenDesc(e.target.value)} rows={3} placeholder="What is this project about?" className={`${inputCls} resize-none`} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Color</label>
                  <div className="flex gap-2 flex-wrap items-center">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setGenColor(c)}
                        className="w-7 h-7 rounded-full transition-all hover:scale-110"
                        style={{ backgroundColor: c, outline: genColor === c ? `3px solid ${c}` : "none", outlineOffset: 2 }}
                      />
                    ))}
                    <input
                      type="color"
                      value={genColor}
                      onChange={(e) => setGenColor(e.target.value)}
                      className="w-7 h-7 rounded-full cursor-pointer border border-slate-200 dark:border-[#2a3044]"
                      title="Custom color"
                    />
                  </div>
                </div>

                <button onClick={saveGeneral} className={saveBtnCls}>
                  <FaCheck className="w-3 h-3" /> Save Changes
                </button>
              </div>
            )}

            {/* ── Members ──────────────────────────────────────────────────── */}
            {tab === "members" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Members</h3>
                  <span className="text-xs text-slate-400">{members.length} member{members.length !== 1 ? "s" : ""}</span>
                </div>

                <div className="space-y-2">
                  {members.map((m) => {
                    const u = users.find((u) => u.id === m.userId);
                    if (!u) return null;
                    return (
                      <div key={m.userId} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 dark:border-[#2a3044] bg-white dark:bg-[#141720]">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: u.color }}>
                          {u.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{u.name}</div>
                          <div className="text-xs text-slate-400 truncate">{u.email}</div>
                        </div>
                        <select
                          value={m.role}
                          onChange={(e) => changeRole(m.userId, e.target.value)}
                          className="text-xs border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-600 dark:text-slate-300 rounded-lg px-2 py-1 focus:outline-none"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                        <button onClick={() => removeMember(m.userId)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors p-1">
                          <FaTimes className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {availableUsers.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Add member</p>
                    <div className="space-y-1.5">
                      {availableUsers.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => addMember(u.id)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-dashed border-slate-200 dark:border-[#2a3044] hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: u.color }}>
                            {u.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{u.name}</div>
                            <div className="text-[11px] text-slate-400">{u.email}</div>
                          </div>
                          <FaPlus className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={saveMembers} className={saveBtnCls}>
                  <FaCheck className="w-3 h-3" /> Save Members
                </button>
              </div>
            )}

            {/* ── Workflow ─────────────────────────────────────────────────── */}
            {tab === "workflow" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Workflow Statuses</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Customize the statuses for this project's board.</p>
                </div>

                <div className="space-y-2">
                  {cols.map((col) => (
                    <div key={col.id} className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-100 dark:border-[#2a3044] bg-white dark:bg-[#141720]">
                      <input
                        type="color"
                        value={col.color}
                        onChange={(e) => updateCol(col.id, { color: e.target.value })}
                        className="w-6 h-6 rounded-full cursor-pointer border-0 flex-shrink-0"
                      />
                      {editColId === col.id ? (
                        <input
                          autoFocus
                          value={col.title}
                          onChange={(e) => updateCol(col.id, { title: e.target.value })}
                          onBlur={() => setEditColId(null)}
                          onKeyDown={(e) => e.key === "Enter" && setEditColId(null)}
                          className="flex-1 text-sm bg-transparent border-b border-blue-400 focus:outline-none text-slate-700 dark:text-slate-200"
                        />
                      ) : (
                        <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{col.title}</span>
                      )}
                      <button onClick={() => setEditColId(col.id)} className="p-1 text-slate-300 dark:text-slate-600 hover:text-blue-500 transition-colors">
                        <FaEdit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeCol(col.id)}
                        disabled={cols.length <= 1}
                        className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <FaTrash className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCol()}
                    placeholder="New status name..."
                    className={`${inputCls} flex-1`}
                  />
                  <button onClick={addCol} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-[#232838] text-slate-600 dark:text-slate-300 rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-colors flex-shrink-0">
                    <FaPlus className="w-3 h-3" /> Add
                  </button>
                </div>

                <button onClick={saveWorkflow} className={saveBtnCls}>
                  <FaCheck className="w-3 h-3" /> Save Workflow
                </button>
              </div>
            )}

            {/* ── Sprint ───────────────────────────────────────────────────── */}
            {tab === "sprint" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sprint Defaults</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Applied when creating new sprints for this project.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Sprint Duration</label>
                  <div className="flex gap-2 flex-wrap">
                    {[7, 14, 21, 28].map((d) => (
                      <button
                        key={d}
                        onClick={() => setSprintDuration(d)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          sprintDuration === d
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-blue-400"
                        }`}
                      >
                        {d === 7 ? "1 week" : d === 14 ? "2 weeks" : d === 21 ? "3 weeks" : "4 weeks"}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Velocity Target (story points)</label>
                  <input
                    type="number"
                    min={0}
                    value={sprintVelocity}
                    onChange={(e) => setSprintVelocity(Number(e.target.value))}
                    className="w-32 px-3 py-2 border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#141720] text-slate-800 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Set 0 to disable velocity tracking.</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Sprint Naming Format</label>
                  <input value={sprintNaming} onChange={(e) => setSprintNaming(e.target.value)} className={inputCls} />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Use <code className="bg-slate-100 dark:bg-[#232838] px-1 rounded">{"{n}"}</code> for sprint number, e.g. "Sprint {"{n}"}" → Sprint 1
                  </p>
                </div>

                <button onClick={saveSprint} className={saveBtnCls}>
                  <FaCheck className="w-3 h-3" /> Save Sprint Defaults
                </button>
              </div>
            )}

            {/* ── Labels ───────────────────────────────────────────────────── */}
            {tab === "labels" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Labels</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Project-specific labels for categorizing tasks.</p>
                </div>

                <div className="space-y-2">
                  {projectLabels.length === 0 && (
                    <p className="text-xs text-slate-400 py-6 text-center border border-dashed border-slate-200 dark:border-[#2a3044] rounded-lg">
                      No labels yet. Add one below.
                    </p>
                  )}
                  {projectLabels.map((lbl) => (
                    <div key={lbl.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 dark:border-[#2a3044] bg-white dark:bg-[#141720]">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: lbl.color }} />
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">{lbl.name}</span>
                      <button onClick={() => removeLabel(lbl.id)} className="p-1 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors">
                        <FaTimes className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newLabelColor}
                    onChange={(e) => setNewLabelColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 dark:border-[#2a3044] flex-shrink-0"
                  />
                  <input
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addLabel()}
                    placeholder="Label name..."
                    className={`${inputCls} flex-1`}
                  />
                  <button onClick={addLabel} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-[#232838] text-slate-600 dark:text-slate-300 rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-colors flex-shrink-0">
                    <FaPlus className="w-3 h-3" /> Add
                  </button>
                </div>

                <button onClick={saveLabels} className={saveBtnCls}>
                  <FaCheck className="w-3 h-3" /> Save Labels
                </button>
              </div>
            )}

            {/* ── Notifications ─────────────────────────────────────────────── */}
            {tab === "notifications" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notifications</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Choose which events trigger notifications for this project.</p>
                </div>

                <div className="space-y-2">
                  {NOTIF_ITEMS.map(({ key, label, desc }) => (
                    <div key={key} className={cardCls}>
                      <div>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
                      </div>
                      <Toggle on={notifs[key]} onToggle={() => setNotifs((p) => ({ ...p, [key]: !p[key] }))} />
                    </div>
                  ))}
                </div>

                <button onClick={saveNotifs} className={saveBtnCls}>
                  <FaCheck className="w-3 h-3" /> Save Notifications
                </button>
              </div>
            )}

            {/* ── Danger Zone ───────────────────────────────────────────────── */}
            {tab === "danger" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold text-red-500">Danger Zone</h3>
                  <p className="text-xs text-slate-400 mt-0.5">These actions may be irreversible. Proceed with caution.</p>
                </div>

                <div className="border border-amber-200 dark:border-amber-700/40 rounded-xl p-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {project.status === "archived" ? "Restore Project" : "Archive Project"}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {project.status === "archived"
                        ? "Restore this project to active status."
                        : "Hide this project from active list. Data is preserved and can be restored."}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      updateProject({ ...project, status: project.status === "archived" ? "active" : "archived" });
                      addToast(project.status === "archived" ? "Project restored" : "Project archived", "info");
                      onClose();
                    }}
                    className="flex-shrink-0 px-4 py-2 border border-amber-400 dark:border-amber-600 text-amber-600 dark:text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    {project.status === "archived" ? "Restore" : "Archive"}
                  </button>
                </div>

                <div className="border border-red-200 dark:border-red-700/40 rounded-xl p-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Delete Project</div>
                    <div className="text-xs text-slate-400 mt-0.5">Permanently delete this project and all its data. This cannot be undone.</div>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                        deleteProject(project.id);
                        addToast("Project deleted", "error");
                        onClose();
                      }
                    }}
                    className="flex-shrink-0 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete Project
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
