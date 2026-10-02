const { test, expect } = require("@playwright/test");
const { gotoSeeded, installCorechestraSeed, loginFromUI, expectBoardLoaded } = require("../helpers/corechestra");

const PREFS_KEY = (uid) => `corechestra_e2e_user_prefs:${uid}`;

function readPrefs(page, uid) {
  return page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || "null"), PREFS_KEY(uid));
}

function isDark(page) {
  return page.evaluate(() => document.documentElement.classList.contains("dark"));
}

test.describe("per-user preferences (userPrefs/{uid})", () => {
  test("dark mode is personal: saved per uid, kept on reload, not leaked to the next user", async ({ page }) => {
    await gotoSeeded(page, "/board", { sessionRole: "admin" });
    await expectBoardLoaded(page);

    // First visit migrates the legacy personal fields from the shared config doc.
    await expect.poll(async () => (await readPrefs(page, "uid-admin"))?.currentProjectId).toBe("project-1");

    await page.getByTitle("Switch to Dark Mode").click();
    await expect.poll(() => isDark(page)).toBe(true);
    await expect.poll(async () => (await readPrefs(page, "uid-admin"))?.darkMode).toBe(true);
    // The shared workspace config is no longer written.
    const sharedDark = await page.evaluate(() => JSON.parse(window.localStorage.getItem("corechestra_e2e_domains")).config.darkMode);
    expect(sharedDark).toBe(false);

    await page.reload();
    await expectBoardLoaded(page);
    await expect.poll(() => isDark(page)).toBe(true);

    await page.getByTitle("alice@example.com").click();
    await page.getByRole("button", { name: /log out/i }).click();
    await loginFromUI(page, "bob@example.com");
    await expectBoardLoaded(page);

    await expect.poll(() => isDark(page)).toBe(false);
    await expect.poll(async () => (await readPrefs(page, "uid-member"))?.darkMode).toBe(false);
    expect((await readPrefs(page, "uid-admin")).darkMode).toBe(true);
  });

  test("a second tab of the same user follows preference changes", async ({ browser }) => {
    const context = await browser.newContext();
    await installCorechestraSeed(context, { sessionRole: "admin" });

    const pageOne = await context.newPage();
    await pageOne.goto("/board");
    await expectBoardLoaded(pageOne);
    const pageTwo = await context.newPage();
    await pageTwo.goto("/board");
    await expectBoardLoaded(pageTwo);

    await pageOne.getByTitle("Switch to Dark Mode").click();
    await expect.poll(() => isDark(pageTwo), { timeout: 7_000 }).toBe(true);

    await context.close();
  });
});
