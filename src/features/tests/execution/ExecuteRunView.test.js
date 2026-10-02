import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import ExecuteRunView from "./ExecuteRunView";

const cases = [
  { id: "tc-1", title: "Login works", priority: "high", steps: [] },
  { id: "tc-2", title: "Logout works", priority: "low", steps: [] },
];

describe("ExecuteRunView", () => {
  beforeEach(() => localStorage.clear());

  it("Save & Exit writes notes for judged cases and keeps untested drafts locally", () => {
    const onUpdateResult = jest.fn();
    const onExit = jest.fn();
    const run = { id: "tr-1", name: "Regression", results: [{ caseId: "tc-1", status: "passed", notes: "" }] };

    const { unmount } = render(
      <ExecuteRunView run={run} cases={cases} onUpdateResult={onUpdateResult} onCompleteRun={jest.fn()} onExit={onExit} />
    );

    // Cursor starts on the first untested case (tc-2).
    fireEvent.change(screen.getByLabelText("Notes (optional)"), { target: { value: "half done" } });
    fireEvent.click(screen.getByRole("button", { name: "Go to case 1" }));
    fireEvent.change(screen.getByLabelText("Notes (optional)"), { target: { value: "flaky on Safari" } });

    fireEvent.click(screen.getByRole("button", { name: /Save & Exit/ }));

    expect(onUpdateResult).toHaveBeenCalledWith("tr-1", "tc-1", { status: "passed", notes: "flaky on Safari", actualResult: "" });
    expect(onUpdateResult).not.toHaveBeenCalledWith("tr-1", "tc-2", expect.anything());
    expect(onExit).toHaveBeenCalled();
    unmount();

    // Re-opening the run restores the untested case's draft.
    render(<ExecuteRunView run={run} cases={cases} onUpdateResult={onUpdateResult} onCompleteRun={jest.fn()} onExit={onExit} />);
    expect(screen.getByLabelText("Notes (optional)")).toHaveValue("half done");
  });
});
