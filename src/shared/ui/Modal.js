import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { cn } from "./utils";

const WIDTHS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

let openModalCount = 0;

function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return undefined;
    openModalCount += 1;
    const { body } = document;
    const previous = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      openModalCount -= 1;
      if (openModalCount === 0) body.style.overflow = previous;
    };
  }, [active]);
}

function ModalPanel({
  onRequestClose,
  title,
  subtitle,
  icon,
  size,
  footer,
  children,
  closeOnBackdrop,
  hideCloseButton,
  className,
  bodyClassName,
  labelledBy,
  describedBy,
  zIndexClass,
  role,
  testId,
}) {
  const panelRef = useRef(null);
  const generatedId = useId();
  const titleId = labelledBy || (title ? `modal-title-${generatedId}` : undefined);

  useEscapeKey(onRequestClose, true);
  useFocusTrap(panelRef, true);
  useBodyScrollLock(true);

  // Close only when the press STARTS and ENDS on the backdrop, so selecting
  // text inside the panel and releasing outside doesn't dismiss it.
  const pointerDownOnBackdrop = useRef(false);

  return (
    <div className={cn("fixed inset-0", zIndexClass)}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
        onMouseDown={(event) => { pointerDownOnBackdrop.current = event.target === event.currentTarget; }}
        onClick={(event) => {
          if (event.target !== event.currentTarget || !pointerDownOnBackdrop.current) return;
          if (closeOnBackdrop) onRequestClose();
        }}
        data-testid={testId ? `${testId}-backdrop` : undefined}
      >
        <motion.div
          ref={panelRef}
          role={role}
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={describedBy}
          data-testid={testId}
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className={cn(
            "relative w-full bg-white dark:bg-[#1a1f2e] shadow-2xl border border-slate-200 dark:border-[#2a3044]",
            "rounded-t-2xl sm:rounded-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col focus:outline-none",
            WIDTHS[size] || WIDTHS.md,
            className
          )}
        >
          {(title || !hideCloseButton) && (
            <div className={cn(
              "flex items-start justify-between gap-3 px-5 py-4 flex-shrink-0",
              title && "border-b border-slate-200 dark:border-[#2a3044]"
            )}>
              <div className="min-w-0 flex items-start gap-3">
                {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
                <div className="min-w-0">
                  {title && <h2 id={titleId} className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>}
                  {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
                </div>
              </div>
              {!hideCloseButton && (
                <button
                  type="button"
                  aria-label="Close dialog"
                  title="Close (Esc)"
                  onClick={onRequestClose}
                  className="w-8 h-8 -mr-1 flex-shrink-0 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          <div className={cn("px-5 py-4 overflow-y-auto flex-1 min-h-0", bodyClassName)}>{children}</div>
          {footer && (
            <div className="px-5 py-4 border-t border-slate-200 dark:border-[#2a3044] flex flex-wrap justify-end gap-2 flex-shrink-0">
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Accessible modal shell used across the app:
 * - rendered in a portal (immune to transformed ancestors),
 * - Esc closes the topmost layer only (shared escape stack),
 * - focus is trapped inside and restored to the trigger on close,
 * - `confirmClose` (e.g. a dirty form) asks before Esc/backdrop/× discard input,
 * - `closeOnBackdrop={false}` for forms that must never close on a stray click.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  size = "md",
  footer,
  children,
  closeOnBackdrop = true,
  confirmClose = false,
  confirmCloseTitle = "Discard unsaved changes?",
  confirmCloseMessage = "You have changes that haven't been saved. They will be lost if you close this dialog.",
  hideCloseButton = false,
  className,
  bodyClassName,
  labelledBy,
  describedBy,
  zIndexClass = "z-[70]",
  role = "dialog",
  testId,
}) {
  const [askDiscard, setAskDiscard] = useState(false);

  useEffect(() => {
    if (!open) setAskDiscard(false);
  }, [open]);

  const requestClose = useCallback(() => {
    if (confirmClose) {
      setAskDiscard(true);
      return;
    }
    onClose?.();
  }, [confirmClose, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <AnimatePresence>
        {open && (
          <ModalPanel
            key="modal"
            onRequestClose={requestClose}
            title={title}
            subtitle={subtitle}
            icon={icon}
            size={size}
            footer={footer}
            closeOnBackdrop={closeOnBackdrop}
            hideCloseButton={hideCloseButton}
            className={className}
            bodyClassName={bodyClassName}
            labelledBy={labelledBy}
            describedBy={describedBy}
            zIndexClass={zIndexClass}
            role={role}
            testId={testId}
          >
            {children}
          </ModalPanel>
        )}
      </AnimatePresence>
      {/* Only dirty-guarded modals render the nested confirm (ConfirmDialog is
          itself a Modal without confirmClose, so the tree stays finite). */}
      {confirmClose !== false && confirmClose != null && (
      <ConfirmDialog
        open={open && askDiscard}
        title={confirmCloseTitle}
        description={confirmCloseMessage}
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        tone="danger"
        onCancel={() => setAskDiscard(false)}
        onConfirm={() => {
          setAskDiscard(false);
          onClose?.();
        }}
      />
      )}
    </>,
    document.body
  );
}

const TONE_BUTTON = {
  danger: "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500",
  primary: "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500",
  warning: "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500",
};

const TONE_ICON = {
  danger: "bg-red-500/10 text-red-500",
  primary: "bg-blue-500/10 text-blue-500",
  warning: "bg-amber-500/10 text-amber-500",
};

/**
 * Confirmation dialog. `requireText` makes the user type a value (e.g. the
 * project or workspace name) before the destructive button enables.
 * `onConfirm` may be async; the button shows a busy state until it settles.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  details,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  requireText,
  requireTextLabel,
  onConfirm,
  onCancel,
  testId = "confirm-dialog",
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      setTyped("");
      setBusy(false);
    }
  }, [open]);

  const textMatches = !requireText || typed.trim() === String(requireText).trim();

  const handleConfirm = async () => {
    if (!textMatches || busy) return;
    try {
      setBusy(true);
      await onConfirm?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { if (!busy) onCancel?.(); }}
      size="md"
      role="alertdialog"
      describedBy={descriptionId}
      zIndexClass="z-[90]"
      testId={testId}
      title={title}
      icon={(
        <span className={cn("w-8 h-8 rounded-full flex items-center justify-center", TONE_ICON[tone] || TONE_ICON.danger)}>
          <FaExclamationTriangle className="w-3.5 h-3.5" />
        </span>
      )}
      footer={(
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            data-autofocus={requireText ? undefined : true}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!textMatches || busy}
            data-testid={`${testId}-confirm`}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1a1f2e]",
              TONE_BUTTON[tone] || TONE_BUTTON.danger
            )}
          >
            {busy && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />}
            {confirmLabel}
          </button>
        </>
      )}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleConfirm();
        }}
      >
        {description && (
          <p id={descriptionId} className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {description}
          </p>
        )}
        {details && <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">{details}</div>}
        {requireText && (
          <label className="block mt-4">
            <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              {requireTextLabel || (
                <>Type <strong className="font-semibold text-slate-800 dark:text-slate-100 select-all">{requireText}</strong> to confirm</>
              )}
            </span>
            <input
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              data-autofocus
              autoComplete="off"
              spellCheck={false}
              data-testid={`${testId}-input`}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </label>
        )}
      </form>
    </Modal>
  );
}
