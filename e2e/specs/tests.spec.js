const { test, expect } = require("@playwright/test");
const { gotoSeeded } = require("../helpers/corechestra");

const DOMAINS_KEY = "corechestra_e2e_domains";

test.describe("test management", () => {
  test("seeds a sample workspace, executes a case with shortcuts and persists the result", async ({ page }) => {
    await gotoSeeded(page, "/tests", { sessionRole: "admin" });

    await expect(page.getByTestId("tests-overview")).toBeVisible();
    await expect(page.getByTestId("kpi-total-cases")).toContainText(/\d+/);

    await page.getByRole("tab", { name: /Repository/ }).click();
    await expect(page.getByTestId("tests-case-table")).toBeVisible();
    await page.getByTestId("tests-case-search").fill("TC-1");
    await expect(page.locator('[data-testid^="tests-case-row-"]').first()).toContainText("Login with valid credentials");

    await page.getByRole("tab", { name: /My Queue/ }).click();
    await page.locator('[data-testid^="tests-queue-start-"]').first().click();
    const runner = page.getByTestId("tests-runner");
    await expect(runner).toBeVisible();
    const title = page.getByTestId("tests-runner-title");
    const before = await title.innerText();

    await page.keyboard.press("p");
    await expect(title).not.toHaveText(before);

    await expect.poll(async () => page.evaluate((key) => {
      const domains = JSON.parse(window.localStorage.getItem(key) || "{}");
      const runs = domains.testing?.testRuns || [];
      return runs.some((run) => (run.results || []).some((result) => result.executedBy === "alice" && Date.now() - Date.parse(result.executedAt) < 120000));
    }, DOMAINS_KEY), { timeout: 10000 }).toBe(true);

    await page.getByRole("button", { name: "Close runner" }).click();
    await page.getByRole("tab", { name: /Reports/ }).click();
    await expect(page.getByTestId("tests-report-document")).toContainText("Test cycle report");
  });

  test("viewers get a read-only test workspace", async ({ page }) => {
    await gotoSeeded(page, "/tests", { sessionRole: "viewer" });
    await expect(page.getByTestId("tests-read-only-hint")).toBeVisible();
    await expect(page.getByTestId("tests-new-case")).toHaveCount(0);
    await expect(page.getByTestId("tests-empty")).toBeVisible();
  });
});
