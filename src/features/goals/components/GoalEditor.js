import React, { useMemo, useState } from "react";
import { FaFlagCheckered, FaLink, FaPlus, FaSlidersH, FaTrash } from "react-icons/fa";
import { GOAL_LEVELS, GOAL_LEVEL_META, KR_TYPE_META, KR_TYPES, periodLabel, periodOptions } from "../utils/goalModel";
import { FIELD_CLS, GHOST_BTN, INPUT_CLS, LABEL_CLS, ModalShell, PRIMARY_BTN, SECONDARY_BTN, Segmented } from "./StrategyPrimitives";

const KR_ICONS = { metric: FaSlidersH, milestone: FaFlagCheckered, work: FaLink };
const LEVEL_RANK = { company: 0, team: 1, project: 2 };

let draftCounter = 0;
const draftId = () => `draft-${Date.now()}-${(draftCounter += 1)}`;

function emptyKeyResult(type = "metric") {
  return { id: draftId(), title: "", type, start: 0, target: 100, current: 0, unit: "", done: false, epicIds: [] };
}

function buildDraft(goal, defaults) {
  if (goal) {
    return {
      ...goal,
      keyResults: (goal.keyResults || []).map((kr) => ({ ...emptyKeyResult(kr.type), ...kr })),
    };
  }
  return {
    title: "",
    description: "",
    level: defaults.level || "company",
    teamId: defaults.teamId || "",
    projectId: defaults.projectId || "",
    ownerId: defaults.ownerId || "",
    parentId: "",
    period: defaults.period,
    keyResults: [emptyKeyResult()],
  };
}

function KeyResultEditor({ kr, index, epics, onChange, onRemove, canRemove }) {
  const Icon = KR_ICONS[kr.type] || FaSlidersH;
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-[#2a3044] dark:bg-[#141720]">
      <div className="flex items-start gap-2">
        <span className="mt-1.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-[#1a1f2e] dark:text-slate-400 dark:ring-[#2a3044]">
          <Icon className="h-3 w-3" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex gap-2">
            <input
              className={INPUT_CLS}
              placeholder={`Key result ${index + 1}, e.g. "Reach 95% sprint predictability"`}
              aria-label={`Key result ${index + 1} title`}
              value={kr.title}
              onChange={(event) => onChange({ title: event.target.value })}
            />
            <select
              className={`${FIELD_CLS} w-36 flex-shrink-0`}
              aria-label={`Key result ${index + 1} type`}
              value={kr.type}
              onChange={(event) => onChange({ type: event.target.value })}
            >
              {KR_TYPES.map((type) => <option key={type} value={type}>{KR_TYPE_META[type].label}</option>)}
            </select>
          </div>
          {kr.type === "metric" && (
            <div className="grid grid-cols-4 gap-2">
              {[["start", "Start"], ["current", "Current"], ["target", "Target"]].map(([field, label]) => (
                <label key={field} className="min-w-0">
                  <span className={LABEL_CLS}>{label}</span>
                  <input type="number" className={INPUT_CLS} value={kr[field]} onChange={(event) => onChange({ [field]: event.target.value })} />
                </label>
              ))}
              <label className="min-w-0">
                <span className={LABEL_CLS}>Unit</span>
                <input className={INPUT_CLS} placeholder="%, users…" value={kr.unit} onChange={(event) => onChange({ unit: event.target.value })} />
              </label>
            </div>
          )}
          {kr.type === "milestone" && (
            <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={Boolean(kr.done)} onChange={(event) => onChange({ done: event.target.checked })} />
              Already achieved
            </label>
          )}
          {kr.type === "work" && (
            <div>
              <span className={LABEL_CLS}>Linked epics — progress follows their tasks automatically</span>
              {epics.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No epics yet. Create epics on the Board to link work.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {epics.map((epic) => {
                    const selected = (kr.epicIds || []).includes(String(epic.id));
                    return (
                      <button
                        key={epic.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onChange({
                          epicIds: selected
                            ? kr.epicIds.filter((id) => id !== String(epic.id))
                            : [...(kr.epicIds || []), String(epic.id)],
                        })}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                          selected
                            ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500/60 dark:bg-blue-500/10 dark:text-blue-300"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-[#2a3044] dark:bg-[#1a1f2e] dark:text-slate-300"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: epic.color || "#6366f1" }} aria-hidden="true" />
                        {epic.title}
                        {epic.projectName && <span className="text-slate-400">· {epic.projectName}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <button type="button" onClick={onRemove} disabled={!canRemove} className={`${GHOST_BTN} mt-1 disabled:invisible`} aria-label={`Remove key result ${index + 1}`}>
          <FaTrash className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/** Create / edit an objective and its key results. */
export default function GoalEditor({ open, goal, goals, defaults, users, teams, projects, epics, onSave, onClose }) {
  const [draft, setDraft] = useState(() => buildDraft(goal, defaults));
  const [error, setError] = useState("");
  const isEditing = Boolean(goal);
  const update = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  const parentOptions = useMemo(() => {
    const excluded = new Set();
    if (goal) {
      // A goal can't align under itself or one of its descendants.
      const walk = (id) => {
        excluded.add(id);
        (goals || []).filter((item) => item.parentId === id).forEach((child) => walk(child.id));
      };
      walk(goal.id);
    }
    return (goals || []).filter((item) => !excluded.has(item.id) && (LEVEL_RANK[item.level] ?? 0) <= (LEVEL_RANK[draft.level] ?? 0));
  }, [goals, goal, draft.level]);

  const epicOptions = useMemo(() => {
    const projectNames = new Map((projects || []).map((project) => [project.id, project.name]));
    const list = (epics || []).map((epic) => ({ ...epic, projectName: (projects || []).length > 1 ? projectNames.get(epic.projectId) : null }));
    return draft.level === "project" && draft.projectId ? list.filter((epic) => epic.projectId === draft.projectId) : list;
  }, [epics, projects, draft.level, draft.projectId]);

  const updateKr = (id, patch) => setDraft((prev) => ({
    ...prev,
    keyResults: prev.keyResults.map((kr) => (kr.id === id ? { ...kr, ...patch } : kr)),
  }));

  const save = () => {
    if (!draft.title.trim()) { setError("Give the objective a title."); return; }
    if (draft.level === "team" && !draft.teamId) { setError("Choose the team that owns this goal."); return; }
    if (draft.level === "project" && !draft.projectId) { setError("Choose the project this goal belongs to."); return; }
    const keyResults = draft.keyResults
      .filter((kr) => kr.title.trim())
      .map((kr) => {
        const { id, ...rest } = kr;
        return String(id).startsWith("draft-") ? rest : kr;
      });
    onSave({ ...draft, keyResults });
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      kicker={isEditing ? "Edit objective" : "New objective"}
      title={isEditing ? goal.title : "Set an objective"}
      footer={(
        <>
          {error && <p className="mr-auto text-xs font-medium text-red-600 dark:text-red-400" role="alert">{error}</p>}
          <button type="button" className={SECONDARY_BTN} onClick={onClose}>Cancel</button>
          <button type="button" className={PRIMARY_BTN} onClick={save}>{isEditing ? "Save changes" : "Create goal"}</button>
        </>
      )}
    >
      <div className="space-y-5">
        <div className="space-y-3">
          <label className="block">
            <span className={LABEL_CLS}>Objective</span>
            <input
              autoFocus={!isEditing}
              className={`${INPUT_CLS} text-base font-medium`}
              placeholder="What do you want to achieve? e.g. Delight teams with effortless planning"
              value={draft.title}
              onChange={(event) => { update({ title: event.target.value }); setError(""); }}
            />
          </label>
          <label className="block">
            <span className={LABEL_CLS}>Why it matters <span className="font-normal text-slate-400">(optional)</span></span>
            <textarea rows={2} className={`${INPUT_CLS} resize-none`} value={draft.description} onChange={(event) => update({ description: event.target.value })} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className={LABEL_CLS}>Level</span>
            <Segmented
              ariaLabel="Goal level"
              value={draft.level}
              onChange={(level) => { update({ level }); setError(""); }}
              options={GOAL_LEVELS.map((level) => ({ id: level, label: GOAL_LEVEL_META[level].label }))}
            />
          </div>
          {draft.level === "team" && (
            <label className="block">
              <span className={LABEL_CLS}>Team</span>
              <select className={INPUT_CLS} value={draft.teamId || ""} onChange={(event) => update({ teamId: event.target.value })}>
                <option value="">Choose a team…</option>
                {(teams || []).map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </label>
          )}
          {draft.level === "project" && (
            <label className="block">
              <span className={LABEL_CLS}>Project</span>
              <select className={INPUT_CLS} value={draft.projectId || ""} onChange={(event) => update({ projectId: event.target.value })}>
                <option value="">Choose a project…</option>
                {(projects || []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            </label>
          )}
          <label className="block">
            <span className={LABEL_CLS}>Owner</span>
            <select className={INPUT_CLS} value={draft.ownerId || ""} onChange={(event) => update({ ownerId: event.target.value })}>
              <option value="">No owner</option>
              {(users || []).map((user) => <option key={user.id || user.username} value={user.username}>{user.name || user.username}</option>)}
            </select>
          </label>
          <label className="block">
            <span className={LABEL_CLS}>Period</span>
            <select className={INPUT_CLS} value={draft.period} onChange={(event) => update({ period: event.target.value })}>
              {[...new Set([...periodOptions(), draft.period])].map((period) => <option key={period} value={period}>{periodLabel(period)}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className={LABEL_CLS}>Aligns with</span>
            <select className={INPUT_CLS} value={draft.parentId || ""} onChange={(event) => update({ parentId: event.target.value })}>
              <option value="">Nothing — top-level goal</option>
              {parentOptions.map((item) => <option key={item.id} value={item.id}>{GOAL_LEVEL_META[item.level]?.label} · {item.title}</option>)}
            </select>
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Key results</span>
            <span className="text-xs text-slate-400">Measurable outcomes · 2–5 is a good number</span>
          </div>
          <div className="space-y-2">
            {draft.keyResults.map((kr, index) => (
              <KeyResultEditor
                key={kr.id}
                kr={kr}
                index={index}
                epics={epicOptions}
                canRemove={draft.keyResults.length > 1}
                onChange={(patch) => updateKr(kr.id, patch)}
                onRemove={() => update({ keyResults: draft.keyResults.filter((item) => item.id !== kr.id) })}
              />
            ))}
          </div>
          <button type="button" className={`${GHOST_BTN} mt-2 text-blue-600 dark:text-blue-400`} onClick={() => update({ keyResults: [...draft.keyResults, emptyKeyResult()] })}>
            <FaPlus className="h-2.5 w-2.5" /> Add key result
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
