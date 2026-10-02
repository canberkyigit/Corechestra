const { test, expect } = require("@playwright/test");
const { gotoSeeded, expectBoardLoaded } = require("../helpers/corechestra");

function readDomains(page) {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem("corechestra_e2e_domains") || "{}"));
}

async function readFieldDefs(page) {
  const domains = await readDomains(page);
  return (domains.entities?.customFieldDefs || []).map((def) => ({
    name: def.name,
    type: def.type,
    showOnCard: def.showOnCard,
    options: (def.options || []).map((option) => option.label),
  }));
}

async function readTaskFields(page, taskId) {
  const domains = await readDomains(page);
  const task = (domains.tasks?.activeTasks || []).find((item) => item.id === taskId);
  return task?.customFields || null;
}

test.describe("custom fields", () => {
  test("admin defines a select field, sets it on a task, sees it on the card and filters by it", async ({ page }) => {
    await gotoSeeded(page, "/board", { sessionRole: "admin" });
    await expectBoardLoaded(page);

    // 1. Define the field in Board Settings.
    await page.getByRole("button", { name: "Board Settings", exact: true }).click();
    const manager = page.getByTestId("custom-fields-manager");
    await manager.getByRole("button", { name: /new field/i }).click();

    const dialog = page.getByRole("dialog", { name: "New custom field" });
    await dialog.getByLabel("Name").fill("Severity");
    await dialog.getByRole("radio", { name: /^Select/ }).click();
    await dialog.getByLabel("Option 1 label").fill("High");
    await dialog.getByLabel("New option").fill("Low");
    await dialog.getByLabel("New option").press("Enter");
    await dialog.getByRole("switch", { name: "Show on card" }).click();
    await dialog.getByRole("button", { name: "Create field" }).click();

    await expect(manager.getByText("Severity", { exact: true })).toBeVisible();
    await expect.poll(() => readFieldDefs(page)).toEqual([
      { name: "Severity", type: "select", showOnCard: true, options: ["High", "Low"] },
    ]);

    // 2. Set a value from the task detail modal.
    await page.getByRole("button", { name: /^active sprint$/i }).click();
    await page.getByTestId("task-card-task-1").click();
    const modal = page.getByTestId("task-detail-modal");
    const fields = modal.getByTestId("task-custom-fields");
    await fields.getByRole("button", { name: "None" }).click();
    await page.getByRole("option", { name: "High" }).click();
    await modal.getByRole("button", { name: /save changes/i }).click();

    await expect.poll(async () => {
      const values = await readTaskFields(page, "task-1");
      return values ? Object.keys(values).length : 0;
    }).toBe(1);
    await modal.getByRole("button", { name: "Activity", exact: true }).click();
    await expect(modal.getByText('set "Severity" to High')).toBeVisible();
    await modal.getByText("Close", { exact: true }).click();

    // 3. Card chip + board filter.
    await expect(page.getByTestId("task-card-fields-task-1")).toContainText("High");
    await page.getByLabel("Filter by field").selectOption({ label: "Severity" });
    await page.getByLabel("Severity value").selectOption({ label: "High" });
    await expect(page.getByTestId("task-card-task-1")).toBeVisible();
    await expect(page.getByTestId("task-card-task-2")).toHaveCount(0);
    await page.getByRole("button", { name: "Clear field filter" }).click();
    await expect(page.getByTestId("task-card-task-2")).toBeVisible();

    // 4. Survives a reload.
    await page.reload();
    await expectBoardLoaded(page);
    await expect(page.getByTestId("task-card-fields-task-1")).toContainText("High");
  });

  test("members can't manage fields", async ({ page }) => {
    await gotoSeeded(page, "/board", { sessionRole: "member" });
    await expectBoardLoaded(page);
    await page.getByRole("button", { name: "Board Settings", exact: true }).click();
    const manager = page.getByTestId("custom-fields-manager");
    await expect(manager.getByText(/Manage project custom fields/)).toBeVisible();
    await expect(manager.getByRole("button", { name: /new field/i })).toHaveCount(0);
  });
});
