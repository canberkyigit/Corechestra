const { test, expect } = require("@playwright/test");
const { gotoSeeded, expectBoardLoaded } = require("../helpers/corechestra");

function readTask(page, taskId) {
  return page.evaluate((id) => {
    const domains = JSON.parse(window.localStorage.getItem("corechestra_e2e_domains") || "{}");
    const task = (domains.tasks?.activeTasks || []).find((item) => item.id === id);
    return task ? { status: task.status, priority: task.priority } : null;
  }, taskId);
}

test("an automation rule reacts to a board status change", async ({ page }) => {
  await gotoSeeded(page, "/board", { sessionRole: "admin" });
  await expectBoardLoaded(page);

  await page.getByRole("button", { name: "Automation", exact: true }).click();
  await page.getByRole("button", { name: /new rule/i }).click();

  const editor = page.getByRole("dialog", { name: /new automation rule/i });
  await editor.getByLabel("Rule name").fill("Escalate review");
  await editor.getByLabel("To status").selectOption("review");
  await editor.getByLabel("Add action").selectOption("set_priority");
  await editor.getByLabel("New priority").selectOption("critical");
  await expect(editor.getByText("set priority to Critical")).toBeVisible();
  await editor.getByRole("button", { name: "Create rule" }).click();

  await expect(page.getByRole("article", { name: /automation rule escalate review/i })).toBeVisible();

  await page.getByRole("button", { name: /^active sprint$/i }).click();
  await page.getByTitle("List").click();
  await page.getByTitle("Bulk select").click();
  await page.getByText("Regression suite cleanup").click();
  await page.locator("select").filter({ hasText: "Change status…" }).selectOption("review");
  await page.getByRole("button", { name: "Apply", exact: true }).click();

  await expect.poll(() => readTask(page, "task-1")).toEqual({ status: "review", priority: "critical" });

  await page.getByRole("button", { name: "Automation", exact: true }).click();
  const log = page.getByRole("region", { name: "Automation run log" });
  await expect(log.getByText("priority → critical")).toBeVisible();

  await page.reload();
  await expectBoardLoaded(page);
  await page.getByRole("button", { name: "Automation", exact: true }).click();
  await expect(page.getByRole("article", { name: /automation rule escalate review/i })).toContainText("1 run");
});
