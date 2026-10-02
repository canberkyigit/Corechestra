const { test, expect } = require("@playwright/test");
const { gotoSeeded, expectBoardLoaded } = require("../helpers/corechestra");

test("persists Team Capacity after a page reload", async ({ page }) => {
  await gotoSeeded(page, "/board", { sessionRole: "admin" });
  await expectBoardLoaded(page);

  await page.getByRole("button", { name: "Planning", exact: true }).click();
  const aliceCapacity = page.getByRole("slider", { name: "Alice Admin capacity" });

  await expect(aliceCapacity).toHaveValue("80");
  await aliceCapacity.fill("50");
  await expect(aliceCapacity).toHaveValue("50");

  await expect.poll(async () => page.evaluate(() => {
    const domains = JSON.parse(window.localStorage.getItem("corechestra_e2e_domains") || "{}");
    return domains.sprints?.perProjectSprint?.["project-1"]?.teamCapacities?.["uid-admin"];
  })).toBe(50);

  await page.reload();
  await expectBoardLoaded(page);
  await page.getByRole("button", { name: "Planning", exact: true }).click();

  await expect(page.getByRole("slider", { name: "Alice Admin capacity" })).toHaveValue("50");
});
