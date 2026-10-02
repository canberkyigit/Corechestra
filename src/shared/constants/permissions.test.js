import {
  canAccessModule,
  canPerformAction,
  getAccountBlockReason,
  getSensitiveAuditMeta,
  normalizePermissionMatrix,
  requiresAdminReason,
  requiresConfirmation,
  runSensitiveActionGate,
} from "./permissions";

describe("permission matrix locks", () => {
  it("never lets a stored matrix remove the admin lockout-critical permissions", () => {
    const stored = {
      admin: {
        modules: { admin: false, hr: false },
        actions: { "workspace:manage": false, "role:manage": false, "audit:view": false },
      },
    };
    const normalized = normalizePermissionMatrix(stored);
    expect(normalized.admin.modules.admin).toBe(true);
    expect(normalized.admin.actions["workspace:manage"]).toBe(true);
    expect(normalized.admin.actions["role:manage"]).toBe(true);
    // non-locked keys stay configurable
    expect(normalized.admin.modules.hr).toBe(false);
    expect(normalized.admin.actions["audit:view"]).toBe(false);
    expect(canAccessModule(stored, "admin", "admin")).toBe(true);
    expect(canPerformAction(stored, "member", "role:manage")).toBe(false);
  });
});

describe("tests module actions", () => {
  it("defaults tests:edit / tests:execute to admin+member and fills them into old stored matrices", () => {
    const legacyStored = { member: { modules: {}, actions: { "task:edit": true } }, viewer: { modules: {}, actions: {} } };
    ["tests:edit", "tests:execute"].forEach((key) => {
      expect(canPerformAction(legacyStored, "admin", key)).toBe(true);
      expect(canPerformAction(legacyStored, "member", key)).toBe(true);
      expect(canPerformAction(legacyStored, "viewer", key)).toBe(false);
    });
  });
});

describe("sensitive action policy", () => {
  it("derives confirmation, reason and audit metadata from the flags", () => {
    expect(requiresConfirmation({}, "destructive")).toBe(true);
    expect(requiresConfirmation({ requireConfirmation: false }, "destructive")).toBe(false);
    expect(requiresConfirmation({ requireConfirmation: false, protectRoleChanges: true }, "role")).toBe(true);
    expect(requiresConfirmation({ requireConfirmation: false, protectRoleChanges: false }, "role")).toBe(false);
    expect(requiresConfirmation({ protectWorkspaceSettings: false }, "workspace")).toBe(false);
    expect(requiresAdminReason({ requireAdminReason: true }, "role")).toBe(true);
    expect(requiresAdminReason({ requireAdminReason: true }, "destructive")).toBe(false);
    expect(getSensitiveAuditMeta({ protectWorkspaceSettings: false }, "workspace")).toEqual({ scope: "workspace", severity: "info" });
    expect(getSensitiveAuditMeta({}, "role")).toEqual({ scope: "security", severity: "warning" });
  });

  it("gates actions through confirm and prompt", () => {
    const confirmFn = jest.fn(() => true);
    expect(runSensitiveActionGate({ requireAdminReason: true }, "role", "ok?", { confirmFn, promptFn: () => "  because " }))
      .toEqual({ ok: true, reason: "because" });
    expect(runSensitiveActionGate({ requireAdminReason: true }, "role", "ok?", { confirmFn, promptFn: () => "" }))
      .toEqual({ ok: false, missingReason: true });
    expect(runSensitiveActionGate({}, "role", "ok?", { confirmFn: () => false, promptFn: () => "x" }))
      .toEqual({ ok: false });
  });
});

describe("getAccountBlockReason", () => {
  it("detects deleted, disabled and revoked records", () => {
    expect(getAccountBlockReason(null)).toBeNull();
    expect(getAccountBlockReason({ role: "member" })).toBeNull();
    expect(getAccountBlockReason({ status: "active", disabled: false })).toBeNull();
    expect(getAccountBlockReason({ deleted: true })).toBe("deleted");
    expect(getAccountBlockReason({ status: "revoked" })).toBe("deleted");
    expect(getAccountBlockReason({ disabled: true })).toBe("disabled");
    expect(getAccountBlockReason({ status: "inactive" })).toBe("disabled");
  });
});
