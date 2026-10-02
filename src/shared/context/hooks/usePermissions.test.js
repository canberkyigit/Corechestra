import { act, renderHook } from "@testing-library/react";
import { usePermissions } from "./usePermissions";
import { resetAppStore, useAppStore } from "../../store/useAppStore";

jest.mock("../AuthContext", () => ({
  useAuth: () => ({ role: "member", isAdmin: false }),
}));

describe("usePermissions", () => {
  beforeEach(() => {
    resetAppStore();
  });

  it("returns stable callbacks across unrelated store updates", () => {
    const { result } = renderHook(() => usePermissions());
    const first = result.current;

    act(() => {
      useAppStore.setState({ activeTasks: [{ id: "CY-1" }] });
    });

    expect(result.current.canAccessPage).toBe(first.canAccessPage);
    expect(result.current.canPerform).toBe(first.canPerform);
    expect(result.current).toBe(first);
    expect(typeof first.canAccessPage("board")).toBe("boolean");
  });
});
