import React from "react";
import { ConfirmDialog } from "../../../shared/ui/Modal";

/** Small destructive-action confirmation used for page and space deletion. */
export default function DocsConfirmDialog({ title, children, confirmLabel = "Delete", onConfirm, onCancel }) {
  return (
    <ConfirmDialog
      open
      title={title}
      description={children}
      confirmLabel={confirmLabel}
      tone="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
      testId="docs-confirm-dialog"
    />
  );
}
