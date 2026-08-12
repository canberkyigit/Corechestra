const mockHttpsCallable = jest.fn();

jest.mock("./firebase", () => ({
  functions: { mocked: true },
}));

jest.mock("firebase/functions", () => ({
  httpsCallable: (...args) => mockHttpsCallable(...args),
}));

describe("admin function client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("routes role changes through the audited callable", async () => {
    const invoke = jest.fn().mockResolvedValue({ data: { success: true } });
    mockHttpsCallable.mockReturnValue(invoke);
    const { changeWorkspaceUserRole } = await import("./adminFunctions");

    await expect(changeWorkspaceUserRole("uid-2", "viewer")).resolves.toEqual({ success: true });
    expect(mockHttpsCallable).toHaveBeenCalledWith({ mocked: true }, "updateUserRole");
    expect(invoke).toHaveBeenCalledWith({ uid: "uid-2", role: "viewer", reason: "", confirmed: true });
  });

  it("returns useful messages for permission failures", async () => {
    const { getAdminActionMessage } = await import("./adminFunctions");
    expect(getAdminActionMessage({ code: "functions/permission-denied" })).toBe(
      "Your workspace role does not allow this action."
    );
  });

  it("persists shared domains through the authorization callable", async () => {
    const invoke = jest.fn().mockResolvedValue({ data: { success: true, _version: 2 } });
    mockHttpsCallable.mockReturnValue(invoke);
    const { persistWorkspaceDomain } = await import("./adminFunctions");

    await expect(persistWorkspaceDomain("tasks", { activeTasks: [] })).resolves.toEqual({
      success: true,
      _version: 2,
    });
    expect(mockHttpsCallable).toHaveBeenCalledWith({ mocked: true }, "saveWorkspaceDomain");
    expect(invoke).toHaveBeenCalledWith({ domain: "tasks", patch: { activeTasks: [] } });
  });
});
