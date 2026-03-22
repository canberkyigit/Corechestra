import {
  TYPE_OPTIONS,
  TEAM_MEMBERS,
  COLUMNS_DATA,
  STATUS_STYLES,
  TYPE_MAP,
  PRIORITY_OPTIONS,
  PRIORITY_STYLES,
  ASSIGNEE_OPTIONS,
} from "../../constants";

// ─── TYPE_OPTIONS ─────────────────────────────────────────────────────────────
describe("TYPE_OPTIONS", () => {
  it("has 8 options total", () => {
    expect(TYPE_OPTIONS).toHaveLength(8);
  });

  it('first option is "All Types" with empty value', () => {
    expect(TYPE_OPTIONS[0]).toEqual({ value: "", label: "All Types" });
  });

  it("contains feature, task, defect, test, testset, testexecution, precondition", () => {
    const values = TYPE_OPTIONS.map((o) => o.value);
    expect(values).toContain("feature");
    expect(values).toContain("task");
    expect(values).toContain("defect");
    expect(values).toContain("test");
    expect(values).toContain("testset");
    expect(values).toContain("testexecution");
    expect(values).toContain("precondition");
  });

  it("each option has value and label", () => {
    TYPE_OPTIONS.forEach((option) => {
      expect(option).toHaveProperty("value");
      expect(option).toHaveProperty("label");
      expect(typeof option.label).toBe("string");
    });
  });

  it("all values are unique", () => {
    const values = TYPE_OPTIONS.map((o) => o.value);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ─── TEAM_MEMBERS ─────────────────────────────────────────────────────────────
describe("TEAM_MEMBERS", () => {
  it('first option is "All Members" with empty value', () => {
    expect(TEAM_MEMBERS[0]).toEqual({ value: "", label: "All Members" });
  });

  it("includes an unassigned option", () => {
    const unassigned = TEAM_MEMBERS.find((m) => m.value === "unassigned");
    expect(unassigned).toBeDefined();
    expect(unassigned.label).toBe("Unassigned");
  });

  it("includes alice, bob, carol, dave", () => {
    const values = TEAM_MEMBERS.map((m) => m.value);
    expect(values).toContain("alice");
    expect(values).toContain("bob");
    expect(values).toContain("carol");
    expect(values).toContain("dave");
  });

  it("each member has value and label", () => {
    TEAM_MEMBERS.forEach((m) => {
      expect(m).toHaveProperty("value");
      expect(m).toHaveProperty("label");
    });
  });
});

// ─── COLUMNS_DATA ─────────────────────────────────────────────────────────────
describe("COLUMNS_DATA", () => {
  it("has exactly 6 columns", () => {
    expect(COLUMNS_DATA).toHaveLength(6);
  });

  it("contains todo, inprogress, review, awaiting, blocked, done", () => {
    const ids = COLUMNS_DATA.map((c) => c.id);
    expect(ids).toContain("todo");
    expect(ids).toContain("inprogress");
    expect(ids).toContain("review");
    expect(ids).toContain("awaiting");
    expect(ids).toContain("blocked");
    expect(ids).toContain("done");
  });

  it("each column has id and title strings", () => {
    COLUMNS_DATA.forEach((col) => {
      expect(typeof col.id).toBe("string");
      expect(typeof col.title).toBe("string");
      expect(col.id.length).toBeGreaterThan(0);
      expect(col.title.length).toBeGreaterThan(0);
    });
  });

  it("all column ids are unique", () => {
    const ids = COLUMNS_DATA.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ─── STATUS_STYLES ────────────────────────────────────────────────────────────
describe("STATUS_STYLES", () => {
  it("has an entry for every default column status", () => {
    const statuses = ["done", "inprogress", "review", "blocked", "awaiting", "todo"];
    statuses.forEach((s) => {
      expect(STATUS_STYLES[s]).toBeDefined();
    });
  });

  it("done status contains green color classes", () => {
    expect(STATUS_STYLES.done).toContain("green");
  });

  it("inprogress status contains blue color classes", () => {
    expect(STATUS_STYLES.inprogress).toContain("blue");
  });

  it("blocked status contains red color classes", () => {
    expect(STATUS_STYLES.blocked).toContain("red");
  });

  it("each status style is a non-empty string", () => {
    Object.values(STATUS_STYLES).forEach((style) => {
      expect(typeof style).toBe("string");
      expect(style.length).toBeGreaterThan(0);
    });
  });
});

// ─── PRIORITY_OPTIONS ─────────────────────────────────────────────────────────
describe("PRIORITY_OPTIONS", () => {
  it("has exactly 4 priorities", () => {
    expect(PRIORITY_OPTIONS).toHaveLength(4);
  });

  it("contains critical, high, medium, low", () => {
    expect(PRIORITY_OPTIONS).toContain("critical");
    expect(PRIORITY_OPTIONS).toContain("high");
    expect(PRIORITY_OPTIONS).toContain("medium");
    expect(PRIORITY_OPTIONS).toContain("low");
  });

  it("all values are strings", () => {
    PRIORITY_OPTIONS.forEach((p) => {
      expect(typeof p).toBe("string");
    });
  });
});

// ─── PRIORITY_STYLES ──────────────────────────────────────────────────────────
describe("PRIORITY_STYLES", () => {
  it("has an entry for each priority level", () => {
    expect(PRIORITY_STYLES.critical).toBeDefined();
    expect(PRIORITY_STYLES.high).toBeDefined();
    expect(PRIORITY_STYLES.medium).toBeDefined();
    expect(PRIORITY_STYLES.low).toBeDefined();
  });

  it("critical style contains red classes", () => {
    expect(PRIORITY_STYLES.critical).toContain("red");
  });

  it("high style contains orange classes", () => {
    expect(PRIORITY_STYLES.high).toContain("orange");
  });

  it("medium style contains yellow classes", () => {
    expect(PRIORITY_STYLES.medium).toContain("yellow");
  });

  it("low style contains green classes", () => {
    expect(PRIORITY_STYLES.low).toContain("green");
  });

  it("all priority styles are non-empty strings", () => {
    Object.values(PRIORITY_STYLES).forEach((style) => {
      expect(typeof style).toBe("string");
      expect(style.length).toBeGreaterThan(0);
    });
  });

  it("all priority styles are unique", () => {
    const styles = Object.values(PRIORITY_STYLES);
    expect(new Set(styles).size).toBe(styles.length);
  });
});

// ─── TYPE_MAP ─────────────────────────────────────────────────────────────────
describe("TYPE_MAP", () => {
  const requiredTypes = [
    "bug",
    "defect",
    "userstory",
    "investigation",
    "task",
    "feature",
    "epic",
    "test",
    "testset",
    "testexecution",
    "precondition",
  ];

  requiredTypes.forEach((type) => {
    it(`has an entry for type "${type}"`, () => {
      expect(TYPE_MAP[type]).toBeDefined();
    });

    it(`"${type}" entry has label, color, and icon`, () => {
      expect(TYPE_MAP[type]).toHaveProperty("label");
      expect(TYPE_MAP[type]).toHaveProperty("color");
      expect(TYPE_MAP[type]).toHaveProperty("icon");
      expect(typeof TYPE_MAP[type].label).toBe("string");
      expect(typeof TYPE_MAP[type].color).toBe("string");
    });
  });

  it("all type labels are non-empty strings", () => {
    Object.values(TYPE_MAP).forEach((entry) => {
      expect(entry.label.length).toBeGreaterThan(0);
    });
  });
});

// ─── ASSIGNEE_OPTIONS ─────────────────────────────────────────────────────────
describe("ASSIGNEE_OPTIONS", () => {
  it("includes Alice, Bob, Carol, Dave, and Unassigned", () => {
    const names = ASSIGNEE_OPTIONS.map((a) => a.name);
    expect(names).toContain("Alice");
    expect(names).toContain("Bob");
    expect(names).toContain("Carol");
    expect(names).toContain("Dave");
    expect(names).toContain("Unassigned");
  });

  it("each assignee has name and avatar fields", () => {
    ASSIGNEE_OPTIONS.forEach((a) => {
      expect(a).toHaveProperty("name");
      expect(a).toHaveProperty("avatar");
      expect(typeof a.name).toBe("string");
      expect(typeof a.avatar).toBe("string");
    });
  });

  it("all avatar URLs are non-empty strings", () => {
    ASSIGNEE_OPTIONS.forEach((a) => {
      expect(a.avatar.length).toBeGreaterThan(0);
    });
  });
});
