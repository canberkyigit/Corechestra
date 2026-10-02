import { confirmNavigation, hasBlockingNavigationGuard, registerNavigationGuard } from "./navigationGuard";

describe("navigationGuard", () => {
  it("allows navigation when nothing is dirty", async () => {
    const confirm = jest.fn();
    const unregister = registerNavigationGuard({ isBlocking: () => false, confirm });
    await expect(confirmNavigation()).resolves.toBe(true);
    expect(confirm).not.toHaveBeenCalled();
    unregister();
  });

  it("asks dirty guards and stops when the user stays", async () => {
    const onDiscard = jest.fn();
    let answer = false;
    const unregister = registerNavigationGuard({ isBlocking: () => true, confirm: async () => answer, onDiscard });

    expect(hasBlockingNavigationGuard()).toBe(true);
    await expect(confirmNavigation()).resolves.toBe(false);
    expect(onDiscard).not.toHaveBeenCalled();

    answer = true;
    await expect(confirmNavigation()).resolves.toBe(true);
    expect(onDiscard).toHaveBeenCalledTimes(1);
    unregister();
    expect(hasBlockingNavigationGuard()).toBe(false);
  });
});
