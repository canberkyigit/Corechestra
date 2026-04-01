const { test, expect } = require("@playwright/test");
const { gotoSeeded } = require("../helpers/corechestra");

test.describe("docs tree workflows", () => {
  test("creates a root page, creates a child page, and posts a comment", async ({ page }) => {
    const rootTitle = `E2E Root ${Date.now()}`;
    const childTitle = `E2E Child ${Date.now()}`;
    const commentText = "Docs flow verified in Playwright";

    await gotoSeeded(page, "/docs", { sessionRole: "admin" });

    await expect(page.getByText(/documentation/i)).toBeVisible();

    await page.getByTitle(/new page/i).click();
    await page.getByRole("button", { name: /blank page/i }).click();
    await page.getByPlaceholder(/page title/i).fill(rootTitle);
    await page.getByRole("button", { name: /^create$/i }).click();

    await expect(page.getByTestId(/docs-tree-node-/).filter({ hasText: rootTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: rootTitle })).toBeVisible();

    await page.getByRole("button", { name: /add child page/i }).last().click();
    await page.getByRole("button", { name: /meeting notes/i }).click();
    await page.getByPlaceholder(/page title/i).fill(childTitle);
    await page.getByRole("button", { name: /^create$/i }).click();

    await expect(page.getByTestId(/docs-tree-node-/).filter({ hasText: childTitle })).toBeVisible();
    await expect(page.getByRole("heading", { name: childTitle })).toBeVisible();

    await page.getByPlaceholder(/add a comment/i).fill(commentText);
    await page.getByRole("button", { name: /post comment/i }).click();

    await expect(page.getByText(commentText)).toBeVisible();
  });
});
