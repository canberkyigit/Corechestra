import React, { useRef, useState } from "react";
import { FaBug } from "react-icons/fa";
import { BTN_PRIMARY, BTN_SECONDARY, FIELD, PRIORITY_OPTIONS } from "../constants/testingConstants";
import { Field, Modal } from "../components/ui";

/** Prefilled bug form for a failed execution (Xray/Zephyr "Create defect"). */
export default function DefectDialog({ initial, users, hasBacklog, onSubmit, onClose }) {
  const titleRef = useRef(null);
  const [form, setForm] = useState({
    title: initial.title,
    description: initial.description,
    priority: initial.priority || "medium",
    assignedTo: "",
    type: "bug",
    destination: "active",
  });
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const submit = (event) => {
    event?.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({ ...form, title: form.title.trim() });
  };
  return (
    <Modal
      title="Create defect"
      subtitle="The bug is linked to this case, the cycle execution and the failed step."
      size="lg"
      onClose={onClose}
      initialFocusRef={titleRef}
      testId="tests-defect-dialog"
      footer={(
        <>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>Cancel</button>
          <button type="button" onClick={submit} disabled={!form.title.trim()} className={`${BTN_PRIMARY} bg-red-600 hover:bg-red-500`} data-testid="tests-defect-submit">
            <FaBug className="h-3 w-3" /> Create defect
          </button>
        </>
      )}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Summary" htmlFor="defect-title">
          <input ref={titleRef} id="defect-title" type="text" value={form.title} onChange={set("title")} className={FIELD} data-testid="tests-defect-title" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Type" htmlFor="defect-type">
            <select id="defect-type" value={form.type} onChange={set("type")} className={`${FIELD} h-9 py-0`}>
              <option value="bug">Bug</option>
              <option value="defect">Defect</option>
            </select>
          </Field>
          <Field label="Priority" htmlFor="defect-priority">
            <select id="defect-priority" value={form.priority} onChange={set("priority")} className={`${FIELD} h-9 py-0`}>
              {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Assignee" htmlFor="defect-assignee">
            <select id="defect-assignee" value={form.assignedTo} onChange={set("assignedTo")} className={`${FIELD} h-9 py-0`}>
              <option value="">Unassigned</option>
              {users.filter((user) => user?.username).map((user) => <option key={user.username} value={user.username}>{user.name || user.username}</option>)}
            </select>
          </Field>
          <Field label="Add to" htmlFor="defect-destination">
            <select id="defect-destination" value={form.destination} onChange={set("destination")} className={`${FIELD} h-9 py-0`}>
              <option value="active">Active sprint</option>
              {hasBacklog && <option value="backlog">Backlog</option>}
            </select>
          </Field>
        </div>
        <Field label="Description" htmlFor="defect-description" hint="Prefilled with the steps to reproduce, expected and actual results.">
          <textarea id="defect-description" rows={12} value={form.description} onChange={set("description")} className={`${FIELD} font-mono text-xs leading-relaxed`} />
        </Field>
      </form>
    </Modal>
  );
}
