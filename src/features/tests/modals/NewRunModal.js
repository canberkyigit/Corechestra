import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaPlay } from "react-icons/fa";
import { ENVIRONMENT_OPTIONS, INPUT_CLASS, PLATFORM_OPTIONS } from "../constants/testingConstants";
import { getRunScopedCases } from "../utils/testingOperations";
import { FormError, LabeledField, ModalFooter, ModalHeader, ModalOverlay } from "../components/TestingPrimitives";

export default function NewRunModal({ suite, cases = [], availablePacks = [], releases = [], users = [], currentUser = "", onClose, onCreate }) {
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  const [name, setName] = useState(`${suite.name} — ${today}`);
  const [regressionPack, setRegressionPack] = useState("all");
  const [releaseId, setReleaseId] = useState("");
  const [environment, setEnvironment] = useState("staging");
  const [buildVersion, setBuildVersion] = useState("");
  const [platform, setPlatform] = useState("web");
  const [assignedTester, setAssignedTester] = useState(currentUser || "");
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const scopedCount = useMemo(
    () => getRunScopedCases({ regressionPack: regressionPack === "all" ? null : regressionPack }, cases).length,
    [cases, regressionPack]
  );

  const handleSubmit = () => {
    if (!name.trim()) { setError("Run name is required."); return; }
    if (scopedCount === 0) { setError("No test cases in this scope. Add cases or choose another pack."); return; }
    onCreate({
      name: name.trim(),
      regressionPack: regressionPack === "all" ? null : regressionPack,
      releaseId: releaseId || null,
      environment,
      buildVersion: buildVersion.trim(),
      platform,
      assignedTester: assignedTester || null,
    });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose} labelledBy="new-run-modal-title">
      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <ModalHeader id="new-run-modal-title" icon={<FaPlay className="text-blue-400 w-3.5 h-3.5" />} title="New Test Run" onClose={onClose} />
        <div className="px-6 py-5 space-y-4">
          <FormError message={error} />
          <LabeledField label="Run Name" htmlFor="run-name">
            <input id="run-name" ref={inputRef} value={name} onChange={(e) => { setName(e.target.value); setError(""); }} className={INPUT_CLASS} />
          </LabeledField>
          <LabeledField label="Regression Pack Scope" htmlFor="run-pack">
            <select id="run-pack" value={regressionPack} onChange={(e) => { setRegressionPack(e.target.value); setError(""); }} className={INPUT_CLASS}>
              <option value="all">All cases in suite</option>
              {availablePacks.map((pack) => <option key={pack} value={pack}>{pack}</option>)}
            </select>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{scopedCount} case{scopedCount !== 1 ? "s" : ""} in scope</p>
          </LabeledField>
          <LabeledField label="Release Context" htmlFor="run-release">
            <select id="run-release" value={releaseId} onChange={(e) => setReleaseId(e.target.value)} className={INPUT_CLASS}>
              <option value="">No linked release</option>
              {releases.map((release) => (
                <option key={release.id} value={release.id}>{release.version} {release.name ? `— ${release.name}` : ""}</option>
              ))}
            </select>
          </LabeledField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabeledField label="Environment" htmlFor="run-environment">
              <select id="run-environment" value={environment} onChange={(e) => setEnvironment(e.target.value)} className={INPUT_CLASS}>
                {ENVIRONMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </LabeledField>
            <LabeledField label="Platform" htmlFor="run-platform">
              <select id="run-platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className={INPUT_CLASS}>
                {PLATFORM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </LabeledField>
            <LabeledField label="Build" htmlFor="run-build">
              <input id="run-build" value={buildVersion} onChange={(e) => setBuildVersion(e.target.value)} placeholder="2026.04.02-rc1" className={INPUT_CLASS} />
            </LabeledField>
            <LabeledField label="Assigned Tester" htmlFor="run-tester">
              <select id="run-tester" value={assignedTester} onChange={(e) => setAssignedTester(e.target.value)} className={INPUT_CLASS}>
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id || user.username} value={user.username || user.id}>{user.name || user.username}</option>
                ))}
              </select>
            </LabeledField>
          </div>
        </div>
        <ModalFooter onCancel={onClose} onSubmit={handleSubmit} submitLabel="Start Run" />
      </div>
    </ModalOverlay>
  );
}
