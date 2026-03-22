import React, { useState } from "react";
import { FaPlus, FaCheck, FaUsers, FaTasks, FaLayerGroup, FaTimes } from "react-icons/fa";
import { useApp } from "../context/AppContext";

const PROJECT_COLORS = [
  "#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#4f46e5",
];

const PROJECT_DESCRIPTIONS = {
  "proj-1": "Core platform — sprint tracking, kanban board, backlog management and team collaboration.",
  "proj-2": "Native mobile app for iOS and Android with offline-first architecture.",
};

function CreateProjectModal({ onClose, onCreate }) {
  const [name, setName]   = useState("");
  const [key, setKey]     = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [desc, setDesc]   = useState("");
  const [error, setError] = useState("");

  const handleKeyChange = (val) => {
    setKey(val.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6));
  };

  const handleSubmit = () => {
    if (!name.trim()) { setError("Project name is required."); return; }
    if (!key.trim()) { setError("Project key is required."); return; }
    onCreate({ name: name.trim(), key: key.trim(), color, description: desc.trim() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1c2030] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a3044] w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#232838]">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">New Project</h2>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838]">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Project Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="e.g. Backend API"
              className="w-full px-3 py-2 border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#141720] text-slate-800 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Project Key *</label>
            <input
              type="text"
              value={key}
              onChange={(e) => { handleKeyChange(e.target.value); setError(""); }}
              placeholder="e.g. API"
              maxLength={6}
              className="w-full px-3 py-2 border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#141720] text-slate-800 dark:text-slate-200 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">2–6 uppercase letters, used as task ID prefix</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-all hover:scale-110"
                  style={{ backgroundColor: c, outline: color === c ? `3px solid ${c}` : "none", outlineOffset: 2 }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What is this project about?"
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#141720] text-slate-800 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          {/* Preview */}
          {(name || key) && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#141720]">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: color }}
              >
                {key || "??"}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{name || "Untitled"}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{key || "???"}-*</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-[#232838]">
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Project
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage({ onNavigate }) {
  const { projects, currentProjectId, setCurrentProjectId, activeTasks, createProject } = useApp();
  const [showCreate, setShowCreate] = useState(false);

  const handleSelect = (projectId) => {
    setCurrentProjectId(projectId);
    onNavigate("board");
  };

  const handleCreate = (data) => {
    createProject(data);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Projects</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{projects.length} project{projects.length !== 1 ? "s" : ""} in your workspace</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FaPlus className="w-3 h-3" />New Project
        </button>
      </div>

      {/* Project grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((p) => {
          const isActive    = p.id === currentProjectId;
          const taskCount   = activeTasks.filter((t) => (t.projectId || "proj-1") === p.id).length;
          const doneCount   = activeTasks.filter((t) => (t.projectId || "proj-1") === p.id && t.status === "done").length;
          const pct         = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;
          const description = PROJECT_DESCRIPTIONS[p.id] || p.description || "No description available.";

          return (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className={`text-left p-5 rounded-xl border transition-all group ${
                isActive
                  ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/10 shadow-sm"
                  : "border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md"
              }`}
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.key}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{p.name}</span>
                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-medium">
                          <FaCheck className="w-2 h-2" />Current
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{p.key}-*</span>
                  </div>
                </div>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: p.color + "22" }}
                >
                  <FaLayerGroup className="w-3.5 h-3.5" style={{ color: p.color }} />
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">{description}</p>

              {/* Progress bar */}
              {taskCount > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Sprint progress</span>
                    <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{doneCount}/{taskCount} done · {pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-[#2a3044] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: p.color }}
                    />
                  </div>
                </div>
              )}

              {/* Footer stats */}
              <div className="flex items-center gap-4 pt-2 border-t border-slate-100 dark:border-[#2a3044]">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                  <FaTasks className="w-3 h-3" />
                  <span>{taskCount} task{taskCount !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                  <FaUsers className="w-3 h-3" />
                  <span>4 members</span>
                </div>
                <div className="ml-auto text-xs font-medium" style={{ color: isActive ? p.color : undefined }}>
                  {isActive ? "Viewing →" : "Switch →"}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
