// Realistic sample test-management data for one project (demo / empty
// workspaces). Pure and deterministic for the same inputs + `now`.
//
// Rules:
// - Every record has `sample: true`, the project's `projectId`, and an id
//   containing `-sample-` (e.g. `tc-sample-<project>-<n>`).
// - Board tasks are NEVER created. Failures link to EXISTING bug/defect tasks
//   of the project when there are any; requirements link to existing
//   user stories / features / tasks.
// - Testers come from real People records (fallback names otherwise); the
//   current user always gets open work in the active cycles.

const DAY = 86400000;
const FALLBACK_TESTERS = ["elif.kaya", "james.porter", "sofia.rossi", "mert.aydin"];

function slug(value) {
  return String(value || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
}

/** Small seeded PRNG (mulberry32) so samples are stable per project. */
function rng(seedText) {
  let seed = 0;
  for (let i = 0; i < seedText.length; i += 1) seed = (Math.imul(31, seed) + seedText.charCodeAt(i)) | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Repository content ──────────────────────────────────────────────────────

const FOLDERS = [
  { key: "web", name: "Web App", description: "Browser client — end-to-end and functional coverage." },
  { key: "web-auth", parent: "web", name: "Authentication" },
  { key: "web-checkout", parent: "web", name: "Checkout" },
  { key: "web-board", parent: "web", name: "Board" },
  { key: "web-board-dnd", parent: "web-board", name: "Drag & drop" },
  { key: "web-notifications", parent: "web", name: "Notifications" },
  { key: "api", name: "API", description: "Public REST API v2 — contract, security and performance." },
  { key: "api-auth", parent: "api", name: "Auth" },
  { key: "api-tasks", parent: "api", name: "Tasks" },
  { key: "mobile", name: "Mobile", description: "iOS and Android apps." },
  { key: "mobile-onboarding", parent: "mobile", name: "Onboarding" },
];

const SHARED = [
  {
    key: "login-admin",
    name: "Login as admin",
    description: "Signs in with the seeded workspace administrator.",
    steps: [
      "Open the login page || /login || Login form with email and password fields is shown",
      "Enter admin credentials || admin@acme.test / Passw0rd! || Fields accept input; password is masked",
      "Click \"Sign in\" || || Board opens and the admin avatar is shown in the header",
    ],
  },
  {
    key: "create-project",
    name: "Create project",
    description: "Creates an empty Scrum project used as test fixture.",
    steps: [
      "Open Projects and click \"New project\" || || Project wizard opens",
      "Fill name and key || Name: QA Sandbox · Key: QAS || Key is validated as unique",
      "Choose the Scrum template and confirm || || Project board opens with default columns",
    ],
  },
  {
    key: "reset-data",
    name: "Reset test data",
    description: "Restores the staging fixtures before destructive tests.",
    steps: [
      "Call the fixture reset endpoint || POST /internal/fixtures/reset · scope=qa || Response 204 within 10 s",
      "Reload the application || || Seeded projects, users and tasks are present",
    ],
  },
  {
    key: "api-token",
    name: "Obtain API token",
    description: "Client-credentials token for API tests.",
    steps: [
      "Request a token || POST /v2/auth/token · client_id=qa-bot · grant_type=client_credentials || 200 with access_token and expires_in=3600",
      "Store the token for the following requests || Authorization: Bearer <token> || Token is a valid JWT (3 segments)",
    ],
  },
];

// [folder, title, priority, type, automation, status, estimateMin, tags, preconditions, steps, expected]
// steps: "action || data || expected" or "@shared-key"
const CASES = [
  ["web-auth", "Login with valid credentials", "critical", "smoke", "automated", "ready", 5, ["smoke", "auth"], "User alice@acme.test exists and is active.", [
    "Open the login page || /login || Login form is displayed",
    "Enter a valid email and password || alice@acme.test / Passw0rd! || Password is masked",
    "Click \"Sign in\" || || Redirected to the Board within 2 s; user menu shows Alice",
  ], "User is signed in and lands on the Board."],
  ["web-auth", "Invalid password shows an inline error", "high", "functional", "automated", "ready", 4, ["auth", "negative"], "", [
    "Open the login page || /login || Login form is displayed",
    "Enter a valid email with a wrong password || alice@acme.test / wrong-pass || ",
    "Click \"Sign in\" || || Inline error \"Email or password is incorrect\"; no redirect",
  ], ""],
  ["web-auth", "Account locks after 5 failed attempts", "high", "security", "to-be-automated", "ready", 8, ["security", "auth"], "Lockout policy: 5 attempts / 15 minutes.", [
    "Submit a wrong password 5 times || alice@acme.test || Error shown after each attempt",
    "Submit the correct password || Passw0rd! || Message \"Account temporarily locked\" and no session",
    "Wait 15 minutes and retry || || Login succeeds",
  ], "Brute-force protection engages after the 5th failure."],
  ["web-auth", "Remember me keeps the session after browser restart", "medium", "functional", "manual", "ready", 6, ["auth"], "", [
    "@login-admin",
    "Tick \"Remember me\" before signing in || || Checkbox is selected",
    "Close and reopen the browser || || User is still signed in",
  ], ""],
  ["web-auth", "Password reset email flow", "high", "e2e", "manual", "ready", 10, ["auth", "email"], "Mail catcher is reachable at mail.staging.", [
    "Click \"Forgot password\" on the login page || || Reset form opens",
    "Submit the account email || alice@acme.test || Confirmation \"Check your inbox\"",
    "Open the reset link from the email || || New password form opens",
    "Set a new password and sign in || N3w-Passw0rd! || Sign-in succeeds with the new password",
  ], "Password can be reset end to end."],
  ["web-auth", "Logout clears the session", "medium", "smoke", "automated", "ready", 3, ["smoke", "auth"], "", [
    "@login-admin",
    "Open the user menu and click \"Log out\" || || Redirected to /login",
    "Press the browser back button || || Login page stays; protected pages are not shown",
  ], ""],
  ["web-auth", "Disabled account cannot sign in", "high", "security", "manual", "ready", 5, ["security", "auth"], "Account bob@acme.test is disabled by an admin.", [
    "Sign in as the disabled user || bob@acme.test / Passw0rd! || Error \"This account has been disabled\"",
    "Check the audit log as admin || || Failed login is recorded with reason \"disabled\"",
  ], ""],
  ["web-auth", "SSO login with Google Workspace", "medium", "integration", "to-be-automated", "needs-update", 8, ["sso", "auth"], "Google Workspace SSO is configured for acme.test.", [
    "Click \"Continue with Google\" || || Google consent screen opens",
    "Select the acme.test account || qa.sso@acme.test || Redirected back and signed in",
  ], ""],
  ["web-auth", "Login form is fully keyboard accessible", "medium", "accessibility", "manual", "ready", 6, ["a11y"], "", [
    "Tab through the login form || || Focus order: email → password → remember me → sign in",
    "Submit with Enter || || Form submits; focus ring visible on every control",
    "Run axe on /login || || No serious or critical violations",
  ], ""],

  ["web-checkout", "Pay with a saved card", "critical", "e2e", "automated", "ready", 6, ["smoke", "payments"], "Customer has a saved Visa ending 4242.", [
    "@login-admin",
    "Add the Pro plan to the cart || Plan: Pro · 10 seats || Cart total 290.00 USD",
    "Choose the saved card and pay || Visa •••• 4242 || Payment succeeds; receipt page shows order number",
  ], "Order is paid and the subscription is active."],
  ["web-checkout", "3-D Secure challenge succeeds", "critical", "integration", "manual", "ready", 8, ["payments"], "Stripe test mode with 3DS cards.", [
    "Start checkout with a 3DS card || 4000 0027 6000 3184 || 3DS challenge modal opens",
    "Approve the challenge || || Modal closes; payment confirmed",
    "Open Billing → Invoices || || Invoice is marked Paid",
  ], ""],
  ["web-checkout", "Apply a valid discount code", "high", "functional", "automated", "ready", 4, ["payments", "regression"], "", [
    "Open the cart with the Pro plan || || Subtotal 290.00 USD",
    "Apply a discount code || SPRING20 || 20% discount line appears; total 232.00 USD",
  ], ""],
  ["web-checkout", "Expired discount code is rejected", "medium", "functional", "automated", "ready", 3, ["payments", "negative"], "", [
    "Apply an expired code || WINTER19 || Error \"This code has expired\"",
    "Check the total || || Total is unchanged",
  ], ""],
  ["web-checkout", "Guest checkout can create an account", "medium", "e2e", "manual", "ready", 10, ["payments"], "", [
    "Checkout as guest || guest+qa@acme.test || Payment form is shown without login",
    "Tick \"Create an account\" and pay || 4242 4242 4242 4242 || Receipt shows; welcome email is sent",
  ], ""],
  ["web-checkout", "Refund a partial order", "high", "functional", "manual", "ready", 7, ["payments", "billing"], "Order #A-1042 paid with 3 line items.", [
    "Open the order as admin || #A-1042 || Order detail with line items",
    "Refund one line item || Seat add-on · 29.00 USD || Refund confirmation dialog",
    "Confirm the refund || || Status \"Partially refunded\"; credit note generated",
  ], ""],
  ["web-checkout", "Tax is calculated by billing country", "high", "regression", "automated", "ready", 5, ["payments", "tax"], "", [
    "Set billing country to Germany || DE · VAT ID empty || 19% VAT line is added",
    "Add a valid VAT ID || DE811569869 || Reverse charge applied; VAT 0.00",
  ], ""],
  ["web-checkout", "Checkout loads under 2 s on throttled 4G", "medium", "performance", "to-be-automated", "ready", 15, ["performance"], "Lighthouse CI profile \"mobile-4g\".", [
    "Run Lighthouse against /checkout || profile: mobile-4g || Largest Contentful Paint < 2.0 s",
    "Check total blocking time || || TBT < 200 ms",
  ], ""],
  ["web-checkout", "Card number input is masked and validated", "low", "security", "manual", "draft", 4, ["payments", "security"], "", [
    "Type a card number || 4242424242424242 || Displayed as 4242 4242 4242 4242",
    "Enter an invalid card number || 1234 5678 9012 3456 || Inline error \"Card number is invalid\"",
  ], ""],

  ["web-board", "Create a task with quick add", "critical", "smoke", "automated", "ready", 4, ["smoke", "board"], "", [
    "@login-admin",
    "Press C on the board || || Quick-add input focuses in To Do",
    "Type a title and press Enter || Update onboarding copy || Task appears at the top of To Do with a CY- key",
  ], "Task is created in the active sprint."],
  ["web-board", "Edit a task title inline", "medium", "functional", "automated", "ready", 3, ["board"], "", [
    "Double-click a task title on the card || || Title becomes editable",
    "Change the text and press Enter || Update onboarding copy (v2) || New title is saved and shown",
  ], ""],
  ["web-board", "Filter the board by assignee", "medium", "regression", "automated", "ready", 4, ["board", "regression"], "", [
    "Open the assignee filter || || List of project members",
    "Select one assignee || Bob || Only Bob's cards are visible; counters update",
    "Clear the filter || || All cards are visible again",
  ], ""],
  ["web-board", "Bulk move tasks to the next sprint", "high", "regression", "manual", "ready", 8, ["board", "sprints"], "Two sprints exist (active + planned).", [
    "@create-project",
    "Select 3 cards with Shift+click || || Bulk action bar shows \"3 selected\"",
    "Choose \"Move to sprint\" → next sprint || Sprint 87 || Cards leave the active sprint and appear in Sprint 87",
  ], ""],
  ["web-board", "Workflow rule blocks an invalid transition", "high", "functional", "automated", "ready", 5, ["board", "workflow"], "Rule: To Do cannot move directly to Done.", [
    "Drag a To Do card onto Done || || Drop is rejected",
    "Read the message || || Toast explains the workflow rule",
  ], ""],
  ["web-board", "Board renders 500 tasks smoothly", "medium", "performance", "to-be-automated", "ready", 12, ["performance", "board"], "Fixture \"large-board\" (500 tasks) is loaded.", [
    "@reset-data",
    "Open the board and scroll the To Do column || || Scrolling stays at 60 fps; no long tasks > 100 ms",
  ], ""],
  ["web-board", "Export board to legacy XLS (v1)", "low", "functional", "manual", "deprecated", 5, ["export"], "", [
    "Open Board → Export → XLS (legacy) || || XLS file downloads",
  ], "Replaced by CSV export in v2."],
  ["web-board-dnd", "Drag a card between columns updates status", "critical", "regression", "automated", "ready", 4, ["board", "dnd", "regression"], "", [
    "Drag a card from To Do to In Progress || CY-1042 || Card lands in In Progress",
    "Reload the page || || Card is still In Progress; status chip shows In Progress",
  ], ""],
  ["web-board-dnd", "Keyboard drag and drop with Space and arrows", "medium", "accessibility", "manual", "ready", 6, ["a11y", "dnd"], "", [
    "Focus a card and press Space || || Card is lifted; screen reader announces it",
    "Press → twice and Space || || Card moves two columns to the right and is dropped",
  ], ""],
  ["web-board-dnd", "Reorder cards within a column persists", "medium", "functional", "automated", "ready", 4, ["dnd"], "", [
    "Drag the third card to the top of the column || || Order updates immediately",
    "Reload the page || || New order is kept",
  ], ""],

  ["web-notifications", "Mention triggers an in-app notification", "high", "functional", "automated", "ready", 4, ["notifications"], "", [
    "Comment on a task mentioning a teammate || @bob please review || Comment saved with a mention chip",
    "Sign in as the mentioned user || bob@acme.test || Bell shows 1 unread; notification links to the comment",
  ], ""],
  ["web-notifications", "Email digest respects notification preferences", "medium", "integration", "manual", "ready", 10, ["notifications", "email"], "Digest is scheduled daily at 08:00.", [
    "Disable \"Assignments\" email notifications || || Preference saved",
    "Trigger the digest job || POST /internal/jobs/digest || Digest email has no assignment section",
  ], ""],
  ["web-notifications", "Mark all notifications as read", "low", "functional", "automated", "ready", 2, ["notifications"], "", [
    "Open the notification panel with unread items || || Unread badge visible",
    "Click \"Mark all as read\" || || Badge disappears; items are no longer bold",
  ], ""],

  ["api-auth", "POST /auth/token returns a JWT for valid clients", "critical", "api", "automated", "ready", 2, ["api", "smoke"], "", [
    "Send a client-credentials request || client_id=qa-bot · secret=*** || 200 OK",
    "Decode the access token || || Claims contain sub, scope and exp = iat + 3600",
  ], ""],
  ["api-auth", "Expired token returns 401", "high", "api", "automated", "ready", 2, ["api", "negative"], "", [
    "Call GET /v2/tasks with an expired token || exp = now - 60 s || 401 with error=token_expired",
  ], ""],
  ["api-auth", "Refresh token rotation invalidates the old token", "high", "security", "automated", "ready", 3, ["api", "security"], "", [
    "@api-token",
    "Exchange the refresh token || POST /v2/auth/refresh || New token pair returned",
    "Reuse the old refresh token || || 401 invalid_grant; token family revoked",
  ], ""],
  ["api-auth", "Rate limit returns 429 after 100 requests/min", "medium", "api", "automated", "ready", 3, ["api", "limits"], "", [
    "Send 101 requests within one minute || GET /v2/projects || Request 101 returns 429",
    "Check response headers || || Retry-After and X-RateLimit-Remaining=0 present",
  ], ""],
  ["api-auth", "Scoped token cannot access admin endpoints", "high", "security", "automated", "ready", 2, ["api", "security"], "", [
    "Request a token with scope tasks:read || || 200 OK",
    "Call GET /v2/admin/users || || 403 insufficient_scope",
  ], ""],
  ["api-auth", "CORS preflight only allows configured origins", "medium", "security", "to-be-automated", "draft", 4, ["api", "security"], "", [
    "Send OPTIONS from an allowed origin || Origin: https://app.acme.test || Access-Control-Allow-Origin echoes the origin",
    "Send OPTIONS from an unknown origin || Origin: https://evil.example || No CORS headers",
  ], ""],

  ["api-tasks", "GET /tasks paginates with a cursor", "high", "api", "automated", "ready", 3, ["api", "regression"], "Project QAS has 250 tasks.", [
    "@api-token",
    "Request the first page || GET /v2/tasks?limit=100 || 100 items and next_cursor",
    "Follow next_cursor until the end || || 250 unique items in total; last page has no cursor",
  ], ""],
  ["api-tasks", "POST /tasks validates required fields", "high", "api", "automated", "ready", 2, ["api", "negative"], "", [
    "@api-token",
    "Create a task without a title || {\"projectId\":\"QAS\"} || 422 with errors[0].field = title",
  ], ""],
  ["api-tasks", "PATCH /tasks/:id enforces workflow rules", "high", "integration", "automated", "ready", 3, ["api", "workflow"], "", [
    "@api-token",
    "Move a To Do task straight to Done || PATCH {\"status\":\"done\"} || 409 workflow_violation",
    "Move it to In Progress || PATCH {\"status\":\"inprogress\"} || 200 and status updated",
  ], ""],
  ["api-tasks", "DELETE /tasks/:id archives instead of hard delete", "medium", "api", "automated", "ready", 2, ["api"], "", [
    "Delete a task || DELETE /v2/tasks/CY-1042 || 204",
    "Fetch archived tasks || GET /v2/archive/tasks || Task is listed with archivedAt",
  ], ""],
  ["api-tasks", "Webhook fires on task status change", "medium", "integration", "to-be-automated", "ready", 6, ["api", "webhooks"], "Webhook endpoint registered on RequestBin.", [
    "Change a task status via API || PATCH {\"status\":\"review\"} || 200",
    "Inspect the webhook receiver || || task.updated event with HMAC signature within 5 s",
  ], ""],
  ["api-tasks", "Bulk import 1,000 tasks under 5 s", "medium", "performance", "to-be-automated", "ready", 10, ["api", "performance"], "", [
    "@reset-data",
    "POST /v2/tasks/bulk with 1,000 items || fixtures/bulk-1000.json || 202 Accepted",
    "Poll the job until complete || || Job completes in < 5 s with 0 errors",
  ], ""],
  ["api-tasks", "Search filters by label and assignee", "medium", "api", "automated", "ready", 3, ["api"], "", [
    "@api-token",
    "Search with filters || GET /v2/tasks?label=qa&assignee=bob || Only matching tasks returned",
  ], ""],

  ["mobile-onboarding", "First launch shows the onboarding carousel", "high", "smoke", "manual", "ready", 4, ["mobile", "smoke"], "Fresh install of build 3.4.", [
    "Launch the app for the first time || || Carousel with 3 slides is shown",
    "Swipe through all slides || || Page indicator updates; last slide shows \"Get started\"",
  ], ""],
  ["mobile-onboarding", "Skip onboarding goes to sign in", "medium", "functional", "manual", "ready", 2, ["mobile"], "", [
    "Tap \"Skip\" on the first slide || || Sign-in screen opens",
    "Relaunch the app || || Onboarding is not shown again",
  ], ""],
  ["mobile-onboarding", "Push notification permission prompt", "medium", "functional", "manual", "ready", 3, ["mobile", "notifications"], "", [
    "Finish onboarding || || System push permission prompt appears once",
    "Deny the permission || || In-app banner explains how to enable notifications later",
  ], ""],
  ["mobile-onboarding", "Biometric login enrollment", "high", "security", "manual", "ready", 6, ["mobile", "security"], "Device with Face ID / fingerprint enrolled.", [
    "Sign in and accept biometric enrollment || || System biometric prompt appears",
    "Lock and reopen the app || || App unlocks with biometrics only",
  ], ""],
  ["mobile-onboarding", "Onboarding supports large dynamic type", "low", "accessibility", "manual", "ready", 5, ["mobile", "a11y"], "Accessibility text size set to the largest value.", [
    "Open the onboarding carousel || || Text wraps; nothing is truncated or overlapping",
  ], ""],
  ["mobile-onboarding", "Invite deep link opens the workspace after onboarding", "medium", "e2e", "to-be-automated", "draft", 8, ["mobile", "deeplink"], "", [
    "Open an invite link on the device || https://acme.test/invite/QAS-123 || App opens onboarding",
    "Complete onboarding and sign in || || Invited workspace opens directly",
  ], ""],
];

// Cases that flip between passed and failed across cycles (flaky).
const FLAKY_TITLES = new Set([
  "Drag a card between columns updates status",
  "3-D Secure challenge succeeds",
  "Refresh token rotation invalidates the old token",
]);
// Cases that fail in the release regression.
const FAILING_TITLES = new Set([
  "Tax is calculated by billing country",
  "Refund a partial order",
  "Webhook fires on task status change",
  "Mention triggers an in-app notification",
]);
const BLOCKED_TITLES = new Set([
  "SSO login with Google Workspace",
  "Email digest respects notification preferences",
]);

function parseStep(raw, makeStepId) {
  if (raw.startsWith("@")) return { id: makeStepId(), sharedStepsId: raw.slice(1) };
  const [action = "", data = "", expected = ""] = raw.split("||").map((part) => part.trim());
  const step = { id: makeStepId(), action };
  if (data) step.data = data;
  if (expected) step.expected = expected;
  return step;
}

function pickRelease(releases, projectId) {
  const list = (releases || []).filter((release) => release && (!release.projectId || release.projectId === projectId));
  const rank = { "code-freeze": 0, "in-progress": 1, planned: 2 };
  return [...list].sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9))[0] || null;
}

/**
 * Builds { suites, cases, sharedSteps, plans, runs } for `projectId`.
 * `tasks` should be the project's tasks (used for requirement/defect links).
 */
export function buildSampleTesting({
  projectId = null, tasks = [], users = [], releases = [], currentUser = null, now = new Date(),
} = {}) {
  const base = now instanceof Date ? now : new Date(now);
  const nowTs = base.getTime();
  const pid = slug(projectId);
  const random = rng(`testing-${pid}`);
  const at = (dayOffset, hour = 10, minute = 0) => {
    const date = new Date(nowTs + dayOffset * DAY);
    date.setHours(hour, minute, 0, 0);
    return Math.min(date.getTime(), nowTs - 60000);
  };
  const iso = (ts) => new Date(ts).toISOString();
  const dateOnly = (dayOffset) => {
    const date = new Date(nowTs + dayOffset * DAY);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const id = (prefix, key) => `${prefix}-sample-${pid}-${key}`;
  let stepCounter = 0;
  const makeStepId = () => {
    stepCounter += 1;
    return `ss${stepCounter.toString(36)}`;
  };

  const realTesters = [...new Set((users || [])
    .filter((user) => user && user.status !== "inactive" && user.role !== "viewer")
    .map((user) => user.username)
    .filter(Boolean))];
  const testers = realTesters.length ? realTesters : (currentUser ? [currentUser, ...FALLBACK_TESTERS] : FALLBACK_TESTERS);
  const me = currentUser || testers[0];
  const tester = (index) => testers[index % testers.length];

  const projectTasks = (tasks || []).filter((task) => task && task.id !== undefined && task.id !== null);
  const requirementTasks = [
    ...projectTasks.filter((task) => ["userstory", "feature"].includes(task.type)),
    ...projectTasks.filter((task) => task.type === "task" || task.type === "investigation"),
  ];
  const defectTasks = projectTasks.filter((task) => task.type === "bug" || task.type === "defect");
  const release = pickRelease(releases, projectId);
  const version = release?.version || "v2.6.0";
  const created = iso(at(-40, 9));

  // ── Suites / folders ──────────────────────────────────────────────────────
  const orderByParent = {};
  const suites = FOLDERS.map((folder) => {
    const parentKey = folder.parent || "root";
    orderByParent[parentKey] = (orderByParent[parentKey] ?? -1) + 1;
    const record = {
      id: id("ts", folder.key),
      projectId,
      parentId: folder.parent ? id("ts", folder.parent) : null,
      name: folder.name,
      order: orderByParent[parentKey],
      owner: me,
      createdAt: created,
      updatedAt: created,
      sample: true,
    };
    if (folder.description) record.description = folder.description;
    return record;
  });

  // ── Shared steps ──────────────────────────────────────────────────────────
  const sharedSteps = SHARED.map((group) => ({
    id: id("tss", group.key),
    projectId,
    name: group.name,
    description: group.description,
    steps: group.steps.map((raw) => parseStep(raw, makeStepId)),
    owner: me,
    createdAt: created,
    updatedAt: created,
    sample: true,
  }));
  const sharedIdByKey = Object.fromEntries(SHARED.map((group) => [group.key, id("tss", group.key)]));

  // ── Cases ─────────────────────────────────────────────────────────────────
  const ownerByFolder = {};
  let reqCursor = 0;
  const orderInFolder = {};
  const cases = CASES.map(([folder, title, priority, type, automation, status, estimate, tags, preconditions, steps, expected], index) => {
    if (!ownerByFolder[folder]) ownerByFolder[folder] = tester(Object.keys(ownerByFolder).length);
    orderInFolder[folder] = (orderInFolder[folder] ?? -1) + 1;
    const record = {
      id: id("tc", index + 1),
      projectId,
      suiteId: id("ts", folder),
      seq: index + 1,
      order: orderInFolder[folder],
      title,
      priority,
      type,
      automation,
      status,
      owner: ownerByFolder[folder],
      estimate,
      tags,
      steps: steps.map((raw) => {
        const step = parseStep(raw, makeStepId);
        if (step.sharedStepsId) step.sharedStepsId = sharedIdByKey[step.sharedStepsId];
        return step;
      }),
      createdAt: iso(at(-40 + (index % 6), 9 + (index % 7))),
      updatedAt: iso(at(-20 + (index % 12), 11)),
      sample: true,
      history: [{ id: `h${index}`, at: iso(at(-40 + (index % 6), 9)), by: ownerByFolder[folder], action: "created", fields: [] }],
    };
    if (preconditions) record.preconditions = preconditions;
    if (expected) record.expectedResult = expected;
    if (index % 5 === 2 && status !== "draft") {
      record.history.push({
        id: `h${index}b`, at: iso(at(-12 + (index % 9), 15)), by: tester(index + 1), action: "updated", fields: ["steps", "priority"], changes: { priority: { from: "medium", to: priority } },
      });
    }
    // ~70% of cases trace to a real requirement of the project.
    if (requirementTasks.length && index % 10 < 7) {
      record.requirementIds = [requirementTasks[reqCursor % requirementTasks.length].id];
      reqCursor += 1;
    }
    if (index % 9 === 4) {
      record.comments = [{ id: `c${index}`, author: tester(index + 2), text: "Updated the test data after the API change — please re-run on staging.", createdAt: iso(at(-6, 14)) }];
    }
    return record;
  });

  const runnable = cases.filter((testCase) => testCase.status !== "deprecated" && testCase.status !== "draft");
  const inFolders = (keys) => runnable.filter((testCase) => keys.some((key) => testCase.suiteId === id("ts", key)));
  const webApi = inFolders(["web-auth", "web-checkout", "web-board", "web-board-dnd", "web-notifications", "api-auth", "api-tasks"]);
  const smoke = runnable.filter((testCase) => testCase.tags.includes("smoke") || testCase.priority === "critical");
  const mobile = inFolders(["mobile-onboarding"]);
  const api = inFolders(["api-auth", "api-tasks"]);

  let defectCursor = 0;
  const nextDefect = () => {
    if (!defectTasks.length) return [];
    const task = defectTasks[defectCursor % defectTasks.length];
    defectCursor += 1;
    return [task.id];
  };
  const defectByCase = new Map();
  const defectFor = (caseId) => {
    if (!defectByCase.has(caseId)) defectByCase.set(caseId, nextDefect());
    return defectByCase.get(caseId);
  };

  /** Execution record with step-level detail for failures. */
  const execution = (testCase, status, ts, by, extra = {}) => {
    const result = {
      caseId: testCase.id,
      status,
      executedBy: by,
      executedAt: iso(ts),
      durationSec: Math.round((testCase.estimate || 4) * 60 * (0.6 + random() * 0.9)),
    };
    const ownSteps = testCase.steps.filter((step) => !step.sharedStepsId);
    if (status === "failed" && ownSteps.length) {
      const failing = ownSteps[ownSteps.length - 1];
      result.stepResults = testCase.steps.map((step) => {
        if (step.sharedStepsId) return null;
        if (step.id === failing.id) {
          return { stepId: step.id, status: "failed", actual: extra.actual || "Got HTTP 500 — \"Internal Server Error\"; no confirmation shown." };
        }
        return { stepId: step.id, status: "passed" };
      }).filter(Boolean);
      result.actualResult = extra.actual || "Step failed with a server error.";
      const defects = defectFor(testCase.id);
      if (defects.length) result.defects = defects;
    }
    if (status === "blocked") result.comment = extra.comment || "Blocked: dependency not available on this environment.";
    if (status === "skipped") result.comment = "Skipped — out of scope for this build.";
    if (status === "retest") result.comment = "Fix deployed in the latest build, please re-run.";
    if (extra.attempts) result.attempts = extra.attempts;
    return result;
  };

  const spread = (startOffset, days, index, total) => at(startOffset + Math.floor((index / Math.max(1, total)) * days), 9 + (index % 8), (index * 7) % 60);

  // ── Plans ─────────────────────────────────────────────────────────────────
  const planRelease = {
    id: id("tp", "release"),
    projectId,
    name: `${version} release regression`,
    description: "Full regression for the release candidate: web, API and payments. Exit criteria: 100% executed, ≥ 95% pass rate, no open critical defects.",
    releaseId: release?.id || null,
    milestone: "RC sign-off",
    startDate: dateOnly(-14),
    endDate: dateOnly(5),
    owner: me,
    scope: "Web App + API — all ready cases; smoke on UAT",
    status: "in-progress",
    statusOverride: false,
    suiteIds: [id("ts", "web"), id("ts", "api")],
    createdAt: iso(at(-15, 9)),
    updatedAt: iso(at(-2, 9)),
    sample: true,
  };
  const planMobile = {
    id: id("tp", "mobile"),
    projectId,
    name: "Mobile 3.4 beta",
    description: "Onboarding redesign beta on iOS and Android before the public rollout.",
    releaseId: null,
    milestone: "Public beta",
    startDate: dateOnly(-31),
    endDate: dateOnly(8),
    owner: tester(1),
    scope: "Mobile › Onboarding",
    status: "in-progress",
    statusOverride: false,
    suiteIds: [id("ts", "mobile")],
    createdAt: iso(at(-32, 9)),
    updatedAt: iso(at(-4, 9)),
    sample: true,
  };

  const assignRoundRobin = (list, offset = 0) => Object.fromEntries(list.map((testCase, index) => [testCase.id, tester(index + offset)]));

  // RC1 — full regression, closed.
  const rc1Results = webApi.map((testCase, index) => {
    let status = "passed";
    if (FAILING_TITLES.has(testCase.title) || testCase.title === "3-D Secure challenge succeeds") status = "failed";
    else if (BLOCKED_TITLES.has(testCase.title)) status = "blocked";
    else if (testCase.type === "performance") status = "skipped";
    return execution(testCase, status, spread(-13, 4, index, webApi.length), tester(index));
  });
  const rc1 = {
    id: id("tr", "rc1"),
    projectId,
    planId: planRelease.id,
    releaseId: release?.id || null,
    name: `${version}-rc.1 · Full regression`,
    environment: "staging",
    build: `${version.replace(/^v/, "")}-rc.1`,
    platform: "chrome",
    assignedTester: me,
    caseIds: webApi.map((testCase) => testCase.id),
    assignments: assignRoundRobin(webApi),
    results: rc1Results,
    status: "completed",
    owner: me,
    startDate: dateOnly(-13),
    dueDate: dateOnly(-8),
    createdAt: iso(at(-13, 8)),
    updatedAt: iso(at(-9, 17)),
    completedAt: iso(at(-9, 17)),
    sample: true,
  };

  // RC2 — rerun of failed & blocked + smoke, closed.
  const rc2Scope = [...new Map([
    ...webApi.filter((testCase) => FAILING_TITLES.has(testCase.title) || BLOCKED_TITLES.has(testCase.title) || FLAKY_TITLES.has(testCase.title)),
    ...smoke.filter((testCase) => webApi.includes(testCase)),
  ].map((testCase) => [testCase.id, testCase])).values()];
  const rc2Results = rc2Scope.map((testCase, index) => {
    let status = "passed";
    if (testCase.title === "Tax is calculated by billing country" || testCase.title === "Drag a card between columns updates status") status = "failed";
    else if (testCase.title === "Email digest respects notification preferences") status = "blocked";
    const attempts = testCase.title === "Refresh token rotation invalidates the old token"
      ? [{ status: "failed", executedBy: tester(2), executedAt: iso(at(-6, 10)) }]
      : undefined;
    return execution(testCase, status, spread(-6, 3, index, rc2Scope.length), tester(index + 1), {
      attempts,
      actual: testCase.title.startsWith("Drag") ? "Card snapped back to To Do after reload (status not persisted)." : undefined,
    });
  });
  const rc2 = {
    id: id("tr", "rc2"),
    projectId,
    planId: planRelease.id,
    releaseId: release?.id || null,
    name: `${version}-rc.2 · Rerun failed & smoke`,
    environment: "staging",
    build: `${version.replace(/^v/, "")}-rc.2`,
    platform: "chrome",
    assignedTester: me,
    caseIds: rc2Scope.map((testCase) => testCase.id),
    assignments: assignRoundRobin(rc2Scope, 1),
    results: rc2Results,
    status: "completed",
    owner: me,
    rerunOf: rc1.id,
    startDate: dateOnly(-6),
    dueDate: dateOnly(-3),
    createdAt: iso(at(-6, 8)),
    updatedAt: iso(at(-3, 18)),
    completedAt: iso(at(-3, 18)),
    sample: true,
  };

  // RC3 — UAT smoke & fixes, open, partially executed; current user has open work.
  const rc3Scope = [...new Map([
    ...smoke,
    ...webApi.filter((testCase) => FLAKY_TITLES.has(testCase.title) || FAILING_TITLES.has(testCase.title)),
  ].map((testCase) => [testCase.id, testCase])).values()].filter((testCase) => webApi.includes(testCase));
  const rc3Assignments = {};
  rc3Scope.forEach((testCase, index) => { rc3Assignments[testCase.id] = index % 3 === 0 ? me : tester(index + 2); });
  const rc3Results = [];
  rc3Scope.forEach((testCase, index) => {
    if (index % 5 === 4 || (rc3Assignments[testCase.id] === me && index % 2 === 0)) return; // still untested
    let status = "passed";
    if (testCase.title === "3-D Secure challenge succeeds") status = "failed";
    else if (testCase.title === "Tax is calculated by billing country") status = "retest";
    else if (testCase.title === "Webhook fires on task status change") status = "blocked";
    rc3Results.push(execution(testCase, status, spread(-2, 2, index, rc3Scope.length), rc3Assignments[testCase.id] === me ? tester(index + 3) : rc3Assignments[testCase.id], {
      attempts: testCase.title === "Tax is calculated by billing country"
        ? [{ status: "failed", executedBy: tester(index + 2), executedAt: iso(at(-2, 11)) }]
        : undefined,
      actual: testCase.title.startsWith("3-D") ? "3DS modal closed but payment stayed \"requires_action\"." : undefined,
      comment: testCase.title.startsWith("Webhook") ? "Blocked: webhook receiver is down on UAT (INFRA-221)." : undefined,
    }));
  });
  const rc3 = {
    id: id("tr", "rc3"),
    projectId,
    planId: planRelease.id,
    releaseId: release?.id || null,
    name: `${version}-rc.3 · UAT smoke & fixes`,
    description: "Smoke plus verification of fixes from rc.2.",
    environment: "uat",
    build: `${version.replace(/^v/, "")}-rc.3`,
    platform: "chrome",
    assignedTester: me,
    caseIds: rc3Scope.map((testCase) => testCase.id),
    assignments: rc3Assignments,
    results: rc3Results,
    status: "in-progress",
    owner: me,
    startDate: dateOnly(-2),
    dueDate: dateOnly(3),
    createdAt: iso(at(-2, 8)),
    updatedAt: iso(at(0, 9)),
    completedAt: null,
    sample: true,
  };

  // Mobile iOS — closed ~4 weeks ago.
  const iosResults = mobile.map((testCase, index) => execution(
    testCase,
    testCase.title.startsWith("Biometric") ? "failed" : "passed",
    spread(-30, 4, index, mobile.length),
    tester(index + 1),
    { actual: testCase.title.startsWith("Biometric") ? "Face ID prompt never appears after enrollment on iOS 18." : undefined }
  ));
  const ios = {
    id: id("tr", "ios"),
    projectId,
    planId: planMobile.id,
    name: "Mobile 3.4 beta · iOS",
    environment: "staging",
    build: "3.4.0 (412)",
    platform: "ios",
    assignedTester: tester(1),
    caseIds: mobile.map((testCase) => testCase.id),
    assignments: assignRoundRobin(mobile, 1),
    results: iosResults,
    status: "completed",
    owner: tester(1),
    startDate: dateOnly(-30),
    dueDate: dateOnly(-25),
    createdAt: iso(at(-30, 8)),
    updatedAt: iso(at(-26, 17)),
    completedAt: iso(at(-26, 17)),
    sample: true,
  };

  // Mobile Android — open, early.
  const androidAssignments = {};
  mobile.forEach((testCase, index) => { androidAssignments[testCase.id] = index % 2 === 0 ? me : tester(index + 2); });
  const androidResults = mobile.slice(0, 2).map((testCase, index) => execution(testCase, "passed", spread(-3, 2, index, 2), androidAssignments[testCase.id]));
  const android = {
    id: id("tr", "android"),
    projectId,
    planId: planMobile.id,
    name: "Mobile 3.4 beta · Android",
    environment: "staging",
    build: "3.4.0 (418)",
    platform: "android",
    assignedTester: tester(2),
    caseIds: mobile.map((testCase) => testCase.id),
    assignments: androidAssignments,
    results: androidResults,
    status: "in-progress",
    owner: tester(1),
    startDate: dateOnly(-4),
    dueDate: dateOnly(6),
    createdAt: iso(at(-4, 8)),
    updatedAt: iso(at(-1, 16)),
    completedAt: null,
    sample: true,
  };

  // Weekly API automation — standalone, closed, with attempt history over 5 weeks.
  const apiResults = api.map((testCase, index) => {
    const flaky = FLAKY_TITLES.has(testCase.title);
    const history = [-33, -26, -19, -12].map((offset, weekIndex) => ({
      status: flaky ? (weekIndex % 2 === 0 ? "passed" : "failed") : (testCase.title.startsWith("Webhook") && weekIndex === 1 ? "failed" : "passed"),
      executedBy: "ci-bot",
      executedAt: iso(at(offset, 2, index)),
    }));
    return execution(testCase, flaky ? "failed" : "passed", at(-5, 2, index), "ci-bot", {
      attempts: history,
      actual: flaky ? "Old refresh token still accepted for ~2 s (race in revocation cache)." : undefined,
    });
  });
  const apiNightly = {
    id: id("tr", "api-weekly"),
    projectId,
    planId: null,
    name: "Weekly API automation",
    description: "Automated API suite triggered by CI every Monday.",
    environment: "production-like",
    build: "api-2026.40",
    platform: "api",
    assignedTester: "ci-bot",
    caseIds: api.map((testCase) => testCase.id),
    assignments: {},
    results: apiResults,
    status: "completed",
    owner: me,
    startDate: dateOnly(-35),
    dueDate: dateOnly(-5),
    createdAt: iso(at(-35, 1)),
    updatedAt: iso(at(-5, 3)),
    completedAt: iso(at(-5, 3)),
    sample: true,
  };

  // Failed cases also reference their defects on the case itself.
  defectByCase.forEach((defects, caseId) => {
    const testCase = cases.find((item) => item.id === caseId);
    if (testCase && defects.length) testCase.defectIds = [...new Set([...(testCase.defectIds || []), ...defects])];
  });

  return {
    suites,
    cases,
    sharedSteps,
    plans: [planRelease, planMobile],
    runs: [apiNightly, ios, rc1, android, rc2, rc3],
    release,
  };
}

export const SAMPLE_ID_MARKER = "-sample-";
