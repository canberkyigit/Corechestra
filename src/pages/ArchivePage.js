import React, { useState, useMemo } from "react";
import {
  FaArchive, FaUndo, FaTrash, FaSearch, FaExclamationTriangle,
  FaTasks, FaProjectDiagram, FaBolt, FaTrashAlt, FaChevronDown,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";

const PRIORITY_COLORS = {
  critical: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-green-500",
};

const STATUS_COLORS = {
  todo: "bg-slate-400", inprogress: "bg-blue-500", review: "bg-purple-500",
  awaiting: "bg-amber-500", blocked: "bg-red-500", done: "bg-green-500",
};

export default function ArchivePage() {
  const {
    archivedTasks, restoreTask, permanentDeleteTask, emptyArchive,
    projects, currentProjectId,
  } = useApp();
  const { addToast } = useToast();

  const [search, setSearch] = useState("");
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [sortBy, setSortBy] = useState("date");
  const [showAllProjects, setShowAllProjects] = useState(false);

  const filtered = useMemo(() => {
    let items = showAllProjects
      ? [...archivedTasks]
      : archivedTasks.filter((t) => (t.projectId || "proj-1") === currentProjectId);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q)
      );
    }
    if (sortBy === "date") items.sort((a, b) => (b.archivedAt || "").localeCompare(a.archivedAt || ""));
    if (sortBy === "priority") {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      items.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
    }
    if (sortBy === "project") items.sort((a, b) => (a.projectId || "").localeCompare(b.projectId || ""));
    return items;
  }, [archivedTasks, search, sortBy]);

  const handleRestore = (taskId) => {
    const task = archivedTasks.find((t) => t.id === taskId);
    restoreTask(taskId);
    addToast(`"${task?.title}" restored`, "success");
  };

  const handlePermanentDelete = (taskId) => {
    const task = archivedTasks.find((t) => t.id === taskId);
    permanentDeleteTask(taskId);
    setConfirmDelete(null);
    addToast(`"${task?.title}" permanently deleted`, "error");
  };

  const handleEmptyArchive = () => {
    emptyArchive();
    setConfirmEmpty(false);
    addToast("Archive emptied", "info");
  };

  const getProjectName = (projectId) => {
    return projects.find((p) => p.id === projectId)?.name || projectId || "—";
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  const totalCount = filtered.length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FaArchive className="w-5 h-5 text-amber-500" />
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Archive</h2>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {totalCount} {totalCount === 1 ? "item" : "items"} archived
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAllProjects((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              showAllProjects
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-blue-300"
            }`}
          >
            {showAllProjects ? "Current Project" : "All Projects"}
          </button>
          {totalCount > 0 && (
            <div>
              {!confirmEmpty ? (
                <button
                  onClick={() => setConfirmEmpty(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-500 border border-red-200 dark:border-red-900/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  <FaTrashAlt className="w-3.5 h-3.5" /> Empty Archive
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500 font-medium">Delete all permanently?</span>
                  <button onClick={handleEmptyArchive} className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Yes, empty</button>
                  <button onClick={() => setConfirmEmpty(false)} className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search & Sort */}
      {totalCount > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search archived items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-slate-400"
            />
          </div>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="date">Sort by date</option>
              <option value="priority">Sort by priority</option>
              <option value="project">Sort by project</option>
            </select>
            <FaChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalCount === 0 && (
        <div className="text-center py-20">
          <FaArchive className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Archive is empty</p>
          <p className="text-slate-400 dark:text-slate-600 text-xs mt-1">Deleted items will appear here</p>
        </div>
      )}

      {/* No search results */}
      {totalCount > 0 && filtered.length === 0 && (
        <div className="text-center py-12">
          <FaSearch className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">No results for "{search}"</p>
        </div>
      )}

      {/* Archived items list */}
      <div className="space-y-2">
        {filtered.map((task) => (
          <div
            key={task.id}
            className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl p-4 flex items-center gap-4 group hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
          >
            {/* Priority dot */}
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_COLORS[task.priority] || "bg-slate-400"}`} />

            {/* Task info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{task.title}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium ${STATUS_COLORS[task.status] || "bg-slate-400"}`}>
                  {task.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
                <span>{getProjectName(task.projectId)}</span>
                <span>Archived {formatDate(task.archivedAt)}</span>
                {task.storyPoint && <span>{task.storyPoint} pts</span>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleRestore(task.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                title="Restore to board"
              >
                <FaUndo className="w-3 h-3" /> Restore
              </button>
              {confirmDelete === task.id ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePermanentDelete(task.id)} className="px-2.5 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Delete</button>
                  <button onClick={() => setConfirmDelete(null)} className="px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">No</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(task.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="Delete permanently"
                >
                  <FaTrash className="w-3 h-3" /> Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
