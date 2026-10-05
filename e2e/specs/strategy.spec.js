const { test, expect } = require("@playwright/test");
const { gotoSeeded } = require("../helpers/corechestra");

test.describe("strategy: goals, portfolio and Maestro", () => {
  test("creates a goal, checks in and sees it on the portfolio", async ({ page }) => {
    await gotoSeeded(page, "/goals", { sessionRole: "admin" });
    await expect(page.getByRole("heading", { name: "Goals", exact: true })).toBeVisible();

    await page.getByRole("button", { name: /New goal/ }).first().click();
    const editor = page.getByRole("dialog", { name: "Set an objective" });
    await editor.getByPlaceholder(/What do you want to achieve/).fill("Ship the mobile beta");
    await editor.getByRole("tab", { name: "Project" }).click();
    await editor.locator("select").first().selectOption({ label: "Corechestra" });
    await editor.getByLabel("Key result 1 title").fill("Beta testers onboarded");
    await editor.getByRole("button", { name: "Create goal" }).click();

    const card = page.getByTestId("goal-card").filter({ hasText: "Ship the mobile beta" });
    await expect(card).toBeVisible();
    await card.click();
    const drawer = page.getByRole("dialog", { name: "Ship the mobile beta" });
    await drawer.getByLabel("Current value of Beta testers onboarded").fill("40");
    await drawer.getByLabel("Current value of Beta testers onboarded").press("Enter");
    await expect(drawer).toContainText("40%");
    await drawer.getByRole("radio", { name: "At risk" }).click();
    await drawer.getByLabel("Check-in note").fill("Waiting on store review");
    await drawer.getByRole("button", { name: "Post check-in" }).click();
    await expect(drawer).toContainText("Waiting on store review");
    await page.keyboard.press("Escape");
    await expect(card).toContainText("At risk");

    await page.getByRole("navigation").getByText("Portfolio", { exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Portfolio", exact: true })).toBeVisible();
    const projectCard = page.getByTestId("portfolio-card").filter({ hasText: "Corechestra" });
    await expect(projectCard).toContainText("1 goal");
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

  test("viewers can read goals but not edit them", async ({ page }) => {
    await gotoSeeded(page, "/goals", { sessionRole: "viewer" });
    await expect(page.getByRole("heading", { name: "Goals", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /New goal/ })).toHaveCount(0);
  });

  test("Maestro is a preview that never sends messages", async ({ page }) => {
    await gotoSeeded(page, "/dashboard", { sessionRole: "admin" });
    await page.getByTestId("maestro-launcher").click();
    await expect(page).toHaveURL(/tab=maestro/);
    await expect(page.getByTestId("maestro-tab")).toContainText("Sprint 86");

    await page.getByTestId("maestro-suggestion").first().click();
    await expect(page.getByLabel("Message Maestro")).toHaveValue(/Summarize Sprint 86/);
    await page.getByRole("button", { name: "Send to Maestro" }).click();
    await expect(page.getByRole("status")).toContainText("isn't connected to an AI model yet");
  });
});
