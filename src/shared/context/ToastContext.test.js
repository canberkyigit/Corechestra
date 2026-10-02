import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ToastProvider, useToast } from "./ToastContext";

function Trigger({ onUndo }) {
  const { addToast } = useToast();
  return (
    <>
      <button type="button" onClick={() => addToast("Task archived", "info", { action: { label: "Undo", onClick: onUndo } })}>archive</button>
      <button type="button" onClick={() => addToast("Save failed", "error")}>fail</button>
    </>
  );
}

describe("ToastProvider", () => {
  afterEach(() => jest.useRealTimers());

  it("runs the action once and dismisses the toast", () => {
    const onUndo = jest.fn();
    render(<ToastProvider><Trigger onUndo={onUndo} /></ToastProvider>);

    fireEvent.click(screen.getByText("archive"));
    expect(screen.getByRole("status")).toHaveTextContent("Task archived");
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("announces errors as alerts and keeps them on screen longer than successes", () => {
    jest.useFakeTimers();
    render(<ToastProvider><Trigger onUndo={() => {}} /></ToastProvider>);

    fireEvent.click(screen.getByText("fail"));
    expect(screen.getByRole("alert")).toHaveTextContent("Save failed");
    act(() => { jest.advanceTimersByTime(4000); });
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
