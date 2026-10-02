const { test, expect } = require("@playwright/test");
const { gotoSeeded } = require("../helpers/corechestra");

const CHAT_KEY = "corechestra_e2e_chat";
const SHOTS = process.env.CHAT_SCREENSHOT_DIR || null;

function chatSeed() {
  const now = Date.now();
  const dmId = "dm_uid-admin__uid-member";
  return {
    channels: {
      general: {
        id: "general", type: "channel", name: "general", description: "Workspace-wide announcements.", isPrivate: false,
        isDefault: true, memberIds: [], adminIds: [], createdBy: "uid-admin", createdAt: now - 86400000, updatedAt: now,
        lastMessageAt: now - 3600000, seq: 1, archived: false,
      },
      [dmId]: {
        id: dmId, type: "dm", name: "", isPrivate: true, memberIds: ["uid-admin", "uid-member"], adminIds: [],
        createdBy: "uid-member", createdAt: now - 7200000, updatedAt: now, lastMessageAt: now - 60000, seq: 1,
        lastMessage: { id: "seed-dm-1", authorId: "uid-member", preview: "Can you review CY-1001 today?", at: now - 60000 },
      },
    },
    messages: {
      general: {
        "seed-g-1": {
          id: "seed-g-1", channelId: "general", authorId: "uid-member", createdAt: now - 3600000, seq: 1,
          text: "Morning all :wave: the **release checklist** is in `docs/release.md`\n- QA sign-off\n- Changelog", reactions: { "1f44d": ["uid-viewer"] },
        },
      },
      [dmId]: {
        "seed-dm-1": { id: "seed-dm-1", channelId: dmId, authorId: "uid-member", createdAt: now - 60000, seq: 1, text: "Can you review CY-1001 today?", reactions: {} },
      },
    },
    replies: {},
    userState: { "uid-admin": { readSeq: { general: 1 }, lastReadAt: { general: now - 1000 } } },
    inbox: {},
    presence: { "uid-member": { status: "active", lastActiveAt: now, customStatus: { emoji: "🎯", text: "Focusing" } } },
    typing: {},
  };
}

async function seedChat(page, mutate = null) {
  const value = chatSeed();
  if (mutate) mutate(value);
  await page.addInitScript(({ key, data }) => {
    if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, JSON.stringify(data));
  }, { key: CHAT_KEY, data: value });
}

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });
}

test.describe("Chats", () => {
  test("shows unread DMs in the sidebar and clears them on open", async ({ page }) => {
    await seedChat(page);
    await gotoSeeded(page, "/dashboard", { sessionRole: "admin" });
    const nav = page.getByRole("button", { name: /Chats, 1 unread/ });
    await expect(nav).toBeVisible();
    await nav.click();
    await expect(page.getByTestId("chats-page")).toBeVisible();
    await shot(page, "01-general");

    await page.getByTestId("chat-row-dm_uid-admin__uid-member").click();
    await expect(page.getByText("Can you review")).toBeVisible();
    await expect(page.getByRole("button", { name: "CY-1001" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Chats, 1 unread/ })).toHaveCount(0);
    await shot(page, "02-dm");
  });

  test("sends formatted messages, reacts and replies in a thread", async ({ page }) => {
    await seedChat(page);
    await gotoSeeded(page, "/chats?c=general", { sessionRole: "admin" });
    const composer = page.getByTestId("chat-composer-input");
    await composer.fill("Deploy is green :rocket: thanks @Bob Member for the ~~late~~ **quick** fix");
    await composer.press("Enter");

    const list = page.getByTestId("chat-message-list");
    const sent = list.locator("[data-message-id]").filter({ hasText: "Deploy is green" });
    await expect(sent).toBeVisible();
    await expect(sent.getByRole("button", { name: "@Bob Member" })).toBeVisible();
    await expect(sent.locator("strong")).toHaveText("quick");

    await sent.hover();
    await sent.getByRole("button", { name: "React with 👍" }).click();
    await expect(sent.getByRole("button", { name: /👍\s*1/ })).toBeVisible();

    await sent.getByRole("button", { name: "Reply in thread" }).click();
    const reply = page.getByRole("complementary").getByTestId("chat-composer-input");
    await reply.fill("Following up here");
    await reply.press("Enter");
    await expect(page.getByRole("complementary").getByText("Following up here")).toBeVisible();
    await expect(sent.getByRole("button", { name: /1 reply/ })).toBeVisible();
    await shot(page, "03-thread");
  });

  test("creates a channel and sets its topic with a slash command", async ({ page }) => {
    await seedChat(page);
    await gotoSeeded(page, "/chats", { sessionRole: "admin" });
    await page.getByLabel("Add channels").click();
    await page.getByRole("menu").getByText("Create a channel").click();
    await page.getByTestId("chat-channel-name").fill("Release Planning");
    await page.getByTestId("chat-create-channel-next").click();
    await page.getByTestId("chat-create-channel-submit").click();
    await expect(page.getByText("Welcome to #release-planning")).toBeVisible();

    const composer = page.getByTestId("chat-composer-input");
    await composer.fill("/topic Ship v2.4 on Friday");
    await composer.press("Enter");
    await expect(page.locator("header").getByText("Ship v2.4 on Friday")).toBeVisible();
    await shot(page, "04-channel");
  });

  test("renders in dark mode", async ({ page }) => {
    await seedChat(page);
    await gotoSeeded(page, "/chats?c=general", { sessionRole: "admin" });
    await page.getByRole("button", { name: "Dark Mode" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("html")).not.toHaveClass(/dark-transitioning/);
    await expect(page.getByTestId("chat-composer-input")).toBeVisible();
    await page.getByTestId("chat-message-list").locator("[data-message-id]").first().hover();
    await shot(page, "05-dark");
  });

  test("switches between the list and the conversation on phones", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedChat(page);
    await gotoSeeded(page, "/chats", { sessionRole: "admin" });
    await expect(page.getByTestId("chat-row-general")).toBeVisible();
    await shot(page, "06-mobile-list");
    await page.getByTestId("chat-row-general").click();
    await expect(page.getByTestId("chat-composer-input")).toBeVisible();
    await shot(page, "07-mobile-conversation");
    await page.getByRole("button", { name: "Back to conversations" }).click();
    await expect(page.getByTestId("chat-row-general")).toBeVisible();
  });

  test("formats in the rich composer and references docs with [[", async ({ page }) => {
    await seedChat(page);
    await gotoSeeded(page, "/chats?c=general", { sessionRole: "admin" });
    const composer = page.getByTestId("chat-composer-input");
    await expect(composer).toHaveAttribute("contenteditable", "true");
    await composer.click();
    await page.keyboard.type("Please read ");
    await page.keyboard.type("[[Release");
    await expect(page.getByTestId("chat-suggestions")).toContainText("Release Checklist");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Control+b");
    await page.keyboard.type("today");
    await page.keyboard.press("Enter");

    const sent = page.getByTestId("chat-message-list").locator("[data-message-id]").filter({ hasText: "Please read" });
    await expect(sent).toBeVisible();
    await expect(sent.locator("strong")).toHaveText("today");
    await expect(sent.getByRole("button", { name: /Release Checklist/ }).last()).toBeVisible();
    await shot(page, "08-references");
  });

  test("discusses a task from the task panel", async ({ page }) => {
    await seedChat(page);
    await gotoSeeded(page, "/dashboard", { sessionRole: "admin" });
    const search = page.getByPlaceholder(/Search tasks/i);
    await search.fill("Login bug");
    await page.getByRole("button", { name: /Login bug fix/ }).first().click();
    await page.getByRole("button", { name: /^Discussion/ }).click();
    const discussion = page.getByTestId("task-discussion");
    await expect(discussion).toBeVisible();
    await discussion.getByTestId("chat-composer-input").click();
    await page.keyboard.type("Is the redirect race fixed on staging?");
    await page.keyboard.press("Enter");
    await expect(discussion.getByText("Is the redirect race fixed on staging?")).toBeVisible();
    await shot(page, "09-task-discussion");

    await discussion.getByRole("button", { name: /Open in Chats/ }).click();
    await expect(page.getByTestId("chats-page")).toBeVisible();
    await expect(page.getByRole("complementary").getByText("Is the redirect race fixed on staging?")).toBeVisible();
  });

  test("schedules a message for later", async ({ page }) => {
    await seedChat(page);
    await gotoSeeded(page, "/chats?c=general", { sessionRole: "admin" });
    await page.getByTestId("chat-composer-input").click();
    await page.keyboard.type("Standup in 5");
    await page.getByTestId("chat-schedule").click();
    await page.getByRole("menuitem", { name: /In 1 hour/ }).click();
    await expect(page.getByTestId("chat-scheduled-bar")).toContainText("1 message scheduled");
    await page.getByTestId("chat-scheduled-bar").click();
    await expect(page.getByText("Standup in 5")).toBeVisible();
    await shot(page, "10-later-scheduled");
  });

  test("windows long histories", async ({ page }) => {
    await seedChat(page, (seed) => {
      const base = Date.now() - 400 * 60000;
      const messages = {};
      for (let index = 0; index < 400; index += 1) {
        messages[`bulk-${index}`] = {
          id: `bulk-${index}`, channelId: "general", authorId: index % 2 ? "uid-member" : "uid-viewer",
          createdAt: base + index * 60000, seq: index + 2, text: `Bulk message number ${index}`, reactions: {},
        };
      }
      Object.assign(seed.messages.general, messages);
      seed.channels.general.seq = 402;
      seed.userState["uid-admin"].readSeq.general = 402;
    });
    await gotoSeeded(page, "/chats?c=general", { sessionRole: "admin" });
    const list = page.getByTestId("chat-message-list");
    await expect(list.getByText("Bulk message number 399")).toBeVisible();
    await list.getByRole("button", { name: "Load older messages" }).first().click().catch(() => {});
    await page.mouse.wheel(0, -50000);
    await page.waitForTimeout(500);
    await page.mouse.wheel(0, -50000);
    await expect(list).toHaveAttribute("data-virtualized", "true", { timeout: 10000 });
    const rendered = await list.locator("[data-message-id]").count();
    expect(rendered).toBeLessThan(120);
  });

  test("starts and leaves a huddle", async ({ browser }) => {
    const context = await browser.newContext({ permissions: ["microphone", "camera"] });
    const page = await context.newPage();
    await seedChat(page);
    await gotoSeeded(page, "/chats?c=general", { sessionRole: "admin" });
    await page.getByTestId("chat-huddle-button").click();
    const window = page.getByTestId("huddle-window");
    await expect(window).toBeVisible();
    await expect(window).toContainText("Waiting for others to join");
    await expect(page.getByTestId("chat-message-list").getByText(/started a huddle/)).toBeVisible();
    await page.getByTestId("huddle-mute").click();
    await expect(page.getByTestId("huddle-mute")).toHaveAttribute("aria-label", "Unmute");
    await shot(page, "11-huddle");
    await page.getByTestId("huddle-leave").click();
    await expect(window).toHaveCount(0);
    await expect(page.getByTestId("chat-message-list").getByText(/The huddle ended/)).toBeVisible();
    await context.close();
  });
});
