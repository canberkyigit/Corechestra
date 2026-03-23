import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  FaRocket, FaPlus, FaTimes, FaEdit, FaTrash, FaCheck, FaTag,
  FaLink, FaChevronRight, FaChevronDown, FaSearch, FaStar, FaBug,
  FaArrowUp, FaExclamationTriangle,
} from "react-icons/fa";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META = {
  released:    { label: "Released",    dot: "bg-green-500",  badge: "bg-green-500/20 text-green-400 border border-green-500/30",  versionBg: "bg-green-600" },
  "in-progress": { label: "In Progress", dot: "bg-blue-500",   badge: "bg-blue-500/20 text-blue-400 border border-blue-500/30",    versionBg: "bg-blue-600" },
  planned:     { label: "Planned",     dot: "bg-slate-400",  badge: "bg-slate-500/20 text-slate-300 border border-slate-500/30", versionBg: "bg-slate-600" },
};

const CHANGELOG_TYPE_META = {
  feature:     { label: "Features",         color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20",   icon: FaStar,                badgeCls: "bg-blue-500/20 text-blue-400" },
  bugfix:      { label: "Bug Fixes",        color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20",     icon: FaBug,                 badgeCls: "bg-red-500/20 text-red-400" },
  improvement: { label: "Improvements",     color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20", icon: FaArrowUp,             badgeCls: "bg-green-500/20 text-green-400" },
  breaking:    { label: "Breaking Changes", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20", icon: FaExclamationTriangle, badgeCls: "bg-orange-500/20 text-orange-400" },
};

const TASK_STATUS_CHIP = {
  todo:       "bg-slate-600/50 text-slate-300",
  inprogress: "bg-blue-600/40 text-blue-300",
  review:     "bg-purple-600/40 text-purple-300",
  awaiting:   "bg-yellow-600/40 text-yellow-300",
  blocked:    "bg-red-600/40 text-red-300",
  done:       "bg-green-600/40 text-green-300",
};

const TASK_STATUS_LABEL = {
  todo: "To Do", inprogress: "In Progress", review: "Review",
  awaiting: "Awaiting", blocked: "Blocked", done: "Done",
};

const EMPTY_FORM = { version: "", name: "", status: "planned", releaseDate: "", description: "", taskIds: [] };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysRelative(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target - now;
  const diffDays = Math.round(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays > 0) return `In ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
  return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} ago`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }) {
  const meta = STATUS_META[status] || STATUS_META.planned;
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />;
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.planned;
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${meta.badge}`}>
      {meta.label}
    </span>
  );
}

function VersionBadge({ version, status, size = "sm" }) {
  const meta = STATUS_META[status] || STATUS_META.planned;
  const sz = size === "lg" ? "text-sm px-3 py-1 rounded-lg font-bold" : "text-xs px-2 py-0.5 rounded font-semibold";
  return (
    <span className={`${meta.versionBg} text-white ${sz} font-mono`}>{version || "—"}</span>
  );
}

// ─── Release Modal ────────────────────────────────────────────────────────────

function ReleaseModal({ initial, onSave, onClose, allTasks = [] }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(initial || {}),
    taskIds: initial?.taskIds || [],
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
    return allTasks.filter((t) =>
      !q || (t.title || "").toLowerCase().includes(q) || `cy-${t.id}`.includes(q)
    ).slice(0, 30);
  }, [allTasks, taskSearch]);

  const selectedTasks = allTasks.filter((t) => form.taskIds.includes(t.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#252b3b] flex-shrink-0">
          <h2 className="text-white font-semibold text-base flex items-center gap-2">
            <FaRocket className="text-blue-400 w-4 h-4" />
            {initial ? "Edit Release" : "New Release"}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1">
          <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Version *</label>
                <input
                  type="text"
                  value={form.version}
                  onChange={(e) => set("version", e.target.value)}
                  placeholder="v1.0.0"
                  required
                  className="w-full bg-[#232838] border border-[#2a3044] text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 transition-colors"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value)}
                  className="w-full bg-[#232838] border border-[#2a3044] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 transition-colors"
                >
                  <option value="planned">Planned</option>
                  <option value="in-progress">In Progress</option>
                  <option value="released">Released</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Release Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Q1 2026 Release"
                className="w-full bg-[#232838] border border-[#2a3044] text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Release Date</label>
              <input
                type="date"
                value={form.releaseDate}
                onChange={(e) => set("releaseDate", e.target.value)}
                className="w-full bg-[#232838] border border-[#2a3044] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 transition-colors [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Describe this release..."
                rows={2}
                className="w-full bg-[#232838] border border-[#2a3044] text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 transition-colors resize-none"
              />
            </div>

            {/* Task Selection */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 font-medium">
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
                      <span className="font-mono text-blue-400/70">CY-{t.id}</span>
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
              <div className="bg-[#232838] border border-[#2a3044] rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a3044]">
                  <FaSearch className="text-slate-500 w-3 h-3 flex-shrink-0" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="Search tasks to add..."
                    className="flex-1 bg-transparent text-white placeholder-slate-500 text-xs focus:outline-none"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {filteredTasks.length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-4">No tasks found</p>
                  ) : (
                    filteredTasks.map((t) => {
                      const checked = form.taskIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTask(t.id)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors text-xs ${
                            checked ? "bg-blue-500/10" : "hover:bg-[#2a3044]"
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                            checked
                              ? "bg-blue-500 border-blue-500"
                              : "border-slate-600"
                          }`}>
                            {checked && <FaCheck className="w-2 h-2 text-white" />}
                          </span>
                          <span className="font-mono text-slate-500 flex-shrink-0">CY-{t.id}</span>
                          <span className={`flex-1 truncate ${checked ? "text-blue-200" : "text-slate-300"}`}>{t.title}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${TASK_STATUS_CHIP[t.status] || "bg-slate-600/50 text-slate-300"}`}>
                            {TASK_STATUS_LABEL[t.status] || t.status}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#252b3b] flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-[#2a3044] rounded-lg hover:border-slate-500 transition-colors"
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

// ─── Task Search Popup ────────────────────────────────────────────────────────

function TaskSearchPopup({ allTasks, linkedIds, onAdd, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allTasks.filter(
      (t) => !linkedIds.includes(t.id) && (t.title || "").toLowerCase().includes(q)
    ).slice(0, 20);
  }, [allTasks, linkedIds, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1a1f2e] border border-[#2a3044] rounded-2xl shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#252b3b]">
          <FaSearch className="text-slate-500 w-3.5 h-3.5 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
          />
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <FaTimes className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">No tasks found</p>
          ) : (
            filtered.map((t) => (
              <button
                key={t.id}
                onClick={() => { onAdd(t.id); onClose(); }}
                className="w-full text-left px-4 py-2.5 hover:bg-[#232838] transition-colors flex items-center gap-3"
              >
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${TASK_STATUS_CHIP[t.status] || "bg-slate-600/50 text-slate-300"}`}>
                  {TASK_STATUS_LABEL[t.status] || t.status}
                </span>
                <span className="text-slate-200 text-sm truncate flex-1">{t.title}</span>
                {t.storyPoint != null && (
                  <span className="text-slate-500 text-xs font-mono flex-shrink-0">{t.storyPoint}pt</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-[#1c2030] border border-[#2a3044] rounded-xl px-4 py-3 flex flex-col gap-1">
      <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">{label}</span>
      <span className="text-white text-2xl font-bold leading-none">{value}</span>
      {sub && <span className="text-slate-500 text-xs">{sub}</span>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReleasesPage() {
  const {
    releases, createRelease, updateRelease, deleteRelease,
    addChangelogEntry, deleteChangelogEntry,
    allTasks, projects, currentProjectId,
  } = useApp();
  const { addToast } = useToast();

  // ── Page-level state ──────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRelease, setEditingRelease] = useState(null); // release object → edit modal
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Description inline edit
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const descRef = useRef(null);

  // Changelog add entry
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryDraft, setEntryDraft] = useState({ type: "feature", text: "" });

  // Linked tasks
  const [tasksExpanded, setTasksExpanded] = useState(true);
  const [showTaskSearch, setShowTaskSearch] = useState(false);

  // Sidebar section collapse
  const [collapsedSections, setCollapsedSections] = useState({});

  // ── Derived data ──────────────────────────────────────────────────────────
  const grouped = useMemo(() => ({
    released:     releases.filter((r) => r.status === "released"),
    "in-progress": releases.filter((r) => r.status === "in-progress"),
    planned:      releases.filter((r) => r.status === "planned"),
  }), [releases]);

  const selected = useMemo(() => releases.find((r) => r.id === selectedId) || null, [releases, selectedId]);

  const linkedTasks = useMemo(() => {
    if (!selected) return [];
    return (selected.taskIds || []).map((id) => allTasks.find((t) => t.id === id)).filter(Boolean);
  }, [selected, allTasks]);

  const completedCount = useMemo(() => linkedTasks.filter((t) => t.status === "done").length, [linkedTasks]);

  const changelogGroups = useMemo(() => {
    if (!selected) return {};
    const groups = {};
    (selected.changelog || []).forEach((e) => {
      if (!groups[e.type]) groups[e.type] = [];
      groups[e.type].push(e);
    });
    return groups;
  }, [selected]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleCreateRelease(formData) {
    createRelease(formData);
    setShowCreateModal(false);
    addToast(`Release ${formData.version} created`, "success");
  }

  function handleUpdateRelease(formData) {
    updateRelease({ ...editingRelease, ...formData });
    setEditingRelease(null);
    addToast("Release updated", "success");
  }

  function handleDeleteRelease(id) {
    if (selectedId === id) setSelectedId(null);
    deleteRelease(id);
    setDeleteConfirmId(null);
    addToast("Release deleted", "info");
  }

  function handleStartEditDesc() {
    setDescDraft(selected?.description || "");
    setEditingDesc(true);
    setTimeout(() => descRef.current?.focus(), 0);
  }

  function handleSaveDesc() {
    if (!selected) return;
    updateRelease({ ...selected, description: descDraft });
    setEditingDesc(false);
    addToast("Description saved", "success");
  }

  function handleAddEntry() {
    if (!entryDraft.text.trim() || !selected) return;
    addChangelogEntry(selected.id, entryDraft);
    setEntryDraft({ type: "feature", text: "" });
    setShowAddEntry(false);
    addToast("Changelog entry added", "success");
  }

  function handleDeleteEntry(entryId) {
    if (!selected) return;
    deleteChangelogEntry(selected.id, entryId);
    addToast("Entry removed", "info");
  }

  function handleAddTask(taskId) {
    if (!selected) return;
    if ((selected.taskIds || []).includes(taskId)) return;
    updateRelease({ ...selected, taskIds: [...(selected.taskIds || []), taskId] });
    addToast("Task linked", "success");
  }

  function handleRemoveTask(taskId) {
    if (!selected) return;
    updateRelease({ ...selected, taskIds: (selected.taskIds || []).filter((id) => id !== taskId) });
    addToast("Task unlinked", "info");
  }

  function toggleSection(key) {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // When selected release changes, reset inline-edit states
  useEffect(() => {
    setEditingDesc(false);
    setShowAddEntry(false);
    setEntryDraft({ type: "feature", text: "" });
  }, [selectedId]);

  // ── Sidebar release section ───────────────────────────────────────────────
  function SidebarSection({ statusKey, label }) {
    const items = grouped[statusKey] || [];
    const collapsed = collapsedSections[statusKey];
    const meta = STATUS_META[statusKey] || STATUS_META.planned;
    return (
      <div>
        <button
          onClick={() => toggleSection(statusKey)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-slate-300 transition-colors group"
        >
          {collapsed
            ? <FaChevronRight className="w-2.5 h-2.5 flex-shrink-0" />
            : <FaChevronDown className="w-2.5 h-2.5 flex-shrink-0" />}
          <StatusDot status={statusKey} />
          <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
          <span className="ml-auto text-xs bg-[#232838] text-slate-400 px-1.5 py-0.5 rounded font-mono">
            {items.length}
          </span>
        </button>
        {!collapsed && items.length > 0 && (
          <div className="ml-2 mt-0.5 flex flex-col gap-0.5">
            {items.map((rel) => (
              <button
                key={rel.id}
                onClick={() => setSelectedId(rel.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors group flex flex-col gap-0.5 ${
                  selectedId === rel.id
                    ? "bg-blue-600/20 border border-blue-500/30"
                    : "hover:bg-[#232838] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-semibold ${meta.color || "text-slate-300"}`}>
                    {rel.version}
                  </span>
                  <span className="text-slate-400 text-xs truncate flex-1">{rel.name}</span>
                </div>
                {rel.releaseDate && (
                  <span className="text-slate-600 text-xs pl-0.5">{formatDate(rel.releaseDate)}</span>
                )}
              </button>
            ))}
          </div>
        )}
        {!collapsed && items.length === 0 && (
          <p className="text-slate-600 text-xs px-7 py-1 italic">None</p>
        )}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-[#141720] overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="w-[260px] flex-shrink-0 bg-[#1a1f2e] border-r border-[#252b3b] flex flex-col overflow-hidden">
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#252b3b]">
          <div className="flex items-center gap-2">
            <FaRocket className="text-blue-400 w-4 h-4" />
            <span className="text-white font-semibold text-sm">Releases</span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-1.5 rounded-lg font-medium transition-colors"
          >
            <FaPlus className="w-2.5 h-2.5" />
            New
          </button>
        </div>

        {/* Release list */}
        <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-1 px-1">
          <SidebarSection statusKey="released" label="Released" />
          <SidebarSection statusKey="in-progress" label="In Progress" />
          <SidebarSection statusKey="planned" label="Planned" />
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {!selected ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-[#1a1f2e] border border-[#2a3044] flex items-center justify-center">
              <FaRocket className="w-7 h-7 text-slate-600" />
            </div>
            <div>
              <p className="text-slate-400 font-medium">Select a release to view details</p>
              <p className="text-slate-600 text-sm mt-1">Or create a new release to get started</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <FaPlus className="w-3 h-3" />
              New Release
            </button>
          </div>
        ) : (
          <div className="px-8 py-6 flex flex-col gap-6 max-w-4xl">

            {/* ── Release Header ─────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <VersionBadge version={selected.version} status={selected.status} size="lg" />
                  <StatusBadge status={selected.status} />
                  {selected.releaseDate && (
                    <span className="text-slate-500 text-sm">{formatDate(selected.releaseDate)}</span>
                  )}
                </div>
                <h1 className="text-white text-2xl font-bold leading-tight">
                  {selected.name || selected.version}
                </h1>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setEditingRelease(selected)}
                  className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white border border-[#2a3044] hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <FaEdit className="w-3 h-3" />
                  Edit
                </button>
                {deleteConfirmId === selected.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-red-400 text-xs">Delete?</span>
                    <button
                      onClick={() => handleDeleteRelease(selected.id)}
                      className="text-xs bg-red-600 hover:bg-red-500 text-white px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="text-xs text-slate-400 hover:text-white border border-[#2a3044] px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(selected.id)}
                    className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 border border-[#2a3044] hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <FaTrash className="w-3 h-3" />
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* ── Stats row ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard
                label="Linked Tasks"
                value={(selected.taskIds || []).length}
              />
              <StatCard
                label="Completed"
                value={completedCount}
                sub={`of ${linkedTasks.length} tasks done`}
              />
              <StatCard
                label="Changelog"
                value={(selected.changelog || []).length}
                sub="entries"
              />
              <StatCard
                label={selected.status === "released" ? "Released" : "Release Date"}
                value={selected.releaseDate ? daysRelative(selected.releaseDate) : "—"}
                sub={selected.releaseDate ? formatDate(selected.releaseDate) : undefined}
              />
            </div>

            {/* ── Description card ───────────────────────────────────────── */}
            <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-xl px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Description</span>
                {!editingDesc && (
                  <button
                    onClick={handleStartEditDesc}
                    className="text-slate-500 hover:text-white transition-colors"
                    title="Edit description"
                  >
                    <FaEdit className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {editingDesc ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    ref={descRef}
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    rows={4}
                    className="w-full bg-[#232838] border border-[#2a3044] focus:border-blue-500/60 text-white placeholder-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none transition-colors"
                    placeholder="Describe what's in this release..."
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingDesc(false)}
                      className="text-xs text-slate-400 hover:text-white border border-[#2a3044] px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDesc}
                      className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                    >
                      <FaCheck className="w-2.5 h-2.5" />
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  className={`text-sm leading-relaxed ${selected.description ? "text-slate-300" : "text-slate-600 italic"}`}
                  onClick={handleStartEditDesc}
                  style={{ cursor: "text" }}
                >
                  {selected.description || "No description — click to add one"}
                </p>
              )}
            </div>

            {/* ── Changelog section ──────────────────────────────────────── */}
            <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#252b3b]">
                <div className="flex items-center gap-2">
                  <FaTag className="text-slate-400 w-3.5 h-3.5" />
                  <span className="text-white font-semibold text-sm">Changelog</span>
                  <span className="text-slate-500 text-xs font-mono bg-[#232838] px-1.5 py-0.5 rounded">
                    {(selected.changelog || []).length}
                  </span>
                </div>
                <button
                  onClick={() => setShowAddEntry((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-400/50 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                >
                  <FaPlus className="w-2.5 h-2.5" />
                  Add Entry
                </button>
              </div>

              {/* Add entry form */}
              {showAddEntry && (
                <div className="px-5 py-4 bg-[#1c2030] border-b border-[#252b3b] flex flex-col gap-3">
                  <div className="flex gap-2">
                    <select
                      value={entryDraft.type}
                      onChange={(e) => setEntryDraft((p) => ({ ...p, type: e.target.value }))}
                      className="bg-[#232838] border border-[#2a3044] text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 transition-colors flex-shrink-0"
                    >
                      <option value="feature">Feature</option>
                      <option value="bugfix">Bug Fix</option>
                      <option value="improvement">Improvement</option>
                      <option value="breaking">Breaking Change</option>
                    </select>
                    <input
                      type="text"
                      value={entryDraft.text}
                      onChange={(e) => setEntryDraft((p) => ({ ...p, text: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddEntry(); if (e.key === "Escape") setShowAddEntry(false); }}
                      placeholder="Describe the change..."
                      autoFocus
                      className="flex-1 bg-[#232838] border border-[#2a3044] text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/60 transition-colors"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowAddEntry(false)}
                      className="text-xs text-slate-400 hover:text-white border border-[#2a3044] px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddEntry}
                      disabled={!entryDraft.text.trim()}
                      className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1"
                    >
                      <FaCheck className="w-2.5 h-2.5" />
                      Save Entry
                    </button>
                  </div>
                </div>
              )}

              {/* Changelog entries grouped by type */}
              <div className="px-5 py-4 flex flex-col gap-5">
                {Object.keys(CHANGELOG_TYPE_META).map((type) => {
                  const entries = changelogGroups[type];
                  if (!entries || entries.length === 0) return null;
                  const meta = CHANGELOG_TYPE_META[type];
                  const Icon = meta.icon;
                  return (
                    <div key={type}>
                      <div className={`flex items-center gap-2 mb-2 pb-1.5 border-b border-[#2a3044]`}>
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                        <span className={`text-xs font-semibold uppercase tracking-wide ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${meta.badgeCls}`}>
                          {entries.length}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {entries.map((entry) => (
                          <ChangelogEntryRow
                            key={entry.id}
                            entry={entry}
                            meta={meta}
                            onDelete={() => handleDeleteEntry(entry.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {(selected.changelog || []).length === 0 && (
                  <p className="text-slate-600 text-sm text-center py-4 italic">
                    No changelog entries yet — add one above
                  </p>
                )}
              </div>
            </div>

            {/* ── Linked Tasks section ───────────────────────────────────── */}
            <div className="bg-[#1a1f2e] border border-[#2a3044] rounded-xl overflow-hidden mb-8">
              <button
                onClick={() => setTasksExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 border-b border-[#252b3b] hover:bg-[#1c2030] transition-colors"
              >
                <div className="flex items-center gap-2">
                  {tasksExpanded ? <FaChevronDown className="w-3 h-3 text-slate-500" /> : <FaChevronRight className="w-3 h-3 text-slate-500" />}
                  <FaLink className="text-slate-400 w-3.5 h-3.5" />
                  <span className="text-white font-semibold text-sm">Linked Tasks</span>
                  <span className="text-slate-500 text-xs font-mono bg-[#232838] px-1.5 py-0.5 rounded">
                    {linkedTasks.length}
                  </span>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setShowTaskSearch(true)}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-400/50 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    <FaPlus className="w-2.5 h-2.5" />
                    Add Task
                  </button>
                </div>
              </button>

              {tasksExpanded && (
                <div className="divide-y divide-[#252b3b]">
                  {linkedTasks.length === 0 ? (
                    <p className="text-slate-600 text-sm text-center py-6 italic">
                      No tasks linked — click "Add Task" to link one
                    </p>
                  ) : (
                    linkedTasks.map((task) => (
                      <LinkedTaskRow key={task.id} task={task} onRemove={() => handleRemoveTask(task.id)} />
                    ))
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <ReleaseModal onSave={handleCreateRelease} onClose={() => setShowCreateModal(false)} allTasks={allTasks} />
      )}
      {editingRelease && (
        <ReleaseModal
          initial={editingRelease}
          onSave={handleUpdateRelease}
          onClose={() => setEditingRelease(null)}
          allTasks={allTasks}
        />
      )}
      {showTaskSearch && selected && (
        <TaskSearchPopup
          allTasks={allTasks}
          linkedIds={selected.taskIds || []}
          onAdd={handleAddTask}
          onClose={() => setShowTaskSearch(false)}
        />
      )}
    </div>
  );
}

// ─── Changelog Entry Row (hover to show delete) ───────────────────────────────

function ChangelogEntryRow({ entry, meta, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const Icon = meta.icon;
  return (
    <div
      className="flex items-start gap-2.5 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Icon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${meta.color} opacity-70`} />
      <span className="text-slate-300 text-sm leading-relaxed flex-1">{entry.text}</span>
      {hovered && (
        <button
          onClick={onDelete}
          className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
          title="Delete entry"
        >
          <FaTimes className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── Linked Task Row ──────────────────────────────────────────────────────────

function LinkedTaskRow({ task, onRemove }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex items-center gap-3 px-5 py-3 hover:bg-[#1c2030] transition-colors"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${TASK_STATUS_CHIP[task.status] || "bg-slate-600/50 text-slate-300"}`}
      >
        {TASK_STATUS_LABEL[task.status] || task.status}
      </span>
      <span className="text-slate-200 text-sm truncate flex-1">{task.title}</span>
      {task.assignedTo && task.assignedTo !== "unassigned" && (
        <span className="text-slate-500 text-xs flex-shrink-0">{task.assignedTo}</span>
      )}
      {task.storyPoint != null && (
        <span className="text-slate-500 text-xs font-mono flex-shrink-0 bg-[#232838] px-1.5 py-0.5 rounded">
          {task.storyPoint}pt
        </span>
      )}
      {hovered && (
        <button
          onClick={onRemove}
          className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
          title="Unlink task"
        >
          <FaTimes className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
