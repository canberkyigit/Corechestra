import {
  EMPTY_FILTER_VALUE,
  buildCardFieldChips,
  buildDefaultCustomFieldValues,
  customFieldSearchText,
  describeCustomFieldChanges,
  fieldAppliesToType,
  formatCustomFieldValue,
  getApplicableCustomFields,
  getCardCustomFields,
  getFieldFilterOptions,
  getMissingRequiredFields,
  isCustomFieldValueEmpty,
  isSameCustomFieldDraft,
  matchesCustomFieldFilter,
  normalizeCustomFieldDefInput,
  normalizeCustomFieldValue,
  normalizeCustomFieldValuesMap,
  setCustomFieldValue,
  stripCustomFieldValues,
  validateCustomFieldDef,
  validateCustomFieldValue,
  validateCustomFieldValues,
  withCustomFieldValues,
} from "./customFields";

const severity = {
  id: "cf-sev",
  projectId: "p1",
  name: "Severity",
  type: "select",
  options: [
    { id: "o-high", label: "High", color: "#dc2626" },
    { id: "o-low", label: "Low", color: "#059669" },
  ],
  order: 1,
  required: true,
  appliesToTypes: ["bug"],
  showOnCard: true,
};
const browsers = {
  id: "cf-br",
  projectId: "p1",
  name: "Browsers",
  type: "multiselect",
  options: [
    { id: "o-ch", label: "Chrome", color: "#2563eb" },
    { id: "o-ff", label: "Firefox", color: "#ea580c" },
  ],
  order: 2,
  appliesToTypes: [],
  showOnCard: true,
};
const customer = { id: "cf-cu", projectId: "p1", name: "Customer", type: "text", order: 0, appliesToTypes: [] };
const estimate = { id: "cf-num", projectId: "p1", name: "Budget", type: "number", order: 3 };
const link = { id: "cf-url", projectId: "p1", name: "Spec", type: "url", order: 4 };
const flagged = { id: "cf-chk", projectId: "p1", name: "Customer facing", type: "checkbox", order: 5, showOnCard: true };
const owner = { id: "cf-usr", projectId: "p1", name: "QA owner", type: "user", order: 6, showOnCard: true };
const archived = { id: "cf-old", projectId: "p1", name: "Old", type: "text", order: 7, archived: true };
const otherProject = { id: "cf-p2", projectId: "p2", name: "Elsewhere", type: "text", order: 0 };
const ALL = [severity, browsers, customer, estimate, link, flagged, owner, archived, otherProject];
const USERS = [{ id: "u1", username: "alice", name: "Alice Admin" }];

describe("custom field applicability", () => {
  it("treats an empty appliesToTypes list as every type", () => {
    expect(fieldAppliesToType(customer, "bug")).toBe(true);
    expect(fieldAppliesToType(severity, "bug")).toBe(true);
    expect(fieldAppliesToType(severity, "task")).toBe(false);
    expect(fieldAppliesToType(severity, undefined)).toBe(false);
  });

  it("returns active project fields for a task type, in order", () => {
    expect(getApplicableCustomFields(ALL, { projectId: "p1", taskType: "task" }).map((def) => def.id))
      .toEqual(["cf-cu", "cf-br", "cf-num", "cf-url", "cf-chk", "cf-usr"]);
    expect(getApplicableCustomFields(ALL, { projectId: "p1", taskType: "bug" }).map((def) => def.id))
      .toEqual(["cf-cu", "cf-sev", "cf-br", "cf-num", "cf-url", "cf-chk", "cf-usr"]);
  });

  it("caps card fields at three", () => {
    expect(getCardCustomFields(ALL, "p1").map((def) => def.id)).toEqual(["cf-sev", "cf-br", "cf-chk"]);
  });
});

describe("custom field values", () => {
  it("normalises editor input per type", () => {
    expect(normalizeCustomFieldValue(estimate, " 12.5 ")).toBe(12.5);
    expect(normalizeCustomFieldValue(estimate, "abc")).toBeUndefined();
    expect(normalizeCustomFieldValue(estimate, "")).toBeUndefined();
    expect(normalizeCustomFieldValue(flagged, false)).toBeUndefined();
    expect(normalizeCustomFieldValue(flagged, true)).toBe(true);
    expect(normalizeCustomFieldValue(browsers, ["o-ch", "o-ch", ""])).toEqual(["o-ch"]);
    expect(normalizeCustomFieldValue(browsers, [])).toBeUndefined();
    expect(normalizeCustomFieldValue(customer, "  Acme  ")).toBe("Acme");
    expect(normalizeCustomFieldValue(owner, "unassigned")).toBeUndefined();
  });

  it("validates formats and option ids", () => {
    expect(validateCustomFieldValue(link, "https://example.com/spec")).toBeNull();
    expect(validateCustomFieldValue(link, "not a url")).toMatch(/valid http/);
    expect(validateCustomFieldValue(link, ["javascript", "alert(1)"].join(":"))).toMatch(/valid http/);
    expect(validateCustomFieldValue(severity, "o-high")).toBeNull();
    expect(validateCustomFieldValue(severity, "o-gone")).toMatch(/unknown option/);
    expect(validateCustomFieldValue(browsers, ["o-ch", "o-x"])).toMatch(/unknown option/);
    expect(validateCustomFieldValue({ id: "d", name: "Due", type: "date" }, "2026-13-45")).toMatch(/valid date|YYYY/);
    expect(validateCustomFieldValue({ id: "d", name: "Due", type: "date" }, "2026-10-02")).toBeNull();
    expect(validateCustomFieldValue(estimate, undefined)).toBeNull();
  });

  it("formats values for display", () => {
    expect(formatCustomFieldValue(severity, "o-high")).toBe("High");
    expect(formatCustomFieldValue(severity, "o-gone")).toBe("");
    expect(formatCustomFieldValue(browsers, ["o-ch", "o-ff"])).toBe("Chrome, Firefox");
    expect(formatCustomFieldValue(flagged, true)).toBe("Yes");
    expect(formatCustomFieldValue(owner, "alice", { users: USERS })).toBe("Alice Admin");
    expect(formatCustomFieldValue(owner, "ghost", { users: USERS })).toBe("ghost");
    expect(formatCustomFieldValue({ id: "d", name: "Due", type: "date" }, "2026-10-02")).toBe("Oct 2, 2026");
  });

  it("sets and removes values without storing empties", () => {
    expect(setCustomFieldValue({ a: 1 }, estimate.id, "3", estimate)).toEqual({ a: 1, "cf-num": 3 });
    expect(setCustomFieldValue({ "cf-num": 3 }, estimate.id, "", estimate)).toEqual({});
    expect(withCustomFieldValues({ id: "t", customFields: { x: "1" } }, {})).toEqual({ id: "t" });
    expect(withCustomFieldValues({ id: "t" }, { x: "", y: "ok" })).toEqual({ id: "t", customFields: { y: "ok" } });
    expect(isCustomFieldValueEmpty(0)).toBe(false);
    expect(isCustomFieldValueEmpty("  ")).toBe(true);
    expect(isSameCustomFieldDraft("", undefined)).toBe(true);
    expect(isSameCustomFieldDraft(3, "3")).toBe(false);
  });

  it("normalises a values map but keeps keys of unknown fields", () => {
    expect(normalizeCustomFieldValuesMap([estimate, customer], {
      "cf-num": "7",
      "cf-cu": "   ",
      "cf-archived-elsewhere": "kept",
    })).toEqual({ "cf-num": 7, "cf-archived-elsewhere": "kept" });
  });

  it("builds defaults only from valid default values", () => {
    expect(buildDefaultCustomFieldValues([
      { ...severity, defaultValue: "o-low" },
      { ...customer, defaultValue: "Acme" },
      { ...estimate, defaultValue: "oops" },
      { ...flagged, defaultValue: false },
    ])).toEqual({ "cf-sev": "o-low", "cf-cu": "Acme" });
  });
});

describe("required checks", () => {
  it("lists required fields without a usable value", () => {
    expect(getMissingRequiredFields([severity, customer], {}).map((def) => def.id)).toEqual(["cf-sev"]);
    expect(getMissingRequiredFields([severity], { "cf-sev": "o-gone" })).toHaveLength(1);
    expect(getMissingRequiredFields([severity], { "cf-sev": "o-high" })).toHaveLength(0);
  });

  it("summarises validation with a readable message", () => {
    const missing = validateCustomFieldValues([severity, { ...customer, required: true }], {});
    expect(missing.ok).toBe(false);
    expect(missing.message).toBe('"Severity", "Customer" are required');
    const invalid = validateCustomFieldValues([link], { "cf-url": "nope" });
    expect(invalid.ok).toBe(false);
    expect(invalid.message).toMatch(/Spec must be a valid/);
    expect(validateCustomFieldValues([severity], { "cf-sev": "o-high" }).ok).toBe(true);
  });
});

describe("definitions", () => {
  it("sanitises definition input", () => {
    const def = normalizeCustomFieldDefInput({
      name: "  Severity  ",
      type: "select",
      options: [{ label: " High " }, { label: "" }, { id: "keep", label: "Low", color: "#000" }],
      required: 1,
      defaultValue: "keep",
      appliesToTypes: ["bug", "bug", ""],
    });
    expect(def.name).toBe("Severity");
    expect(def.options).toHaveLength(2);
    expect(def.options[0]).toMatchObject({ label: "High" });
    expect(def.options[0].id).toMatch(/^opt-/);
    expect(def.options[1]).toEqual({ id: "keep", label: "Low", color: "#000" });
    expect(def.required).toBe(true);
    expect(def.defaultValue).toBe("keep");
    expect(def.appliesToTypes).toEqual(["bug"]);
    expect(normalizeCustomFieldDefInput({ name: "x", type: "bogus" }).type).toBe("text");
    expect(normalizeCustomFieldDefInput({ name: "x", type: "text", options: [{ label: "a" }] }).options).toEqual([]);
  });

  it("validates names, options and defaults", () => {
    expect(validateCustomFieldDef({ name: "", type: "text", projectId: "p1" }).errors.name).toBeTruthy();
    expect(validateCustomFieldDef({ name: "customer", type: "text", projectId: "p1" }, ALL).errors.name).toMatch(/already exists/);
    expect(validateCustomFieldDef({ name: "customer", type: "text", projectId: "p1" }, ALL, { ignoreId: "cf-cu" }).ok).toBe(true);
    // Archived names can be reused.
    expect(validateCustomFieldDef({ name: "Old", type: "text", projectId: "p1" }, ALL).ok).toBe(true);
    expect(validateCustomFieldDef({ name: "S", type: "select", projectId: "p1", options: [] }).errors.options).toBeTruthy();
    expect(validateCustomFieldDef({ name: "S", type: "select", projectId: "p1", options: [{ id: "a", label: "A" }, { id: "b", label: "a" }] }).errors.options).toMatch(/unique/);
    expect(validateCustomFieldDef({ name: "N", type: "number", projectId: "p1", defaultValue: "x" }).errors.defaultValue).toBeTruthy();
  });
});

describe("cards, filters, search", () => {
  const bug = { id: "t1", type: "bug", customFields: { "cf-sev": "o-high", "cf-br": ["o-ff", "o-ch"], "cf-chk": true, "cf-usr": "alice" } };
  const task = { id: "t2", type: "task", customFields: { "cf-sev": "o-high" } };

  it("builds colored chips for applicable card fields", () => {
    expect(buildCardFieldChips(bug, getCardCustomFields(ALL, "p1"))).toEqual([
      { fieldId: "cf-sev", name: "Severity", type: "select", text: "High", color: "#dc2626" },
      { fieldId: "cf-br", name: "Browsers", type: "multiselect", text: "Firefox, Chrome", color: "#ea580c" },
      { fieldId: "cf-chk", name: "Customer facing", type: "checkbox", text: "Customer facing", color: null },
    ]);
    // Severity doesn't apply to plain tasks, so its stale value is hidden.
    expect(buildCardFieldChips(task, getCardCustomFields(ALL, "p1"))).toEqual([]);
  });

  it("matches field filters", () => {
    expect(matchesCustomFieldFilter(bug, { fieldId: "cf-sev", value: "o-high" }, ALL)).toBe(true);
    expect(matchesCustomFieldFilter(task, { fieldId: "cf-sev", value: "o-high" }, ALL)).toBe(false);
    expect(matchesCustomFieldFilter(task, { fieldId: "cf-sev", value: EMPTY_FILTER_VALUE }, ALL)).toBe(true);
    expect(matchesCustomFieldFilter(bug, { fieldId: "cf-br", value: "o-ch" }, ALL)).toBe(true);
    expect(matchesCustomFieldFilter(bug, { fieldId: "cf-chk", value: "checked" }, ALL)).toBe(true);
    expect(matchesCustomFieldFilter(task, { fieldId: "cf-chk", value: EMPTY_FILTER_VALUE }, ALL)).toBe(true);
    expect(matchesCustomFieldFilter(bug, { fieldId: "cf-usr", value: "bob" }, ALL)).toBe(false);
    expect(matchesCustomFieldFilter(bug, { fieldId: "cf-old", value: "x" }, ALL)).toBe(true);
    expect(matchesCustomFieldFilter(bug, { fieldId: "", value: "" }, ALL)).toBe(true);
  });

  it("offers filter choices per type", () => {
    expect(getFieldFilterOptions(flagged).map((option) => option.value)).toEqual(["checked", EMPTY_FILTER_VALUE]);
    expect(getFieldFilterOptions(owner, { members: [{ value: "unassigned", label: "Unassigned" }, { value: "alice", label: "Alice" }] }))
      .toEqual([{ value: "alice", label: "Alice" }, { value: EMPTY_FILTER_VALUE, label: "(No value)" }]);
    expect(getFieldFilterOptions(severity)[0]).toEqual({ value: "o-high", label: "High", color: "#dc2626" });
  });

  it("exposes values to free-text search", () => {
    expect(customFieldSearchText({ customFields: { "cf-cu": "Acme Corp" } }, [customer])).toBe("acme corp");
  });
});

describe("activity + cleanup", () => {
  it("describes field changes with the field name", () => {
    const changes = describeCustomFieldChanges(
      { "cf-sev": "o-low", "cf-cu": "Acme", "cf-chk": true },
      { "cf-sev": "o-high", "cf-usr": "alice" },
      ALL,
      { users: USERS }
    );
    expect(changes.map((change) => change.action)).toEqual([
      'set "Severity" to High',
      'cleared "Customer"',
      'unchecked "Customer facing"',
      'set "QA owner" to Alice Admin',
    ]);
    expect(changes[0]).toMatchObject({ fieldId: "cf-sev", fieldName: "Severity", from: "o-low", to: "o-high" });
    expect(describeCustomFieldChanges({ unknown: 1 }, {}, ALL)).toEqual([]);
    expect(describeCustomFieldChanges({ "cf-cu": "A" }, { "cf-cu": "A" }, ALL)).toEqual([]);
  });

  it("strips deleted field values from a task", () => {
    const task = { id: "t", customFields: { a: 1, b: 2 } };
    expect(stripCustomFieldValues(task, ["a"])).toEqual({ id: "t", customFields: { b: 2 } });
    expect(stripCustomFieldValues(task, ["a", "b"])).toEqual({ id: "t" });
    expect(stripCustomFieldValues(task, ["zzz"])).toBe(task);
  });
});
