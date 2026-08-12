const fs = require("node:fs");
const path = require("node:path");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} = require("firebase/firestore");

const projectId = process.env.GCLOUD_PROJECT || "corechestra-rules-test";

async function run() {
  const testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"),
    },
  });

  const adminDb = testEnv.authenticatedContext("admin-1", { email: "admin@example.com" }).firestore();
  const memberDb = testEnv.authenticatedContext("member-1", { email: "member@example.com" }).firestore();
  const viewerDb = testEnv.authenticatedContext("viewer-1", { email: "viewer@example.com" }).firestore();
  const inactiveDb = testEnv.authenticatedContext("inactive-1", { email: "inactive@example.com" }).firestore();
  const newUserDb = testEnv.authenticatedContext("new-user", { email: "new@example.com" }).firestore();
  const newAdminDb = testEnv.authenticatedContext("new-admin", { email: "new-admin@example.com" }).firestore();
  const anonymousDb = testEnv.unauthenticatedContext().firestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "users", "admin-1"), { email: "admin@example.com", role: "admin", status: "active" }),
      setDoc(doc(db, "users", "member-1"), { email: "member@example.com", role: "member", status: "active" }),
      setDoc(doc(db, "users", "viewer-1"), { email: "viewer@example.com", role: "viewer", status: "active" }),
      setDoc(doc(db, "users", "inactive-1"), { email: "inactive@example.com", role: "admin", status: "inactive" }),
      setDoc(doc(db, "appData", "tasks"), { activeTasks: [] }),
      setDoc(doc(db, "appData", "config"), { workspaceSettings: { name: "Corechestra" } }),
      setDoc(doc(db, "auditLogs", "audit-1"), { type: "user.role_updated", createdAt: "2026-08-12T10:00:00.000Z" }),
      setDoc(doc(db, "hrData", "member-1"), { timeEntries: [] }),
      setDoc(doc(db, "hrData", "admin-1"), { timeEntries: [] }),
      setDoc(doc(db, "hrData", "hr_shared"), { absences: [], approvalInbox: [], performanceNotes: [] }),
      setDoc(doc(db, "hrData", "pipeline"), { candidates: [] }),
    ]);
  });

  const tests = [
    ["anonymous users cannot read workspace data", () => assertFails(getDoc(doc(anonymousDb, "appData", "tasks")))],
    ["active viewers can read workspace data", () => assertSucceeds(getDoc(doc(viewerDb, "appData", "tasks")))],
    ["inactive accounts cannot read workspace data", () => assertFails(getDoc(doc(inactiveDb, "appData", "tasks")))],
    ["viewers cannot write workspace data", () => assertFails(updateDoc(doc(viewerDb, "appData", "tasks"), { activeTasks: [{ id: "blocked" }] }))],
    ["members can edit operational workspace data", () => assertSucceeds(updateDoc(doc(memberDb, "appData", "tasks"), { activeTasks: [{ id: "allowed" }] }))],
    ["members cannot write protected workspace config", () => assertFails(updateDoc(doc(memberDb, "appData", "config"), { workspaceSettings: { name: "Hijacked" } }))],
    ["admins can write protected workspace config", () => assertSucceeds(updateDoc(doc(adminDb, "appData", "config"), { workspaceSettings: { name: "Approved" } }))],
    ["members cannot delete workspace domains", () => assertFails(deleteDoc(doc(memberDb, "appData", "tasks")))],
    ["admins can delete workspace domains", () => assertSucceeds(deleteDoc(doc(adminDb, "appData", "tasks")))],
    ["users can update whitelisted profile fields", () => assertSucceeds(updateDoc(doc(memberDb, "users", "member-1"), { fullName: "Member One", timezone: "Europe/Istanbul" }))],
    ["users cannot promote themselves", () => assertFails(updateDoc(doc(memberDb, "users", "member-1"), { role: "admin" }))],
    ["admins cannot bypass the audited role function", () => assertFails(updateDoc(doc(adminDb, "users", "member-1"), { role: "viewer" }))],
    ["admins cannot hard-delete accounts from the client", () => assertFails(deleteDoc(doc(adminDb, "users", "member-1")))],
    ["new accounts can only bootstrap as members", () => assertSucceeds(setDoc(doc(newUserDb, "users", "new-user"), { email: "new@example.com", role: "member" }))],
    ["new accounts cannot bootstrap as admins", () => assertFails(setDoc(doc(newAdminDb, "users", "new-admin"), { email: "new-admin@example.com", role: "admin" }))],
    ["viewers can store their own preferences", () => assertSucceeds(setDoc(doc(viewerDb, "userPreferences", "viewer-1"), { darkMode: true, _updatedAt: Date.now() }))],
    ["users cannot read another user's preferences", () => assertFails(getDoc(doc(memberDb, "userPreferences", "viewer-1")))],
    ["clients cannot forge audit events", () => assertFails(setDoc(doc(adminDb, "auditLogs", "forged"), { type: "forged" }))],
    ["admins can read immutable audit events", () => assertSucceeds(getDoc(doc(adminDb, "auditLogs", "audit-1")))],
    ["members cannot read admin audit events", () => assertFails(getDoc(doc(memberDb, "auditLogs", "audit-1")))],
    ["users can read and write their own HR record", async () => {
      await assertSucceeds(getDoc(doc(memberDb, "hrData", "member-1")));
      await assertSucceeds(updateDoc(doc(memberDb, "hrData", "member-1"), { timeEntries: [{ date: "2026-08-12" }] }));
    }],
    ["users cannot read another employee's HR record", () => assertFails(getDoc(doc(memberDb, "hrData", "admin-1")))],
    ["non-admins cannot read the hiring pipeline", () => assertFails(getDoc(doc(memberDb, "hrData", "pipeline")))],
    ["admins can read the hiring pipeline", () => assertSucceeds(getDoc(doc(adminDb, "hrData", "pipeline")))],
    ["employees cannot change protected shared HR fields", () => assertFails(updateDoc(doc(memberDb, "hrData", "hr_shared"), { performanceNotes: [{ text: "forged" }] }))],
  ];

  let passed = 0;
  try {
    for (const [name, test] of tests) {
      await test();
      passed += 1;
      process.stdout.write(`✓ ${name}\n`);
    }
    process.stdout.write(`\n${passed}/${tests.length} Firestore security checks passed.\n`);
  } finally {
    await testEnv.cleanup();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
