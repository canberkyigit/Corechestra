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
    expect(invoke).toHaveBeenCalledWith({ uid: "uid-2", role: "viewer" });
  });

  it("returns useful messages for permission failures", async () => {
    const { getAdminActionMessage } = await import("./adminFunctions");
    expect(getAdminActionMessage({ code: "functions/permission-denied" })).toBe(
      "Only workspace admins can perform this action."
    );
  });
});
