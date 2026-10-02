import React, { useState } from "react";
import { FaTimes } from "react-icons/fa";

const SPACE_COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#db2777"];

export default function SpaceModal({ initialData = null, projects, defaultProjectId = "", onSave, onClose }) {
  const isEdit = Boolean(initialData?.id);
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [icon, setIcon] = useState(initialData?.icon || "📘");
  const [color, setColor] = useState(initialData?.color || "#2563eb");
  const [projectId, setProjectId] = useState(
    initialData ? (initialData.projectId || "") : (defaultProjectId || projects[0]?.id || "")
  );

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      ...(initialData || {}),
      name: name.trim(),
      key: initialData?.key || name.slice(0, 2).toUpperCase(),
      description: description.trim(),
      icon,
      color,
      projectId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="app-surface w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#2a3044]">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">{isEdit ? "Edit Space" : "Create Space"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Icon</label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-14 text-center text-xl bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                maxLength={2}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Space Name *</label>
              <input
                type="text"
                placeholder="e.g. Engineering Docs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Description</label>
            <textarea
              placeholder="What is this space for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">Color</label>
            <div className="flex gap-2">
              {SPACE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-2 ring-blue-400 scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">All projects (shared)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 justify-end px-5 py-4 border-t border-slate-200 dark:border-[#2a3044]">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isEdit ? "Save Changes" : "Create Space"}
          </button>
        </div>
      </div>
    </div>
  );
}
