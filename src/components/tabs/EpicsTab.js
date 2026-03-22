import React, { useState } from "react";
import { FaRocket, FaPlus, FaEdit, FaTrash, FaCheck } from "react-icons/fa";
import { useApp } from "../../context/AppContext";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#d97706",
];

function EpicForm({ initial = {}, onSave, onCancel }) {
  const [title, setTitle] = useState(initial.title || "");
  const [description, setDescription] = useState(initial.description || "");
  const [color, setColor] = useState(initial.color || PRESET_COLORS[5]);

  return (
    <div className="bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] rounded-xl p-4 space-y-3">
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">Epic Name</label>
        <input
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Epic name..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1 block">Description</label>
        <textarea
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          rows={2}
          placeholder="Optional description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Color</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? "border-slate-600 scale-110" : "border-transparent"}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
          <input
            type="color"
            className="w-7 h-7 rounded-full cursor-pointer border border-slate-200"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            title="Custom color"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          onClick={() => { if (title.trim()) onSave({ title: title.trim(), description, color }); }}
        >
          <FaCheck className="w-3 h-3" /> Save
        </button>
        <button
          className="px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function EpicsTab() {
  const { epics, createEpic, updateEpic, deleteEpic, activeTasks, backlogSections, currentProjectId } = useApp();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const allTasks = [
    ...activeTasks,
    ...backlogSections.flatMap((s) => s.tasks),
  ].filter((t) => (t.projectId || "proj-1") === currentProjectId);

  const projectEpics = epics.filter((e) => (e.projectId || "proj-1") === currentProjectId);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Epics</h2>
          <p className="text-sm text-slate-400">Group related issues into epics to track large bodies of work.</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          onClick={() => setCreating(true)}
        >
          <FaPlus className="w-3 h-3" /> Create Epic
        </button>
      </div>

      {creating && (
        <div className="mb-4">
          <EpicForm
            onSave={(data) => { createEpic(data); setCreating(false); }}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      {projectEpics.length === 0 && !creating ? (
        <div className="text-center py-16 text-slate-400">
          <FaRocket className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No epics yet</p>
          <p className="text-sm">Create an epic to group related tasks</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projectEpics.map((epic) => {
            const epicTasks = allTasks.filter((t) => t.epicId === epic.id);
            const done = epicTasks.filter((t) => t.status === "done").length;
            const pct = epicTasks.length > 0 ? Math.round((done / epicTasks.length) * 100) : 0;

            return (
              <div key={epic.id}>
                {editingId === epic.id ? (
                  <EpicForm
                    initial={epic}
                    onSave={(data) => { updateEpic({ ...epic, ...data }); setEditingId(null); }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl p-4 hover:shadow-sm transition-shadow group">
                    <div className="flex items-start gap-3">
                      {/* Color bar */}
                      <div className="mt-1 w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: epic.color }} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-800">{epic.title}</span>
                          <span
                            className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{ backgroundColor: epic.color + "22", color: epic.color }}
                          >
                            <FaRocket className="inline w-2.5 h-2.5 mr-1" />Epic
                          </span>
                        </div>
                        {epic.description && (
                          <p className="text-sm text-slate-500 mb-3">{epic.description}</p>
                        )}
                        {/* Progress */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-xs">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, backgroundColor: epic.color }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">{done}/{epicTasks.length} tasks · {pct}%</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          onClick={() => setEditingId(epic.id)}
                          title="Edit"
                        >
                          <FaEdit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          onClick={() => setConfirmDelete(epic.id)}
                          title="Delete"
                        >
                          <FaTrash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Delete confirmation */}
                {confirmDelete === epic.id && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mt-1 flex items-center justify-between">
                    <span className="text-sm text-red-700">Delete epic "{epic.title}"? Tasks will keep their data but lose the epic reference.</span>
                    <div className="flex gap-2 ml-3 flex-shrink-0">
                      <button
                        className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700"
                        onClick={() => { deleteEpic(epic.id); setConfirmDelete(null); }}
                      >
                        Delete
                      </button>
                      <button
                        className="px-3 py-1 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100"
                        onClick={() => setConfirmDelete(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
