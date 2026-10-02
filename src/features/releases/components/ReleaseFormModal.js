import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaCheck, FaRocket, FaSearch, FaTimes } from "react-icons/fa";
import { taskKey } from "../../../shared/utils/helpers";
import { EMPTY_RELEASE_FORM, FIELD_CLASS, LABEL_CLASS, RELEASE_STATUSES, STATUS_META } from "../constants/releaseMeta";
import { matchesTaskQuery } from "../utils/releaseUtils";
import { TaskStatusChip } from "./ReleaseBadges";

const FORM_KEYS = Object.keys(EMPTY_RELEASE_FORM);

function validate(form, existingVersions) {
  const errors = {};
  const version = form.version.trim();
  if (!version) errors.version = "Version is required";
  else if (existingVersions.includes(version.toLowerCase())) errors.version = "This version already exists in the project";
  if (form.startDate && form.releaseDate && form.startDate > form.releaseDate) errors.releaseDate = "Target date is before the start date";
  if (form.freezeDate && form.releaseDate && form.freezeDate > form.releaseDate) errors.freezeDate = "Code freeze is after the target date";
  return errors;
}

/** Create / edit release form. */
export default function ReleaseFormModal({ initial, onSave, onClose, allTasks = [], users = [], releaseTemplates = [], existingVersions = [], suggestedVersion = "" }) {
  const [form, setForm] = useState(() => {
    const base = { ...EMPTY_RELEASE_FORM };
    FORM_KEYS.forEach((key) => {
      if (initial && initial[key] !== undefined && initial[key] !== null) base[key] = initial[key];
    });
    base.taskIds = initial?.taskIds || [];
    base.templateId = initial?.templateId || releaseTemplates[0]?.id || "";
    return base;
  });
  const [taskSearch, setTaskSearch] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const versionRef = useRef(null);

  const takenVersions = useMemo(
    () => existingVersions.map((v) => String(v).trim().toLowerCase()).filter((v) => !initial || v !== String(initial.version || "").trim().toLowerCase()),
    [existingVersions, initial]
  );
  const errors = validate(form, takenVersions);

  useEffect(() => {
    versionRef.current?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  function handleSubmit(event) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    onSave({ ...form, version: form.version.trim(), name: form.name.trim() });
  }

  const toggleTask = (id) => setForm((prev) => ({
    ...prev,
    taskIds: prev.taskIds.includes(id) ? prev.taskIds.filter((item) => item !== id) : [...prev.taskIds, id],
  }));

  const filteredTasks = useMemo(
    () => allTasks.filter((task) => task.type !== "epic" && matchesTaskQuery(task, taskSearch)).slice(0, 40),
    [allTasks, taskSearch]
  );
  const selectedTasks = allTasks.filter((task) => form.taskIds.includes(task.id));
  const showError = (key) => submitted && errors[key];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
      <div role="dialog" aria-modal="true" aria-labelledby="release-form-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/100 shadow-2xl dark:border-[#2a3044] dark:bg-[#1c2030]">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 dark:border-[#2a3044]">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400"><FaRocket className="h-4 w-4" /></span>
            <div>
              <h2 id="release-form-title" className="text-base font-semibold text-slate-900">{initial ? `Edit ${initial.version}` : "New release"}</h2>
              <p className="text-xs text-slate-500">{initial ? "Update scope, schedule and ownership" : "Plan a version, its schedule and scope"}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-500/10 hover:text-slate-900 dark:hover:text-white">
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr]">
              <div>
                <label htmlFor="release-version" className={LABEL_CLASS}>Version *</label>
                <input
                  id="release-version"
                  ref={versionRef}
                  type="text"
                  value={form.version}
                  onChange={(event) => set("version", event.target.value)}
                  placeholder="v1.0.0"
                  aria-invalid={Boolean(showError("version"))}
                  className={`${FIELD_CLASS} font-mono`}
                />
                {showError("version") && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.version}</p>}
                {!initial && suggestedVersion && !form.version && (
                  <button type="button" onClick={() => set("version", suggestedVersion)} className="mt-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                    Use {suggestedVersion}
                  </button>
                )}
              </div>
              <div>
                <label htmlFor="release-name" className={LABEL_CLASS}>Name</label>
                <input id="release-name" type="text" value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="e.g. Compass" className={FIELD_CLASS} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="release-status" className={LABEL_CLASS}>Status</label>
                <select id="release-status" value={form.status} onChange={(event) => set("status", event.target.value)} className={FIELD_CLASS}>
                  {RELEASE_STATUSES.map((status) => <option key={status} value={status}>{STATUS_META[status].label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="release-owner" className={LABEL_CLASS}>Owner</label>
                <select id="release-owner" value={form.owner || ""} onChange={(event) => set("owner", event.target.value)} className={FIELD_CLASS}>
                  <option value="">Unassigned</option>
                  {users.map((user) => {
                    const value = user.username || user.id;
                    return <option key={user.id || value} value={value}>{user.name || value}</option>;
                  })}
                  {form.owner && !users.some((user) => (user.username || user.id) === form.owner) && <option value={form.owner}>{form.owner}</option>}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="release-start" className={LABEL_CLASS}>Start date</label>
                <input id="release-start" type="date" value={form.startDate} onChange={(event) => set("startDate", event.target.value)} className={FIELD_CLASS} />
              </div>
              <div>
                <label htmlFor="release-freeze" className={LABEL_CLASS}>Code freeze</label>
                <input id="release-freeze" type="date" value={form.freezeDate} onChange={(event) => set("freezeDate", event.target.value)} className={FIELD_CLASS} />
                {showError("freezeDate") && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.freezeDate}</p>}
              </div>
              <div>
                <label htmlFor="release-date" className={LABEL_CLASS}>Target date</label>
                <input id="release-date" type="date" value={form.releaseDate} onChange={(event) => set("releaseDate", event.target.value)} className={FIELD_CLASS} />
                {showError("releaseDate") && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.releaseDate}</p>}
              </div>
            </div>

            {!initial && releaseTemplates.length > 0 && (
              <div>
                <label htmlFor="release-template" className={LABEL_CLASS}>Template</label>
                <select id="release-template" value={form.templateId} onChange={(event) => set("templateId", event.target.value)} className={FIELD_CLASS}>
                  {releaseTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {(releaseTemplates.find((template) => template.id === form.templateId) || releaseTemplates[0])?.description || "Seeds the checklist, rollback plan and monitoring checks."}
                </p>
              </div>
            )}

            <div>
              <label htmlFor="release-description" className={LABEL_CLASS}>Description</label>
              <textarea id="release-description" rows={2} value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="What is this release about?" className={`${FIELD_CLASS} resize-none`} />
            </div>

            <div>
              <div className={LABEL_CLASS}>
                Work items
                {form.taskIds.length > 0 && <span className="ml-2 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">{form.taskIds.length} selected</span>}
              </div>
              {selectedTasks.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {selectedTasks.map((task) => (
                    <span key={task.id} className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-800 dark:text-blue-200">
                      <span className="font-mono opacity-70">{taskKey(task.id)}</span>
                      <span className="max-w-[140px] truncate">{task.title}</span>
                      <button type="button" onClick={() => toggleTask(task.id)} aria-label={`Remove ${task.title}`} className="ml-0.5 opacity-60 hover:text-red-600 hover:opacity-100">
                        <FaTimes className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="overflow-hidden rounded-lg border border-slate-300/80 dark:border-[#2a3044]">
                <div className="flex items-center gap-2 border-b border-slate-200/80 px-3 py-2 dark:border-[#2a3044]">
                  <FaSearch className="h-3 w-3 text-slate-500" />
                  <input
                    value={taskSearch}
                    onChange={(event) => setTaskSearch(event.target.value)}
                    placeholder="Search by title or key (CY-123)…"
                    aria-label="Search work items"
                    className="flex-1 bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {filteredTasks.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-500">No work items found</p>
                  ) : filteredTasks.map((task) => {
                    const checked = form.taskIds.includes(task.id);
                    return (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        aria-pressed={checked}
                        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors ${checked ? "bg-blue-500/[0.07]" : "hover:bg-slate-500/[0.06]"}`}
                      >
                        <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 dark:border-[#3a4258]"}`}>
                          {checked && <FaCheck className="h-2 w-2" />}
                        </span>
                        <span className="flex-shrink-0 font-mono text-slate-500">{taskKey(task.id)}</span>
                        <span className="flex-1 truncate text-slate-800">{task.title}</span>
                        <TaskStatusChip status={task.status} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200/80 px-6 py-4 dark:border-[#2a3044]">
            <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-300/70 px-4 text-sm font-medium text-slate-700 hover:bg-slate-500/[0.06] dark:border-[#2a3044] dark:text-slate-200">
              Cancel
            </button>
            <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500">
              <FaCheck className="h-3 w-3" />
              {initial ? "Save changes" : "Create release"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
