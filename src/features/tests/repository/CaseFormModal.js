import React, { useRef, useState } from "react";
import {
  AUTOMATION_OPTIONS, BTN_PRIMARY, BTN_SECONDARY, CASE_STATUS_OPTIONS, CASE_TYPE_OPTIONS, FIELD, LINKABLE_REQUIREMENT_TYPES, PRIORITY_OPTIONS,
} from "../constants/testingConstants";
import FolderSelect from "../components/FolderSelect";
import TaskPicker from "../components/TaskPicker";
import TaskRef from "../components/TaskRef";
import { Field, Modal } from "../components/ui";
import StepsEditor, { newStep } from "./StepsEditor";

const SELECT = `${FIELD} h-9 py-0`;

/** Create a test case (TestRail-style full form). "Create & add another" keeps folder & settings. */
export default function CaseFormModal({ ws, initial = {}, onClose, onCreated }) {
  const { data, users, currentUser } = ws;
  const titleRef = useRef(null);
  const blank = () => ({
    title: "",
    suiteId: initial.suiteId || data.tree.roots[0]?.id || "",
    priority: initial.priority || "medium",
    type: initial.type || "functional",
    automation: initial.automation || "manual",
    status: initial.status || "draft",
    owner: initial.owner ?? currentUser ?? "",
    estimate: "",
    tags: (initial.tags || []).join(", "),
    preconditions: "",
    expectedResult: "",
    steps: [newStep()],
    requirementIds: initial.requirementIds || [],
  });
  const [form, setForm] = useState(() => ({ ...blank(), title: initial.title || "" }));
  const [error, setError] = useState("");
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event?.target ? event.target.value : event }));

  const submit = (another) => {
    if (!form.title.trim()) {
      setError("Title is required");
      titleRef.current?.focus();
      return;
    }
    if (!form.suiteId) {
      setError("Choose a folder");
      return;
    }
    const record = ws.actions.createCase({
      ...form,
      title: form.title.trim(),
      owner: form.owner || null,
      estimate: Number.parseInt(form.estimate, 10) || null,
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      steps: form.steps,
    });
    if (!record) return;
    onCreated?.(record, another);
    if (another) {
      setForm((prev) => ({ ...blank(), suiteId: prev.suiteId, priority: prev.priority, type: prev.type, automation: prev.automation, status: prev.status, owner: prev.owner, tags: prev.tags }));
      setError("");
      titleRef.current?.focus();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      title="New test case"
      subtitle="Cases get a project-scoped key (TC-…) automatically."
      size="lg"
      onClose={onClose}
      initialFocusRef={titleRef}
      testId="tests-case-form"
      footer={(
        <>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>Cancel</button>
          <button type="button" onClick={() => submit(true)} className={BTN_SECONDARY} data-testid="tests-case-create-another">Create & add another</button>
          <button type="button" onClick={() => submit(false)} className={BTN_PRIMARY} data-testid="tests-case-create">Create case</button>
        </>
      )}
    >
      <form onSubmit={(event) => { event.preventDefault(); submit(false); }} className="space-y-4">
        <Field label="Title" htmlFor="new-case-title">
          <input ref={titleRef} id="new-case-title" type="text" value={form.title} onChange={(event) => { set("title")(event); setError(""); }} placeholder="e.g. Login with valid credentials" className={FIELD} aria-invalid={Boolean(error && !form.title.trim())} />
        </Field>
        {error && <p role="alert" className="-mt-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Field label="Folder" htmlFor="new-case-folder" className="col-span-2">
            <FolderSelect id="new-case-folder" tree={data.tree} value={form.suiteId} onChange={(value) => setForm((prev) => ({ ...prev, suiteId: value || "" }))} className={SELECT} />
          </Field>
          <Field label="Priority" htmlFor="new-case-priority">
            <select id="new-case-priority" value={form.priority} onChange={set("priority")} className={SELECT}>{PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          </Field>
          <Field label="Type" htmlFor="new-case-type">
            <select id="new-case-type" value={form.type} onChange={set("type")} className={SELECT}>{CASE_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          </Field>
          <Field label="Automation" htmlFor="new-case-automation">
            <select id="new-case-automation" value={form.automation} onChange={set("automation")} className={SELECT}>{AUTOMATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          </Field>
          <Field label="Status" htmlFor="new-case-status">
            <select id="new-case-status" value={form.status} onChange={set("status")} className={SELECT}>{CASE_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          </Field>
          <Field label="Owner" htmlFor="new-case-owner">
            <select id="new-case-owner" value={form.owner || ""} onChange={set("owner")} className={SELECT}>
              <option value="">Unassigned</option>
              {users.filter((user) => user?.username).map((user) => <option key={user.username} value={user.username}>{user.name || user.username}</option>)}
            </select>
          </Field>
          <Field label="Estimate (min)" htmlFor="new-case-estimate">
            <input id="new-case-estimate" type="number" min="0" value={form.estimate} onChange={set("estimate")} className={FIELD} placeholder="10" />
          </Field>
        </div>
        <Field label="Tags" htmlFor="new-case-tags" hint="Comma separated, e.g. smoke, regression, payments">
          <input id="new-case-tags" type="text" value={form.tags} onChange={set("tags")} className={FIELD} />
        </Field>
        <Field label="Preconditions" htmlFor="new-case-pre">
          <textarea id="new-case-pre" rows={2} value={form.preconditions} onChange={set("preconditions")} className={FIELD} placeholder="Accounts, data or flags required before step 1" />
        </Field>
        <Field label="Steps">
          <StepsEditor steps={form.steps} onChange={(steps) => setForm((prev) => ({ ...prev, steps }))} sharedSteps={data.sharedSteps} sharedById={data.sharedById} />
        </Field>
        <Field label="Expected result (overall)" htmlFor="new-case-expected">
          <textarea id="new-case-expected" rows={2} value={form.expectedResult} onChange={set("expectedResult")} className={FIELD} />
        </Field>
        <Field label="Requirements">
          {form.requirementIds.length > 0 && (
            <ul className="mb-2 divide-y divide-slate-200/70 dark:divide-[#252b3b]">
              {form.requirementIds.map((id) => (
                <TaskRef key={id} id={id} task={data.taskById.get(String(id))} onRemove={() => setForm((prev) => ({ ...prev, requirementIds: prev.requirementIds.filter((item) => item !== id) }))} />
              ))}
            </ul>
          )}
          <TaskPicker tasks={data.tasks} types={LINKABLE_REQUIREMENT_TYPES} excludeIds={form.requirementIds} onPick={(task) => setForm((prev) => ({ ...prev, requirementIds: [...prev.requirementIds, task.id] }))} placeholder="Link a user story, feature or task…" />
        </Field>
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
