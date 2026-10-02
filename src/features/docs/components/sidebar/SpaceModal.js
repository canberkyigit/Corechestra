import React, { useState } from "react";
import { Modal } from "../../../../shared/ui/Modal";

const SPACE_COLORS = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#db2777"];

export default function SpaceModal({ initialData = null, projects, defaultProjectId = "", onSave, onClose }) {
  const isEdit = Boolean(initialData?.id);
  const [initialValues] = useState(() => ({
    name: initialData?.name || "",
    description: initialData?.description || "",
    icon: initialData?.icon || "📘",
    color: initialData?.color || "#2563eb",
    projectId: initialData ? (initialData.projectId || "") : (defaultProjectId || projects[0]?.id || ""),
  }));
  const [name, setName] = useState(initialValues.name);
  const [description, setDescription] = useState(initialValues.description);
  const [icon, setIcon] = useState(initialValues.icon);
  const [color, setColor] = useState(initialValues.color);
  const [projectId, setProjectId] = useState(initialValues.projectId);

  const dirty = name !== initialValues.name
    || description !== initialValues.description
    || icon !== initialValues.icon
    || color !== initialValues.color
    || projectId !== initialValues.projectId;

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
    <Modal
      open
      onClose={onClose}
      title={isEdit ? "Edit Space" : "Create Space"}
      size="md"
      confirmClose={dirty}
      closeOnBackdrop={!dirty}
      testId="docs-space-modal"
      footer={(
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Cancel</button>
          <button
            type="submit"
            form="docs-space-form"
            disabled={!name.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isEdit ? "Save Changes" : "Create Space"}
          </button>
        </>
      )}
    >
      <form
        id="docs-space-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSave();
        }}
      >
        <div className="flex items-center gap-3">
          <div>
            <label htmlFor="docs-space-icon" className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Icon</label>
            <input
              id="docs-space-icon"
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-14 text-center text-xl bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg py-2 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              maxLength={2}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="docs-space-name" className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Space Name *</label>
            <input
              id="docs-space-name"
              type="text"
              placeholder="e.g. Engineering Docs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              data-autofocus
            />
          </div>
        </div>

        <div>
          <label htmlFor="docs-space-description" className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Description</label>
          <textarea
            id="docs-space-description"
            placeholder="What is this space for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">Color</p>
          <div className="flex gap-2">
            {SPACE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Space color ${c}`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-2 ring-blue-400 dark:ring-offset-[#1a1f2e] scale-110" : "hover:scale-105"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="docs-space-project" className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Project</label>
          <select
            id="docs-space-project"
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
      </form>
    </Modal>
  );
}
