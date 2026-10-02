import React, { useMemo, useState } from "react";
import { FaCopy, FaGlobe, FaPen, FaTrash } from "react-icons/fa";
import { describeRule } from "../../../shared/automation/automationDescribe";
import { RuleSentence, StatusDot, ToggleSwitch, relativeTime } from "./automationControls";

export default function AutomationRuleCard({ rule, lookups, canEdit, onToggle, onEdit, onDuplicate, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const description = useMemo(() => describeRule(rule, lookups), [rule, lookups]);

  return (
    <article
      aria-label={`Automation rule ${rule.name}`}
      className={`rounded-xl border bg-white dark:bg-[#1c2030] p-4 transition-colors ${rule.enabled
        ? "border-slate-200 dark:border-[#2a3044]"
        : "border-dashed border-slate-200 dark:border-[#2a3044] opacity-70"}`}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <ToggleSwitch
            checked={Boolean(rule.enabled)}
            disabled={!canEdit}
            label={`${rule.enabled ? "Disable" : "Enable"} ${rule.name}`}
            onChange={(enabled) => onToggle(rule.id, enabled)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-white">{rule.name}</h3>
            {!rule.projectId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-300">
                <FaGlobe className="h-2.5 w-2.5" /> All projects
              </span>
            )}
            {!rule.enabled && (
              <span className="rounded-full bg-slate-100 dark:bg-[#232838] px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">Paused</span>
            )}
          </div>
          {rule.description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{rule.description}</p>}
          <RuleSentence description={description} className="mt-1.5" />
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1.5">
              <StatusDot status={rule.lastStatus} />
              {rule.runCount ? `${rule.runCount} run${rule.runCount === 1 ? "" : "s"}` : "Not run yet"}
            </span>
            {rule.lastRunAt && <span>Last run {relativeTime(rule.lastRunAt)}</span>}
            {rule.createdBy && <span>Created by {lookups.user(rule.createdBy)}</span>}
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-shrink-0 items-center gap-0.5">
            {confirming ? (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Delete?</span>
                <button type="button" onClick={() => onDelete(rule.id)} className="rounded-md bg-red-600 px-2 py-1 font-medium text-white hover:bg-red-700">Delete</button>
                <button type="button" onClick={() => setConfirming(false)} className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#232838]">Cancel</button>
              </div>
            ) : (
              <>
                <button type="button" aria-label={`Edit ${rule.name}`} onClick={() => onEdit(rule)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#232838] dark:hover:text-slate-200">
                  <FaPen className="h-3 w-3" />
                </button>
                <button type="button" aria-label={`Duplicate ${rule.name}`} onClick={() => onDuplicate(rule.id)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#232838] dark:hover:text-slate-200">
                  <FaCopy className="h-3 w-3" />
                </button>
                <button type="button" aria-label={`Delete ${rule.name}`} onClick={() => setConfirming(true)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                  <FaTrash className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
