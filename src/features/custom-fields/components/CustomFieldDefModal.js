import React, { useMemo, useState } from "react";
import { FaArrowDown, FaArrowUp, FaPlus, FaTimes, FaTrash } from "react-icons/fa";
import { TASK_TYPE_OPTIONS } from "../../../shared/constants/taskMeta";
import { useEscapeKey } from "../../board/hooks/useEscapeKey";
import { ToggleSwitch } from "../../automation/components/automationControls";
import CustomFieldInput from "./CustomFieldInput";
import {
  CUSTOM_FIELD_TYPES,
  MAX_CARD_FIELDS,
  OPTION_COLORS,
  createFieldOptionId,
  isOptionFieldType,
  normalizeCustomFieldValue,
  validateCustomFieldDef,
} from "../../../shared/utils/customFields";

const INPUT_CLS = "w-full px-3 py-2 border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#141720] text-slate-800 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";
const LABEL_CLS = "block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5";

function emptyDraft(projectId) {
  return {
    projectId,
    name: "",
    description: "",
    type: "text",
    options: [],
    required: false,
    defaultValue: null,
    appliesToTypes: [],
    showOnCard: false,
  };
}

function ErrorText({ children }) {
  if (!children) return null;
  return <p className="mt-1 text-[11px] text-red-500 dark:text-red-400">{children}</p>;
}

function FlagRow({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2.5 rounded-lg border border-slate-100 dark:border-[#2a3044] bg-white dark:bg-[#141720]">
      <div>
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</div>
        {description && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{description}</div>}
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} label={label} />
    </div>
  );
}

/**
 * Create / edit dialog for one custom field definition. The type can only be
 * chosen when creating (stored values depend on it).
 */
export default function CustomFieldDefModal({
  open,
  field,
  projectId,
  existingDefs,
  cardFieldCount = 0,
  members,
  users,
  onSave,
  onClose,
}) {
  const isEditing = Boolean(field?.id);
  const [draft, setDraft] = useState(() => (field ? {
    ...emptyDraft(projectId),
    ...field,
    options: (field.options || []).map((option) => ({ ...option })),
    appliesToTypes: [...(field.appliesToTypes || [])],
  } : emptyDraft(projectId)));
  const [submitted, setSubmitted] = useState(false);
  const [newOptionLabel, setNewOptionLabel] = useState("");

  useEscapeKey(onClose, open);

  const validation = useMemo(
    () => validateCustomFieldDef(draft, existingDefs, { ignoreId: field?.id }),
    [draft, existingDefs, field?.id]
  );
  const errors = submitted ? validation.errors : {};
  const patch = (next) => setDraft((prev) => ({ ...prev, ...next }));
  const hasOptions = isOptionFieldType(draft.type);
  // A preview definition for the default-value editor (only labelled options).
  const previewDef = useMemo(() => ({
    ...draft,
    id: "default",
    name: "Default value",
    options: (draft.options || []).filter((option) => String(option.label || "").trim()),
  }), [draft]);
  const cardLimitReached = !draft.showOnCard && cardFieldCount >= MAX_CARD_FIELDS && !(isEditing && field.showOnCard);

  if (!open) return null;

  const changeType = (type) => {
    if (isEditing) return;
    patch({
      type,
      defaultValue: null,
      options: isOptionFieldType(type) && draft.options.length === 0
        ? [
          { id: createFieldOptionId(), label: "", color: OPTION_COLORS[1] },
        ]
        : draft.options,
    });
  };

  const updateOption = (optionId, next) => patch({
    options: draft.options.map((option) => (option.id === optionId ? { ...option, ...next } : option)),
  });
  const removeOption = (optionId) => patch({
    options: draft.options.filter((option) => option.id !== optionId),
    defaultValue: Array.isArray(draft.defaultValue)
      ? draft.defaultValue.filter((id) => id !== optionId)
      : draft.defaultValue === optionId ? null : draft.defaultValue,
  });
  const moveOption = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= draft.options.length) return;
    const options = [...draft.options];
    [options[index], options[target]] = [options[target], options[index]];
    patch({ options });
  };
  const addOption = () => {
    const label = newOptionLabel.trim();
    if (!label) return;
    patch({
      options: [...draft.options, {
        id: createFieldOptionId(),
        label,
        color: OPTION_COLORS[(draft.options.length + 1) % OPTION_COLORS.length],
      }],
    });
    setNewOptionLabel("");
  };

  const toggleType = (type) => patch({
    appliesToTypes: draft.appliesToTypes.includes(type)
      ? draft.appliesToTypes.filter((item) => item !== type)
      : [...draft.appliesToTypes, type],
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.ok) return;
    onSave({
      ...draft,
      options: hasOptions ? draft.options : [],
      defaultValue: normalizeCustomFieldValue(previewDef, draft.defaultValue) ?? null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? `Edit field ${field.name}` : "New custom field"}
        onSubmit={handleSubmit}
        className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1a1f2e] shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#252b3b]">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">{isEditing ? "Edit custom field" : "New custom field"}</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">Fields appear on every task of this project they apply to.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838]">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cf-def-name" className={LABEL_CLS}>Name</label>
              <input
                id="cf-def-name"
                autoFocus
                value={draft.name}
                onChange={(event) => patch({ name: event.target.value })}
                placeholder="e.g. Severity, Customer, Environment"
                className={`${INPUT_CLS} ${errors.name ? "!border-red-400" : ""}`}
                maxLength={60}
              />
              <ErrorText>{errors.name}</ErrorText>
            </div>
            <div>
              <label htmlFor="cf-def-description" className={LABEL_CLS}>Help text <span className="font-normal text-slate-400">(optional)</span></label>
              <input
                id="cf-def-description"
                value={draft.description || ""}
                onChange={(event) => patch({ description: event.target.value })}
                placeholder="Shown as a tooltip on the field"
                className={INPUT_CLS}
                maxLength={200}
              />
            </div>
          </div>

          <div>
            <span className={LABEL_CLS}>Type {isEditing && <span className="font-normal text-slate-400">(cannot be changed after creation)</span>}</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Field type">
              {CUSTOM_FIELD_TYPES.map((type) => {
                const active = draft.type === type.value;
                return (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    key={type.value}
                    disabled={isEditing && !active}
                    onClick={() => changeType(type.value)}
                    className={`text-left px-3 py-2 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      active
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-slate-200 dark:border-[#2a3044] hover:border-slate-300 dark:hover:border-slate-500"
                    }`}
                  >
                    <div className={`text-sm font-medium ${active ? "text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-200"}`}>{type.label}</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">{type.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {hasOptions && (
            <div>
              <span className={LABEL_CLS}>Options</span>
              <div className="space-y-1.5">
                {draft.options.map((option, index) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label={`Color for ${option.label || `option ${index + 1}`}`}
                      value={option.color || OPTION_COLORS[0]}
                      onChange={(event) => updateOption(option.id, { color: event.target.value })}
                      className="w-7 h-7 rounded cursor-pointer border border-slate-200 dark:border-[#2a3044] bg-transparent flex-shrink-0"
                    />
                    <input
                      aria-label={`Option ${index + 1} label`}
                      value={option.label}
                      onChange={(event) => updateOption(option.id, { label: event.target.value })}
                      placeholder={`Option ${index + 1}`}
                      className={`${INPUT_CLS} py-1.5`}
                      maxLength={60}
                    />
                    <button type="button" aria-label={`Move ${option.label || "option"} up`} disabled={index === 0} onClick={() => moveOption(index, -1)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30">
                      <FaArrowUp className="w-3 h-3" />
                    </button>
                    <button type="button" aria-label={`Move ${option.label || "option"} down`} disabled={index === draft.options.length - 1} onClick={() => moveOption(index, 1)} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30">
                      <FaArrowDown className="w-3 h-3" />
                    </button>
                    <button type="button" aria-label={`Remove ${option.label || "option"}`} onClick={() => removeOption(option.id)} className="p-1.5 text-slate-400 hover:text-red-500">
                      <FaTrash className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  aria-label="New option"
                  value={newOptionLabel}
                  onChange={(event) => setNewOptionLabel(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addOption(); } }}
                  placeholder="Add an option and press Enter"
                  className={`${INPUT_CLS} py-1.5`}
                  maxLength={60}
                />
                <button type="button" onClick={addOption} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#232838] text-slate-600 dark:text-slate-300 rounded-lg text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-colors flex-shrink-0">
                  <FaPlus className="w-3 h-3" /> Add
                </button>
              </div>
              {isEditing && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Removing an option clears it from tasks that use it.</p>}
              <ErrorText>{errors.options}</ErrorText>
            </div>
          )}

          <div>
            <span className={LABEL_CLS}>Default value <span className="font-normal text-slate-400">(prefilled on new tasks)</span></span>
            <CustomFieldInput
              def={previewDef}
              value={draft.defaultValue ?? undefined}
              onChange={(value) => patch({ defaultValue: value ?? null })}
              members={members}
              users={users}
            />
            <ErrorText>{errors.defaultValue}</ErrorText>
          </div>

          <div>
            <span className={LABEL_CLS}>Applies to task types <span className="font-normal text-slate-400">(none selected = all types)</span></span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Applies to task types">
              {TASK_TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = draft.appliesToTypes.includes(option.value);
                return (
                  <button
                    type="button"
                    key={option.value}
                    aria-pressed={active}
                    onClick={() => toggleType(option.value)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      active
                        ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
                        : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
                    }`}
                  >
                    <Icon className={`w-3 h-3 ${option.color}`} />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <FlagRow
              label="Required"
              description="New tasks can't be created without a value; existing tasks show a warning."
              checked={Boolean(draft.required)}
              onChange={(value) => patch({ required: value })}
            />
            <FlagRow
              label="Show on card"
              description={cardLimitReached
                ? `Kanban cards show at most ${MAX_CARD_FIELDS} fields. Turn one off first.`
                : `Show the value as a chip on Kanban cards and as a table column (max ${MAX_CARD_FIELDS}).`}
              checked={Boolean(draft.showOnCard)}
              disabled={cardLimitReached}
              onChange={(value) => patch({ showOnCard: value })}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-[#252b3b] bg-slate-50/70 dark:bg-[#141720]/60 rounded-b-2xl">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838]">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            {isEditing ? "Save field" : "Create field"}
          </button>
        </div>
      </form>
    </div>
  );
}
