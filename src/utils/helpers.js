import { PRIORITY_STYLES } from "../constants";

const SUBTASK_TEMPLATES = {
  bug: [
    "Reproduce the issue in local environment",
    "Identify and document root cause",
    "Write a failing test to capture the bug",
    "Implement the fix",
    "Verify fix in staging environment",
  ],
  defect: [
    "Reproduce the issue in local environment",
    "Identify and document root cause",
    "Write a failing test to capture the defect",
    "Implement the fix",
    "Verify fix in staging environment",
  ],
  feature: [
    "Define acceptance criteria",
    "Design UI/UX mockup",
    "Implement backend changes",
    "Build frontend component",
    "Write integration tests",
  ],
  test: [
    "Define test scenarios and scope",
    "Set up test environment",
    "Write test cases",
    "Execute tests",
    "Document and report results",
  ],
  testset: [
    "Identify test scope and coverage",
    "Create test data",
    "Write automated test scripts",
    "Run the full test suite",
    "Analyze and report results",
  ],
  testexecution: [
    "Prepare test environment",
    "Execute smoke tests",
    "Run regression suite",
    "Log defects found",
    "Sign off on results",
  ],
  investigation: [
    "Gather requirements and context",
    "Analyze existing system behavior",
    "Identify bottlenecks and issues",
    "Document findings",
    "Propose recommended solutions",
  ],
  epic: [
    "Break down into user stories",
    "Define MVP scope",
    "Set up project structure",
    "Coordinate with stakeholders",
    "Track delivery progress",
  ],
  userstory: [
    "Define acceptance criteria",
    "Create wireframes",
    "Implement the feature",
    "Write tests",
    "Demo to stakeholders",
  ],
  precondition: [
    "Identify prerequisites",
    "Document required conditions",
    "Validate environment setup",
    "Run prerequisite checks",
    "Confirm readiness",
  ],
  task: [
    "Research and plan approach",
    "Design the solution",
    "Implement changes",
    "Review and test",
    "Deploy and monitor",
  ],
};

const SUBTASK_PRIORITIES = ["high", "medium", "medium", "low", "low"];
const SUBTASK_STORY_POINTS = [3, 2, 2, 1, 1];

export function generateSubtasks(title, type = "task", min = 3, max = 5) {
  const templates = SUBTASK_TEMPLATES[type] || SUBTASK_TEMPLATES.task;
  const count = Math.min(templates.length, Math.floor(Math.random() * (max - min + 1)) + min);
  const doneCount = Math.floor(count * 0.4);
  return templates.slice(0, count).map((subTitle, i) => {
    const done = i < doneCount;
    return {
      id: `${title.replace(/\s+/g, "_").toLowerCase()}_sub_${i + 1}`,
      title: subTitle,
      done,
      status: done ? "done" : i === doneCount ? "inprogress" : "todo",
      priority: SUBTASK_PRIORITIES[i] || "medium",
      storyPoint: SUBTASK_STORY_POINTS[i] || 1,
      assignedTo: "unassigned",
      description: "",
      type: "task",
    };
  });
}

export function getPriorityColor(priority) {
  return PRIORITY_STYLES[(priority || "medium").toLowerCase()] || PRIORITY_STYLES.medium;
}

export function getRetroItemColor(score) {
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const s = clamp(score, -10, 10);
  if (s === 0) return "white";
  if (s < 0) {
    const pct = Math.abs(s) / 10;
    const sat = 70 * (1 - pct);
    const l = 90 + 10 * (1 - pct);
    return `hsl(120,${sat}%,${l}%)`;
  } else {
    const pct = s / 10;
    const sat = 70 * pct;
    const l = 100 - 10 * pct;
    return `hsl(0,${sat}%,${l}%)`;
  }
}

export function normalizeStatus(val) {
  return (val || "").toLowerCase().replace(/[\s-]/g, "");
}

export function generateId() {
  return `CY-${Math.floor(Math.random() * 100000)}`;
}

export function getSprintLabel(sprint) {
  if (!sprint) return "";
  if (sprint.value === "active") return "Active Sprint";
  return sprint.label || "";
}
