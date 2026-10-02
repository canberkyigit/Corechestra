import React from "react";
import { FaTimes } from "react-icons/fa";

export default function TemplatePickerModal({ onSelect, onClose, templates }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="app-surface w-full max-w-2xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#2a3044]">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">Choose a Template</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className="flex flex-col items-start gap-2 p-4 rounded-xl border border-slate-200 dark:border-[#2a3044] hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all text-left group"
            >
              <span className="text-2xl">{t.emoji}</span>
              <div>
                <div className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{t.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">{t.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
