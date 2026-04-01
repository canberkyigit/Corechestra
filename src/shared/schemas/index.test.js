import { sprintSchema, taskSchema } from "./index";

describe("schemas", () => {
  describe("taskSchema", () => {
    it("accepts the task types used by the UI and coerces story points", () => {
      const result = taskSchema.safeParse({
        title: "Regression coverage",
        description: "Covers the refactor path",
        type: "defect",
        priority: "medium",
        status: "todo",
        assignedTo: "taro",
        dueDate: "2026-04-17",
        storyPoint: "6",
      });

      expect(result.success).toBe(true);
      expect(result.data.storyPoint).toBe(6);
      expect(result.data.type).toBe("defect");
    });

    it("rejects unsupported task types", () => {
      const result = taskSchema.safeParse({
        title: "Legacy type",
        type: "story",
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["type"]);
    });
  });

  describe("sprintSchema", () => {
    it("rejects an end date before the start date", () => {
      const result = sprintSchema.safeParse({
        name: "Sprint 12",
        goal: "Ship stability work",
        startDate: "2026-04-10",
        endDate: "2026-04-05",
      });

      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["endDate"]);
    });
  });
});
