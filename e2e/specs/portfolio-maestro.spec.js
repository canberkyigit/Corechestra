const { test, expect } = require("@playwright/test");
const { gotoSeeded } = require("../helpers/corechestra");

test.describe("portfolio tab and Maestro", () => {
  test("shows project health on the dashboard and posts a status update", async ({ page }) => {
    await gotoSeeded(page, "/portfolio", { sessionRole: "admin" });
    await expect(page).toHaveURL(/\/dashboard\?tab=portfolio/);
    await expect(page.getByRole("tab", { name: "Portfolio" })).toHaveAttribute("aria-selected", "true");

    const projectCard = page.getByTestId("portfolio-card").filter({ hasText: "Corechestra" });
    await expect(projectCard).toBeVisible();
    await projectCard.click();
    const healthDrawer = page.getByRole("dialog", { name: "Corechestra" });
    await expect(healthDrawer).toContainText("Why this health");
    await healthDrawer.getByRole("radio", { name: "Off track" }).click();
    await healthDrawer.getByLabel("Status update summary").fill("Scope cut needed");
    await healthDrawer.getByRole("button", { name: "Post update" }).click();
    await expect(healthDrawer).toContainText("Scope cut needed");
    await page.keyboard.press("Escape");
    await expect(projectCard).toContainText("Off track");
  });

  test("viewers see portfolio health but cannot post updates", async ({ page }) => {
    await gotoSeeded(page, "/dashboard?tab=portfolio", { sessionRole: "viewer" });
    await page.getByTestId("portfolio-card").first().click();
    await expect(page.getByRole("dialog")).toContainText("Why this health");
    await expect(page.getByRole("button", { name: "Post update" })).toHaveCount(0);
  });

  test("Maestro has its own sidebar entry and never sends messages", async ({ page }) => {
    await gotoSeeded(page, "/dashboard", { sessionRole: "admin" });
    await page.getByTestId("nav-maestro").click();
    await expect(page).toHaveURL(/\/maestro$/);
    await expect(page.getByTestId("nav-maestro")).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("maestro-chat")).toContainText("Sprint 86");

    await page.getByTestId("maestro-suggestion").first().click();
    await expect(page.getByLabel("Message Maestro")).toHaveValue(/Summarize Sprint 86/);
    await page.getByRole("button", { name: "Send to Maestro" }).click();
    await expect(page.getByRole("status")).toContainText("isn't connected to an AI model yet");
  });
});
