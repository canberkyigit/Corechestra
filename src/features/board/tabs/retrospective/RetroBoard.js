import React, { useState, useCallback, useEffect } from "react";
import { FaCopy, FaPlus } from "react-icons/fa";
import { useApp } from "../../../../shared/context/AppContext";
import { useToast } from "../../../../shared/context/ToastContext";
import { COLUMNS } from "./retroConstants";
import RetroTimer from "./RetroTimer";
import RetroCard from "./RetroCard";

const EMPTY_ITEMS = { wentWell: [], wentWrong: [], canImprove: [], actionItems: [] };

export default function RetroBoard() {
  const {
    retrospectiveItems,
    addRetroItem,
    updateRetroItem,
    deleteRetroItem,
    voteRetroItem,
    toggleRetroItem,
    setRetroItemEditing,
  } = useApp();
  const { addToast } = useToast();
  const items = retrospectiveItems || EMPTY_ITEMS;

  const [editingItem, setEditingItem] = useState(null); // { category, id }
  const [editText, setEditText] = useState("");

  // Newly added items are created with `isEditing: true`; open their editor
  // right away instead of showing an "Empty item" placeholder.
  useEffect(() => {
    if (editingItem) return;
    for (const col of COLUMNS) {
      const pending = (items[col.key] || []).find((item) => item.isEditing && !item.text);
      if (pending) {
        setEditingItem({ category: col.key, id: pending.id });
        setEditText("");
        return;
      }
    }
  }, [items, editingItem]);

  const handleEdit = (category, id) => {
    const item = (items[category] || []).find((entry) => entry.id === id);
    setEditingItem({ category, id });
    setEditText(item?.text || "");
    setRetroItemEditing(category, id, true);
  };

  const handleSave = useCallback(() => {
    if (!editingItem) return;
    updateRetroItem(editingItem.category, editingItem.id, editText.trim());
    setEditingItem(null);
    setEditText("");
  }, [editingItem, editText, updateRetroItem]);

  const handleExport = async () => {
    const lines = COLUMNS.map((col) => {
      const columnItems = items[col.key] || [];
      if (!columnItems.length) return null;
      return `## ${col.icon} ${col.label}\n${columnItems.map((item) => `- ${item.checked ? "[x] " : ""}${item.text}${item.score > 0 ? ` (+${item.score})` : ""}`).join("\n")}`;
    }).filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(`# Sprint Retrospective\n\n${lines}`);
      addToast("Retrospective copied as Markdown", "success");
    } catch {
      addToast("Could not access the clipboard", "error");
    }
  };

  const wellCount = items.wentWell?.length || 0;
  const wrongCount = items.wentWrong?.length || 0;
  const totalSent = wellCount + wrongCount;
  const wellPct = totalSent > 0 ? Math.round((wellCount / totalSent) * 100) : 50;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 flex-wrap">
        {totalSent > 0 && (
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <span className="text-xs text-green-500 font-medium flex-shrink-0">{wellCount} ✓</span>
            <div className="flex-1 h-2 bg-red-200 dark:bg-red-900/30 rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full transition-all duration-500" style={{ width: `${wellPct}%` }} />
            </div>
            <span className="text-xs text-red-500 font-medium flex-shrink-0">{wrongCount} ✗</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          <RetroTimer />
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
            title="Copy to clipboard as Markdown"
          >
            <FaCopy className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const columnItems = items[col.key] || [];
          return (
            <div key={col.key} className="flex flex-col gap-2">
              <div className={`${col.header} rounded-xl px-3 py-2 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-bold">{col.icon}</span>
                  <span className="text-white text-xs font-semibold">{col.label}</span>
                </div>
                <span className="text-white/70 text-xs font-medium">{columnItems.length}</span>
              </div>

              <div className="flex flex-col gap-2 min-h-16">
                {columnItems.map((item) => {
                  const isEditing = editingItem?.category === col.key && editingItem?.id === item.id;
                  return (
                    <RetroCard
                      key={item.id}
                      item={item}
                      col={col}
                      isEditing={isEditing}
                      editText={editText}
                      setEditText={setEditText}
                      onSave={handleSave}
                      onEdit={() => handleEdit(col.key, item.id)}
                      onDelete={() => deleteRetroItem(col.key, item.id)}
                      onVote={(delta) => voteRetroItem(col.key, item.id, delta)}
                      onToggleResolved={() => toggleRetroItem(col.key, item.id)}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => addRetroItem(col.key)}
                className={`flex items-center gap-1.5 w-full text-xs py-2 px-3 rounded-xl border border-dashed transition-colors ${col.addBtn}`}
              >
                <FaPlus className="w-2.5 h-2.5" /> Add item
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
