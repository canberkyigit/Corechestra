import React, { useRef, useState } from "react";
import { BTN_PRIMARY, BTN_SECONDARY, FIELD } from "../constants/testingConstants";
import { Field, Modal } from "../components/ui";

/** Create / edit a test plan (release-linked container of cycles). */
export default function PlanFormModal({ ws, plan = null, onClose, onSaved }) {
  const { data, users, currentUser } = ws;
  const nameRef = useRef(null);
  const [form, setForm] = useState(() => ({
    name: plan?.name || "",
    description: plan?.description || "",
    releaseId: plan?.releaseId || "",
    milestone: plan?.milestone || "",
    startDate: plan?.startDate || "",
    endDate: plan?.endDate || "",
    owner: plan?.owner || currentUser || "",
    scope: plan?.scope || "",
  }));
  const [error, setError] = useState("");
  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const activeReleases = data.projectReleases.filter((release) => !["released", "cancelled", "rolled-back"].includes(release.status) || release.id === plan?.releaseId);

  const submit = (event) => {
    event?.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required");
      nameRef.current?.focus();
      return;
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError("End date must be after the start date");
      return;
    }
    const payload = { ...form, name: form.name.trim(), releaseId: form.releaseId || null, owner: form.owner || null, startDate: form.startDate || null, endDate: form.endDate || null };
    if (plan) {
      ws.actions.updatePlan(plan.id, payload);
      onSaved?.(plan);
    } else {
      const record = ws.actions.createPlan(payload);
      onSaved?.(record);
    }
    onClose();
  };

  return (
    <Modal
      title={plan ? "Edit test plan" : "New test plan"}
      subtitle="A plan groups cycles for a release or milestone and rolls up their progress."
      onClose={onClose}
      initialFocusRef={nameRef}
      testId="tests-plan-form"
      footer={(
        <>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>Cancel</button>
          <button type="button" onClick={submit} className={BTN_PRIMARY} data-testid="tests-plan-save">{plan ? "Save plan" : "Create plan"}</button>
        </>
      )}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name" htmlFor="plan-name">
          <input ref={nameRef} id="plan-name" type="text" value={form.name} onChange={(event) => { set("name")(event); setError(""); }} className={FIELD} placeholder="e.g. v2.6 release regression" />
        </Field>
        {error && <p role="alert" className="-mt-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Release" htmlFor="plan-release" hint="Results roll up into the release's Quality tab.">
            <select id="plan-release" value={form.releaseId} onChange={set("releaseId")} className={`${FIELD} h-9 py-0`}>
              <option value="">No release</option>
              {activeReleases.map((release) => <option key={release.id} value={release.id}>{release.version}{release.name ? ` — ${release.name}` : ""}</option>)}
            </select>
          </Field>
          <Field label="Milestone" htmlFor="plan-milestone">
            <input id="plan-milestone" type="text" value={form.milestone} onChange={set("milestone")} className={FIELD} placeholder="e.g. RC sign-off" />
          </Field>
          <Field label="Start date" htmlFor="plan-start">
            <input id="plan-start" type="date" value={form.startDate} onChange={set("startDate")} className={FIELD} />
          </Field>
          <Field label="End date" htmlFor="plan-end">
            <input id="plan-end" type="date" value={form.endDate} onChange={set("endDate")} className={FIELD} />
          </Field>
          <Field label="Owner" htmlFor="plan-owner">
            <select id="plan-owner" value={form.owner} onChange={set("owner")} className={`${FIELD} h-9 py-0`}>
              <option value="">Unassigned</option>
              {users.filter((user) => user?.username).map((user) => <option key={user.username} value={user.username}>{user.name || user.username}</option>)}
            </select>
          </Field>
          <Field label="Scope" htmlFor="plan-scope">
            <input id="plan-scope" type="text" value={form.scope} onChange={set("scope")} className={FIELD} placeholder="e.g. Web + API regression, smoke on UAT" />
          </Field>
        </div>
        <Field label="Description & exit criteria" htmlFor="plan-description">
          <textarea id="plan-description" rows={3} value={form.description} onChange={set("description")} className={FIELD} placeholder="Objectives, entry/exit criteria, risks" />
        </Field>
      </form>
    </Modal>
  );
}
