import React, { useMemo, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { useEscapeKey } from "../../board/hooks/useEscapeKey";
import { AUTOMATION_TEMPLATES } from "../../../shared/automation/automationTemplates";
import { describeRule } from "../../../shared/automation/automationDescribe";
import { RuleSentence } from "./automationControls";

export function TemplateCard({ template, lookups, onUse, compact = false }) {
  const description = useMemo(() => describeRule(template, lookups), [template, lookups]);
  return (
    <button
      type="button"
      onClick={() => onUse(template)}
      className="group flex h-full flex-col rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:hover:border-blue-600"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{template.category}</span>
      <span className="mt-1 text-sm font-semibold text-slate-800 dark:text-white">{template.name}</span>
      {!compact && <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">{template.description}</span>}
      <RuleSentence description={description} className="mt-2 text-xs leading-6" />
      <span className="mt-auto pt-3 text-xs font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-blue-400">
        Use template →
      </span>
    </button>
  );
}

export default function AutomationTemplateGallery({ open, lookups, onUse, onClose }) {
  const [category, setCategory] = useState("All");
  useEscapeKey(onClose, open);

  const categories = useMemo(() => ["All", ...new Set(AUTOMATION_TEMPLATES.map((template) => template.category))], []);
  const visible = category === "All"
    ? AUTOMATION_TEMPLATES
    : AUTOMATION_TEMPLATES.filter((template) => template.category === category);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-8" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Automation templates" className="w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1a1f2e] shadow-2xl animate-modal-enter">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#2a3044] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Rule templates</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Start from a proven rule and adjust it in the editor.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#232838]">
            <FaTimes className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 px-6 pt-4">
          {categories.map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${category === item
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-[#232838] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2a3044]"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((template) => (
            <TemplateCard key={template.id} template={template} lookups={lookups} onUse={onUse} />
          ))}
        </div>
      </div>
    </div>
  );
}
