import React, { memo, useState } from "react";
import {
  FaArrowDown, FaArrowUp, FaChevronRight, FaGripVertical, FaLayerGroup, FaPlus, FaTrashAlt,
} from "react-icons/fa";
import { generateShortId } from "../../../shared/context/hooks/actions/testingRecords";
import OverflowMenu from "../components/OverflowMenu";

const AREA = "w-full resize-y rounded-md border border-slate-300/70 bg-white/100 px-2.5 py-1.5 text-sm leading-snug text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-[#2a3044] dark:bg-[#141720] dark:text-slate-100 dark:placeholder:text-slate-500";
const ICON_BTN = "inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-500/10 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:opacity-30 dark:hover:text-white";

export const newStep = () => ({ id: generateShortId("s"), action: "", data: "", expected: "" });

function SharedPreview({ group }) {
  if (!group) return <p className="text-xs text-red-600 dark:text-red-400">This shared step group was deleted.</p>;
  return (
    <ol className="mt-2 space-y-1 border-l-2 border-indigo-500/30 pl-3">
      {group.steps.map((step, index) => (
        <li key={step.id} className="text-xs text-slate-600">
          <span className="font-semibold tabular-nums text-slate-500">{index + 1}.</span> {step.action}
          {step.expected && <span className="text-slate-500"> → {step.expected}</span>}
        </li>
      ))}
    </ol>
  );
}

/**
 * Editable steps table: action / test data / expected result. Reorder with
 * drag handle or ↑/↓ buttons, insert below, delete, and "Call shared steps"
 * (a reference expanded at execution time).
 */
function StepsEditor({ steps, onChange, sharedSteps = [], sharedById = new Map(), readOnly = false, allowShared = true, testId = "tests-steps-editor" }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());

  const update = (index, patch) => onChange(steps.map((step, i) => (i === index ? { ...step, ...patch } : step)));
  const remove = (index) => onChange(steps.filter((_, i) => i !== index));
  const insertAt = (index, step = newStep()) => {
    const next = [...steps];
    next.splice(index, 0, step);
    onChange(next);
  };
  const move = (from, to) => {
    if (to < 0 || to >= steps.length || from === to) return;
    const next = [...steps];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  const callShared = (groupId, index = steps.length) => insertAt(index, { id: generateShortId("s"), sharedStepsId: groupId });

  if (readOnly) {
    if (!steps.length) return <p className="text-sm text-slate-500">No steps defined.</p>;
    return (
      <ol className="divide-y divide-slate-200/70 overflow-hidden rounded-lg border border-slate-200/80 dark:divide-[#252b3b] dark:border-[#252b3b]" data-testid={testId}>
        {steps.map((step, index) => (
          <li key={step.id} className="grid gap-2 px-3 py-2.5 text-sm sm:grid-cols-[28px_1fr_1fr_1fr]">
            <span className="font-semibold tabular-nums text-slate-500">{index + 1}</span>
            {step.sharedStepsId ? (
              <div className="sm:col-span-3">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 dark:text-indigo-300"><FaLayerGroup className="h-3 w-3" /> Shared: {sharedById.get(step.sharedStepsId)?.name || "Missing group"}</span>
                <SharedPreview group={sharedById.get(step.sharedStepsId)} />
              </div>
            ) : (
              <>
                <span className="text-slate-800">{step.action || <i className="text-slate-500">No action</i>}</span>
                <span className="font-mono text-xs text-slate-600">{step.data || "—"}</span>
                <span className="text-slate-700">{step.expected || "—"}</span>
              </>
            )}
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div data-testid={testId}>
      {steps.length > 0 && (
        <div className="mb-1.5 hidden grid-cols-[44px_1fr_1fr_1fr_76px] gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 md:grid">
          <span>#</span><span>Step action</span><span>Test data</span><span>Expected result</span><span />
        </div>
      )}
      <ol className="space-y-2">
        {steps.map((step, index) => {
          const group = step.sharedStepsId ? sharedById.get(step.sharedStepsId) : null;
          const isOpen = expanded.has(step.id);
          return (
            <li
              key={step.id}
              onDragOver={(event) => {
                if (dragIndex === null) return;
                event.preventDefault();
                setOverIndex(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex !== null) move(dragIndex, index);
                setDragIndex(null);
                setOverIndex(null);
              }}
              className={`relative grid gap-2 rounded-lg border p-2 md:grid-cols-[44px_1fr_1fr_1fr_76px] md:items-start ${
                step.sharedStepsId ? "border-indigo-500/25 bg-indigo-500/[0.04]" : "border-slate-200/80 bg-slate-500/[0.02] dark:border-[#252b3b]"
              } ${overIndex === index && dragIndex !== index ? "ring-2 ring-blue-500/50" : ""}`}
              data-testid="tests-step-row"
            >
              <div className="flex items-center gap-1 md:pt-1.5">
                <span
                  draggable
                  onDragStart={(event) => {
                    setDragIndex(index);
                    try { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", step.id); } catch { /* noop */ }
                  }}
                  onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                  className="cursor-grab text-slate-400 hover:text-slate-600"
                  title="Drag to reorder"
                  aria-hidden="true"
                >
                  <FaGripVertical className="h-3 w-3" />
                </span>
                <span className="text-xs font-semibold tabular-nums text-slate-500">{index + 1}</span>
              </div>
              {step.sharedStepsId ? (
                <div className="md:col-span-3">
                  <button type="button" onClick={() => setExpanded((prev) => { const next = new Set(prev); if (next.has(step.id)) next.delete(step.id); else next.add(step.id); return next; })} className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:underline dark:text-indigo-300" aria-expanded={isOpen}>
                    <FaChevronRight className={`h-2.5 w-2.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                    <FaLayerGroup className="h-3 w-3" />
                    Call shared steps: {group?.name || "Missing group"}
                    <span className="font-normal text-slate-500">({group?.steps.length || 0} steps)</span>
                  </button>
                  {isOpen && <SharedPreview group={group} />}
                </div>
              ) : (
                <>
                  <textarea rows={2} value={step.action} onChange={(event) => update(index, { action: event.target.value })} placeholder="What the tester does" aria-label={`Step ${index + 1} action`} className={AREA} />
                  <textarea rows={2} value={step.data} onChange={(event) => update(index, { data: event.target.value })} placeholder="Input / test data" aria-label={`Step ${index + 1} test data`} className={`${AREA} font-mono text-xs`} />
                  <textarea rows={2} value={step.expected} onChange={(event) => update(index, { expected: event.target.value })} placeholder="Expected result" aria-label={`Step ${index + 1} expected result`} className={AREA} />
                </>
              )}
              <div className="flex items-center justify-end gap-0.5 md:pt-1">
                <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} className={ICON_BTN} aria-label={`Move step ${index + 1} up`}><FaArrowUp className="h-2.5 w-2.5" /></button>
                <button type="button" onClick={() => move(index, index + 1)} disabled={index === steps.length - 1} className={ICON_BTN} aria-label={`Move step ${index + 1} down`}><FaArrowDown className="h-2.5 w-2.5" /></button>
                <OverflowMenu
                  label={`More actions for step ${index + 1}`}
                  triggerClassName={ICON_BTN}
                  items={[
                    { id: "insert", label: "Insert step below", icon: FaPlus, onSelect: () => insertAt(index + 1) },
                    allowShared && sharedSteps.length ? { id: "shared", label: "Call shared steps below…", icon: FaLayerGroup, onSelect: () => callShared(sharedSteps[0].id, index + 1) } : null,
                    { id: "div", divider: true },
                    { id: "delete", label: "Delete step", icon: FaTrashAlt, danger: true, onSelect: () => remove(index) },
                  ]}
                />
              </div>
              {step.sharedStepsId && sharedSteps.length > 1 && (
                <div className="md:col-start-2 md:col-span-3">
                  <label className="sr-only" htmlFor={`shared-pick-${step.id}`}>Shared steps group</label>
                  <select id={`shared-pick-${step.id}`} value={step.sharedStepsId} onChange={(event) => update(index, { sharedStepsId: event.target.value })} className="h-8 rounded-md border border-slate-300/70 bg-white/80 px-2 text-xs text-slate-700 dark:border-[#2a3044] dark:bg-[#1c2030] dark:text-slate-200">
                    {sharedSteps.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {steps.length === 0 && <p className="rounded-lg border border-dashed border-slate-300/80 px-3 py-4 text-center text-sm text-slate-500 dark:border-[#2a3044]">No steps yet. Add the first step or call a shared step group.</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => insertAt(steps.length)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-2.5 text-xs font-medium text-slate-700 hover:border-blue-400 hover:text-blue-600 dark:border-[#374155] dark:text-slate-200 dark:hover:text-blue-300" data-testid="tests-add-step">
          <FaPlus className="h-2.5 w-2.5" /> Add step
        </button>
        {allowShared && sharedSteps.length > 0 && (
          <OverflowMenu
            label="Call shared steps"
            align="left"
            testId="tests-call-shared"
            triggerClassName="inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed border-indigo-400/50 px-2.5 text-xs font-medium text-indigo-700 hover:bg-indigo-500/10 dark:text-indigo-300"
            items={sharedSteps.map((group) => ({ id: group.id, label: `${group.name} (${group.steps.length})`, icon: FaLayerGroup, onSelect: () => callShared(group.id) }))}
          >
            <><FaLayerGroup className="h-2.5 w-2.5" /> Call shared steps</>
          </OverflowMenu>
        )}
      </div>
    </div>
  );
}

export default memo(StepsEditor);
