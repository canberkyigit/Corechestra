import React from "react";
import { AppButton } from "../../../shared/components/AppPrimitives";

/** Small destructive-action confirmation used for page and space deletion. */
export default function DocsConfirmDialog({ title, children, confirmLabel = "Delete", onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="app-surface w-full max-w-sm mx-4 p-6">
        <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          {children}
        </p>
        <div className="flex gap-3 justify-end">
          <AppButton
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </AppButton>
          <AppButton
            variant="danger"
            onClick={onConfirm}
          >
            {confirmLabel}
          </AppButton>
        </div>
      </div>
    </div>
  );
}
