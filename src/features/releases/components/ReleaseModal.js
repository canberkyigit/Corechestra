import React, { useMemo, useState } from "react";
import { FaCheck, FaRocket, FaSearch, FaTimes } from "react-icons/fa";
import { taskKey } from "../../../shared/utils/helpers";
import { EMPTY_RELEASE_FORM } from "../constants/releaseMeta";
import { matchesTaskQuery } from "../utils/releaseUtils";
import { TaskStatusChip } from "./ReleaseBadges";

export default function ReleaseModal({ initial, onSave, onClose, allTasks = [], releaseTemplates = [] }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_RELEASE_FORM,
    ...(initial || {}),
    taskIds: initial?.taskIds || [],
    templateId: initial?.templateId || releaseTemplates[0]?.id || "",
  }));
  const [taskSearch, setTaskSearch] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.version.trim()) return;
    onSave(form);
  }

  function set(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function toggleTask(id) {
    setForm((prev) => ({
      ...prev,
      taskIds: prev.taskIds.includes(id)
        ? prev.taskIds.filter((t) => t !== id)
        : [...prev.taskIds, id],
    }));
  }

  const filteredTasks = useMemo(() => {
    const q = taskSearch.toLowerCase();
    return allTasks.filter((t) => !q || matchesTaskQuery(t, q)).slice(0, 30);
  }, [allTasks, taskSearch]);

  const selectedTasks = allTasks.filter((t) => form.taskIds.includes(t.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="app-surface w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#252b3b] flex-shrink-0">
          <div>
            <div className="app-kicker mb-1">Release Setup</div>
            <h2 className="text-slate-800 dark:text-white font-semibold text-base flex items-center gap-2">
              <FaRocket className="text-blue-400 w-4 h-4" />
              {initial ? "Edit Release" : "New Release"}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1">
          <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-slate-400 dark:text-slate-500 mb-1.5 font-medium">Version *</label>
                <input
                  type="text"
                  value={form.version}
                  onChange={(e) => set("version", e.target.value)}
                  placeholder="v1.0.0"
                  required
                  className="w-full bg-white dark:bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-400 dark:text-slate-500 mb-1.5 font-medium">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className="w-full bg-white dark:bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 transition-colors"
                >
                  <option value="planned">Planned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="released">Released</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 dark:text-slate-500 mb-1.5 font-medium">Release Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Q1 2026 Release"
                className="w-full bg-white dark:bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 dark:text-slate-500 mb-1.5 font-medium">Release Date</label>
              <input
                type="date"
                value={form.releaseDate}
                onChange={(e) => set("releaseDate", e.target.value)}
                className="w-full bg-white dark:bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 transition-colors dark:[color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 dark:text-slate-500 mb-1.5 font-medium">Release Template</label>
              <select
                value={form.templateId}
                onChange={(e) => set("templateId", e.target.value)}
                className="w-full bg-white dark:bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 transition-colors"
              >
                {releaseTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              {releaseTemplates.length > 0 && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {(releaseTemplates.find((template) => template.id === form.templateId) || releaseTemplates[0])?.description}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-400 dark:text-slate-500 mb-1.5 font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Describe this release..."
                rows={2}
                className="w-full bg-white dark:bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 transition-colors resize-none"
              />
            </div>

            {/* Task Selection */}
            <div>
              <label className="block text-xs text-slate-400 dark:text-slate-500 mb-1.5 font-medium">
                Tasks in this release
                {form.taskIds.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-semibold">
                    {form.taskIds.length} selected
                  </span>
                )}
              </label>

              {/* Selected tasks chips */}
              {selectedTasks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedTasks.map((t) => (
                    <span
                      key={t.id}
                      className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/15 border border-blue-500/30 rounded-full text-xs text-blue-300"
                    >
                      <span className="font-mono text-blue-400/70">{taskKey(t.id)}</span>
                      <span className="max-w-[140px] truncate">{t.title}</span>
                      <button
                        type="button"
                        onClick={() => toggleTask(t.id)}
                        className="text-blue-400/60 hover:text-red-400 transition-colors ml-0.5"
                      >
                        <FaTimes className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Task search + list */}
              <div className="bg-white dark:bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-[#2a3044]">
                  <FaSearch className="text-slate-500 dark:text-slate-400 w-3 h-3 flex-shrink-0" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Search by title or key (CY-123)…"
                    className="flex-1 bg-transparent text-slate-700 dark:text-white placeholder-slate-500 text-xs focus:outline-none"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {filteredTasks.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400 text-xs text-center py-4">No tasks found</p>
                  ) : (
                    filteredTasks.map((t) => {
                      const checked = form.taskIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTask(t.id)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors text-xs ${
                            checked ? "bg-blue-500/10" : "hover:bg-slate-100 dark:hover:bg-[#2a3044]"
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                            checked
                              ? "bg-blue-500 border-blue-500"
                              : "border-slate-300 dark:border-slate-600"
                          }`}>
                            {checked && <FaCheck className="w-2 h-2 text-white" />}
                          </span>
                          <span className="font-mono text-slate-500 dark:text-slate-400 flex-shrink-0">{taskKey(t.id)}</span>
                          <span className={`flex-1 truncate ${checked ? "text-blue-700 dark:text-blue-200" : "text-slate-700 dark:text-slate-300"}`}>{t.title}</span>
                          <TaskStatusChip status={t.status} className="px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0" />
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-[#252b3b] flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-[#2a3044] rounded-lg hover:border-slate-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5"
            >
              <FaCheck className="w-3 h-3" />
              {initial ? "Save Changes" : "Create Release"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
