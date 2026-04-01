const { test, expect } = require("@playwright/test");
const { gotoSeeded, loginFromUI, expectBoardLoaded } = require("../helpers/corechestra");

test.describe("auth and route guards", () => {
  test("requires login and lets a valid user enter the app", async ({ page }) => {
    await gotoSeeded(page, "/", { sessionRole: null });

    await expect(page.getByText(/welcome back/i)).toBeVisible();

    await loginFromUI(page, "alice@example.com");
    await expectBoardLoaded(page);
  });

  test("redirects a non-admin away from the admin route", async ({ page }) => {
    await gotoSeeded(page, "/admin", { sessionRole: "member" });

    await expect(page).toHaveURL(/\/board$/);
    await expectBoardLoaded(page);
    await expect(page.getByText(/^Admin$/)).toHaveCount(0);
  });
});
