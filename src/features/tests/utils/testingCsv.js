// CSV import/export for test cases (TestRail/Xray-style columns).
//
// Steps cell format: one step per line, "action | test data | expected".
// A line may also be just "action" or "action | | expected". Leading
// numbering ("1." / "1)") is stripped on import.
import {
  AUTOMATION_META,
  CASE_STATUS_META,
  CASE_TYPE_LABELS,
  PRIORITY_META,
} from "../constants/testingConstants";

export const CASE_CSV_COLUMNS = [
  "ID", "Title", "Folder", "Priority", "Type", "Automation", "Status", "Owner",
  "Estimate (min)", "Tags", "Preconditions", "Steps", "Expected Result", "Requirements",
];

/** RFC 4180 parser: quotes, escaped quotes, CR/LF/CRLF, BOM. Returns string[][]. */
export function parseCsv(input) {
  const textValue = String(input || "").replace(/^﻿/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < textValue.length; i += 1) {
    const char = textValue[i];
    if (quoted) {
      if (char === '"') {
        if (textValue[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && textValue[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => String(cell).trim() !== ""));
}

export function csvCell(value) {
  const textValue = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(textValue) ? `"${textValue.replace(/"/g, '""')}"` : textValue;
}

export function toCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function formatStepsCell(steps = [], sharedById = new Map()) {
  return steps.map((step, index) => {
    if (step.sharedStepsId) return `${index + 1}. [Shared] ${sharedById.get(step.sharedStepsId)?.name || step.sharedStepsId}`;
    const parts = [step.action || "", step.data || "", step.expected || ""];
    while (parts.length > 1 && !parts[parts.length - 1]) parts.pop();
    return `${index + 1}. ${parts.join(" | ")}`;
  }).join("\n");
}

export function parseStepsCell(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+\s*[.)]\s*/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const [action = "", data = "", ...rest] = parts;
      return { action, data, expected: rest.join(" | ") };
    })
    .filter((step) => step.action || step.expected);
}

/** Export rows (header + one row per case). */
export function casesToCsv(cases, { pathById = new Map(), taskKeyOf = (id) => id, sharedById = new Map() } = {}) {
  const rows = [CASE_CSV_COLUMNS];
  cases.forEach((testCase) => {
    rows.push([
      testCase.key || "",
      testCase.title,
      (pathById.get(testCase.suiteId) || []).join(" / "),
      PRIORITY_META[testCase.priority]?.label || testCase.priority,
      CASE_TYPE_LABELS[testCase.type] || testCase.type,
      AUTOMATION_META[testCase.automation]?.label || testCase.automation,
      CASE_STATUS_META[testCase.status]?.label || testCase.status,
      testCase.owner || "",
      testCase.estimate || "",
      (testCase.tags || []).join(", "),
      testCase.preconditions || "",
      formatStepsCell(testCase.steps, sharedById),
      testCase.expectedResult || "",
      (testCase.requirementIds || []).map(taskKeyOf).join(", "),
    ]);
  });
  return toCsv(rows);
}

// ── Import ──────────────────────────────────────────────────────────────────

const HEADER_ALIASES = {
  title: ["title", "name", "summary", "test case", "case", "test"],
  folder: ["folder", "section", "suite", "path", "folder path", "section hierarchy"],
  priority: ["priority"],
  type: ["type", "test type", "category"],
  automation: ["automation", "automation status", "automated"],
  status: ["status", "state", "lifecycle"],
  owner: ["owner", "author", "created by", "assignee"],
  estimate: ["estimate", "estimate (min)", "estimate min", "estimated time", "duration"],
  tags: ["tags", "labels", "references", "regression pack"],
  preconditions: ["preconditions", "precondition", "prerequisites"],
  steps: ["steps", "test steps", "steps (step)", "step"],
  expectedResult: ["expected result", "expected", "expected results"],
  description: ["description", "objective"],
};

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function matchOption(raw, map, aliases = {}) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return null;
  if (map[value]) return value;
  if (aliases[value]) return aliases[value];
  const byLabel = Object.entries(map).find(([, meta]) => String(typeof meta === "string" ? meta : meta.label).toLowerCase() === value);
  return byLabel ? byLabel[0] : undefined;
}

const PRIORITY_ALIASES = { p0: "critical", p1: "critical", blocker: "critical", urgent: "critical", p2: "high", major: "high", p3: "medium", normal: "medium", p4: "low", minor: "low", trivial: "low" };
const TYPE_ALIASES = { "end-to-end": "e2e", "end to end": "e2e", ui: "functional", acceptance: "functional", load: "performance" };
const AUTOMATION_ALIASES = { yes: "automated", true: "automated", no: "manual", false: "manual", "to be automated": "to-be-automated", planned: "to-be-automated", "to automate": "to-be-automated" };
const STATUS_ALIASES = { active: "ready", approved: "ready", "needs update": "needs-update", outdated: "needs-update", obsolete: "deprecated", retired: "deprecated", new: "draft", design: "draft" };

/**
 * Parses a cases CSV. Returns { rows, warnings, errors }.
 * rows: [{ line, title, folderPath: string[], priority, type, automation, status, owner, estimate, tags, preconditions, steps, expectedResult, description }]
 */
export function parseCasesCsv(textValue) {
  const table = parseCsv(textValue);
  const errors = [];
  const warnings = [];
  if (table.length < 2) {
    errors.push({ line: 1, message: "The file needs a header row and at least one case." });
    return { rows: [], warnings, errors };
  }
  const header = table[0].map(normalizeHeader);
  const columnOf = {};
  Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
    const index = header.findIndex((cell) => aliases.includes(cell));
    if (index !== -1) columnOf[field] = index;
  });
  if (columnOf.title === undefined) {
    errors.push({ line: 1, message: 'Missing a "Title" column.' });
    return { rows: [], warnings, errors };
  }
  const rows = [];
  table.slice(1).forEach((cells, index) => {
    const line = index + 2;
    const cell = (field) => (columnOf[field] === undefined ? "" : String(cells[columnOf[field]] ?? "").trim());
    const title = cell("title");
    if (!title) {
      warnings.push({ line, message: "Skipped: empty title." });
      return;
    }
    const pick = (field, map, aliases, fallback) => {
      const raw = cell(field);
      const value = matchOption(raw, map, aliases);
      if (value === undefined) {
        warnings.push({ line, message: `Unknown ${field} "${raw}" → ${fallback}.` });
        return fallback;
      }
      return value || fallback;
    };
    const estimate = Number.parseInt(cell("estimate"), 10);
    rows.push({
      line,
      title,
      folderPath: cell("folder").split(/\s*(?:\/|›|>|\\)\s*/).map((part) => part.trim()).filter(Boolean),
      priority: pick("priority", PRIORITY_META, PRIORITY_ALIASES, "medium"),
      type: pick("type", CASE_TYPE_LABELS, TYPE_ALIASES, "functional"),
      automation: pick("automation", AUTOMATION_META, AUTOMATION_ALIASES, "manual"),
      status: pick("status", CASE_STATUS_META, STATUS_ALIASES, "draft"),
      owner: cell("owner") || null,
      estimate: Number.isFinite(estimate) && estimate > 0 ? estimate : null,
      tags: cell("tags").split(/[,;]/).map((tag) => tag.trim()).filter(Boolean),
      preconditions: cell("preconditions"),
      steps: parseStepsCell(cell("steps")),
      expectedResult: cell("expectedResult"),
      description: cell("description"),
    });
  });
  if (!rows.length) errors.push({ line: 2, message: "No importable rows found." });
  return { rows, warnings, errors };
}

/**
 * Turns parsed rows into new suite + case records (pure; ids from `makeId`).
 * Folder paths are resolved against existing suites by name (case-insensitive);
 * missing folders are created. Rows without a folder go into `defaultSuiteId`.
 */
export function buildImportRecords(rows, {
  projectId, suites = [], defaultSuiteId = null, startSeq = 1, startOrder = 0, currentUser = null,
  now = new Date().toISOString(), makeId,
}) {
  const newSuites = [];
  const allSuites = [...suites];
  const findChild = (parentId, name) => allSuites.find((suite) => (suite.parentId || null) === (parentId || null) && suite.name.trim().toLowerCase() === name.toLowerCase());
  const ensurePath = (path) => {
    let parentId = null;
    path.forEach((name) => {
      let node = findChild(parentId, name);
      if (!node) {
        const siblings = allSuites.filter((suite) => (suite.parentId || null) === (parentId || null));
        node = {
          id: makeId("ts"), projectId, parentId, name, description: "", order: siblings.length, owner: currentUser, createdAt: now, updatedAt: now,
        };
        allSuites.push(node);
        newSuites.push(node);
      }
      parentId = node.id;
    });
    return parentId;
  };
  let seq = startSeq;
  let order = startOrder;
  const cases = [];
  rows.forEach((row) => {
    const suiteId = row.folderPath.length ? ensurePath(row.folderPath) : defaultSuiteId;
    if (!suiteId) return;
    const record = {
      id: makeId("tc"),
      projectId,
      suiteId,
      seq,
      order,
      title: row.title,
      priority: row.priority,
      type: row.type,
      automation: row.automation,
      status: row.status,
      owner: row.owner || currentUser,
      tags: row.tags,
      steps: row.steps.map((step, index) => ({ id: `${makeId("s")}${index}`, ...step })),
      createdAt: now,
      updatedAt: now,
    };
    if (row.estimate) record.estimate = row.estimate;
    if (row.preconditions) record.preconditions = row.preconditions;
    if (row.expectedResult) record.expectedResult = row.expectedResult;
    if (row.description) record.description = row.description;
    cases.push(record);
    seq += 1;
    order += 1;
  });
  return { suites: newSuites, cases };
}
