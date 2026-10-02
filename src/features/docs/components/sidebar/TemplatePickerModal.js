import React from "react";
import { Modal } from "../../../../shared/ui/Modal";

export default function TemplatePickerModal({ onSelect, onClose, templates }) {
  return (
    <Modal open onClose={onClose} title="Choose a Template" size="2xl" testId="docs-template-picker">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {templates.map((t, index) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t)}
            data-autofocus={index === 0 ? true : undefined}
            className="flex flex-col items-start gap-2 p-4 rounded-xl border border-slate-200 dark:border-[#2a3044] hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="text-2xl" aria-hidden="true">{t.emoji}</span>
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{t.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">{t.description}</div>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
}
