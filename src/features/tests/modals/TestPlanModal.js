import React, { useState } from "react";
import { FaLayerGroup } from "react-icons/fa";
import { ENVIRONMENT_OPTIONS, INPUT_CLASS, PLATFORM_OPTIONS } from "../constants/testingConstants";
import { FormError, LabeledField, ModalFooter, ModalHeader, ModalOverlay } from "../components/TestingPrimitives";

export default function TestPlanModal({ initialData, projectSuites, releases = [], users = [], currentUser, onClose, onSave }) {
  const isEdit = Boolean(initialData?.id);
  const projectSuiteIds = new Set(projectSuites.map((suite) => suite.id));
  const [name, setName] = useState(initialData?.name || "");
  const [releaseId, setReleaseId] = useState(initialData?.releaseId || "");
  const [environment, setEnvironment] = useState(initialData?.environment || "staging");
  const [buildVersion, setBuildVersion] = useState(initialData?.buildVersion || "");
  const [platform, setPlatform] = useState(initialData?.platform || "web");
  const [assignedTester, setAssignedTester] = useState(initialData?.assignedTester || "");
  const [dueDate, setDueDate] = useState(initialData?.dueDate || "");
  const [regressionPack, setRegressionPack] = useState(initialData?.regressionPack || "");
  // Drop dangling ids of suites that no longer exist.
  const [suiteIds, setSuiteIds] = useState(() => (initialData?.suiteIds || []).filter((id) => projectSuiteIds.has(id)));
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [error, setError] = useState("");

  const toggleSuite = (suiteId) => {
    setError("");
    setSuiteIds((prev) => (prev.includes(suiteId) ? prev.filter((id) => id !== suiteId) : [...prev, suiteId]));
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Plan name is required.");
      return;
    }
    if (suiteIds.length === 0) {
      setError("Select at least one suite.");
      return;
    }
    onSave({
      ...(initialData || {}),
      name: name.trim(),
      releaseId: releaseId || null,
      environment,
      buildVersion: buildVersion.trim(),
      platform,
      assignedTester: assignedTester || currentUser || null,
      dueDate: dueDate || null,
      regressionPack: regressionPack.trim() || null,
      suiteIds,
      notes: notes.trim(),
      status: initialData?.status || "draft",
    });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose} labelledBy="test-plan-modal-title">
      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <ModalHeader
          id="test-plan-modal-title"
          icon={<FaLayerGroup className="text-blue-400 w-4 h-4" />}
          title={isEdit ? "Edit Test Plan" : "New Test Plan"}
          onClose={onClose}
        />
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <FormError message={error} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabeledField label="Plan Name *" htmlFor="plan-name">
              <input id="plan-name" value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Regression Plan — Sprint 12" className={INPUT_CLASS} />
            </LabeledField>
            <LabeledField label="Linked Release" htmlFor="plan-release">
              <select id="plan-release" value={releaseId} onChange={(e) => setReleaseId(e.target.value)} className={INPUT_CLASS}>
                <option value="">No linked release</option>
                {releases.map((release) => (
                  <option key={release.id} value={release.id}>{release.version} {release.name ? `— ${release.name}` : ""}</option>
                ))}
              </select>
            </LabeledField>
            <LabeledField label="Environment" htmlFor="plan-environment">
              <select id="plan-environment" value={environment} onChange={(e) => setEnvironment(e.target.value)} className={INPUT_CLASS}>
                {ENVIRONMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </LabeledField>
            <LabeledField label="Platform" htmlFor="plan-platform">
              <select id="plan-platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className={INPUT_CLASS}>
                {PLATFORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </LabeledField>
            <LabeledField label="Build / Version" htmlFor="plan-build">
              <input id="plan-build" value={buildVersion} onChange={(e) => setBuildVersion(e.target.value)} placeholder="2026.04.02-rc1" className={INPUT_CLASS} />
            </LabeledField>
            <LabeledField label="Assigned Tester" htmlFor="plan-tester">
              <select id="plan-tester" value={assignedTester} onChange={(e) => setAssignedTester(e.target.value)} className={INPUT_CLASS}>
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id || user.username} value={user.username || user.id}>{user.name || user.username}</option>
                ))}
              </select>
            </LabeledField>
            <LabeledField label="Due Date" htmlFor="plan-due">
              <input id="plan-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${INPUT_CLASS} dark:[color-scheme:dark]`} />
            </LabeledField>
            <LabeledField label="Regression Pack" htmlFor="plan-pack">
              <input id="plan-pack" value={regressionPack} onChange={(e) => setRegressionPack(e.target.value)} placeholder="smoke / checkout-regression" className={INPUT_CLASS} />
            </LabeledField>
          </div>
          <LabeledField label="Suite Scope *">
            {projectSuites.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 rounded-xl border border-dashed border-slate-300 dark:border-[#2a3044] p-3">
                Create a test suite first — plans need at least one suite.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-[#2a3044] p-3 bg-slate-50 dark:bg-[#141720]">
                {projectSuites.map((suite) => (
                  <label key={suite.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    suiteIds.includes(suite.id)
                      ? "border-blue-500/60 bg-blue-50 dark:bg-blue-500/10"
                      : "border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030]"
                  }`}>
                    <input type="checkbox" checked={suiteIds.includes(suite.id)} onChange={() => toggleSuite(suite.id)} />
                    <span className="text-sm text-slate-800 dark:text-white truncate">{suite.name}</span>
                  </label>
                ))}
              </div>
            )}
          </LabeledField>
          <LabeledField label="Plan Notes" htmlFor="plan-notes">
            <textarea id="plan-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Scope, blockers, exit criteria..." className={`${INPUT_CLASS} resize-none`} />
          </LabeledField>
        </div>
        <ModalFooter onCancel={onClose} onSubmit={handleSubmit} submitLabel={isEdit ? "Save Plan" : "Create Plan"} />
      </div>
    </ModalOverlay>
  );
}
