const { test, expect } = require("@playwright/test");
const { gotoSeeded, expectBoardLoaded } = require("../helpers/corechestra");

test.describe("board task CRUD", () => {
  test("creates, edits, and deletes a task through the board UI", async ({ page }) => {
    const taskTitle = `E2E task ${Date.now()}`;
    const updatedTitle = `${taskTitle} updated`;

    await gotoSeeded(page, "/board", { sessionRole: "admin" });
    await expectBoardLoaded(page);

    await page.getByRole("button", { name: /create task/i }).first().click();
    const modal = page.getByTestId("task-detail-modal");
    await expect(modal).toBeVisible();

    await modal.locator('input[placeholder*="Task title"]').fill(taskTitle);
    await modal.getByRole("button", { name: /create task/i }).click();

    await expect(page.getByText(taskTitle)).toBeVisible();
    await page.getByText(taskTitle).click();

    await expect(modal).toBeVisible();
    await modal.locator('input[placeholder*="Task title"]').fill(updatedTitle);
    await modal.getByRole("button", { name: /save changes/i }).click();

    await expect(page.getByText(updatedTitle)).toBeVisible();
    await modal.getByTitle(/delete task/i).click();
    await modal.getByRole("button", { name: /^delete$/i }).click();

    await expect(page.getByText(updatedTitle)).toHaveCount(0);
  });
});
