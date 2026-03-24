import { z } from "zod";

// ── Sprint schema ──────────────────────────────────────────────────────────────
export const sprintSchema = z
  .object({
    name:      z.string().min(1, "Sprint name is required"),
    goal:      z.string().optional().default(""),
    startDate: z.string().min(1, "Start date is required"),
    endDate:   z.string().min(1, "End date is required"),
  })
  .refine(
    (d) => !d.startDate || !d.endDate || new Date(d.endDate) > new Date(d.startDate),
    { message: "End date must be after start date", path: ["endDate"] }
  );

// ── Planned sprint schema (same rules, no status field needed) ─────────────────
export const plannedSprintSchema = sprintSchema;

// ── Task schema (used for validation in create mode) ──────────────────────────
export const taskSchema = z.object({
  title:       z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().optional().default(""),
  type:        z.enum(["task", "bug", "story", "feature", "improvement", "chore"]).default("task"),
  priority:    z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status:      z.string().default("todo"),
  assignedTo:  z.string().default("unassigned"),
  dueDate:     z.string().optional().default(""),
  storyPoint:  z.union([z.number().min(0), z.literal("")]).optional(),
});
