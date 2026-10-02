import React from "react";
import { formatDistanceToNow } from "date-fns";

export const INPUT_CLS = "w-full border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";
export const SELECT_CLS = `${INPUT_CLS} pr-8`;
export const INLINE_SELECT_CLS = "border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400";
export const LABEL_CLS = "text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block";

/** Colour language of the rule builder: WHEN = blue, IF = amber, THEN = green. */
export const STEP_TONES = {
  when: {
    chip: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/60",
    dot: "bg-blue-500",
    label: "text-blue-600 dark:text-blue-400",
  },
  if: {
    chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/60",
    dot: "bg-amber-500",
    label: "text-amber-600 dark:text-amber-400",
  },
  then: {
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/60",
    dot: "bg-emerald-500",
    label: "text-emerald-600 dark:text-emerald-400",
  },
};

export function SentenceChip({ tone, children }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium ${STEP_TONES[tone].chip}`}>
      {children}
    </span>
  );
}

/** "When … if … then …" sentence with coloured chips. */
export function RuleSentence({ description, className = "" }) {
  return (
    <p className={`text-sm leading-7 text-slate-600 dark:text-slate-300 ${className}`}>
      <span className="font-semibold text-slate-700 dark:text-slate-200">When </span>
      <SentenceChip tone="when">{description.when}</SentenceChip>
      {description.conditions.length > 0 && (
        <>
          <span className="font-semibold text-slate-700 dark:text-slate-200"> if </span>
          {description.conditions.map((text, index) => (
            <React.Fragment key={`${text}-${index}`}>
              {index > 0 && <span className="text-slate-400"> and </span>}
              <SentenceChip tone="if">{text}</SentenceChip>
            </React.Fragment>
          ))}
        </>
      )}
      <span className="font-semibold text-slate-700 dark:text-slate-200"> then </span>
      {description.actions.length === 0 ? (
        <span className="text-slate-400">…</span>
      ) : description.actions.map((text, index) => (
        <React.Fragment key={`${text}-${index}`}>
          {index > 0 && " "}
          <span className="whitespace-nowrap">
            <SentenceChip tone="then">{text}</SentenceChip>
            {index < description.actions.length - 1 && <span className="text-slate-400">,</span>}
          </span>
        </React.Fragment>
      ))}
    </p>
  );
}

export function ToggleSwitch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${checked ? "bg-blue-600" : "bg-slate-300 dark:bg-[#2a3044]"}`}
    >
      {/* Inline colour: dark.css remaps .bg-white in dark mode. */}
      <span
        className={`inline-block h-4 w-4 transform rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`}
        style={{ backgroundColor: "#ffffff" }}
      />
    </button>
  );
}

/** Toggle chips for short option lists; value is a string or an array. */
export function ChipMultiSelect({ options, value, onChange, ariaLabel }) {
  const selected = Array.isArray(value) ? value : (value ? [value] : []);
  const toggle = (optionValue) => {
    const next = selected.includes(optionValue)
      ? selected.filter((item) => item !== optionValue)
      : [...selected, optionValue];
    onChange(next.length === 1 ? next[0] : next);
  };
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            type="button"
            key={option.value}
            aria-pressed={active}
            onClick={() => toggle(option.value)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${active
              ? "border-blue-500 bg-blue-600 text-white"
              : "border-slate-200 dark:border-[#2a3044] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#232838]"}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function StatusDot({ status }) {
  const tone = status === "success"
    ? "bg-emerald-500"
    : status === "partial"
      ? "bg-amber-500"
      : status === "error"
        ? "bg-red-500"
        : "bg-slate-300 dark:bg-slate-600";
  return <span className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${tone}`} aria-hidden="true" />;
}

export function relativeTime(iso) {
  if (!iso) return "never";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch (_) {
    return "";
  }
}
