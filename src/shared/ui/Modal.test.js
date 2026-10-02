import React, { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConfirmDialog, Modal } from "./Modal";
import { ConfirmProvider, useConfirm } from "../context/ConfirmContext";

function pressEscape() {
  fireEvent.keyDown(document, { key: "Escape" });
}

describe("Modal", () => {
  it("closes on Escape and labels the dialog with its title", () => {
    const onClose = jest.fn();
    render(<Modal open onClose={onClose} title="Edit sprint"><input aria-label="Name" /></Modal>);

    expect(screen.getByRole("dialog", { name: "Edit sprint" })).toBeInTheDocument();
    pressEscape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("only closes the topmost layer on Escape", () => {
    const outerClose = jest.fn();
    const innerClose = jest.fn();
    render(
      <>
        <Modal open onClose={outerClose} title="Outer">outer</Modal>
        <Modal open onClose={innerClose} title="Inner">inner</Modal>
      </>
    );

    pressEscape();
    expect(innerClose).toHaveBeenCalledTimes(1);
    expect(outerClose).not.toHaveBeenCalled();
  });

  it("asks before discarding when confirmClose is set", () => {
    const onClose = jest.fn();
    render(<Modal open onClose={onClose} title="Form" confirmClose>body</Modal>);

    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("Discard unsaved changes?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(onClose).not.toHaveBeenCalled();

    // The dismissed confirm may still be animating out; the form's × is first.
    fireEvent.click(screen.getAllByRole("button", { name: "Close dialog" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Discard changes" }).at(-1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores backdrop clicks when closeOnBackdrop is false", () => {
    const onClose = jest.fn();
    render(<Modal open onClose={onClose} title="Form" closeOnBackdrop={false} testId="m">body</Modal>);
    const backdrop = screen.getByTestId("m-backdrop");
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes on a full backdrop click by default", () => {
    const onClose = jest.fn();
    render(<Modal open onClose={onClose} title="Info" testId="m">body</Modal>);
    const backdrop = screen.getByTestId("m-backdrop");
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ConfirmDialog", () => {
  it("enables the destructive action only after the exact text is typed", async () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmDialog open title="Delete project?" requireText="Apollo" confirmLabel="Delete" onConfirm={onConfirm} onCancel={() => {}} />
    );

    const button = screen.getByTestId("confirm-dialog-confirm");
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByTestId("confirm-dialog-input"), { target: { value: "Apollo" } });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
  });
});

describe("useConfirm", () => {
  function Harness({ onResult }) {
    const confirm = useConfirm();
    const [label, setLabel] = useState("idle");
    return (
      <button
        type="button"
        onClick={async () => {
          const ok = await confirm({ title: "Remove member?", confirmLabel: "Remove" });
          setLabel(String(ok));
          onResult(ok);
        }}
      >
        {label}
      </button>
    );
  }

  it("resolves true on confirm and false on cancel", async () => {
    const onResult = jest.fn();
    render(<ConfirmProvider><Harness onResult={onResult} /></ConfirmProvider>);

    fireEvent.click(screen.getByRole("button", { name: "idle" }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove" }));
    await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(true));

    fireEvent.click(await screen.findByRole("button", { name: "true" }));
    fireEvent.click((await screen.findAllByRole("button", { name: "Cancel" })).at(-1));
    await waitFor(() => expect(onResult).toHaveBeenLastCalledWith(false));
  });
});
