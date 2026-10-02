import React, { memo, useState } from "react";
import { FaCheck, FaPlus, FaRobot, FaTimes } from "react-icons/fa";
import { TASK_STATUS_SHORT_LABELS, TASK_TYPE_ICON_META, TASK_TYPE_LABELS } from "../../../../shared/constants/taskMeta";
import { FIELD_BASE, FIELD_CLASS, RISK_META } from "../../constants/releaseMeta";
import { isActiveStatus } from "../../utils/releaseModel";
import { ProgressBar, ReadinessRing } from "../ReleaseBadges";
import DetailCard, { SMALL_BTN_GHOST, SMALL_BTN_PRIMARY, SMALL_BTN_SECONDARY } from "./DetailCard";

const STATUS_HEX = {
  done: "#10b981",
  review: "#eab308",
  inprogress: "#3b82f6",
  awaiting: "#a855f7",
  blocked: "#ef4444",
  todo: "#94a3b8",
};
const STATUS_ORDER = ["done", "review", "inprogress", "awaiting", "blocked", "todo"];

function Donut({ percent, size = 112, stroke = 12 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-slate-200 dark:stroke-[#2a3044]" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} stroke="#3b82f6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - percent / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums text-slate-900">{percent}%</span>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">done</span>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-lg bg-slate-500/[0.05] px-3 py-2 dark:bg-white/[0.03]">
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${tone || "text-slate-900"}`}>{value}</div>
    </div>
  );
}

function ProgressCard({ metrics }) {
  const { work } = metrics;
  const types = Object.entries(work.byType).sort((a, b) => b[1] - a[1]);
  return (
    <DetailCard title="Progress" subtitle={work.total ? `${work.done} of ${work.total} work items done` : "No linked work items yet"}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Donut percent={work.percent} />
        <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Items" value={`${work.done}/${work.total}`} />
          <Stat label="Story points" value={work.points ? `${work.pointsDone}/${work.points}` : "—"} />
          <Stat label="Blocked" value={work.blocked} tone={work.blocked ? "text-red-600 dark:text-red-400" : undefined} />
          <Stat label="Open bugs" value={work.openBugs} tone={work.openBugs ? "text-amber-600 dark:text-amber-400" : undefined} />
        </div>
      </div>
      {work.total > 0 && (
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold text-slate-700">By status</div>
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-500/10">
              {STATUS_ORDER.filter((status) => work.byStatus[status]).map((status) => (
                <span key={status} style={{ width: `${(work.byStatus[status] / work.total) * 100}%`, backgroundColor: STATUS_HEX[status] }} title={`${TASK_STATUS_SHORT_LABELS[status]}: ${work.byStatus[status]}`} />
              ))}
            </div>
            <ul className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1">
              {STATUS_ORDER.filter((status) => work.byStatus[status]).map((status) => (
                <li key={status} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: STATUS_HEX[status] }} aria-hidden="true" />
                  <span className="flex-1">{TASK_STATUS_SHORT_LABELS[status]}</span>
                  <span className="tabular-nums font-medium text-slate-800">{work.byStatus[status]}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold text-slate-700">By type</div>
            <ul className="space-y-1.5">
              {types.map(([type, count]) => {
                const meta = TASK_TYPE_ICON_META[type];
                const Icon = meta?.icon;
                return (
                  <li key={type} className="flex items-center gap-2 text-xs">
                    <span className={`w-4 flex justify-center ${meta?.color || "text-slate-500"}`}>{Icon && <Icon className="h-3 w-3" />}</span>
                    <span className="w-24 truncate text-slate-600">{TASK_TYPE_LABELS[type] || type}</span>
                    <span className="flex-1"><ProgressBar value={(count / work.total) * 100} tone="slate" className="h-1.5" /></span>
                    <span className="w-6 text-right tabular-nums font-medium text-slate-800">{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </DetailCard>
  );
}

function ChecklistCard({ release, metrics, canManage, onToggle, onAdd, onRemove }) {
  const [draft, setDraft] = useState("");
  const { checklist } = metrics;
  return (
    <DetailCard
      title="Readiness checklist"
      subtitle={checklist.total ? `${checklist.done} of ${checklist.total} complete` : "No checklist items"}
      action={checklist.total > 0 && <span className="text-xs font-semibold tabular-nums text-slate-700">{checklist.percent}%</span>}
      testId="release-checklist"
    >
      {checklist.total > 0 && <ProgressBar value={checklist.percent} tone={checklist.percent === 100 ? "green" : "blue"} className="mb-3 h-1" />}
      <ul className="space-y-1">
        {release.checklist.map((item) => (
          <li key={item.id} className="group flex items-center gap-2">
            <button
              type="button"
              role="checkbox"
              aria-checked={item.completed}
              disabled={!canManage}
              onClick={() => onToggle(item.id)}
              data-testid={`release-checklist-${item.id}`}
              className="flex flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-slate-500/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:cursor-default disabled:hover:bg-transparent"
            >
              <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${item.completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 dark:border-[#3a4258]"}`}>
                {item.completed && <FaCheck className="h-2.5 w-2.5" />}
              </span>
              <span className={item.completed ? "text-slate-500 line-through" : "text-slate-800"}>{item.title}</span>
            </button>
            {canManage && (
              <button type="button" onClick={() => onRemove(item.id)} aria-label={`Remove checklist item ${item.title}`} className="rounded p-1 text-slate-500 opacity-0 hover:text-red-600 focus:opacity-100 group-hover:opacity-100">
                <FaTimes className="h-3 w-3" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {canManage && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (onAdd(draft)) setDraft("");
          }}
        >
          <input type="text" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add checklist item" aria-label="New checklist item" className={`${FIELD_CLASS} h-8 py-1`} />
          <button type="submit" className={SMALL_BTN_SECONDARY} disabled={!draft.trim()}>
            <FaPlus className="h-2.5 w-2.5" /> Add
          </button>
        </form>
      )}
    </DetailCard>
  );
}

function ReadinessCard({ metrics, release }) {
  const { readiness } = metrics;
  return (
    <DetailCard title="Readiness score" subtitle={isActiveStatus(release.status) ? "Computed from checklist, work, tests and blockers" : "Final snapshot"}>
      <div className="flex items-center gap-4">
        <ReadinessRing score={readiness.score} size={84} stroke={8} />
        <div className="text-sm text-slate-600">
          {readiness.parts.length === 0
            ? "Add checklist items or link work to compute readiness."
            : readiness.score >= 80 ? "Ready to ship." : readiness.score >= 50 ? "Getting there — review open items." : "Not ready — significant work remaining."}
        </div>
      </div>
      {readiness.parts.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {readiness.parts.map((part) => (
            <li key={part.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-slate-600">{part.label} <span className="text-slate-500">· weight {part.weight}</span></span>
                <span className="tabular-nums font-semibold text-slate-800">{part.value}%</span>
              </div>
              <ProgressBar value={part.value} tone={part.value >= 80 ? "green" : part.value >= 50 ? "amber" : "red"} className="h-1" />
            </li>
          ))}
        </ul>
      )}
    </DetailCard>
  );
}

function RisksCard({ release, metrics, canManage, onAddRisk, onRemoveRisk }) {
  const [text, setText] = useState("");
  const [severity, setSeverity] = useState("medium");
  const auto = metrics.autoRisks;
  const manual = release.risks;
  const active = isActiveStatus(release.status);
  return (
    <DetailCard
      title="Risks"
      subtitle={active ? `${auto.length + manual.length} open` : "Release is closed"}
      action={active && <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${RISK_META[metrics.riskLevel]?.pill}`}>{RISK_META[metrics.riskLevel]?.label} risk</span>}
      testId="release-risks"
    >
      {auto.length + manual.length === 0 && <p className="text-sm text-slate-500">No risks identified.</p>}
      <ul className="space-y-2">
        {auto.map((risk) => (
          <li key={risk.id} className="flex items-start gap-2 text-sm">
            <span className={`mt-0.5 inline-flex w-14 flex-shrink-0 justify-center rounded px-1.5 py-px text-[10px] font-semibold uppercase ring-1 ring-inset ${RISK_META[risk.severity].pill}`}>{risk.severity}</span>
            <span className="flex-1 text-slate-800">{risk.text}</span>
            <span className="inline-flex flex-shrink-0 items-center gap-1 text-[10px] font-medium text-slate-500" title="Derived automatically"><FaRobot className="h-2.5 w-2.5" /> Auto</span>
          </li>
        ))}
        {manual.map((risk) => (
          <li key={risk.id} className="group flex items-start gap-2 text-sm">
            <span className={`mt-0.5 inline-flex w-14 flex-shrink-0 justify-center rounded px-1.5 py-px text-[10px] font-semibold uppercase ring-1 ring-inset ${RISK_META[risk.severity].pill}`}>{risk.severity}</span>
            <span className="flex-1 text-slate-800">{risk.text}</span>
            {canManage && (
              <button type="button" onClick={() => onRemoveRisk(risk.id)} aria-label={`Remove risk ${risk.text}`} className="rounded p-1 text-slate-500 opacity-0 hover:text-red-600 focus:opacity-100 group-hover:opacity-100">
                <FaTimes className="h-3 w-3" />
              </button>
            )}
          </li>
        ))}
      </ul>
      {canManage && active && (
        <form
          aria-label="Add risk"
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (onAddRisk({ text, severity })) setText("");
          }}
        >
          <input type="text" value={text} onChange={(event) => setText(event.target.value)} placeholder="Add a risk note" aria-label="New risk" className={`${FIELD_CLASS} h-8 py-1`} />
          <div className="flex gap-2">
            <select value={severity} onChange={(event) => setSeverity(event.target.value)} aria-label="Risk severity" className={`${FIELD_BASE} h-8 w-auto py-0`}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button type="submit" className={SMALL_BTN_SECONDARY} disabled={!text.trim()}>
              <FaPlus className="h-2.5 w-2.5" /> Add
            </button>
          </div>
        </form>
      )}
    </DetailCard>
  );
}

function PlanCard({ release, canManage, onSave }) {
  const [editing, setEditing] = useState(false);
  const [rollbackPlan, setRollbackPlan] = useState(release.rollbackPlan);
  const [monitoringChecks, setMonitoringChecks] = useState(release.monitoringChecks);
  const startEdit = () => {
    setRollbackPlan(release.rollbackPlan);
    setMonitoringChecks(release.monitoringChecks);
    setEditing(true);
  };
  return (
    <DetailCard
      title="Rollback plan & monitoring"
      action={canManage && !editing && <button type="button" onClick={startEdit} className={SMALL_BTN_GHOST}>Edit</button>}
    >
      {editing ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSave({ rollbackPlan, monitoringChecks });
            setEditing(false);
          }}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Rollback plan</span>
            <textarea rows={3} value={rollbackPlan} onChange={(event) => setRollbackPlan(event.target.value)} className={FIELD_CLASS} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Monitoring checks</span>
            <textarea rows={3} value={monitoringChecks} onChange={(event) => setMonitoringChecks(event.target.value)} className={FIELD_CLASS} />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className={SMALL_BTN_GHOST}>Cancel</button>
            <button type="submit" className={SMALL_BTN_PRIMARY}>Save</button>
          </div>
        </form>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700">Rollback plan</div>
            <p className="whitespace-pre-wrap text-sm text-slate-600">{release.rollbackPlan || "Not documented yet."}</p>
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold text-slate-700">Monitoring checks</div>
            <p className="whitespace-pre-wrap text-sm text-slate-600">{release.monitoringChecks || "Not documented yet."}</p>
          </div>
        </div>
      )}
    </DetailCard>
  );
}

function OverviewTab({ release, metrics, canManage, actions }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <ProgressCard metrics={metrics} />
        <ChecklistCard
          release={release}
          metrics={metrics}
          canManage={canManage}
          onToggle={(itemId) => actions.toggleChecklist(release, itemId)}
          onAdd={(title) => actions.addChecklistItem(release, title)}
          onRemove={(itemId) => actions.removeChecklistItem(release, itemId)}
        />
        <PlanCard key={release.id} release={release} canManage={canManage} onSave={(fields) => actions.savePlan(release, fields)} />
      </div>
      <div className="min-w-0 space-y-4">
        <ReadinessCard metrics={metrics} release={release} />
        <RisksCard
          release={release}
          metrics={metrics}
          canManage={canManage}
          onAddRisk={(risk) => actions.addRisk(release, risk)}
          onRemoveRisk={(riskId) => actions.removeRisk(release, riskId)}
        />
      </div>
    </div>
  );
}

export default memo(OverviewTab);
