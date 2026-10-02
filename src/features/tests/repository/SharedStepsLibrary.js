import React, { useEffect, useMemo, useState } from "react";
import { FaLayerGroup, FaPlus, FaTrashAlt } from "react-icons/fa";
import { BTN_PRIMARY, BTN_SECONDARY, FIELD } from "../constants/testingConstants";
import { EmptyState, Field, Modal } from "../components/ui";
import StepsEditor, { newStep } from "./StepsEditor";

/** Library of reusable step groups ("Call to test" / shared steps). */
export default function SharedStepsLibrary({ ws, onClose }) {
  const { data, perms, actions } = ws;
  const canEdit = perms.canEdit;
  const [selectedId, setSelectedId] = useState(data.sharedSteps[0]?.id || null);
  const [draft, setDraft] = useState(null);
  const selected = data.sharedSteps.find((group) => group.id === selectedId) || null;
  const usage = useMemo(() => {
    const map = new Map();
    data.cases.forEach((testCase) => testCase.steps.forEach((step) => {
      if (step.sharedStepsId) map.set(step.sharedStepsId, (map.get(step.sharedStepsId) || new Set()).add(testCase.id));
    }));
    return map;
  }, [data.cases]);

  useEffect(() => {
    if (selected) setDraft({ name: selected.name, description: selected.description, steps: selected.steps });
    else if (selectedId !== "__new__") setDraft(null);
  }, [selected, selectedId]);

  const dirty = draft && selected && JSON.stringify(draft) !== JSON.stringify({ name: selected.name, description: selected.description, steps: selected.steps });
  const isNew = selectedId === "__new__";

  const save = () => {
    if (!draft?.name?.trim()) return;
    if (isNew) {
      const record = actions.createSharedSteps({ ...draft, name: draft.name.trim() });
      if (record) setSelectedId(record.id);
      return;
    }
    actions.updateSharedSteps(selected.id, { ...draft, name: draft.name.trim() });
  };

  return (
    <Modal title="Shared steps library" subtitle="Reusable step groups that test cases call. Edits apply everywhere they are used." size="xl" onClose={onClose} testId="tests-shared-steps">
      <div className="grid min-h-[420px] gap-4 md:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-2 md:border-r md:border-slate-200/70 md:pr-4 md:dark:border-[#252b3b]">
          {canEdit && (
            <button type="button" onClick={() => { setSelectedId("__new__"); setDraft({ name: "", description: "", steps: [newStep()] }); }} className={`${BTN_SECONDARY} w-full`} data-testid="tests-shared-new">
              <FaPlus className="h-3 w-3" /> New step group
            </button>
          )}
          <ul className="space-y-1">
            {data.sharedSteps.map((group) => (
              <li key={group.id}>
                <button type="button" onClick={() => setSelectedId(group.id)} className={`flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left ${group.id === selectedId ? "bg-blue-500/10" : "hover:bg-slate-500/[0.06]"}`}>
                  <FaLayerGroup className="mt-0.5 h-3 w-3 flex-shrink-0 text-indigo-500" />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${group.id === selectedId ? "font-semibold text-blue-700 dark:text-blue-300" : "font-medium text-slate-800"}`}>{group.name}</span>
                    <span className="block text-[11px] text-slate-500">{group.steps.length} steps · used by {usage.get(group.id)?.size || 0} case{(usage.get(group.id)?.size || 0) !== 1 ? "s" : ""}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {data.sharedSteps.length === 0 && !isNew && <p className="px-1 text-xs text-slate-500">No shared step groups yet.</p>}
        </div>
        <div className="min-w-0">
          {!draft ? (
            <EmptyState icon={FaLayerGroup} title="Select a step group" description="Shared steps keep common flows (login, setup, cleanup) in one place." />
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name" htmlFor="shared-name">
                  <input id="shared-name" type="text" value={draft.name} disabled={!canEdit} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} className={FIELD} placeholder="e.g. Login as admin" data-testid="tests-shared-name" />
                </Field>
                <Field label="Description" htmlFor="shared-description">
                  <input id="shared-description" type="text" value={draft.description} disabled={!canEdit} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} className={FIELD} />
                </Field>
              </div>
              <StepsEditor steps={draft.steps} onChange={(steps) => setDraft((prev) => ({ ...prev, steps }))} allowShared={false} readOnly={!canEdit} testId="tests-shared-steps-editor" />
              {canEdit && (
                <div className="flex items-center justify-between gap-2 border-t border-slate-200/70 pt-3 dark:border-[#252b3b]">
                  {!isNew && selected ? (
                    <button type="button" onClick={() => actions.deleteSharedSteps(selected)} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400">
                      <FaTrashAlt className="h-3 w-3" /> Delete
                    </button>
                  ) : <span />}
                  <div className="flex gap-2">
                    {isNew && <button type="button" onClick={() => setSelectedId(data.sharedSteps[0]?.id || null)} className={BTN_SECONDARY}>Cancel</button>}
                    <button type="button" onClick={save} disabled={!draft.name.trim() || (!isNew && !dirty)} className={BTN_PRIMARY} data-testid="tests-shared-save">
                      {isNew ? "Create group" : "Save changes"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
