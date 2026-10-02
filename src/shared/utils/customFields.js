/**
 * Custom fields (Jira / ClickUp style), pure helpers.
 *
 * Definitions live in the store (`customFieldDefs`, Firestore `entities`
 * domain) and are scoped to a project. Values live on the task itself as
 * `task.customFields = { [fieldId]: value }`; only fields that carry a value
 * are stored, so the (single) tasks document stays small.
 *
 * Value shapes per type:
 *   text / textarea / url → string
 *   number                → finite number
 *   date                  → "YYYY-MM-DD"
 *   select                → option id
 *   multiselect           → option id[]
 *   checkbox              → true (unchecked = no value)
 *   user                  → username (same key as `task.assignedTo`)
 */

export const CUSTOM_FIELD_TYPES = [
  { value: "text", label: "Text", description: "Single line of text" },
  { value: "textarea", label: "Long text", description: "Multiple lines of text" },
  { value: "number", label: "Number", description: "Numeric value" },
  { value: "date", label: "Date", description: "Calendar date" },
  { value: "select", label: "Select", description: "One option from a list" },
  { value: "multiselect", label: "Multi-select", description: "Several options from a list" },
  { value: "checkbox", label: "Checkbox", description: "Yes / no flag" },
  { value: "user", label: "Person", description: "A project member" },
  { value: "url", label: "URL", description: "Web link" },
];

export const CUSTOM_FIELD_TYPE_VALUES = CUSTOM_FIELD_TYPES.map((type) => type.value);
export const OPTION_FIELD_TYPES = ["select", "multiselect"];
/** Types the board filter bar can filter by (discrete values only). */
export const FILTERABLE_FIELD_TYPES = ["select", "multiselect", "checkbox", "user"];
export const MAX_CARD_FIELDS = 3;
export const MAX_FIELD_NAME_LENGTH = 60;
export const MAX_TEXT_VALUE_LENGTH = 2000;

/** Special filter value matching tasks where the field has no value. */
export const EMPTY_FILTER_VALUE = "__empty__";

export const OPTION_COLORS = [
  "#64748b", "#2563eb", "#0891b2", "#059669", "#65a30d",
  "#d97706", "#ea580c", "#dc2626", "#db2777", "#7c3aed",
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getCustomFieldTypeLabel(type) {
  return CUSTOM_FIELD_TYPES.find((item) => item.value === type)?.label || type;
}

export function isOptionFieldType(type) {
  return OPTION_FIELD_TYPES.includes(type);
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

export function createCustomFieldId() {
  return `cf-${Date.now().toString(36)}-${randomSuffix()}`;
}

export function createFieldOptionId() {
  return `opt-${Date.now().toString(36)}-${randomSuffix()}`;
}

// ─── Values ──────────────────────────────────────────────────────────────────

export function isCustomFieldValueEmpty(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "number") return !Number.isFinite(value);
  if (typeof value === "boolean") return value === false;
  return false;
}

/**
 * Coerces a raw editor value into the stored shape for `def`. Returns
 * `undefined` for "no value" so callers can drop the key.
 */
export function normalizeCustomFieldValue(def, raw) {
  if (!def) return undefined;
  switch (def.type) {
    case "number": {
      if (raw === "" || raw === null || raw === undefined) return undefined;
      const number = typeof raw === "number" ? raw : Number(String(raw).trim());
      return Number.isFinite(number) ? number : undefined;
    }
    case "checkbox":
      return raw === true || raw === "true" ? true : undefined;
    case "multiselect": {
      const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
      const unique = [...new Set(list.filter(Boolean).map(String))];
      return unique.length > 0 ? unique : undefined;
    }
    case "date": {
      const value = String(raw ?? "").trim();
      return value || undefined;
    }
    case "select":
    case "user": {
      const value = raw === null || raw === undefined ? "" : String(raw);
      return value && value !== "unassigned" ? value : undefined;
    }
    default: {
      // text / textarea / url
      const value = raw === null || raw === undefined ? "" : String(raw);
      const trimmed = def.type === "textarea" ? value.replace(/\s+$/, "") : value.trim();
      return trimmed ? trimmed.slice(0, MAX_TEXT_VALUE_LENGTH) : undefined;
    }
  }
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Returns an error message for an invalid (non-empty) value, else null. */
export function validateCustomFieldValue(def, value) {
  if (!def || isCustomFieldValueEmpty(value)) return null;
  const optionIds = new Set((def.options || []).map((option) => option.id));
  switch (def.type) {
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? null : `${def.name} must be a number`;
    case "date": {
      if (!DATE_PATTERN.test(String(value))) return `${def.name} must be a date (YYYY-MM-DD)`;
      const parsed = new Date(`${value}T00:00:00Z`);
      return Number.isNaN(parsed.getTime()) ? `${def.name} must be a valid date` : null;
    }
    case "url":
      return isValidUrl(String(value)) ? null : `${def.name} must be a valid http(s) URL`;
    case "select":
      return optionIds.has(value) ? null : `${def.name} has an unknown option`;
    case "multiselect":
      return Array.isArray(value) && value.every((item) => optionIds.has(item))
        ? null
        : `${def.name} has an unknown option`;
    case "checkbox":
      return value === true ? null : `${def.name} must be checked or empty`;
    default:
      return typeof value === "string" ? null : `${def.name} must be text`;
  }
}

/**
 * Value a field should show. Select values pointing at a removed option count
 * as empty (the option no longer exists).
 */
export function getEffectiveCustomFieldValue(def, value) {
  if (!def || isCustomFieldValueEmpty(value)) return undefined;
  if (def.type === "select") {
    return (def.options || []).some((option) => option.id === value) ? value : undefined;
  }
  if (def.type === "multiselect") {
    const known = new Set((def.options || []).map((option) => option.id));
    const list = (Array.isArray(value) ? value : [value]).filter((item) => known.has(item));
    return list.length > 0 ? list : undefined;
  }
  return value;
}

/** Returns a new values map with `fieldId` set (or removed when empty). */
export function setCustomFieldValue(values, fieldId, value, def) {
  const next = { ...(values || {}) };
  const normalized = def ? normalizeCustomFieldValue(def, value) : value;
  if (isCustomFieldValueEmpty(normalized)) delete next[fieldId];
  else next[fieldId] = normalized;
  return next;
}

/**
 * Normalises editor drafts (raw strings while typing) for every known field in
 * `defs`. Keys without a definition here (other projects, archived or
 * deleted fields) are kept untouched so no stored value is lost.
 */
export function normalizeCustomFieldValuesMap(defs, values) {
  const byId = new Map((defs || []).map((def) => [def.id, def]));
  const next = {};
  Object.entries(values || {}).forEach(([fieldId, value]) => {
    const def = byId.get(fieldId);
    const normalized = def ? normalizeCustomFieldValue(def, value) : value;
    if (!isCustomFieldValueEmpty(normalized)) next[fieldId] = normalized;
  });
  return next;
}

/** True when two editor drafts represent the same value (empty == empty). */
export function isSameCustomFieldDraft(a, b) {
  if (isCustomFieldValueEmpty(a) && isCustomFieldValueEmpty(b)) return true;
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Drops empty values; returns `undefined` when nothing is left. */
export function compactCustomFieldValues(values) {
  const entries = Object.entries(values || {}).filter(([, value]) => !isCustomFieldValueEmpty(value));
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/** Applies a values map to a task (removes the key entirely when empty). */
export function withCustomFieldValues(task, values) {
  const compact = compactCustomFieldValues(values);
  const next = { ...task };
  if (compact) next.customFields = compact;
  else delete next.customFields;
  return next;
}

export function findOption(def, optionId) {
  return (def?.options || []).find((option) => option.id === optionId) || null;
}

function findUserLabel(users, username) {
  const user = (users || []).find((item) => item && (item.username === username || item.id === username));
  return user?.name || user?.username || username;
}

/** Human readable value ("" when empty). */
export function formatCustomFieldValue(def, value, { users } = {}) {
  const effective = getEffectiveCustomFieldValue(def, value);
  if (effective === undefined) return "";
  switch (def.type) {
    case "select":
      return findOption(def, effective)?.label || "";
    case "multiselect":
      return effective.map((id) => findOption(def, id)?.label).filter(Boolean).join(", ");
    case "checkbox":
      return "Yes";
    case "user":
      return findUserLabel(users, effective);
    case "number":
      return String(effective);
    case "date": {
      const parsed = new Date(`${effective}T00:00:00Z`);
      if (Number.isNaN(parsed.getTime())) return String(effective);
      return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    }
    default:
      return String(effective);
  }
}

// ─── Definitions ─────────────────────────────────────────────────────────────

function normalizeOptions(options) {
  const seen = new Set();
  return (options || [])
    .map((option, index) => ({
      id: option?.id || createFieldOptionId(),
      label: String(option?.label || "").trim().slice(0, MAX_FIELD_NAME_LENGTH),
      color: option?.color || OPTION_COLORS[index % OPTION_COLORS.length],
    }))
    .filter((option) => {
      if (!option.label || seen.has(option.id)) return false;
      seen.add(option.id);
      return true;
    });
}

/**
 * Sanitises editable definition fields (name, type, options, flags, default).
 * Bookkeeping fields (id, projectId, order, createdAt, …) are left to callers.
 */
export function normalizeCustomFieldDefInput(input = {}) {
  const type = CUSTOM_FIELD_TYPE_VALUES.includes(input.type) ? input.type : "text";
  const options = isOptionFieldType(type) ? normalizeOptions(input.options) : [];
  const base = {
    name: String(input.name || "").trim().slice(0, MAX_FIELD_NAME_LENGTH),
    type,
    options,
    required: Boolean(input.required),
    appliesToTypes: [...new Set((input.appliesToTypes || []).filter(Boolean))],
    showOnCard: Boolean(input.showOnCard),
    description: String(input.description || "").trim().slice(0, 200),
  };
  const defaultValue = normalizeCustomFieldValue(base, input.defaultValue);
  const validDefault = defaultValue !== undefined && !validateCustomFieldValue(base, defaultValue)
    ? defaultValue
    : null;
  return { ...base, defaultValue: validDefault };
}

/** Validates a definition draft; returns `{ ok, errors: { field: message } }`. */
export function validateCustomFieldDef(input, existingDefs = [], { ignoreId } = {}) {
  const errors = {};
  const name = String(input?.name || "").trim();
  if (!name) errors.name = "Field name is required";
  else if (name.length > MAX_FIELD_NAME_LENGTH) errors.name = `Use at most ${MAX_FIELD_NAME_LENGTH} characters`;
  else {
    const clash = (existingDefs || []).some((def) => (
      def.id !== ignoreId
      && def.projectId === input.projectId
      && !def.archived
      && String(def.name || "").trim().toLowerCase() === name.toLowerCase()
    ));
    if (clash) errors.name = "A field with this name already exists in the project";
  }
  if (!CUSTOM_FIELD_TYPE_VALUES.includes(input?.type)) errors.type = "Choose a field type";
  if (isOptionFieldType(input?.type)) {
    const labels = (input.options || []).map((option) => String(option?.label || "").trim()).filter(Boolean);
    if (labels.length === 0) errors.options = "Add at least one option";
    else if (new Set(labels.map((label) => label.toLowerCase())).size !== labels.length) {
      errors.options = "Option labels must be unique";
    }
  }
  if (!isCustomFieldValueEmpty(input?.defaultValue) && !errors.options) {
    const normalized = normalizeCustomFieldDefInput(input);
    const value = normalizeCustomFieldValue(normalized, input.defaultValue);
    const error = value === undefined ? "Default value is not valid" : validateCustomFieldValue(normalized, value);
    if (error) errors.defaultValue = "Default value is not valid";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function sortCustomFieldDefs(defs) {
  return [...(defs || [])].sort((a, b) => (
    (a.order ?? 0) - (b.order ?? 0)
    || String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
  ));
}

export function getProjectCustomFieldDefs(defs, projectId, { includeArchived = false } = {}) {
  return sortCustomFieldDefs((defs || []).filter((def) => (
    def && def.projectId === projectId && (includeArchived || !def.archived)
  )));
}

/** True when the field is shown for tasks of `taskType` (empty list = all). */
export function fieldAppliesToType(def, taskType) {
  const types = def?.appliesToTypes || [];
  return types.length === 0 || types.includes(taskType || "task");
}

/** Active (non-archived) fields of a project that apply to a task type, in order. */
export function getApplicableCustomFields(defs, { projectId, taskType }) {
  return getProjectCustomFieldDefs(defs, projectId).filter((def) => fieldAppliesToType(def, taskType));
}

/** Default values of applicable fields (used to prefill the create modal). */
export function buildDefaultCustomFieldValues(defs) {
  const values = {};
  (defs || []).forEach((def) => {
    const value = normalizeCustomFieldValue(def, def.defaultValue);
    if (value !== undefined && !validateCustomFieldValue(def, value)) values[def.id] = value;
  });
  return values;
}

/** Required fields (among `defs`) that have no usable value. */
export function getMissingRequiredFields(defs, values) {
  return (defs || []).filter((def) => (
    def.required && getEffectiveCustomFieldValue(def, values?.[def.id]) === undefined
  ));
}

/**
 * Validates every value for the given (applicable) fields.
 * Returns `{ ok, missing: def[], invalid: [{ def, message }], message }`.
 */
export function validateCustomFieldValues(defs, values) {
  const missing = getMissingRequiredFields(defs, values);
  const invalid = (defs || [])
    .map((def) => ({ def, message: validateCustomFieldValue(def, values?.[def.id]) }))
    .filter((item) => item.message);
  let message = "";
  if (missing.length > 0) {
    const names = missing.map((def) => `"${def.name}"`).join(", ");
    message = missing.length === 1 ? `${names} is required` : `${names} are required`;
  } else if (invalid.length > 0) {
    message = invalid[0].message;
  }
  return { ok: missing.length === 0 && invalid.length === 0, missing, invalid, message };
}

/** Next `order` for a new field in a project. */
export function getNextFieldOrder(defs, projectId) {
  const orders = (defs || []).filter((def) => def.projectId === projectId).map((def) => Number(def.order) || 0);
  return orders.length > 0 ? Math.max(...orders) + 1 : 0;
}

/** Fields of a project shown on Kanban cards (max 3, applicable to the task type). */
export function getCardCustomFields(defs, projectId) {
  return getProjectCustomFieldDefs(defs, projectId).filter((def) => def.showOnCard).slice(0, MAX_CARD_FIELDS);
}

/**
 * Compact chips for a Kanban card: `[{ fieldId, name, text, color }]`.
 * Fields that don't apply to the task type or have no value are skipped.
 */
export function buildCardFieldChips(task, cardFields, { users } = {}) {
  return (cardFields || [])
    .filter((def) => fieldAppliesToType(def, task?.type))
    .map((def) => {
      const value = getEffectiveCustomFieldValue(def, task?.customFields?.[def.id]);
      if (value === undefined) return null;
      let color = null;
      if (def.type === "select") color = findOption(def, value)?.color || null;
      if (def.type === "multiselect") color = findOption(def, value[0])?.color || null;
      const text = def.type === "checkbox" ? def.name : formatCustomFieldValue(def, value, { users });
      return { fieldId: def.id, name: def.name, type: def.type, text, color };
    })
    .filter(Boolean);
}

// ─── Filtering ───────────────────────────────────────────────────────────────

export function isFilterableField(def) {
  return Boolean(def) && FILTERABLE_FIELD_TYPES.includes(def.type);
}

/** Filter choices for a field: `[{ value, label, color? }]`. */
export function getFieldFilterOptions(def, { members = [] } = {}) {
  if (!def) return [];
  if (def.type === "checkbox") {
    return [
      { value: "checked", label: "Checked" },
      { value: EMPTY_FILTER_VALUE, label: "Not checked" },
    ];
  }
  const empty = { value: EMPTY_FILTER_VALUE, label: "(No value)" };
  if (def.type === "user") {
    return [
      ...(members || [])
        .filter((member) => member.value && member.value !== "unassigned")
        .map((member) => ({ value: member.value, label: member.label })),
      empty,
    ];
  }
  return [
    ...(def.options || []).map((option) => ({ value: option.id, label: option.label, color: option.color })),
    empty,
  ];
}

/**
 * True when `task` matches a board field filter `{ fieldId, value }`.
 * Tasks the field doesn't apply to never match a concrete value.
 */
export function matchesCustomFieldFilter(task, filter, defs) {
  if (!filter?.fieldId || !filter.value) return true;
  const def = (defs || []).find((item) => item.id === filter.fieldId);
  if (!def || def.archived) return true;
  const applies = fieldAppliesToType(def, task?.type);
  const value = applies ? getEffectiveCustomFieldValue(def, task?.customFields?.[def.id]) : undefined;
  if (filter.value === EMPTY_FILTER_VALUE) return value === undefined;
  if (value === undefined) return false;
  switch (def.type) {
    case "checkbox":
      return filter.value === "checked" && value === true;
    case "multiselect":
      return value.includes(filter.value);
    default:
      return value === filter.value;
  }
}

/** Free-text search over a task's custom field values. */
export function customFieldSearchText(task, defs, ctx) {
  return (defs || [])
    .map((def) => formatCustomFieldValue(def, task?.customFields?.[def.id], ctx))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// ─── Activity ────────────────────────────────────────────────────────────────

function sameValue(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * Field-level changes between two values maps, for the task activity log.
 * Returns `[{ fieldId, fieldName, from, to, action }]`. Values of fields with
 * no known definition are ignored (orphans are never reported).
 */
export function describeCustomFieldChanges(previousValues, nextValues, defs, ctx = {}) {
  const prev = previousValues || {};
  const next = nextValues || {};
  const ids = [...new Set([...Object.keys(prev), ...Object.keys(next)])];
  return ids
    .map((fieldId) => {
      const def = (defs || []).find((item) => item.id === fieldId);
      if (!def || sameValue(prev[fieldId], next[fieldId])) return null;
      const fromText = formatCustomFieldValue(def, prev[fieldId], ctx);
      const toText = formatCustomFieldValue(def, next[fieldId], ctx);
      if (fromText === toText && isCustomFieldValueEmpty(prev[fieldId]) === isCustomFieldValueEmpty(next[fieldId])) return null;
      let action;
      if (def.type === "checkbox") action = toText ? `checked "${def.name}"` : `unchecked "${def.name}"`;
      else if (!toText) action = `cleared "${def.name}"`;
      else if (def.type === "textarea") action = `updated "${def.name}"`;
      else action = `set "${def.name}" to ${toText}`;
      return {
        fieldId,
        fieldName: def.name,
        from: prev[fieldId] ?? null,
        to: next[fieldId] ?? null,
        action,
      };
    })
    .filter(Boolean);
}

/** Removes the given field ids from a task's values (used by hard delete). */
export function stripCustomFieldValues(task, fieldIds) {
  if (!task?.customFields) return task;
  const ids = new Set(fieldIds);
  const remaining = Object.fromEntries(Object.entries(task.customFields).filter(([id]) => !ids.has(id)));
  if (Object.keys(remaining).length === Object.keys(task.customFields).length) return task;
  return withCustomFieldValues(task, remaining);
}

/** Number of tasks carrying a value for `fieldId`. */
export function countTasksWithFieldValue(tasks, fieldId) {
  return (tasks || []).filter((task) => !isCustomFieldValueEmpty(task?.customFields?.[fieldId])).length;
}
