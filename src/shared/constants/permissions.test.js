import {
  canAccessModule,
  canPerformAction,
  normalizePermissionMatrix,
} from "./permissions";

describe("permission matrix safety ceilings", () => {
  it("always keeps administrators fully enabled", () => {
    const normalized = normalizePermissionMatrix({
      admin: {
        modules: { admin: false, board: false },
        actions: { "workspace:manage": false, "task:edit": false },
      },
    });

    expect(normalized.admin.modules.admin).toBe(true);
    expect(normalized.admin.modules.board).toBe(true);
    expect(normalized.admin.actions["workspace:manage"]).toBe(true);
    expect(normalized.admin.actions["task:edit"]).toBe(true);
  });

  it("allows viewer module visibility but never viewer mutations", () => {
    const matrix = normalizePermissionMatrix({
      viewer: {
        modules: { docs: false, hr: true },
        actions: { "task:edit": true, "project:manage": true },
      },
    });

    expect(canAccessModule(matrix, "viewer", "docs")).toBe(false);
    expect(canAccessModule(matrix, "viewer", "hr")).toBe(true);
    expect(canPerformAction(matrix, "viewer", "task:edit")).toBe(false);
    expect(canPerformAction(matrix, "viewer", "project:manage")).toBe(false);
  });

  it("uses the configured member capabilities", () => {
    const matrix = normalizePermissionMatrix({
      member: {
        modules: { docs: false },
        actions: { "task:create": false, "project:manage": true },
      },
    });

    expect(canAccessModule(matrix, "member", "docs")).toBe(false);
    expect(canPerformAction(matrix, "member", "task:create")).toBe(false);
    expect(canPerformAction(matrix, "member", "project:manage")).toBe(true);
  });
});
