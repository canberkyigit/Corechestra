const { test, expect } = require("@playwright/test");
const { gotoSeeded, installCorechestraSeed, loginFromUI, expectBoardLoaded } = require("../helpers/corechestra");

test.describe("admin roles and multi-tab sync", () => {
  test("newly promoted user can access the admin route after signing in again", async ({ page }) => {
    await gotoSeeded(page, "/admin", { sessionRole: "admin" });

    await page.getByRole("button", { name: /access/i }).click();
    await expect(page.getByText(/role changes are security-sensitive/i)).toBeVisible();

    const bobToggle = page.getByTestId("access-role-toggle-uid-member");
    await expect(bobToggle).toHaveValue("member");
    page.once("dialog", (dialog) => dialog.accept());
    await bobToggle.selectOption("admin");
    await expect(bobToggle).toHaveValue("admin");

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

  test("applies the workspace matrix to a member and keeps viewer actions read-only", async ({ browser }) => {
    const context = await browser.newContext();
    await installCorechestraSeed(context, { sessionRole: "admin" });
    const adminPage = await context.newPage();
    await adminPage.goto("/admin");

    await adminPage.getByRole("button", { name: /^workspace$/i }).click();
    const adminWorkspace = adminPage.getByTestId("permission-admin-actions-workspace:manage");
    const viewerEdit = adminPage.getByTestId("permission-viewer-actions-task:edit");
    const memberDocs = adminPage.getByTestId("permission-member-modules-docs");
    const memberCreate = adminPage.getByTestId("permission-member-actions-task:create");

    await expect(adminWorkspace).toBeChecked();
    await expect(adminWorkspace).toBeDisabled();
    await expect(viewerEdit).not.toBeChecked();
    await expect(viewerEdit).toBeDisabled();
    await memberDocs.uncheck();
    await memberCreate.uncheck();

    adminPage.once("dialog", (dialog) => dialog.accept());
    await adminPage.getByTestId("save-workspace-controls").click();
    await expect(adminPage.getByText(/workspace controls saved and synced/i)).toBeVisible();

    await adminPage.evaluate(() => {
      window.localStorage.setItem("corechestra_e2e_session", JSON.stringify({
        uid: "uid-member",
        email: "bob@example.com",
        role: "member",
        name: "Bob Member",
        username: "bob",
      }));
    });
    await adminPage.goto("/docs");
    await expect(adminPage).not.toHaveURL(/\/docs$/);

    await adminPage.goto("/board");
    await expect(adminPage.getByRole("button", { name: /create task/i })).toHaveCount(0);

    await context.close();
  });
});
