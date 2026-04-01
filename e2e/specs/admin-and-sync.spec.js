const { test, expect } = require("@playwright/test");
const { gotoSeeded, installCorechestraSeed, loginFromUI, expectBoardLoaded } = require("../helpers/corechestra");

test.describe("admin roles and multi-tab sync", () => {
  test("newly promoted user can access the admin route after signing in again", async ({ page }) => {
    await gotoSeeded(page, "/admin", { sessionRole: "admin" });

    await page.getByRole("button", { name: /access/i }).click();
    await expect(page.getByText(/manage firebase auth user roles/i)).toBeVisible();

    const bobToggle = page.getByTestId("access-role-toggle-uid-member");
    await expect(bobToggle).toHaveText(/make admin/i);
    await bobToggle.click();
    await expect(bobToggle).toHaveText(/make member/i);

    await page.evaluate(() => {
      window.localStorage.removeItem("corechestra_e2e_session");
    });
    const reloginPage = await page.context().newPage();
    await reloginPage.goto("/admin");

    await loginFromUI(reloginPage, "bob@example.com");
    await expect(reloginPage).toHaveURL(/\/admin$/);
    await expect(reloginPage.getByRole("heading", { name: /^admin$/i })).toBeVisible();
  });

  test("syncs task creation across tabs in the same browser context", async ({ browser }) => {
    const context = await browser.newContext();
    await installCorechestraSeed(context, { sessionRole: "admin" });

    const pageOne = await context.newPage();
    const taskTitle = `Sync task ${Date.now()}`;

    await pageOne.goto("/board");
    await expectBoardLoaded(pageOne);

    await pageOne.getByRole("button", { name: /create task/i }).first().click();
    const modal = pageOne.getByTestId("task-detail-modal");
    await modal.locator('input[placeholder*="Task title"]').fill(taskTitle);
    await modal.getByRole("button", { name: /create task/i }).click();

    await expect(pageOne.getByText(taskTitle)).toBeVisible();
    await expect.poll(async () => {
      return pageOne.evaluate(() => {
        const raw = window.localStorage.getItem("corechestra_e2e_domains");
        const domains = raw ? JSON.parse(raw) : {};
        return domains.tasks?.activeTasks?.length || 0;
      });
    }).toBe(4);

    const pageTwo = await context.newPage();
    await pageTwo.goto("/board");
    await expectBoardLoaded(pageTwo);
    await expect(pageTwo.getByText(taskTitle)).toBeVisible({ timeout: 7_000 });

    await context.close();
  });
});
