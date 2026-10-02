import React from "react";
import { Modal } from "../../../shared/ui/Modal";

/**
 * HR dialog shell — a thin wrapper over the shared accessible Modal
 * (portal, Esc stack, focus trap). Pass `dirty` for forms so a stray Esc or
 * backdrop click asks before throwing away typed input.
 */
export function HRModal({ open, onClose, title, subtitle, icon, size = "md", children, footer, labelledBy, dirty = false, closeOnBackdrop, testId }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      icon={icon}
      size={size}
      footer={footer}
      labelledBy={labelledBy}
      confirmClose={dirty}
      closeOnBackdrop={closeOnBackdrop ?? !dirty}
      testId={testId}
    >
      {children}
    </Modal>
  );
}

export const hrInputClassName = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
export const hrSecondaryButton = "px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors";
export const hrPrimaryButton = "px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium";
export const hrDangerButton = "px-5 py-2 text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium";
