const { test, expect } = require("@playwright/test");
const { gotoSeeded } = require("../helpers/corechestra");

test.describe("dashboard", () => {
  test("shows project health and the merged report tabs", async ({ page }) => {
    await gotoSeeded(page, "/dashboard", { sessionRole: "admin" });

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByTestId("sprint-health-card")).toContainText("Sprint 86");
    await expect(page.getByTestId("kpi-blocked")).toContainText("1");

    await page.getByTestId("kpi-blocked").click();
    await expect(page.getByRole("dialog", { name: /Blocked work items/ })).toContainText("Login bug fix");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("tab", { name: "Sprint" }).click();
    await expect(page).toHaveURL(/tab=sprint/);
    await expect(page.getByTestId("sprint-items")).toContainText("Regression suite cleanup");

    await page.getByRole("tab", { name: "Team" }).click();
    await expect(page.getByTestId("team-table")).toContainText("bob");
  });

  test("old /reports links land on the dashboard sprint report", async ({ page }) => {
    await gotoSeeded(page, "/reports", { sessionRole: "admin" });
    await expect(page).toHaveURL(/\/dashboard\?tab=sprint/);
    await expect(page.getByRole("tab", { name: "Sprint" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("link", { name: "Reports" })).toHaveCount(0);
  });
});
