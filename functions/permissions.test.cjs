const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getAuthorization,
  normalizePermissionMatrix,
  requirePermission,
} = require("./permissions");

test("normalization enforces admin and viewer safety ceilings", () => {
  const matrix = normalizePermissionMatrix({
    admin: { actions: { "workspace:manage": false } },
    viewer: {
      modules: { docs: false, hr: true },
      actions: { "task:edit": true },
    },
  });

  assert.equal(matrix.admin.actions["workspace:manage"], true);
  assert.equal(matrix.viewer.modules.docs, false);
  assert.equal(matrix.viewer.modules.hr, true);
  assert.equal(matrix.viewer.actions["task:edit"], false);
});

test("authorization reads member capabilities from workspace config", async () => {
  const snapshots = {
    "users/member-1": {
      data: () => ({ role: "member", status: "active" }),
    },
    "appData/config": {
      data: () => ({
        permissionMatrix: {
          member: { actions: { "project:manage": true, "task:create": false } },
        },
      }),
    },
  };
  const firestore = {
    collection(collectionName) {
      return {
        doc(id) {
          return { get: async () => snapshots[`${collectionName}/${id}`] };
        },
      };
    },
  };

  const authorization = await getAuthorization(firestore, {
    auth: { uid: "member-1", token: { email: "member@example.com" } },
  });

  assert.equal(authorization.canPerform("project:manage"), true);
  assert.equal(authorization.canPerform("task:create"), false);
  assert.throws(
    () => requirePermission(authorization, "task:create"),
    (error) => error.code === "permission-denied"
  );
});

test("viewer cannot gain mutation permissions from a stored matrix", async () => {
  const firestore = {
    collection(collectionName) {
      return {
        doc() {
          return {
            get: async () => ({
              data: () => collectionName === "users"
                ? { role: "viewer", status: "active" }
                : { permissionMatrix: { viewer: { actions: { "task:edit": true } } } },
            }),
          };
        },
      };
    },
  };
  const authorization = await getAuthorization(firestore, { auth: { uid: "viewer-1", token: {} } });
  assert.equal(authorization.canPerform("task:edit"), false);
});
