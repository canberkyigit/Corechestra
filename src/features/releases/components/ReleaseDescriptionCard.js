import React, { useEffect, useRef, useState } from "react";
import { FaCheck, FaEdit } from "react-icons/fa";

/**
 * Inline-editable release description. Mount with `key={release.id}` so an
 * open editor closes when another release is selected.
 */
export default function ReleaseDescriptionCard({ description, canManage, onSave }) {
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const descRef = useRef(null);

  useEffect(() => {
    if (!canManage) setEditingDesc(false);
  }, [canManage]);

  function startEdit() {
    if (!canManage) return;
    setDescDraft(description || "");
    setEditingDesc(true);
    setTimeout(() => descRef.current?.focus(), 0);
  }

  function save() {
    onSave(descDraft);
    setEditingDesc(false);
  }

  return (
    <div className="app-surface px-5 py-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wide">Description</span>
        {!editingDesc && canManage && (
          <button
            onClick={startEdit}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
            title="Edit description"
          >
            <FaEdit className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {editingDesc && canManage ? (
        <div className="flex flex-col gap-2">
          <textarea
            ref={descRef}
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            rows={4}
            className="w-full bg-white dark:bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] focus:border-blue-500/60 text-slate-700 dark:text-white placeholder-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none transition-colors"
            placeholder="Describe what's in this release..."
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setEditingDesc(false)}
              className="text-xs text-slate-400 hover:text-slate-800 dark:hover:text-white border border-slate-200 dark:border-[#2a3044] px-3 py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
            >
              <FaCheck className="w-2.5 h-2.5" />
              Save
            </button>
          </div>
        </div>
      ) : (
        <p
          className={`text-sm leading-relaxed ${description ? "text-slate-700 dark:text-slate-300" : "text-slate-600 dark:text-slate-400 italic"}`}
          onClick={canManage ? startEdit : undefined}
          style={canManage ? { cursor: "text" } : undefined}
        >
          {description || (canManage ? "No description — click to add one" : "No description")}
        </p>
      )}
    </div>
  );
}
