const { expect } = require("@playwright/test");
const { createCorechestraSeed } = require("../fixtures/corechestra.fixture");

const DOMAINS_KEY = "corechestra_e2e_domains";
const AUTH_USERS_KEY = "corechestra_e2e_auth_users";
const SESSION_KEY = "corechestra_e2e_session";

async function installCorechestraSeed(target, options = {}) {
  const seed = createCorechestraSeed(options);

  await target.addInitScript(({ seedData, keys }) => {
    if (!window.localStorage.getItem(keys.domains)) {
      window.localStorage.setItem(keys.domains, JSON.stringify(seedData.domains));
    }
    if (!window.localStorage.getItem(keys.authUsers)) {
      window.localStorage.setItem(keys.authUsers, JSON.stringify(seedData.authUsers));
    }
    if (seedData.session && !window.localStorage.getItem(keys.session)) {
      window.localStorage.setItem(keys.session, JSON.stringify(seedData.session));
    }
    if (!seedData.session && !window.localStorage.getItem(keys.session)) {
      window.localStorage.removeItem(keys.session);
    }
  }, {
    seedData: seed,
    keys: {
      domains: DOMAINS_KEY,
      authUsers: AUTH_USERS_KEY,
      session: SESSION_KEY,
    },
  });

  return seed;
}

async function gotoSeeded(page, path = "/", options = {}) {
  const seed = await installCorechestraSeed(page, options);
  await page.goto(path);
  return seed;
}

async function loginFromUI(page, email, password = "password123") {
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

async function expectBoardLoaded(page) {
  await expect(page.getByRole("button", { name: /create task/i }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^active sprint$/i })).toBeVisible();
}

module.exports = {
  installCorechestraSeed,
  gotoSeeded,
  loginFromUI,
  expectBoardLoaded,
};
