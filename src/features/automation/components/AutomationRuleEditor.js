import React, { useMemo, useState } from "react";
import {
  FaArrowDown,
  FaArrowUp,
  FaBolt,
  FaCalendarAlt,
  FaCheckDouble,
  FaComment,
  FaExchangeAlt,
  FaFlagCheckered,
  FaPen,
  FaPlay,
  FaPlus,
  FaRocket,
  FaTimes,
  FaTrash,
  FaUserCheck,
} from "react-icons/fa";
import { useEscapeKey } from "../../board/hooks/useEscapeKey";
import { TASK_PRIORITY_OPTIONS, TASK_TYPE_OPTIONS } from "../../../shared/constants/taskMeta";
import {
  ACTION_BY_TYPE,
  ASSIGNEE_MODES,
  AUTOMATION_TRIGGERS,
  CONDITION_FIELDS,
  CONDITION_FIELD_BY_VALUE,
  CONDITION_OPERATORS,
  DEFAULT_ACTION_CONFIG,
  DEFAULT_TRIGGER_CONFIG,
  DUE_DATE_WHEN_OPTIONS,
  NOTIFY_TARGETS,
  SMART_VALUES,
  WATCHED_TASK_FIELDS,
  WATCHER_MODES,
  createAutomationId,
  getActionsForTrigger,
  isTaskScopedTrigger,
} from "../../../shared/automation/automationMeta";
import { validateRule } from "../../../shared/automation/automationEngine";
import { describeRule } from "../../../shared/automation/automationDescribe";
import {
  ChipMultiSelect,
  INLINE_SELECT_CLS,
  INPUT_CLS,
  LABEL_CLS,
  RuleSentence,
  STEP_TONES,
} from "./automationControls";

const TRIGGER_ICONS = {
  task_created: FaPlus,
  status_changed: FaExchangeAlt,
  field_changed: FaPen,
  assigned: FaUserCheck,
  comment_added: FaComment,
  subtasks_completed: FaCheckDouble,
  due_date: FaCalendarAlt,
  sprint_started: FaRocket,
  sprint_completed: FaFlagCheckered,
};

const TYPE_OPTIONS = TASK_TYPE_OPTIONS.map(({ value, label }) => ({ value, label }));
const PRIORITY_OPTIONS = TASK_PRIORITY_OPTIONS.map(({ value, label }) => ({ value, label }));

function emptyDraft(projectId) {
  return {
    name: "",
    description: "",
    projectId,
    enabled: true,
    trigger: { type: "status_changed", config: { ...DEFAULT_TRIGGER_CONFIG.status_changed } },
    conditions: [],
    actions: [],
  };
}

function StepHeader({ tone, step, title, hint }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${STEP_TONES[tone].dot}`}>{step}</span>
      <h3 className={`text-sm font-semibold uppercase tracking-wide ${STEP_TONES[tone].label}`}>{title}</h3>
      {hint && <span className="text-xs text-slate-400 dark:text-slate-500">{hint}</span>}
    </div>
  );
}

function OptionSelect({ value, onChange, options, placeholder, ariaLabel, className = INLINE_SELECT_CLS }) {
  return (
    <select aria-label={ariaLabel} className={className} value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}

// ─── Trigger ────────────────────────────────────────────────────────────────

function TriggerConfig({ trigger, onChange, options }) {
  const config = trigger.config || {};
  const set = (patch) => onChange({ ...trigger, config: { ...config, ...patch } });

  switch (trigger.type) {
    case "status_changed":
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span>from</span>
          <OptionSelect ariaLabel="From status" value={config.from} onChange={(from) => set({ from })} options={options.statuses} placeholder="any status" />
          <span>to</span>
          <OptionSelect ariaLabel="To status" value={config.to} onChange={(to) => set({ to })} options={options.statuses} placeholder="any status" />
        </div>
      );
    case "field_changed":
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span>when</span>
          <OptionSelect ariaLabel="Watched field" value={config.field} onChange={(field) => set({ field })} options={WATCHED_TASK_FIELDS} />
          <span>changes</span>
        </div>
      );
    case "assigned":
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span>to</span>
          <OptionSelect ariaLabel="Assigned to" value={config.to} onChange={(to) => set({ to })} options={options.users} placeholder="anyone" />
        </div>
      );
    case "due_date":
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          {(config.when || "before") === "before" && (
            <input
              type="number"
              min={0}
              max={60}
              aria-label="Days before due date"
              className={`${INLINE_SELECT_CLS} w-20`}
              value={config.days ?? 1}
              onChange={(event) => set({ days: Math.max(0, Number(event.target.value) || 0) })}
            />
          )}
          <OptionSelect ariaLabel="Due date timing" value={config.when || "before"} onChange={(when) => set({ when })} options={DUE_DATE_WHEN_OPTIONS} />
          <span className="w-full text-xs text-slate-400 dark:text-slate-500">
            Checked when the app is open (on load and every 5 minutes). Each task fires once per due date.
          </span>
        </div>
      );
    default:
      return null;
  }
}

function TriggerPicker({ trigger, onChange, options }) {
  const groups = useMemo(() => {
    const map = new Map();
    AUTOMATION_TRIGGERS.forEach((item) => {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group).push(item);
    });
    return [...map.entries()];
  }, []);

  return (
    <div className="space-y-3">
      {groups.map(([group, items]) => (
        <div key={group}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{group}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {items.map((item) => {
              const Icon = TRIGGER_ICONS[item.type] || FaBolt;
              const active = trigger.type === item.type;
              return (
                <button
                  type="button"
                  key={item.type}
                  aria-pressed={active}
                  onClick={() => onChange({ type: item.type, config: { ...(DEFAULT_TRIGGER_CONFIG[item.type] || {}) } })}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${active
                    ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                    : "border-slate-200 dark:border-[#2a3044] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#232838]"}`}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <TriggerConfig trigger={trigger} onChange={onChange} options={options} />
    </div>
  );
}

// ─── Conditions ─────────────────────────────────────────────────────────────

function ConditionValueInput({ condition, onChange, options }) {
  const field = CONDITION_FIELD_BY_VALUE[condition.field];
  if (!field || !CONDITION_OPERATORS[condition.operator]?.needsValue) return null;
  const set = (value) => onChange({ ...condition, value });

  switch (field.input) {
    case "type":
      return <ChipMultiSelect ariaLabel="Condition types" options={TYPE_OPTIONS} value={condition.value} onChange={set} />;
    case "priority":
      return <ChipMultiSelect ariaLabel="Condition priorities" options={PRIORITY_OPTIONS} value={condition.value} onChange={set} />;
    case "status":
      return <ChipMultiSelect ariaLabel="Condition statuses" options={options.statuses} value={condition.value} onChange={set} />;
    case "user":
      return <OptionSelect ariaLabel="Condition person" value={condition.value} onChange={set} options={options.users} placeholder="Choose a person" />;
    case "label":
      return <OptionSelect ariaLabel="Condition label" value={condition.value} onChange={set} options={options.labels} placeholder="Choose a label" />;
    case "epic":
      return <OptionSelect ariaLabel="Condition epic" value={condition.value} onChange={set} options={options.epics} placeholder="Choose an epic" />;
    case "number":
      return (
        <input
          type="number"
          aria-label="Condition number"
          className={`${INLINE_SELECT_CLS} w-24`}
          value={condition.value ?? ""}
          onChange={(event) => set(event.target.value === "" ? "" : Number(event.target.value))}
        />
      );
    case "text":
      return (
        <input
          aria-label="Condition text"
          className={`${INLINE_SELECT_CLS} min-w-[10rem] flex-1`}
          value={condition.value ?? ""}
          placeholder="text…"
          onChange={(event) => set(event.target.value)}
        />
      );
    default:
      return null;
  }
}

function ConditionRow({ condition, index, onChange, onRemove, options }) {
  const field = CONDITION_FIELD_BY_VALUE[condition.field] || CONDITION_FIELDS[0];
  const operatorOptions = field.operators.map((key) => ({ value: key, label: CONDITION_OPERATORS[key].label }));
  return (
    <div className="rounded-lg border border-amber-200/70 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-900/10 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{index === 0 ? "IF" : "AND"}</span>
        <OptionSelect
          ariaLabel={`Condition ${index + 1} field`}
          value={condition.field}
          options={CONDITION_FIELDS.map(({ value, label }) => ({ value, label }))}
          onChange={(nextField) => {
            const meta = CONDITION_FIELD_BY_VALUE[nextField];
            onChange({ ...condition, field: nextField, operator: meta.operators[0], value: "" });
          }}
        />
        <OptionSelect
          ariaLabel={`Condition ${index + 1} operator`}
          value={condition.operator}
          options={operatorOptions}
          onChange={(operator) => onChange({ ...condition, operator })}
        />
        <button
          type="button"
          aria-label={`Remove condition ${index + 1}`}
          onClick={onRemove}
          className="ml-auto rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
        >
          <FaTrash className="h-3 w-3" />
        </button>
      </div>
      <div className="mt-2 empty:hidden">
        <ConditionValueInput condition={condition} onChange={onChange} options={options} />
      </div>
    </div>
  );
}

// ─── Actions ────────────────────────────────────────────────────────────────

function PersonModeFields({ modes, mode, user, onChange, options, ariaPrefix }) {
  return (
    <>
      <OptionSelect ariaLabel={`${ariaPrefix} mode`} value={mode} options={modes} onChange={(next) => onChange({ mode: next })} />
      {mode === "user" && (
        <OptionSelect ariaLabel={`${ariaPrefix} person`} value={user} options={options.users} placeholder="Choose a person" onChange={(next) => onChange({ user: next })} />
      )}
    </>
  );
}

function SmartValueHint({ onInsert }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      <span className="text-[11px] text-slate-400 dark:text-slate-500">Insert:</span>
      {SMART_VALUES.slice(0, 8).map((item) => (
        <button
          type="button"
          key={item.token}
          title={item.label}
          onClick={() => onInsert(item.token)}
          className="rounded border border-slate-200 dark:border-[#2a3044] px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#232838]"
        >
          {item.token}
        </button>
      ))}
    </div>
  );
}

function ActionConfig({ action, onChange, options, triggerType }) {
  const config = action.config || {};
  const set = (patch) => onChange({ ...action, config: { ...config, ...patch } });
  const taskScoped = isTaskScopedTrigger(triggerType);

  switch (action.type) {
    case "set_status":
      return <OptionSelect ariaLabel="New status" value={config.status} options={options.statuses} onChange={(status) => set({ status })} />;
    case "set_priority":
      return <OptionSelect ariaLabel="New priority" value={config.priority} options={PRIORITY_OPTIONS} onChange={(priority) => set({ priority })} />;
    case "set_assignee":
      return <PersonModeFields ariaPrefix="Assignee" modes={ASSIGNEE_MODES} mode={config.mode} user={config.user} options={options} onChange={set} />;
    case "set_story_points":
      return (
        <input
          type="number"
          min={0}
          aria-label="Story points"
          className={`${INLINE_SELECT_CLS} w-24`}
          value={config.value ?? ""}
          onChange={(event) => set({ value: event.target.value === "" ? "" : Number(event.target.value) })}
        />
      );
    case "set_due_date":
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={Boolean(config.clear)} onChange={(event) => set({ clear: event.target.checked })} />
            Clear instead
          </label>
          {!config.clear && (
            <>
              <span>today +</span>
              <input
                type="number"
                aria-label="Due date offset in days"
                className={`${INLINE_SELECT_CLS} w-20`}
                value={config.offsetDays ?? 0}
                onChange={(event) => set({ offsetDays: Number(event.target.value) || 0 })}
              />
              <span>days</span>
            </>
          )}
        </div>
      );
    case "add_label":
    case "remove_label":
      return options.labels.length === 0 ? (
        <span className="text-xs text-slate-400">No labels exist yet. Create labels first.</span>
      ) : (
        <OptionSelect ariaLabel="Label" value={config.labelId} options={options.labels} placeholder="Choose a label" onChange={(labelId) => set({ labelId })} />
      );
    case "add_watcher":
      return <PersonModeFields ariaPrefix="Watcher" modes={WATCHER_MODES} mode={config.mode} user={config.user} options={options} onChange={set} />;
    case "add_comment":
      return (
        <div className="w-full">
          <textarea
            aria-label="Comment text"
            rows={3}
            className={`${INPUT_CLS} resize-y`}
            value={config.text || ""}
            placeholder="Comment posted as Automation…"
            onChange={(event) => set({ text: event.target.value })}
          />
          <SmartValueHint onInsert={(token) => set({ text: `${config.text || ""}${token}` })} />
        </div>
      );
    case "create_subtask":
      return (
        <div className="w-full">
          <input aria-label="Subtask title" className={INPUT_CLS} value={config.title || ""} placeholder="Subtask title" onChange={(event) => set({ title: event.target.value })} />
          <SmartValueHint onInsert={(token) => set({ title: `${config.title || ""}${token}` })} />
        </div>
      );
    case "notify": {
      const targets = taskScoped ? NOTIFY_TARGETS : NOTIFY_TARGETS.filter((item) => ["user", "everyone"].includes(item.value));
      return (
        <div className="w-full space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <OptionSelect ariaLabel="Notify" value={config.to} options={targets} onChange={(to) => set({ to })} />
            {config.to === "user" && (
              <OptionSelect ariaLabel="Notify person" value={config.user} options={options.users} placeholder="Choose a person" onChange={(user) => set({ user })} />
            )}
          </div>
          <input aria-label="Notification message" className={INPUT_CLS} value={config.message || ""} onChange={(event) => set({ message: event.target.value })} />
          <SmartValueHint onInsert={(token) => set({ message: `${config.message || ""}${token}` })} />
        </div>
      );
    }
    case "create_task":
      return (
        <div className="w-full space-y-2">
          <input aria-label="New task title" className={INPUT_CLS} value={config.title || ""} placeholder="Task title" onChange={(event) => set({ title: event.target.value })} />
          <SmartValueHint onInsert={(token) => set({ title: `${config.title || ""}${token}` })} />
          <div className="flex flex-wrap items-center gap-2">
            <OptionSelect ariaLabel="New task type" value={config.type || "task"} options={TYPE_OPTIONS} onChange={(type) => set({ type })} />
            <OptionSelect ariaLabel="New task priority" value={config.priority || "medium"} options={PRIORITY_OPTIONS} onChange={(priority) => set({ priority })} />
            <OptionSelect
              ariaLabel="New task assignee"
              value={config.assigneeMode || "unassigned"}
              options={ASSIGNEE_MODES.filter((mode) => taskScoped || mode.value !== "reporter")}
              onChange={(assigneeMode) => set({ assigneeMode })}
            />
            {config.assigneeMode === "user" && (
              <OptionSelect ariaLabel="New task person" value={config.user} options={options.users} placeholder="Choose a person" onChange={(user) => set({ user })} />
            )}
          </div>
          {!taskScoped && <p className="text-xs text-slate-400 dark:text-slate-500">Sprint rules add the task to the first backlog section.</p>}
        </div>
      );
    default:
      return null;
  }
}

function ActionRow({ action, index, total, onChange, onRemove, onMove, options, triggerType }) {
  return (
    <div className="rounded-lg border border-emerald-200/70 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-900/10 p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">{index + 1}</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{ACTION_BY_TYPE[action.type]?.label || action.type}</span>
        <div className="ml-auto flex items-center gap-0.5">
          <button type="button" aria-label={`Move action ${index + 1} up`} disabled={index === 0} onClick={() => onMove(-1)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#232838] disabled:opacity-30">
            <FaArrowUp className="h-3 w-3" />
          </button>
          <button type="button" aria-label={`Move action ${index + 1} down`} disabled={index === total - 1} onClick={() => onMove(1)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#232838] disabled:opacity-30">
            <FaArrowDown className="h-3 w-3" />
          </button>
          <button type="button" aria-label={`Remove action ${index + 1}`} onClick={onRemove} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
            <FaTrash className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ActionConfig action={action} onChange={onChange} options={options} triggerType={triggerType} />
      </div>
    </div>
  );
}

// ─── Editor ─────────────────────────────────────────────────────────────────

/**
 * Rule builder modal. `initialRule` is an existing rule (edit), a template
 * draft (new from template) or null (blank).
 */
export default function AutomationRuleEditor({
  open,
  initialRule,
  isEditing,
  currentProjectId,
  canManageGlobal,
  options,
  lookups,
  testTasks,
  onSave,
  onTestRun,
  onClose,
}) {
  const [draft, setDraft] = useState(() => ({
    ...emptyDraft(currentProjectId),
    ...(initialRule || {}),
    projectId: initialRule ? (initialRule.projectId ?? null) : currentProjectId,
  }));
  const [showProblems, setShowProblems] = useState(false);
  const [testTaskId, setTestTaskId] = useState("");
  const [addingAction, setAddingAction] = useState("");

  useEscapeKey(onClose, open);

  const problems = useMemo(() => validateRule(draft), [draft]);
  const description = useMemo(() => describeRule(draft, lookups), [draft, lookups]);
  const availableActions = getActionsForTrigger(draft.trigger?.type);
  const taskScoped = isTaskScopedTrigger(draft.trigger?.type);

  if (!open) return null;

  const update = (patch) => setDraft((prev) => ({ ...prev, ...patch }));
  const updateList = (key, index, value) => setDraft((prev) => ({
    ...prev,
    [key]: prev[key].map((item, itemIndex) => (itemIndex === index ? value : item)),
  }));
  const removeFromList = (key, index) => setDraft((prev) => ({
    ...prev,
    [key]: prev[key].filter((_, itemIndex) => itemIndex !== index),
  }));
  const moveAction = (index, delta) => setDraft((prev) => {
    const next = [...prev.actions];
    const target = index + delta;
    if (target < 0 || target >= next.length) return prev;
    [next[index], next[target]] = [next[target], next[index]];
    return { ...prev, actions: next };
  });

  const addCondition = () => setDraft((prev) => ({
    ...prev,
    conditions: [...prev.conditions, { id: createAutomationId("cond"), field: "type", operator: "is", value: "" }],
  }));

  const addAction = (type) => {
    if (!type) return;
    setDraft((prev) => ({
      ...prev,
      actions: [...prev.actions, { id: createAutomationId("act"), type, config: { ...(DEFAULT_ACTION_CONFIG[type] || {}) } }],
    }));
    setAddingAction("");
  };

  const handleSave = () => {
    if (problems.length > 0) {
      setShowProblems(true);
      return;
    }
    onSave({ ...draft, name: draft.name.trim() });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={isEditing ? "Edit automation rule" : "New automation rule"} className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1a1f2e] shadow-2xl animate-modal-enter">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-[#2a3044] px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{isEditing ? "Edit rule" : "New rule"}</p>
            <input
              aria-label="Rule name"
              className="mt-1 w-full bg-transparent text-lg font-semibold text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:outline-none"
              placeholder="Name this rule…"
              value={draft.name}
              autoFocus={!isEditing}
              onChange={(event) => update({ name: event.target.value })}
            />
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#232838]">
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#141720] px-4 py-3">
            <RuleSentence description={description} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL_CLS} htmlFor="automation-scope">Applies to</label>
              <select
                id="automation-scope"
                className={INPUT_CLS}
                value={draft.projectId ? "project" : "global"}
                disabled={!canManageGlobal && !draft.projectId}
                onChange={(event) => update({ projectId: event.target.value === "global" ? null : currentProjectId })}
              >
                <option value="project">This project only</option>
                {(canManageGlobal || !draft.projectId) && <option value="global">All projects</option>}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS} htmlFor="automation-description">Description (optional)</label>
              <input id="automation-description" className={INPUT_CLS} value={draft.description || ""} placeholder="Why does this rule exist?" onChange={(event) => update({ description: event.target.value })} />
            </div>
          </div>

          <section>
            <StepHeader tone="when" step={1} title="When" hint="Pick what starts the rule" />
            <TriggerPicker trigger={draft.trigger} options={options} onChange={(trigger) => update({ trigger })} />
          </section>

          <section>
            <StepHeader tone="if" step={2} title="If" hint="Optional: every condition must match" />
            {!taskScoped ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">Sprint triggers have no task, so conditions are not available.</p>
            ) : (
              <div className="space-y-2">
                {draft.conditions.map((condition, index) => (
                  <ConditionRow
                    key={condition.id || index}
                    condition={condition}
                    index={index}
                    options={options}
                    onChange={(value) => updateList("conditions", index, value)}
                    onRemove={() => removeFromList("conditions", index)}
                  />
                ))}
                <button type="button" onClick={addCondition} className="flex items-center gap-1.5 rounded-lg border border-dashed border-amber-300 dark:border-amber-800/60 px-3 py-1.5 text-sm text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10">
                  <FaPlus className="h-3 w-3" /> Add condition
                </button>
              </div>
            )}
          </section>

          <section>
            <StepHeader tone="then" step={3} title="Then" hint="Actions run top to bottom" />
            <div className="space-y-2">
              {draft.actions.map((action, index) => (
                <ActionRow
                  key={action.id || index}
                  action={action}
                  index={index}
                  total={draft.actions.length}
                  options={options}
                  triggerType={draft.trigger?.type}
                  onChange={(value) => updateList("actions", index, value)}
                  onRemove={() => removeFromList("actions", index)}
                  onMove={(delta) => moveAction(index, delta)}
                />
              ))}
              <div className="flex items-center gap-2">
                <select
                  aria-label="Add action"
                  className={`${INLINE_SELECT_CLS} border-dashed`}
                  value={addingAction}
                  onChange={(event) => addAction(event.target.value)}
                >
                  <option value="">+ Add action…</option>
                  {availableActions.map((action) => (
                    <option key={action.type} value={action.type}>{action.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {showProblems && problems.length > 0 && (
            <div role="alert" className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              <p className="font-medium">Fix these before saving:</p>
              <ul className="mt-1 list-disc pl-5">
                {problems.map((problem) => <li key={problem}>{problem}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 dark:border-[#2a3044] px-6 py-4">
          {taskScoped && onTestRun && (
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <select
                aria-label="Task to run the rule on"
                className={`${INLINE_SELECT_CLS} min-w-0 max-w-[16rem] flex-1`}
                value={testTaskId}
                onChange={(event) => setTestTaskId(event.target.value)}
              >
                <option value="">Run now on a task…</option>
                {testTasks.map((task) => (
                  <option key={task.id} value={task.id}>{task.label}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!testTaskId || problems.length > 0}
                title="Applies the actions to the selected task now (conditions are checked)"
                onClick={() => onTestRun(draft, testTaskId)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#232838] disabled:opacity-40"
              >
                <FaPlay className="h-3 w-3" /> Run
              </button>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 dark:border-[#2a3044] px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#232838]">
              Cancel
            </button>
            <button type="button" onClick={handleSave} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              {isEditing ? "Save changes" : "Create rule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
