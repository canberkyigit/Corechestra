import {
  generateSubtasks,
  getPriorityColor,
  getRetroItemColor,
  normalizeStatus,
  generateId,
  getSprintLabel,
} from "../../utils/helpers";

// ─── generateSubtasks ─────────────────────────────────────────────────────────
describe("generateSubtasks", () => {
  it("generates between 3 and 5 subtasks by default", () => {
    for (let i = 0; i < 30; i++) {
      const result = generateSubtasks("Test Task");
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.length).toBeLessThanOrEqual(5);
    }
  });

  it("respects custom min and max parameters", () => {
    for (let i = 0; i < 20; i++) {
      const result = generateSubtasks("Task", 2, 4);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.length).toBeLessThanOrEqual(4);
    }
  });

  it("generates exactly count when min === max", () => {
    const result = generateSubtasks("Fixed Task", 3, 3);
    expect(result.length).toBe(3);
  });

  it("each subtask has id, title, and done fields", () => {
    const result = generateSubtasks("My Task");
    result.forEach((sub) => {
      expect(sub).toHaveProperty("id");
      expect(sub).toHaveProperty("title");
      expect(sub).toHaveProperty("done");
    });
  });

  it("subtask titles are numbered correctly", () => {
    const result = generateSubtasks("My Task", 3, 3);
    expect(result[0].title).toBe("Subtask 1");
    expect(result[1].title).toBe("Subtask 2");
    expect(result[2].title).toBe("Subtask 3");
  });

  it("subtask IDs contain slugified title", () => {
    const result = generateSubtasks("Hello World", 3, 3);
    result.forEach((sub, i) => {
      expect(sub.id).toContain("hello_world");
      expect(sub.id).toContain(`_sub_${i + 1}`);
    });
  });

  it("done field is a boolean", () => {
    const result = generateSubtasks("Task");
    result.forEach((sub) => {
      expect(typeof sub.done).toBe("boolean");
    });
  });

  it("handles multi-word titles in ID generation", () => {
    const result = generateSubtasks("Fix Login Bug", 1, 1);
    expect(result[0].id).toBe("fix_login_bug_sub_1");
  });
});

// ─── getPriorityColor ─────────────────────────────────────────────────────────
describe("getPriorityColor", () => {
  it("returns a red-based class for critical priority", () => {
    expect(getPriorityColor("critical")).toContain("red");
  });

  it("returns an orange-based class for high priority", () => {
    expect(getPriorityColor("high")).toContain("orange");
  });

  it("returns a yellow-based class for medium priority", () => {
    expect(getPriorityColor("medium")).toContain("yellow");
  });

  it("returns a green-based class for low priority", () => {
    expect(getPriorityColor("low")).toContain("green");
  });

  it("is case-insensitive", () => {
    expect(getPriorityColor("CRITICAL")).toBe(getPriorityColor("critical"));
    expect(getPriorityColor("HIGH")).toBe(getPriorityColor("high"));
    expect(getPriorityColor("MEDIUM")).toBe(getPriorityColor("medium"));
    expect(getPriorityColor("LOW")).toBe(getPriorityColor("low"));
  });

  it("falls back to medium for unknown priority", () => {
    const medium = getPriorityColor("medium");
    expect(getPriorityColor("unknown")).toBe(medium);
    expect(getPriorityColor("extreme")).toBe(medium);
  });

  it("falls back to medium when called with null", () => {
    expect(getPriorityColor(null)).toBe(getPriorityColor("medium"));
  });

  it("falls back to medium when called with undefined", () => {
    expect(getPriorityColor(undefined)).toBe(getPriorityColor("medium"));
  });

  it("returns a non-empty string", () => {
    ["critical", "high", "medium", "low"].forEach((p) => {
      expect(getPriorityColor(p).length).toBeGreaterThan(0);
    });
  });
});

// ─── getRetroItemColor ────────────────────────────────────────────────────────
describe("getRetroItemColor", () => {
  it('returns "white" for score 0', () => {
    expect(getRetroItemColor(0)).toBe("white");
  });

  it("returns a green HSL (hue 120) for negative scores", () => {
    const color = getRetroItemColor(-5);
    expect(color).toMatch(/^hsl\(120,/);
  });

  it("returns a red HSL (hue 0) for positive scores", () => {
    const color = getRetroItemColor(5);
    expect(color).toMatch(/^hsl\(0,/);
  });

  it("clamps scores above 10 to the same result as 10", () => {
    expect(getRetroItemColor(10)).toBe(getRetroItemColor(15));
    expect(getRetroItemColor(10)).toBe(getRetroItemColor(100));
  });

  it("clamps scores below -10 to the same result as -10", () => {
    expect(getRetroItemColor(-10)).toBe(getRetroItemColor(-15));
    expect(getRetroItemColor(-10)).toBe(getRetroItemColor(-100));
  });

  it("returns a string for all valid scores", () => {
    [-10, -5, -1, 0, 1, 5, 10].forEach((score) => {
      expect(typeof getRetroItemColor(score)).toBe("string");
    });
  });

  it("returns different colors for different positive scores", () => {
    expect(getRetroItemColor(1)).not.toBe(getRetroItemColor(5));
    expect(getRetroItemColor(5)).not.toBe(getRetroItemColor(10));
  });

  it("returns different colors for different negative scores", () => {
    expect(getRetroItemColor(-1)).not.toBe(getRetroItemColor(-5));
    expect(getRetroItemColor(-5)).not.toBe(getRetroItemColor(-10));
  });
});

// ─── normalizeStatus ──────────────────────────────────────────────────────────
describe("normalizeStatus", () => {
  it("converts to lowercase", () => {
    expect(normalizeStatus("DONE")).toBe("done");
    expect(normalizeStatus("InProgress")).toBe("inprogress");
    expect(normalizeStatus("REVIEW")).toBe("review");
  });

  it("removes spaces", () => {
    expect(normalizeStatus("in progress")).toBe("inprogress");
    expect(normalizeStatus("to do")).toBe("todo");
    expect(normalizeStatus("awaiting customer")).toBe("awaitingcustomer");
  });

  it("removes dashes", () => {
    expect(normalizeStatus("in-progress")).toBe("inprogress");
    expect(normalizeStatus("awaiting-customer")).toBe("awaitingcustomer");
  });

  it("handles mixed spaces and dashes", () => {
    expect(normalizeStatus("In-Progress Mode")).toBe("inprogressmode");
  });

  it("returns empty string for null", () => {
    expect(normalizeStatus(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(normalizeStatus(undefined)).toBe("");
  });

  it("returns empty string for empty string input", () => {
    expect(normalizeStatus("")).toBe("");
  });

  it("does not alter already-normalized statuses", () => {
    expect(normalizeStatus("done")).toBe("done");
    expect(normalizeStatus("todo")).toBe("todo");
    expect(normalizeStatus("inprogress")).toBe("inprogress");
  });
});

// ─── generateId ───────────────────────────────────────────────────────────────
describe("generateId", () => {
  it('starts with "CY-"', () => {
    expect(generateId()).toMatch(/^CY-/);
  });

  it("has a numeric suffix in range 0–99999", () => {
    const id = generateId();
    const suffix = Number(id.replace("CY-", ""));
    expect(suffix).toBeGreaterThanOrEqual(0);
    expect(suffix).toBeLessThan(100000);
  });

  it("returns a string", () => {
    expect(typeof generateId()).toBe("string");
  });

  it("generates unique IDs across multiple calls", () => {
    const ids = Array.from({ length: 50 }, generateId);
    const unique = new Set(ids);
    // With 50 calls across range 0-99999, very likely to have > 45 unique values
    expect(unique.size).toBeGreaterThan(40);
  });
});

// ─── getSprintLabel ───────────────────────────────────────────────────────────
describe("getSprintLabel", () => {
  it("returns empty string for null sprint", () => {
    expect(getSprintLabel(null)).toBe("");
  });

  it("returns empty string for undefined sprint", () => {
    expect(getSprintLabel(undefined)).toBe("");
  });

  it('returns "Active Sprint" when sprint.value is "active"', () => {
    expect(getSprintLabel({ value: "active", label: "Sprint 86" })).toBe(
      "Active Sprint"
    );
  });

  it("returns sprint label for non-active sprint", () => {
    expect(getSprintLabel({ value: "completed", label: "Sprint 85" })).toBe(
      "Sprint 85"
    );
  });

  it("returns sprint label for planned sprint", () => {
    expect(getSprintLabel({ value: "planned", label: "Sprint 87" })).toBe(
      "Sprint 87"
    );
  });

  it("returns empty string when label is missing and value is not active", () => {
    expect(getSprintLabel({ value: "planned" })).toBe("");
  });
});
