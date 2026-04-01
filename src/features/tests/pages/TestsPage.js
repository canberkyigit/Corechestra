import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { taskKey } from "../../../shared/utils/helpers";
import {
  FaFlask, FaPlus, FaTimes, FaEdit, FaTrash, FaCheck, FaPlay, FaStop,
  FaCheckCircle, FaTimesCircle, FaMinusCircle, FaChevronRight, FaChevronDown,
  FaFlag, FaLink, FaSearch, FaClipboardList, FaChartPie, FaTasks, FaLayerGroup,
  FaUserCheck, FaExclamationTriangle, FaBug, FaRedo, FaShieldAlt,
} from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { TestsSkeleton } from "../../../shared/components/Skeleton";
import SavedViewsBar from "../../../shared/components/SavedViewsBar";
import { useSavedViews } from "../../../shared/context/hooks/useSavedViews";
import {
  buildCoverageRows,
  buildInitialRunResults,
  buildPlanSummary,
  buildRerunFailedInput,
  getRunScopedCases,
} from "../utils/testingOperations";


function generateTestId(prefix = "t") {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/** Legacy or imported data may store steps as a string, object, or non-array. */
function normalizeTestSteps(steps) {
  if (Array.isArray(steps)) {
    return steps.map((s) => (s == null ? "" : String(s).trim())).filter(Boolean);
  }
  if (typeof steps === "string" && steps.trim()) {
    return steps.split(/\n/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

// ─── Priority config ──────────────────────────────────────────────────────────
const PRIORITY_BORDER = { high: "border-red-500", medium: "border-yellow-500", low: "border-green-500" };
const PRIORITY_TEXT   = { high: "text-red-600 dark:text-red-400",   medium: "text-yellow-600 dark:text-yellow-400",   low: "text-green-600 dark:text-green-400" };
const PRIORITY_BG     = { high: "bg-red-100 dark:bg-red-500/10",  medium: "bg-yellow-100 dark:bg-yellow-500/10",  low: "bg-green-100 dark:bg-green-500/10" };

const STATUS_CONFIG = {
  passed:   { label: "Passed",   color: "text-green-600 dark:text-green-400",  bg: "bg-green-100 dark:bg-green-500/15",  border: "border-green-500/30" },
  failed:   { label: "Failed",   color: "text-red-600 dark:text-red-400",    bg: "bg-red-100 dark:bg-red-500/15",    border: "border-red-500/30" },
  untested: { label: "Untested", color: "text-slate-600 dark:text-slate-400",  bg: "bg-slate-100 dark:bg-slate-500/15",  border: "border-slate-500/30" },
  skipped:  { label: "Skipped",  color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-500/15", border: "border-yellow-500/30" },
};

const RUN_STATUS_CONFIG = {
  "in-progress": { label: "In Progress", color: "text-blue-600 dark:text-blue-400",  bg: "bg-blue-100 dark:bg-blue-500/15",  border: "border-blue-500/30" },
  completed:     { label: "Completed",   color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-500/15", border: "border-green-500/30" },
  aborted:       { label: "Aborted",     color: "text-red-600 dark:text-red-400",   bg: "bg-red-100 dark:bg-red-500/15",   border: "border-red-500/30" },
};

// ─── Small reusable components ────────────────────────────────────────────────

function StatusChip({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.untested;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {status === "passed"   && <FaCheckCircle className="w-2.5 h-2.5" />}
      {status === "failed"   && <FaTimesCircle className="w-2.5 h-2.5" />}
      {status === "skipped"  && <FaMinusCircle className="w-2.5 h-2.5" />}
      {cfg.label}
    </span>
  );
}

function RunStatusChip({ status }) {
  const cfg = RUN_STATUS_CONFIG[status] || RUN_STATUS_CONFIG["in-progress"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_TEXT[priority] || "text-slate-400"} ${PRIORITY_BG[priority] || "bg-slate-500/10"}`}>
      <FaFlag className="w-2.5 h-2.5" />
      {(priority || "medium").charAt(0).toUpperCase() + (priority || "medium").slice(1)}
    </span>
  );
}

function ModalOverlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function LabeledField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TestPlanModal({ initialData, projectSuites, releases, users, currentUser, onClose, onSave }) {
  const isEdit = Boolean(initialData?.id);
  const [name, setName] = useState(initialData?.name || "");
  const [releaseId, setReleaseId] = useState(initialData?.releaseId || "");
  const [environment, setEnvironment] = useState(initialData?.environment || "staging");
  const [buildVersion, setBuildVersion] = useState(initialData?.buildVersion || "");
  const [platform, setPlatform] = useState(initialData?.platform || "web");
  const [assignedTester, setAssignedTester] = useState(initialData?.assignedTester || "");
  const [dueDate, setDueDate] = useState(initialData?.dueDate || "");
  const [regressionPack, setRegressionPack] = useState(initialData?.regressionPack || "");
  const [suiteIds, setSuiteIds] = useState(initialData?.suiteIds || []);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [error, setError] = useState("");

  const toggleSuite = (suiteId) => {
    setSuiteIds((prev) => (
      prev.includes(suiteId)
        ? prev.filter((id) => id !== suiteId)
        : [...prev, suiteId]
    ));
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
    <ModalOverlay onClose={onClose}>
      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#252b3b]">
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FaLayerGroup className="text-blue-400 w-4 h-4" />
            {isEdit ? "Edit Test Plan" : "New Test Plan"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="px-3 py-2 bg-red-900/20 text-red-400 text-sm rounded-lg border border-red-800/40">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabeledField label="Plan Name *">
              <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="Regression Plan — Sprint 12" className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </LabeledField>
            <LabeledField label="Linked Release">
              <select value={releaseId} onChange={(e) => setReleaseId(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">No linked release</option>
                {releases.map((release) => (
                  <option key={release.id} value={release.id}>{release.version} {release.name ? `— ${release.name}` : ""}</option>
                ))}
              </select>
            </LabeledField>
            <LabeledField label="Environment">
              <select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="staging">Staging</option>
                <option value="uat">UAT</option>
                <option value="production-like">Production-like</option>
                <option value="local">Local</option>
              </select>
            </LabeledField>
            <LabeledField label="Platform">
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="web">Web</option>
                <option value="ios">iOS</option>
                <option value="android">Android</option>
                <option value="api">API</option>
                <option value="cross-platform">Cross-platform</option>
              </select>
            </LabeledField>
            <LabeledField label="Build / Version">
              <input value={buildVersion} onChange={(e) => setBuildVersion(e.target.value)} placeholder="2026.04.02-rc1" className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </LabeledField>
            <LabeledField label="Assigned Tester">
              <select value={assignedTester} onChange={(e) => setAssignedTester(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id || user.username} value={user.username || user.id}>{user.name || user.username}</option>
                ))}
              </select>
            </LabeledField>
            <LabeledField label="Due Date">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:[color-scheme:dark]" />
            </LabeledField>
            <LabeledField label="Regression Pack">
              <input value={regressionPack} onChange={(e) => setRegressionPack(e.target.value)} placeholder="smoke / checkout-regression" className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </LabeledField>
          </div>
          <LabeledField label="Suite Scope *">
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
          </LabeledField>
          <LabeledField label="Plan Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Scope, blockers, exit criteria..." className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </LabeledField>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-[#252b3b]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
            {isEdit ? "Save Plan" : "Create Plan"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── New Suite Modal ──────────────────────────────────────────────────────────

function NewSuiteModal({ onClose, onCreate }) {
  const [name, setName]   = useState("");
  const [desc, setDesc]   = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = () => {
    if (!name.trim()) { setError("Suite name is required."); return; }
    onCreate({ name: name.trim(), description: desc.trim() });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#252b3b]">
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FaFlask className="text-blue-400 w-4 h-4" /> New Test Suite
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="px-3 py-2 bg-red-900/20 text-red-400 text-sm rounded-lg border border-red-800/40">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Suite Name *</label>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="e.g. Authentication Flow"
              className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional description of this test suite..."
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-[#252b3b]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
            Create Suite
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── New / Edit Test Case Modal ───────────────────────────────────────────────

function TestCaseModal({ initialData, allTasks, onClose, onSave }) {
  const isEdit = !!initialData?.id;

  const [title,          setTitle]          = useState(initialData?.title          || "");
  const [description,    setDescription]    = useState(initialData?.description    || "");
  const [preconditions,  setPreconditions]  = useState(initialData?.preconditions  || "");
  const [testData,       setTestData]       = useState(initialData?.testData       || "");
  const [component,      setComponent]      = useState(initialData?.component      || "");
  const [priority,       setPriority]       = useState(initialData?.priority       || "medium");
  const [steps,          setSteps]          = useState(() => {
    const normalized = normalizeTestSteps(initialData?.steps);
    return normalized.length > 0 ? normalized : [""];
  });
  const [expectedResult, setExpectedResult] = useState(initialData?.expectedResult || "");
  const [status,         setStatus]         = useState(initialData?.status         || "untested");
  const [linkedTaskId,   setLinkedTaskId]   = useState(initialData?.linkedTaskId   || "");
  const [linkedBugTaskId, setLinkedBugTaskId] = useState(initialData?.linkedBugTaskId || "");
  const [requirement,    setRequirement]    = useState(initialData?.requirement    || "");
  const [regressionPacks, setRegressionPacks] = useState(initialData?.regressionPacks || []);
  const [packDraft, setPackDraft] = useState("");
  const [taskSearch,     setTaskSearch]     = useState("");
  const [bugSearch, setBugSearch] = useState("");
  const [taskDropOpen,   setTaskDropOpen]   = useState(false);
  const [bugDropOpen, setBugDropOpen] = useState(false);
  const [error,          setError]          = useState("");
  const titleRef = useRef(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const filteredTasks = useMemo(() =>
    allTasks.filter((t) => t.title?.toLowerCase().includes(taskSearch.toLowerCase())).slice(0, 8),
    [allTasks, taskSearch]
  );
  const filteredBugTasks = useMemo(() =>
    allTasks
      .filter((task) => {
        const type = (task.type || "").toLowerCase();
        return type === "bug" || type === "defect";
      })
      .filter((task) =>
        !bugSearch
        || task.title?.toLowerCase().includes(bugSearch.toLowerCase())
        || taskKey(task.id).toLowerCase().includes(bugSearch.toLowerCase()))
      .slice(0, 8),
    [allTasks, bugSearch]
  );

  const addStep = () => setSteps((prev) => [...prev, ""]);
  const updateStep = (i, val) => setSteps((prev) => prev.map((s, idx) => idx === i ? val : s));
  const removeStep = (i) => setSteps((prev) => prev.filter((_, idx) => idx !== i));
  const moveStep = (i, dir) => {
    const next = [...steps];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setSteps(next);
  };

  const linkedTask = allTasks.find((t) => t.id === linkedTaskId);
  const linkedBugTask = allTasks.find((t) => t.id === linkedBugTaskId);

  const addRegressionPack = () => {
    const normalized = packDraft.trim();
    if (!normalized || regressionPacks.includes(normalized)) return;
    setRegressionPacks((prev) => [...prev, normalized]);
    setPackDraft("");
  };

  const handleSubmit = () => {
    if (!title.trim()) { setError("Title is required."); return; }
    onSave({
      ...(initialData || {}),
      title:          title.trim(),
      description:    description.trim(),
      preconditions:  preconditions.trim(),
      testData:       testData.trim(),
      component:      component.trim(),
      priority,
      steps:          (Array.isArray(steps) ? steps : normalizeTestSteps(steps)).map((s) => String(s).trim()).filter(Boolean),
      expectedResult: expectedResult.trim(),
      status,
      linkedTaskId:   linkedTaskId || null,
      linkedBugTaskId: linkedBugTaskId || null,
      requirement: requirement.trim(),
      regressionPacks,
    });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#252b3b] flex-shrink-0">
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            {isEdit ? "Edit Test Case" : "New Test Case"}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="px-3 py-2 bg-red-900/20 text-red-400 text-sm rounded-lg border border-red-800/40">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Title *</label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder="e.g. Verify login with valid credentials"
              className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this test case validating?"
              rows={2}
              className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Preconditions</label>
              <textarea
                value={preconditions}
                onChange={(e) => setPreconditions(e.target.value)}
                placeholder="User exists, feature flag enabled..."
                rows={2}
                className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Test Data</label>
              <textarea
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                placeholder="demo@corechestra.com / valid order #123"
                rows={2}
                className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600 resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Component / Area</label>
            <input
              value={component}
              onChange={(e) => setComponent(e.target.value)}
              placeholder="Auth / Checkout / Calendar"
              className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Requirement / Acceptance Criteria</label>
            <textarea
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="Which requirement or expected behavior does this case validate?"
              rows={2}
              className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600 resize-none"
            />
          </div>

          {/* Priority + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="untested">Untested</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Test Steps</label>
              <button
                onClick={addStep}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <FaPlus className="w-2.5 h-2.5" /> Add Step
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-100 dark:bg-[#232838] text-slate-500 dark:text-slate-400 text-xs flex items-center justify-center flex-shrink-0 font-mono">
                    {i + 1}
                  </span>
                  <input
                    value={step}
                    onChange={(e) => updateStep(i, e.target.value)}
                    placeholder={`Step ${i + 1}`}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600"
                  />
                  <button
                    onClick={() => moveStep(i, -1)}
                    disabled={i === 0}
                    className="text-slate-500 hover:text-slate-600 dark:text-slate-300 disabled:opacity-20 transition-colors text-xs px-1"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveStep(i, 1)}
                    disabled={i === steps.length - 1}
                    className="text-slate-500 hover:text-slate-600 dark:text-slate-300 disabled:opacity-20 transition-colors text-xs px-1"
                    title="Move down"
                  >
                    ▼
                  </button>
                  {steps.length > 1 && (
                    <button
                      onClick={() => removeStep(i)}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <FaTimes className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Expected Result */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Expected Result</label>
            <textarea
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              placeholder="What should happen after executing the steps?"
              rows={2}
              className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600 resize-none"
            />
          </div>

          {/* Link Task */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              <FaLink className="inline w-3 h-3 mr-1 text-slate-500" /> Link to Task (optional)
            </label>
            {linkedTask ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-600/10 border border-blue-500/30 rounded-lg">
                <span className="text-xs text-blue-400 font-mono">{taskKey(linkedTask.id)}</span>
                <span className="text-sm text-slate-800 dark:text-white flex-1 truncate">{linkedTask.title}</span>
                <button onClick={() => setLinkedTaskId("")} className="text-slate-500 hover:text-red-400 transition-colors">
                  <FaTimes className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] rounded-lg">
                  <FaSearch className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  <input
                    value={taskSearch}
                    onChange={(e) => { setTaskSearch(e.target.value); setTaskDropOpen(true); }}
                    onFocus={() => setTaskDropOpen(true)}
                    placeholder="Search tasks..."
                    className="flex-1 bg-transparent text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
                  />
                </div>
                {taskDropOpen && taskSearch && filteredTasks.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-2xl overflow-hidden">
                    {filteredTasks.map((t) => (
                      <button
                        key={t.id}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors text-left"
                        onClick={() => {
                          setLinkedTaskId(t.id);
                          setTaskSearch("");
                          setTaskDropOpen(false);
                        }}
                      >
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono flex-shrink-0">{taskKey(t.id)}</span>
                        <span className="text-sm text-slate-800 dark:text-white truncate">{t.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              <FaLink className="inline w-3 h-3 mr-1 text-slate-500" /> Linked Bug / Defect (optional)
            </label>
            {linkedBugTask ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                <span className="text-xs text-red-500 font-mono">{taskKey(linkedBugTask.id)}</span>
                <span className="text-sm text-slate-800 dark:text-white flex-1 truncate">{linkedBugTask.title}</span>
                <button onClick={() => setLinkedBugTaskId("")} className="text-slate-500 hover:text-red-400 transition-colors">
                  <FaTimes className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] rounded-lg">
                  <FaSearch className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  <input
                    value={bugSearch}
                    onChange={(e) => { setBugSearch(e.target.value); setBugDropOpen(true); }}
                    onFocus={() => setBugDropOpen(true)}
                    placeholder="Search bugs or defects..."
                    className="flex-1 bg-transparent text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
                  />
                </div>
                {bugDropOpen && bugSearch && filteredBugTasks.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-2xl overflow-hidden">
                    {filteredBugTasks.map((task) => (
                      <button
                        key={task.id}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors text-left"
                        onClick={() => {
                          setLinkedBugTaskId(task.id);
                          setBugSearch("");
                          setBugDropOpen(false);
                        }}
                      >
                        <span className="text-xs text-red-500 font-mono flex-shrink-0">{taskKey(task.id)}</span>
                        <span className="text-sm text-slate-800 dark:text-white truncate">{task.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Regression Packs</label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Use packs to group release validation flows</span>
            </div>
            <div className="flex gap-2">
              <input
                value={packDraft}
                onChange={(e) => setPackDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRegressionPack();
                  }
                }}
                placeholder="e.g. smoke-web"
                className="flex-1 px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600"
              />
              <button
                onClick={addRegressionPack}
                type="button"
                className="px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
              >
                Add Pack
              </button>
            </div>
            {regressionPacks.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {regressionPacks.map((pack) => (
                  <span key={pack} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                    {pack}
                    <button type="button" onClick={() => setRegressionPacks((prev) => prev.filter((item) => item !== pack))}>
                      <FaTimes className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-[#252b3b] flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
            {isEdit ? "Save Changes" : "Create Test Case"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── New Test Run Modal ───────────────────────────────────────────────────────

function NewRunModal({ suite, availablePacks, releases, users = [], currentUser = "", onClose, onCreate }) {
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  const [name, setName] = useState(`${suite.name} — ${today}`);
  const [regressionPack, setRegressionPack] = useState("all");
  const [releaseId, setReleaseId] = useState("");
  const [environment, setEnvironment] = useState("staging");
  const [buildVersion, setBuildVersion] = useState("");
  const [platform, setPlatform] = useState("web");
  const [assignedTester, setAssignedTester] = useState(currentUser || "");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select(); }, []);

  const handleSubmit = () => {
    if (!name.trim()) return;
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
    <ModalOverlay onClose={onClose}>
      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#252b3b]">
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <FaPlay className="text-blue-400 w-3.5 h-3.5" /> New Test Run
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Run Name</label>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Regression Pack Scope</label>
              <select
                value={regressionPack}
                onChange={(e) => setRegressionPack(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All cases in suite</option>
                {availablePacks.map((pack) => (
                  <option key={pack} value={pack}>{pack}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Release Context</label>
              <select
                value={releaseId}
                onChange={(e) => setReleaseId(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No linked release</option>
                {releases.map((release) => (
                  <option key={release.id} value={release.id}>{release.version} {release.name ? `— ${release.name}` : ""}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Environment</label>
                <select value={environment} onChange={(e) => setEnvironment(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="staging">Staging</option>
                  <option value="uat">UAT</option>
                  <option value="production-like">Production-like</option>
                  <option value="local">Local</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Platform</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="web">Web</option>
                  <option value="ios">iOS</option>
                  <option value="android">Android</option>
                  <option value="api">API</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Build</label>
                <input value={buildVersion} onChange={(e) => setBuildVersion(e.target.value)} placeholder="2026.04.02-rc1" className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">Assigned Tester</label>
                <select value={assignedTester} onChange={(e) => setAssignedTester(e.target.value)} className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id || user.username} value={user.username || user.id}>{user.name || user.username}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 dark:border-[#252b3b]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
            Start Run
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Execute Run View ─────────────────────────────────────────────────────────

function ExecuteRunView({ run, cases, onUpdateResult, onCompleteRun, onExit, onCreateBug }) {
  const executedCount = (run.results || []).filter((r) => r.status !== "untested").length;
  const [notes, setNotes] = useState({});
  const [actualResults, setActualResults] = useState({});
  const [currentIdx, setCurrentIdx] = useState(() => {
    if (!cases.length) return 0;
    const firstUntested = cases.findIndex((c) => {
      const r = (run.results || []).find((r) => r.caseId === c.id);
      return !r || r.status === "untested";
    });
    if (firstUntested >= 0) return firstUntested;
    return cases.length;
  });

  const currentCase = cases[currentIdx];
  if (!cases.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
        <FaClipboardList className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3" />
        <p className="text-slate-800 dark:text-white font-semibold">No test cases in this suite</p>
        <p className="text-sm mt-1 text-center max-w-xs">Add cases under Test Cases, then start a new run.</p>
        <button type="button" onClick={onExit} className="mt-4 px-5 py-2 bg-slate-100 dark:bg-[#232838] text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-[#2a3044] transition-colors">
          Back
        </button>
      </div>
    );
  }
  if (!currentCase) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
        <FaCheckCircle className="w-10 h-10 text-green-500 mb-3" />
        <p className="text-slate-800 dark:text-white font-semibold">All cases executed!</p>
        <button type="button" onClick={onCompleteRun} className="mt-4 px-5 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors">
          Complete Run
        </button>
      </div>
    );
  }

  const currentResult = (run.results || []).find((r) => r.caseId === currentCase.id);
  const currentCaseSteps = normalizeTestSteps(currentCase.steps);

  const handleResult = (status) => {
    onUpdateResult(run.id, currentCase.id, {
      status,
      notes: notes[currentCase.id] || "",
      actualResult: actualResults[currentCase.id] || "",
    });
    if (currentIdx < cases.length - 1) setCurrentIdx((i) => i + 1);
    else setCurrentIdx(cases.length);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-slate-800 dark:text-white font-semibold">{run.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Executing {executedCount} / {cases.length} cases
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCompleteRun}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30 text-sm rounded-lg transition-colors"
          >
            <FaStop className="w-3 h-3" /> Complete Run
          </button>
          <button
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-100 dark:bg-[#232838] text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm rounded-lg transition-colors"
          >
            Save & Exit
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-200 dark:bg-slate-100 dark:bg-[#232838] rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500"
          style={{ width: `${cases.length > 0 ? (executedCount / cases.length) * 100 : 0}%` }}
        />
      </div>

      {/* Case navigator pills */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {cases.map((c, i) => {
          const r = (run.results || []).find((r) => r.caseId === c.id);
          const s = r?.status || "untested";
          const isActive = i === currentIdx;
          const dotColor = s === "passed" ? "bg-green-500" : s === "failed" ? "bg-red-500" : s === "skipped" ? "bg-yellow-500" : "bg-slate-600";
          return (
            <button
              key={c.id}
              onClick={() => setCurrentIdx(i)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                isActive ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-100 dark:bg-[#232838] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Current case */}
      <div className="flex-1 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl p-5 space-y-4 overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-slate-500 font-mono">Case {currentIdx + 1} of {cases.length}</span>
              <PriorityBadge priority={currentCase.priority} />
            </div>
            <h4 className="text-slate-800 dark:text-white font-semibold text-base">{currentCase.title}</h4>
          </div>
          {currentResult && currentResult.status !== "untested" && (
            <StatusChip status={currentResult.status} />
          )}
        </div>

        {currentCase.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400">{currentCase.description}</p>
        )}

        {currentCaseSteps.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Steps</p>
            <ol className="space-y-2">
              {currentCaseSteps.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-100 dark:bg-[#232838] text-slate-500 dark:text-slate-400 text-xs flex items-center justify-center flex-shrink-0 font-mono mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {currentCase.expectedResult && (
          <div className="bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] rounded-lg p-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Expected Result</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{currentCase.expectedResult}</p>
          </div>
        )}

        {/* Notes for failure */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Notes (optional)</label>
          <textarea
            value={notes[currentCase.id] || ""}
            onChange={(e) => setNotes((prev) => ({ ...prev, [currentCase.id]: e.target.value }))}
            placeholder="Describe what happened, attach error info..."
            rows={2}
            className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Actual Result</label>
          <textarea
            value={actualResults[currentCase.id] || ""}
            onChange={(e) => setActualResults((prev) => ({ ...prev, [currentCase.id]: e.target.value }))}
            placeholder="What happened during execution?"
            rows={2}
            className="w-full px-3 py-2 bg-white dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-800 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-600 resize-none"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1 flex-wrap">
          <button
            onClick={() => onCreateBug?.(currentCase, run, {
              notes: notes[currentCase.id] || "",
              actualResult: actualResults[currentCase.id] || "",
            })}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/30 hover:bg-red-200 dark:hover:bg-red-500/20 font-medium rounded-xl transition-colors"
          >
            <FaBug className="w-3.5 h-3.5" /> Create Bug
          </button>
          <button
            onClick={() => handleResult("passed")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600/20 text-green-400 border border-green-500/40 hover:bg-green-600/30 font-medium rounded-xl transition-colors"
          >
            <FaCheck className="w-3.5 h-3.5" /> Pass
          </button>
          <button
            onClick={() => handleResult("failed")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600/20 text-red-400 border border-red-500/40 hover:bg-red-600/30 font-medium rounded-xl transition-colors"
          >
            <FaTimes className="w-3.5 h-3.5" /> Fail
          </button>
          <button
            onClick={() => handleResult("skipped")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-yellow-600/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-600/30 font-medium rounded-xl transition-colors"
          >
            <FaMinusCircle className="w-3.5 h-3.5" /> Skip
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Results View ────────────────────────────────────────────────────────

function ViewResultsView({ run, cases, onBack }) {
  const results = run.results || [];
  const passed  = results.filter((r) => r.status === "passed").length;
  const failed  = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const total   = cases.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-slate-800 dark:text-white font-semibold">{run.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {run.completedAt ? new Date(run.completedAt).toLocaleDateString() : ""}
          </p>
        </div>
        <button onClick={onBack} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-100 dark:bg-[#232838] text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm rounded-lg transition-colors">
          ← Back to Runs
        </button>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
          <FaCheckCircle className="text-green-400 w-4 h-4" />
          <span className="text-green-400 font-bold text-lg">{passed}</span>
          <span className="text-slate-500 dark:text-slate-400 text-sm">Passed</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
          <FaTimesCircle className="text-red-400 w-4 h-4" />
          <span className="text-red-400 font-bold text-lg">{failed}</span>
          <span className="text-slate-500 dark:text-slate-400 text-sm">Failed</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
          <FaMinusCircle className="text-yellow-400 w-4 h-4" />
          <span className="text-yellow-400 font-bold text-lg">{skipped}</span>
          <span className="text-slate-500 dark:text-slate-400 text-sm">Skipped</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-500/10 border border-slate-500/20 rounded-xl">
          <FaClipboardList className="text-slate-400 w-4 h-4" />
          <span className="text-slate-600 dark:text-slate-300 font-bold text-lg">{total - results.length}</span>
          <span className="text-slate-500 dark:text-slate-400 text-sm">Untested</span>
        </div>
      </div>

      {/* Results table */}
      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_200px] text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-4 py-2.5 border-b border-slate-200 dark:border-[#252b3b]">
          <span>Test Case</span>
          <span className="w-24 text-center">Status</span>
          <span className="w-[200px]">Execution Notes</span>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-[#252b3b]">
          {cases.map((c) => {
            const r = results.find((r) => r.caseId === c.id);
            const status = r?.status || "untested";
            const rowBg = status === "passed" ? "bg-green-900/10" : status === "failed" ? "bg-red-900/10" : status === "skipped" ? "bg-yellow-900/10" : "";
            return (
              <div key={c.id} className={`grid grid-cols-[1fr_auto_200px] items-center px-4 py-3 gap-4 ${rowBg}`}>
                <div>
                  <p className="text-sm text-slate-800 dark:text-white">{c.title}</p>
                  <PriorityBadge priority={c.priority} />
                  {r?.bugTaskId && (
                    <p className="text-xs text-red-600 dark:text-red-300 mt-1">Linked bug: {taskKey(r.bugTaskId)}</p>
                  )}
                </div>
                <div className="w-24 flex justify-center">
                  <StatusChip status={status} />
                </div>
                <div className="w-[200px]">
                  {r?.notes || r?.actualResult ? (
                    <div className="space-y-1">
                      {r?.notes && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{r.notes}</p>}
                      {r?.actualResult && <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">Actual: {r.actualResult}</p>}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 dark:text-slate-400">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────

function AnalyticsTab({ cases, runs }) {
  const completedRuns = runs.filter((r) => r.status === "completed");
  const lastRun = completedRuns[completedRuns.length - 1];

  const lastRunStats = useMemo(() => {
    if (!lastRun) return { passed: 0, failed: 0, skipped: 0 };
    return {
      passed:  (lastRun.results || []).filter((r) => r.status === "passed").length,
      failed:  (lastRun.results || []).filter((r) => r.status === "failed").length,
      skipped: (lastRun.results || []).filter((r) => r.status === "skipped").length,
    };
  }, [lastRun]);

  const passRate = useMemo(() => {
    const denom = lastRunStats.passed + lastRunStats.failed + lastRunStats.skipped;
    if (denom === 0) return 0;
    return Math.round((lastRunStats.passed / denom) * 100);
  }, [lastRunStats]);

  const avgCasesPerRun = useMemo(() => {
    if (completedRuns.length === 0) return 0;
    const total = completedRuns.reduce((sum, r) => sum + (r.results || []).length, 0);
    return Math.round(total / completedRuns.length);
  }, [completedRuns]);

  const last5Runs = useMemo(() => completedRuns.slice(-5), [completedRuns]);

  // Failure analysis: which cases failed most often?
  const failureMap = useMemo(() => {
    const map = {};
    for (const run of runs) {
      for (const result of run.results || []) {
        if (result.status === "failed") {
          if (!map[result.caseId]) map[result.caseId] = { count: 0, lastDate: null };
          map[result.caseId].count++;
          const d = run.completedAt || run.createdAt;
          if (!map[result.caseId].lastDate || d > map[result.caseId].lastDate) {
            map[result.caseId].lastDate = d;
          }
        }
      }
    }
    return map;
  }, [runs]);

  const failureList = useMemo(() =>
    cases
      .filter((c) => failureMap[c.id])
      .map((c) => ({ ...c, failCount: failureMap[c.id].count, lastFailDate: failureMap[c.id].lastDate }))
      .sort((a, b) => b.failCount - a.failCount),
    [cases, failureMap]
  );

  return (
    <div className="p-5 space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Cases"
          value={cases.length}
          icon={<FaClipboardList className="text-blue-400" />}
          accent="blue"
        />
        <StatCard
          label="Pass Rate"
          value={`${passRate}%`}
          sub={lastRun ? "last completed run" : "no runs yet"}
          icon={<FaCheckCircle className="text-green-400" />}
          accent="green"
        />
        <StatCard
          label="Most Recent Run"
          value={lastRun ? new Date(lastRun.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
          sub={lastRun?.name || ""}
          icon={<FaPlay className="text-purple-400" />}
          accent="purple"
        />
        <StatCard
          label="Avg Cases / Run"
          value={avgCasesPerRun}
          sub={`${completedRuns.length} completed runs`}
          icon={<FaChartPie className="text-yellow-400" />}
          accent="yellow"
        />
      </div>

      {/* Pass/Fail trend chart */}
      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Pass / Fail Trend (Last 5 Runs)</h3>
        {last5Runs.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No completed runs yet.</p>
        ) : (
          <div className="space-y-3">
            {last5Runs.map((run) => {
              const r = run.results || [];
              const p = r.filter((x) => x.status === "passed").length;
              const f = r.filter((x) => x.status === "failed").length;
              const s = r.filter((x) => x.status === "skipped").length;
              const tot = p + f + s;
              const pPct = tot > 0 ? (p / tot) * 100 : 0;
              const fPct = tot > 0 ? (f / tot) * 100 : 0;
              const sPct = tot > 0 ? (s / tot) * 100 : 0;
              return (
                <div key={run.id} className="flex items-center gap-3">
                  <div className="w-36 text-xs text-slate-500 dark:text-slate-400 truncate text-right flex-shrink-0" title={run.name}>
                    {run.name}
                  </div>
                  <div className="flex-1 flex h-5 rounded-lg overflow-hidden bg-slate-100 dark:bg-[#232838] gap-px">
                    {pPct > 0 && (
                      <div
                        className="bg-green-500 h-full flex items-center justify-center transition-all"
                        style={{ width: `${pPct}%` }}
                        title={`${p} passed`}
                      />
                    )}
                    {fPct > 0 && (
                      <div
                        className="bg-red-500 h-full flex items-center justify-center transition-all"
                        style={{ width: `${fPct}%` }}
                        title={`${f} failed`}
                      />
                    )}
                    {sPct > 0 && (
                      <div
                        className="bg-yellow-500 h-full flex items-center justify-center transition-all"
                        style={{ width: `${sPct}%` }}
                        title={`${s} skipped`}
                      />
                    )}
                    {tot === 0 && <div className="flex-1 bg-slate-100 dark:bg-[#232838]" />}
                  </div>
                  <div className="w-28 text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                    <span className="text-green-400">{p}P</span>
                    {" / "}
                    <span className="text-red-400">{f}F</span>
                    {" / "}
                    <span className="text-yellow-400">{s}S</span>
                  </div>
                </div>
              );
            })}
            <div className="flex items-center gap-4 pt-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-green-500 inline-block" /> Passed</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-red-500 inline-block" /> Failed</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm bg-yellow-500 inline-block" /> Skipped</span>
            </div>
          </div>
        )}
      </div>

      {/* Failure Analysis */}
      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Failure Analysis</h3>
        {failureList.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">No failures recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {failureList.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] rounded-lg">
                <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 dark:text-white truncate">{c.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Last failed: {c.lastFailDate ? new Date(c.lastFailDate).toLocaleDateString() : "—"}
                  </p>
                </div>
                <PriorityBadge priority={c.priority} />
                <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-full text-xs text-red-400 font-bold flex-shrink-0">
                  <FaTimesCircle className="w-3 h-3" /> {c.failCount}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon, accent }) {
  const accentClasses = {
    blue:   "bg-blue-500/10 border-blue-500/20",
    green:  "bg-green-500/10 border-green-500/20",
    purple: "bg-purple-500/10 border-purple-500/20",
    yellow: "bg-yellow-500/10 border-yellow-500/20",
  };
  return (
    <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">{value}</p>
          {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${accentClasses[accent] || accentClasses.blue}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Test Cases Tab ───────────────────────────────────────────────────────────

function TestCasesTab({ suite, cases, runs, allTasks, onCreateCase, onUpdateCase, onDeleteCase }) {
  const { currentProjectId } = useApp();
  const { addToast } = useToast();
  const [search, setSearch]           = useState("");
  const [priFilter, setPriFilter]     = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [packFilter, setPackFilter] = useState("all");
  const [expandedId, setExpandedId]   = useState(null);
  const [caseModal, setCaseModal]     = useState(null); // null | "new" | {case obj}
  const [editingSuiteName, setEditingSuiteName] = useState(false);
  const [editingDesc, setEditingDesc]           = useState(false);

  // Get latest status for each case from all runs (most recent run wins)
  const latestStatusMap = useMemo(() => {
    const map = {};
    const sortedRuns = [...runs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const run of sortedRuns) {
      for (const r of run.results || []) {
        map[r.caseId] = r.status;
      }
    }
    return map;
  }, [runs]);

  const displayCases = useMemo(() => {
    return cases.filter((c) => {
      const haystack = `${c.title || ""} ${c.requirement || ""}`.toLowerCase();
      if (search && !haystack.includes(search.toLowerCase())) return false;
      if (priFilter !== "all" && c.priority !== priFilter) return false;
      const effectiveStatus = latestStatusMap[c.id] || c.status || "untested";
      if (statusFilter !== "all" && effectiveStatus !== statusFilter) return false;
      if (packFilter !== "all" && !(c.regressionPacks || []).includes(packFilter)) return false;
      return true;
    });
  }, [cases, search, priFilter, statusFilter, latestStatusMap, packFilter]);

  const regressionPackOptions = useMemo(
    () => [...new Set(cases.flatMap((testCase) => testCase.regressionPacks || []))].sort(),
    [cases]
  );
  const activeFilterCount = [Boolean(search), priFilter !== "all", statusFilter !== "all", packFilter !== "all"].filter(Boolean).length;
  const viewState = useMemo(() => ({
    suiteId: suite.id,
    search,
    priFilter,
    statusFilter,
    packFilter,
  }), [packFilter, priFilter, search, statusFilter, suite.id]);
  const {
    views: savedTestViews,
    activeViewId,
    saveCurrentView,
    deleteView,
  } = useSavedViews("tests", `${currentProjectId}:${suite.id}`, viewState);

  const handleDelete = (id) => {
    onDeleteCase(id);
    addToast("Test case deleted.", "info");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Suite header */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-[#252b3b]">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <EditableField
              value={suite.name}
              isEditing={editingSuiteName}
              onStartEdit={() => setEditingSuiteName(true)}
              onSave={(val) => { onUpdateCase && onUpdateCase({ ...suite, name: val }); setEditingSuiteName(false); }}
              onCancel={() => setEditingSuiteName(false)}
              className="text-lg font-bold text-slate-800 dark:text-white"
              placeholder="Suite name"
            />
            <EditableField
              value={suite.description || ""}
              isEditing={editingDesc}
              onStartEdit={() => setEditingDesc(true)}
              onSave={(val) => { onUpdateCase && onUpdateCase({ ...suite, description: val }); setEditingDesc(false); }}
              onCancel={() => setEditingDesc(false)}
              className="text-sm text-slate-400 mt-0.5"
              placeholder="Add a description..."
              multiline
            />
          </div>
          <span className="text-xs text-slate-500 px-2 py-1 bg-slate-100 dark:bg-[#232838] rounded-full flex-shrink-0">
            {cases.length} {cases.length === 1 ? "case" : "cases"}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <SavedViewsBar
        label="Test Views"
        views={savedTestViews}
        activeViewId={activeViewId}
        onSaveCurrentView={saveCurrentView}
        onDeleteView={deleteView}
        onApplyView={(view) => {
          setSearch(view.state?.search || "");
          setPriFilter(view.state?.priFilter || "all");
          setStatusFilter(view.state?.statusFilter || "all");
          setPackFilter(view.state?.packFilter || "all");
        }}
      />
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200 dark:border-[#252b3b] flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-[160px] px-3 py-1.5 bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] rounded-lg">
          <FaSearch className="w-3 h-3 text-slate-500 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cases..."
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-slate-500 hover:text-slate-800 dark:hover:text-white"><FaTimes className="w-3 h-3" /></button>
          )}
        </div>
        <select
          value={priFilter}
          onChange={(e) => setPriFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-slate-300 rounded-lg text-xs focus:outline-none"
        >
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-slate-300 rounded-lg text-xs focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="untested">Untested</option>
          <option value="skipped">Skipped</option>
        </select>
        <select
          value={packFilter}
          onChange={(e) => setPackFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-slate-300 rounded-lg text-xs focus:outline-none"
        >
          <option value="all">All Packs</option>
          {regressionPackOptions.map((pack) => (
            <option key={pack} value={pack}>{pack}</option>
          ))}
        </select>
        {activeFilterCount > 0 && (
          <button
            onClick={() => {
              setSearch("");
              setPriFilter("all");
              setStatusFilter("all");
              setPackFilter("all");
            }}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-200 dark:hover:bg-[#2a3044] transition-colors"
          >
            Clear filters ({activeFilterCount})
          </button>
        )}
        <button
          onClick={() => setCaseModal("new")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors ml-auto"
        >
          <FaPlus className="w-3 h-3" /> New Test Case
        </button>
      </div>

      {/* Case list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {displayCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
            <FaClipboardList className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-sm text-center">
              {cases.length === 0 ? "No test cases yet." : "No cases match your filters."}
            </p>
            {cases.length === 0 && (
              <button
                onClick={() => setCaseModal("new")}
                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
              >
                Create First Case
              </button>
            )}
          </div>
        ) : (
          displayCases.map((c) => {
            const effectiveStatus = latestStatusMap[c.id] || c.status || "untested";
            const isExpanded = expandedId === c.id;
            const linkedTask = c.linkedTaskId ? allTasks.find((t) => t.id === c.linkedTaskId) : null;
            const linkedBugTask = c.linkedBugTaskId ? allTasks.find((t) => t.id === c.linkedBugTaskId) : null;
            const caseSteps = normalizeTestSteps(c.steps);
            return (
              <div
                key={c.id}
                className={`bg-white dark:bg-[#1c2030] border-l-[3px] border-r border-t border-b rounded-xl overflow-hidden transition-shadow ${
                  PRIORITY_BORDER[c.priority] || "border-l-slate-500"
                } border-slate-200 dark:border-[#2a3044]`}
              >
                {/* Case header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    className="text-slate-500 hover:text-slate-600 dark:text-slate-300 transition-colors flex-shrink-0"
                  >
                    {isExpanded ? <FaChevronDown className="w-3 h-3" /> : <FaChevronRight className="w-3 h-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      className="text-sm font-medium text-slate-800 dark:text-white hover:text-blue-500 dark:hover:text-blue-300 text-left truncate block w-full transition-colors"
                    >
                      {c.title}
                    </button>
                  </div>
                  <PriorityBadge priority={c.priority} />
                  <StatusChip status={effectiveStatus} />
                  <button
                    onClick={() => setCaseModal(c)}
                    className="p-1.5 text-slate-500 hover:text-blue-400 rounded transition-colors"
                    title="Edit"
                  >
                    <FaEdit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors"
                    title="Delete"
                  >
                    <FaTrash className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Expanded accordion */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-200 dark:border-[#252b3b] space-y-3">
                    {c.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">{c.description}</p>
                    )}
                    {c.requirement && (
                      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-3">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase tracking-wide mb-1">Requirement</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{c.requirement}</p>
                      </div>
                    )}
                    {(c.preconditions || c.testData || c.component) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {c.preconditions && (
                          <div className="bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] rounded-lg p-3">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Preconditions</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{c.preconditions}</p>
                          </div>
                        )}
                        {c.testData && (
                          <div className="bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] rounded-lg p-3">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Test Data</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{c.testData}</p>
                          </div>
                        )}
                        {c.component && (
                          <div className="bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] rounded-lg p-3">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Component</p>
                            <p className="text-sm text-slate-600 dark:text-slate-300">{c.component}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {caseSteps.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Steps</p>
                        <ol className="space-y-1.5">
                          {caseSteps.map((step, i) => (
                            <li key={i} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                              <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-100 dark:bg-[#232838] text-slate-500 dark:text-slate-400 text-xs flex items-center justify-center flex-shrink-0 font-mono mt-0.5">
                                {i + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {c.expectedResult && (
                      <div className="bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] rounded-lg p-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Expected Result</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">{c.expectedResult}</p>
                      </div>
                    )}
                    {linkedTask && (
                      <div className="flex items-center gap-2 text-xs text-blue-400">
                        <FaLink className="w-3 h-3" />
                        <span className="text-slate-500 dark:text-slate-400">Requirement task</span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">{taskKey(linkedTask.id)}</span>
                        <span className="text-blue-400">{linkedTask.title}</span>
                      </div>
                    )}
                    {linkedBugTask && (
                      <div className="flex items-center gap-2 text-xs text-red-400">
                        <FaLink className="w-3 h-3" />
                        <span className="text-slate-500 dark:text-slate-400">Bug link</span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">{taskKey(linkedBugTask.id)}</span>
                        <span className="text-red-400">{linkedBugTask.title}</span>
                      </div>
                    )}
                    {(c.regressionPacks || []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(c.regressionPacks || []).map((pack) => (
                          <span key={pack} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                            {pack}
                          </span>
                        ))}
                      </div>
                    )}
                    {!c.description && !c.requirement && !c.preconditions && !c.testData && !c.component && !caseSteps.length && !c.expectedResult && !linkedTask && !linkedBugTask && !(c.regressionPacks || []).length && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 italic">No additional details.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Test Case Modal */}
      {caseModal && (
        <TestCaseModal
          initialData={caseModal === "new" ? null : caseModal}
          allTasks={allTasks}
          onClose={() => setCaseModal(null)}
          onSave={(data) => {
            if (caseModal === "new") {
              onCreateCase(data);
              addToast("Test case created.", "success");
            } else {
              onUpdateCase(data);
              addToast("Test case updated.", "success");
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Editable Field ───────────────────────────────────────────────────────────

function EditableField({ value, isEditing, onStartEdit, onSave, onCancel, className, placeholder, multiline }) {
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(value);
      setTimeout(() => ref.current?.focus(), 0);
    }
  }, [isEditing, value]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !multiline) { onSave(draft); }
    if (e.key === "Escape") { onCancel(); }
  };

  if (isEditing) {
    const sharedClass = `bg-white dark:bg-[#141720] border border-blue-500 text-slate-800 dark:text-white rounded-lg px-2 py-1 text-sm focus:outline-none w-full`;
    return multiline ? (
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onSave(draft)}
        onKeyDown={handleKeyDown}
        rows={2}
        className={`${sharedClass} resize-none`}
        placeholder={placeholder}
      />
    ) : (
      <input
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onSave(draft)}
        onKeyDown={handleKeyDown}
        className={sharedClass}
        placeholder={placeholder}
      />
    );
  }

  return (
    <button
      onClick={onStartEdit}
      className={`text-left hover:opacity-70 transition-opacity block w-full ${className}`}
    >
      {value || <span className="italic text-slate-600 dark:text-slate-400">{placeholder}</span>}
    </button>
  );
}

function PlansTab({
  plans,
  projectSuites,
  releases,
  users,
  testCases,
  testRuns,
  currentUser,
  onCreatePlan,
  onUpdatePlan,
  onDeletePlan,
  onStartPlan,
}) {
  const [planModal, setPlanModal] = useState(null);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-[#252b3b]">
        <div>
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Test Plans</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Plan release scope, owner, environment and execution gates.</p>
        </div>
        <button
          onClick={() => setPlanModal("new")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <FaPlus className="w-3 h-3" /> New Plan
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
            <FaLayerGroup className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-sm">No test plans yet.</p>
            <button
              onClick={() => setPlanModal("new")}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              Create First Plan
            </button>
          </div>
        ) : (
          plans.map((plan) => {
            const linkedRelease = releases.find((release) => release.id === plan.releaseId);
            const owner = users.find((user) => (user.username || user.id) === (plan.assignedTester || plan.owner));
            const summary = buildPlanSummary(plan, testRuns, testCases);
            const statusTone =
              plan.status === "completed" ? "text-green-600 border-green-200 bg-green-50 dark:text-green-300 dark:border-green-500/30 dark:bg-green-500/10" :
              plan.status === "in-progress" ? "text-blue-600 border-blue-200 bg-blue-50 dark:text-blue-300 dark:border-blue-500/30 dark:bg-blue-500/10" :
              "text-slate-600 border-slate-200 bg-slate-50 dark:text-slate-300 dark:border-slate-500/30 dark:bg-slate-500/10";
            return (
              <div key={plan.id} className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-2xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-slate-800 dark:text-white font-semibold truncate">{plan.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusTone}`}>
                        {plan.status || "draft"}
                      </span>
                      {linkedRelease && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium border border-purple-200 text-purple-700 bg-purple-50 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300">
                          {linkedRelease.version}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {owner?.name || plan.assignedTester || "Unassigned"} · {plan.environment || "staging"} · {plan.platform || "web"}{plan.buildVersion ? ` · ${plan.buildVersion}` : ""}
                    </p>
                    {plan.notes && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{plan.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setPlanModal(plan)} className="p-2 text-slate-500 hover:text-blue-500 rounded-lg transition-colors" title="Edit plan">
                      <FaEdit className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDeletePlan(plan.id)} className="p-2 text-slate-500 hover:text-red-500 rounded-lg transition-colors" title="Delete plan">
                      <FaTrash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Suites</div>
                    <div className="text-lg font-semibold text-slate-800 dark:text-white">{(plan.suiteIds || []).length}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Scoped Cases</div>
                    <div className="text-lg font-semibold text-slate-800 dark:text-white">{summary.scopedCaseCount}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Runs</div>
                    <div className="text-lg font-semibold text-slate-800 dark:text-white">{summary.totalRuns}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Progress</div>
                    <div className="text-lg font-semibold text-slate-800 dark:text-white">{summary.progressPercent}%</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Failures</div>
                    <div className="text-lg font-semibold text-red-600 dark:text-red-300">{summary.failed}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {(plan.suiteIds || []).map((suiteId) => {
                    const suite = projectSuites.find((item) => item.id === suiteId);
                    return (
                      <span key={suiteId} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700 dark:bg-[#141720] dark:text-slate-300 border border-slate-200 dark:border-[#2a3044]">
                        {suite?.name || suiteId}
                      </span>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {plan.dueDate ? `Due ${new Date(plan.dueDate).toLocaleDateString()}` : "No due date"}
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.status !== "completed" && (
                      <button
                        onClick={() => onStartPlan(plan)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <FaPlay className="w-3 h-3" />
                        Start Plan
                      </button>
                    )}
                    {plan.status !== "draft" && (
                      <button
                        onClick={() => onUpdatePlan({ ...plan, status: "draft" })}
                        className="px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-200 dark:hover:bg-[#2a3044] transition-colors"
                      >
                        Move to Draft
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {planModal && (
        <TestPlanModal
          initialData={planModal === "new" ? null : planModal}
          projectSuites={projectSuites}
          releases={releases}
          users={users}
          currentUser={currentUser}
          onClose={() => setPlanModal(null)}
          onSave={(data) => {
            if (planModal === "new") onCreatePlan(data);
            else onUpdatePlan(data);
          }}
        />
      )}
    </div>
  );
}

function QueueTab({ currentUser, plans, runs, suites, releases, onOpenRun, onRerunFailed }) {
  const myPlans = plans.filter((plan) => !currentUser || (plan.assignedTester || plan.owner) === currentUser);
  const myRuns = runs.filter((run) => !currentUser || run.assignedTester === currentUser || run.owner === currentUser);
  const failedRuns = myRuns.filter((run) => run.status === "completed" && (run.results || []).some((result) => result.status === "failed"));

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-[#252b3b]">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Tester Queue</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Assigned plans, active runs and failed retest work in one place.</p>
      </div>
      <div className="px-5 py-4 space-y-6">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FaUserCheck className="w-3.5 h-3.5 text-blue-400" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Assigned Plans</h4>
          </div>
          {myPlans.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No plans assigned.</p>
          ) : myPlans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{plan.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{plan.environment || "staging"} · {plan.platform || "web"}{plan.buildVersion ? ` · ${plan.buildVersion}` : ""}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-[#141720] dark:text-slate-300 border border-slate-200 dark:border-[#2a3044]">{plan.status || "draft"}</span>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FaTasks className="w-3.5 h-3.5 text-green-400" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Active Runs</h4>
          </div>
          {myRuns.filter((run) => run.status === "in-progress").length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No active runs.</p>
          ) : myRuns.filter((run) => run.status === "in-progress").map((run) => (
            <div key={run.id} className="rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{run.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {suites.find((suite) => suite.id === run.suiteId)?.name || run.suiteId} · {run.environment || "staging"} · {run.platform || "web"}
                  {run.releaseId ? ` · ${releases.find((release) => release.id === run.releaseId)?.version || run.releaseId}` : ""}
                </p>
              </div>
              <button onClick={() => onOpenRun(run.id)} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
                Open Run
              </button>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="w-3.5 h-3.5 text-red-400" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Failed Retest Queue</h4>
          </div>
          {failedRuns.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No failed runs waiting for rerun.</p>
          ) : failedRuns.map((run) => {
            const failCount = (run.results || []).filter((result) => result.status === "failed").length;
            return (
              <div key={run.id} className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50/60 dark:bg-red-500/5 px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{run.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{failCount} failed case{failCount !== 1 ? "s" : ""}</p>
                </div>
                <button onClick={() => onRerunFailed(run)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-[#1c2030] border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors">
                  <FaRedo className="w-3 h-3" />
                  Rerun Failed
                </button>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function CoverageTab({ rows, allTasks }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-[#252b3b]">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Requirement Coverage</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Trace requirements to cases, latest run outcome and linked bugs.</p>
      </div>
      <div className="px-5 py-4">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
            <FaShieldAlt className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-sm">No requirement coverage data yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030]">
            <div className="grid grid-cols-[minmax(0,2fr)_120px_120px_120px_120px] gap-3 px-4 py-3 border-b border-slate-200 dark:border-[#252b3b] text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <div>Requirement</div>
              <div>Cases</div>
              <div>Passed</div>
              <div>Failed</div>
              <div>Status</div>
            </div>
            {rows.map((row) => {
              const statusTone =
                row.coverageStatus === "covered" ? "text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30" :
                row.coverageStatus === "at-risk" ? "text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30" :
                "text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30";
              const task = row.linkedTaskId ? allTasks.find((item) => item.id === row.linkedTaskId) : null;
              return (
                <div key={row.key} className="grid grid-cols-[minmax(0,2fr)_120px_120px_120px_120px] gap-3 px-4 py-3 border-b border-slate-200 dark:border-[#252b3b] last:border-b-0 items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{row.title}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {task && (
                        <span className="text-xs text-blue-600 dark:text-blue-300">{taskKey(task.id)}</span>
                      )}
                      {row.linkedBugIds.length > 0 && (
                        <span className="text-xs text-red-600 dark:text-red-300">{row.linkedBugIds.length} linked bug{row.linkedBugIds.length !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300">{row.caseCount}</div>
                  <div className="text-sm text-green-600 dark:text-green-300">{row.passedCount}</div>
                  <div className="text-sm text-red-600 dark:text-red-300">{row.failedCount}</div>
                  <div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statusTone}`}>
                      {row.coverageStatus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Test Runs Tab ────────────────────────────────────────────────────────────

function TestRunsTab({
  suite,
  cases,
  runs,
  releases,
  users,
  currentUser,
  openRunId,
  onConsumeOpenRun,
  onCreateRun,
  onUpdateRun,
  onUpdateResult,
  onCreateBug,
  onRerunFailed,
}) {
  const { addToast } = useToast();
  const [newRunModal, setNewRunModal] = useState(false);
  const [activeView, setActiveView]   = useState(null); // { type: "execute" | "results", runId }
  const availablePacks = useMemo(
    () => [...new Set(cases.flatMap((testCase) => testCase.regressionPacks || []))].sort(),
    [cases]
  );

  const sortedRuns = useMemo(() => [...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [runs]);

  useEffect(() => {
    if (!openRunId) return;
    const targetRun = runs.find((run) => run.id === openRunId);
    if (!targetRun) return;
    setActiveView({ type: targetRun.status === "completed" ? "results" : "execute", runId: targetRun.id });
    onConsumeOpenRun?.();
  }, [openRunId, onConsumeOpenRun, runs]);

  const handleCreateRun = (data) => {
    onCreateRun(data);
    addToast(`Run "${data.name}" started.`, "success");
  };

  const handleCompleteRun = (runId) => {
    onUpdateRun({ ...runs.find((r) => r.id === runId), status: "completed", completedAt: new Date().toISOString() });
    setActiveView(null);
    addToast("Run marked as completed.", "success");
  };

  if (activeView?.type === "execute") {
    const run = runs.find((r) => r.id === activeView.runId);
    if (!run) return null;
    return (
      <div className="flex flex-col h-full p-5">
        <ExecuteRunView
          run={run}
          cases={cases}
          onUpdateResult={onUpdateResult}
          onCompleteRun={() => handleCompleteRun(run.id)}
          onExit={() => setActiveView(null)}
          onCreateBug={onCreateBug}
        />
      </div>
    );
  }

  if (activeView?.type === "results") {
    const run = runs.find((r) => r.id === activeView.runId);
    if (!run) return null;
    return (
      <div className="flex flex-col h-full p-5 overflow-y-auto">
        <ViewResultsView
          run={run}
          cases={cases}
          onBack={() => setActiveView(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-[#252b3b]">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Test Runs</h3>
        <button
          onClick={() => setNewRunModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <FaPlus className="w-3 h-3" /> New Test Run
        </button>
      </div>

      {/* Runs list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {sortedRuns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
            <FaPlay className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-sm">No test runs yet.</p>
            <button
              onClick={() => setNewRunModal(true)}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
            >
              Start First Run
            </button>
          </div>
        ) : (
          sortedRuns.map((run) => {
            const results = run.results || [];
            const total   = cases.length;
            const executed = results.filter((r) => r.status !== "untested").length;
            const passed  = results.filter((r) => r.status === "passed").length;
            const failed  = results.filter((r) => r.status === "failed").length;
            const skipped = results.filter((r) => r.status === "skipped").length;
            const progress = total > 0 ? (executed / total) * 100 : 0;

            return (
              <div key={run.id} className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{run.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(run.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {run.regressionPack && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                          Pack: {run.regressionPack}
                        </span>
                      )}
                      {run.releaseId && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                          Release: {releases.find((release) => release.id === run.releaseId)?.version || run.releaseId}
                        </span>
                      )}
                      {run.environment && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-[#141720] dark:text-slate-300 border border-slate-200 dark:border-[#2a3044]">
                          {run.environment}
                        </span>
                      )}
                      {run.platform && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-[#141720] dark:text-slate-300 border border-slate-200 dark:border-[#2a3044]">
                          {run.platform}
                        </span>
                      )}
                      {run.buildVersion && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-[#141720] dark:text-slate-300 border border-slate-200 dark:border-[#2a3044]">
                          Build: {run.buildVersion}
                        </span>
                      )}
                      {run.assignedTester && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-[#141720] dark:text-slate-300 border border-slate-200 dark:border-[#2a3044]">
                          Tester: {users.find((user) => (user.username || user.id) === run.assignedTester)?.name || run.assignedTester}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <RunStatusChip status={run.status} />
                    {run.status === "in-progress" && (
                      <button
                        onClick={() => setActiveView({ type: "execute", runId: run.id })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <FaPlay className="w-2.5 h-2.5" /> Execute
                      </button>
                    )}
                    {run.status === "completed" && (
                      <button
                        onClick={() => setActiveView({ type: "results", runId: run.id })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-100 dark:bg-[#232838] text-slate-700 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <FaChartPie className="w-2.5 h-2.5" /> View Results
                      </button>
                    )}
                    {run.status === "completed" && (run.results || []).some((result) => result.status === "failed") && (
                      <button
                        onClick={() => onRerunFailed(run)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30 text-xs font-medium rounded-lg transition-colors"
                      >
                        <FaRedo className="w-2.5 h-2.5" /> Rerun Failed
                      </button>
                    )}
                    {run.status === "in-progress" && (
                      <button
                        onClick={() => {
                          onUpdateRun({ ...run, status: "aborted" });
                          addToast("Run aborted.", "warning");
                        }}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                        title="Abort run"
                      >
                        <FaStop className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{executed} / {total} cases executed</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-100 dark:bg-[#232838] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${run.status === "completed" ? "bg-green-500" : run.status === "aborted" ? "bg-red-500" : "bg-blue-500"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Counts */}
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1 text-green-400">
                    <FaCheckCircle className="w-3 h-3" /> {passed} passed
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <FaTimesCircle className="w-3 h-3" /> {failed} failed
                  </span>
                  <span className="flex items-center gap-1 text-yellow-400">
                    <FaMinusCircle className="w-3 h-3" /> {skipped} skipped
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {newRunModal && (
        <NewRunModal
          suite={suite}
          availablePacks={availablePacks}
          releases={releases}
          users={users}
          currentUser={currentUser}
          onClose={() => setNewRunModal(false)}
          onCreate={handleCreateRun}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TestsPage() {
  const {
    projects, currentProjectId, allTasks,
    currentUser, users, createTask,
    releases,
    testPlans, setTestPlans,
    testSuites, setTestSuites,
    testCases, setTestCases,
    testRuns, setTestRuns, dbReady,
  } = useApp();
  const { addToast } = useToast();

  const currentProject = projects.find((p) => p.id === currentProjectId);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedSuiteId, setSelectedSuiteId] = useState(null);
  const [activeTab, setActiveTab]             = useState("queue");
  const [newSuiteModal, setNewSuiteModal]     = useState(false);
  const [focusedRunId, setFocusedRunId]       = useState(null);

  // Filter suites for current project
  const projectSuites = useMemo(
    () => testSuites.filter((s) => s.projectId === currentProjectId),
    [testSuites, currentProjectId]
  );
  const projectSuiteIds = useMemo(() => new Set(projectSuites.map((suite) => suite.id)), [projectSuites]);
  const projectPlans = useMemo(
    () => testPlans.filter((plan) => (plan.projectId || currentProjectId) === currentProjectId),
    [testPlans, currentProjectId]
  );
  const projectRuns = useMemo(
    () => testRuns.filter((run) => projectSuiteIds.has(run.suiteId)),
    [testRuns, projectSuiteIds]
  );

  const selectedSuite = testSuites.find((s) => s.id === selectedSuiteId) || null;

  // Auto-select first suite when project changes
  useEffect(() => {
    setSelectedSuiteId((prev) => {
      if (projectSuites.find((s) => s.id === prev)) return prev;
      return projectSuites[0]?.id || null;
    });
  }, [currentProjectId, projectSuites]);

  // ── Derived data for selected suite ───────────────────────────────────────
  const suiteCases = useMemo(
    () => testCases.filter((c) => c.suiteId === selectedSuiteId),
    [testCases, selectedSuiteId]
  );

  const suiteRuns = useMemo(
    () => testRuns.filter((r) => r.suiteId === selectedSuiteId),
    [testRuns, selectedSuiteId]
  );
  const coverageRows = useMemo(
    () => buildCoverageRows(testCases.filter((testCase) => projectSuiteIds.has(testCase.suiteId)), allTasks, projectRuns),
    [allTasks, projectRuns, projectSuiteIds, testCases]
  );

  // ── Sidebar stats ─────────────────────────────────────────────────────────
  const sidebarStats = useMemo(() => {
    const totalCases = projectSuites.reduce((sum, s) => {
      return sum + testCases.filter((c) => c.suiteId === s.id).length;
    }, 0);

    // Pass rate: across all completed runs for this project's suites
    const suiteIds = new Set(projectSuites.map((s) => s.id));
    const completedRuns = testRuns.filter((r) => suiteIds.has(r.suiteId) && r.status === "completed");
    let totalPassed = 0, totalAttempted = 0;
    for (const run of completedRuns) {
      for (const r of run.results || []) {
        if (r.status !== "untested") {
          totalAttempted++;
          if (r.status === "passed") totalPassed++;
        }
      }
    }
    const passRate = totalAttempted > 0 ? Math.round((totalPassed / totalAttempted) * 100) : null;
    const activePlans = projectPlans.filter((plan) => plan.status === "in-progress").length;
    return { totalCases, passRate, activePlans };
  }, [projectPlans, projectSuites, testCases, testRuns]);

  // ── Suite last run status ─────────────────────────────────────────────────
  const suiteLastRunStatus = useCallback((suiteId) => {
    const runs = testRuns.filter((r) => r.suiteId === suiteId);
    if (runs.length === 0) return null;
    const last = runs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return last.status;
  }, [testRuns]);

  // ── CRUD: Plans ───────────────────────────────────────────────────────────
  const createTestPlan = useCallback((data) => {
    const id = generateTestId("plan");
    setTestPlans((prev) => [...prev, {
      ...data,
      id,
      projectId: currentProjectId,
      status: data.status || "draft",
      owner: data.owner || currentUser || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]);
    setActiveTab("plans");
    addToast(`Plan "${data.name}" created.`, "success");
  }, [addToast, currentProjectId, currentUser, setTestPlans]);

  const updateTestPlan = useCallback((updated) => {
    setTestPlans((prev) => prev.map((plan) => (
      plan.id === updated.id
        ? { ...plan, ...updated, updatedAt: new Date().toISOString() }
        : plan
    )));
    addToast("Test plan updated.", "success");
  }, [addToast, setTestPlans]);

  const deleteTestPlan = useCallback((id) => {
    setTestPlans((prev) => prev.filter((plan) => plan.id !== id));
    addToast("Test plan deleted.", "info");
  }, [addToast, setTestPlans]);

  // ── CRUD: Suites ──────────────────────────────────────────────────────────
  const createTestSuite = useCallback((data) => {
    const id = generateTestId("suite");
    setTestSuites((prev) => [...prev, { ...data, id, projectId: currentProjectId }]);
    setSelectedSuiteId(id);
    setActiveTab("cases");
  }, [currentProjectId, setTestSuites]);

  const updateTestSuite = useCallback((updated) => {
    setTestSuites((prev) => prev.map((s) => s.id === updated.id ? updated : s));
  }, [setTestSuites]);

  const deleteTestSuite = useCallback((id) => {
    setTestSuites((prev) => prev.filter((s) => s.id !== id));
    setTestCases((prev) => prev.filter((c) => c.suiteId !== id));
    setTestRuns((prev) => prev.filter((r) => r.suiteId !== id));
    setSelectedSuiteId((prev) => {
      const remaining = projectSuites.filter((s) => s.id !== id);
      return remaining[0]?.id || null;
    });
    addToast("Test suite deleted.", "info");
  }, [projectSuites, addToast, setTestSuites, setTestCases, setTestRuns]);

  // ── CRUD: Cases ───────────────────────────────────────────────────────────
  const createTestCase = useCallback((data) => {
    const id = generateTestId("case");
    setTestCases((prev) => [...prev, { ...data, id, suiteId: selectedSuiteId }]);
  }, [selectedSuiteId, setTestCases]);

  const updateTestCase = useCallback((updated) => {
    setTestCases((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  }, [setTestCases]);

  const deleteTestCase = useCallback((id) => {
    setTestCases((prev) => prev.filter((c) => c.id !== id));
  }, [setTestCases]);

  // ── CRUD: Runs ────────────────────────────────────────────────────────────
  const createRunRecord = useCallback((suiteId, data) => {
    const scopedCases = getRunScopedCases(data, testCases.filter((testCase) => testCase.suiteId === suiteId));
    const id = generateTestId("run");
    return {
      ...data,
      id,
      suiteId,
      status: "in-progress",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      results: buildInitialRunResults(scopedCases),
      caseIds: scopedCases.map((testCase) => testCase.id),
    };
  }, [testCases]);

  const createTestRun = useCallback((data) => {
    if (!selectedSuiteId) return;
    const newRun = createRunRecord(selectedSuiteId, data);
    setTestRuns((prev) => [...prev, newRun]);
  }, [createRunRecord, selectedSuiteId, setTestRuns]);

  const startPlanRuns = useCallback((plan) => {
    const suiteIds = plan.suiteIds || [];
    if (suiteIds.length === 0) return;
    const runsToCreate = suiteIds.map((suiteId) => createRunRecord(suiteId, {
      name: `${plan.name} — ${(projectSuites.find((suite) => suite.id === suiteId)?.name) || "Suite Run"}`,
      regressionPack: plan.regressionPack || null,
      releaseId: plan.releaseId || null,
      environment: plan.environment || "staging",
      buildVersion: plan.buildVersion || "",
      platform: plan.platform || "web",
      assignedTester: plan.assignedTester || currentUser || null,
      planId: plan.id,
      owner: currentUser || null,
    }));
    setTestRuns((prev) => [...prev, ...runsToCreate]);
    setTestPlans((prev) => prev.map((item) => (
      item.id === plan.id
        ? { ...item, status: "in-progress", startedAt: item.startedAt || new Date().toISOString(), updatedAt: new Date().toISOString() }
        : item
    )));
    setActiveTab("queue");
    addToast(`Started ${runsToCreate.length} run${runsToCreate.length !== 1 ? "s" : ""} for ${plan.name}.`, "success");
  }, [addToast, createRunRecord, currentUser, projectSuites, setTestPlans, setTestRuns]);

  const updateTestRun = useCallback((updated) => {
    setTestRuns((prev) => prev.map((r) => r.id === updated.id ? updated : r));
  }, [setTestRuns]);

  const updateTestRunResult = useCallback((runId, caseId, result) => {
    setTestRuns((prev) =>
      prev.map((r) => {
        if (r.id !== runId) return r;
        const existing = (r.results || []).find((x) => x.caseId === caseId);
        const updated = existing
          ? (r.results || []).map((x) => x.caseId === caseId ? { ...x, ...result } : x)
          : [...(r.results || []), { caseId, ...result }];
        return { ...r, results: updated, updatedAt: new Date().toISOString() };
      })
    );
  }, [setTestRuns]);

  const rerunFailedCases = useCallback((run) => {
    const rerunInput = buildRerunFailedInput(run);
    if (!rerunInput.caseIds.length) {
      addToast("No failed cases to rerun.", "info");
      return;
    }
    const newRun = createRunRecord(run.suiteId, rerunInput);
    setTestRuns((prev) => [...prev, newRun]);
    addToast(`Created rerun for ${rerunInput.caseIds.length} failed case${rerunInput.caseIds.length !== 1 ? "s" : ""}.`, "success");
  }, [addToast, createRunRecord, setTestRuns]);

  const createBugFromFailure = useCallback((testCase, run, context = {}) => {
    const bugTitle = `Test failure: ${testCase.title}`;
    const description = [
      `Failed during test run "${run.name}".`,
      run.environment ? `Environment: ${run.environment}` : null,
      run.platform ? `Platform: ${run.platform}` : null,
      run.buildVersion ? `Build: ${run.buildVersion}` : null,
      testCase.expectedResult ? `Expected: ${testCase.expectedResult}` : null,
      context.actualResult ? `Actual: ${context.actualResult}` : null,
      context.notes ? `Notes: ${context.notes}` : null,
    ].filter(Boolean).join("\n");

    const newBug = createTask({
      title: bugTitle,
      description,
      type: "bug",
      priority: testCase.priority || "medium",
      storyPoint: 0,
      dueDate: "",
      assignee: "",
      labels: ["QA"],
    }, "active");

    if (!newBug?.id) {
      addToast("Bug created, but linking back to test case failed.", "warning");
      return;
    }

    setTestCases((prev) => prev.map((item) => (
      item.id === testCase.id
        ? { ...item, linkedBugTaskId: newBug.id, updatedAt: new Date().toISOString() }
        : item
    )));
    setTestRuns((prev) => prev.map((item) => {
      if (item.id !== run.id) return item;
      return {
        ...item,
        results: (item.results || []).map((result) => (
          result.caseId === testCase.id
            ? { ...result, bugTaskId: newBug.id }
            : result
        )),
      };
    }));
    addToast("Linked bug created from failed test.", "success");
  }, [addToast, createTask, setTestCases, setTestRuns]);

  useEffect(() => {
    if (!projectPlans.length) return;
    setTestPlans((prev) => {
      let changed = false;
      const next = prev.map((plan) => {
        const relatedRuns = projectRuns.filter((run) => run.planId === plan.id);
        if (!relatedRuns.length) return plan;
        const nextStatus = relatedRuns.every((run) => run.status === "completed" || run.status === "aborted")
          ? "completed"
          : relatedRuns.some((run) => run.status === "in-progress")
            ? "in-progress"
            : plan.status;
        if (nextStatus === plan.status) return plan;
        changed = true;
        return { ...plan, status: nextStatus, updatedAt: new Date().toISOString() };
      });
      return changed ? next : prev;
    });
  }, [projectPlans, projectRuns, setTestPlans]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!dbReady) return <TestsSkeleton />;
  return (
    <div className="flex h-full bg-slate-100 dark:bg-[#141720] overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-[260px] flex-shrink-0 bg-slate-50 dark:bg-[#1a1f2e] border-r border-slate-200 dark:border-[#2a3044] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-[#252b3b]">
          <div className="flex items-center gap-2">
            <FaFlask className="text-blue-400 w-4 h-4" />
            <span className="text-sm font-bold text-slate-800 dark:text-white">Test Management</span>
          </div>
          <button
            onClick={() => setNewSuiteModal(true)}
            className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
            title="New Suite"
          >
            <FaPlus className="w-2.5 h-2.5" /> Suite
          </button>
        </div>

        {/* Project name */}
        {currentProject && (
          <div className="px-4 pt-3 pb-1">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">{currentProject.name}</p>
          </div>
        )}

        {/* Suite list */}
        <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {projectSuites.length === 0 ? (
            <div className="px-2 py-6 text-center">
              <FaFlask className="w-6 h-6 text-slate-700 dark:text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-600 dark:text-slate-400">No suites yet.</p>
              <button
                onClick={() => setNewSuiteModal(true)}
                className="mt-2 text-xs text-blue-500 hover:text-blue-400 transition-colors"
              >
                Create one
              </button>
            </div>
          ) : (
            projectSuites.map((suite) => {
              const caseCount = testCases.filter((c) => c.suiteId === suite.id).length;
              const lastStatus = suiteLastRunStatus(suite.id);
              const isSelected = selectedSuiteId === suite.id;
              const statusDotColor =
                lastStatus === "completed"   ? "bg-green-500"  :
                lastStatus === "in-progress" ? "bg-blue-500"   :
                lastStatus === "aborted"     ? "bg-red-500"    : "bg-slate-600";

              return (
                <div
                  key={suite.id}
                  className={`w-full flex items-center gap-0.5 rounded-lg transition-colors group ${
                    isSelected
                      ? "bg-blue-600/20 text-blue-700 dark:text-white"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#232838]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => { setSelectedSuiteId(suite.id); setActiveTab("cases"); }}
                    className="flex-1 flex items-center gap-2 px-3 py-2.5 min-w-0 text-left rounded-lg"
                  >
                    <span className={`flex-1 text-sm font-medium truncate ${isSelected ? "text-blue-700 dark:text-white" : ""}`}>
                      {suite.name}
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#141720] px-1.5 py-0.5 rounded-full flex-shrink-0">
                      {caseCount}
                    </span>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotColor}`} title={lastStatus || "no runs"} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTestSuite(suite.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 mr-0.5 text-slate-600 dark:text-slate-400 hover:text-red-400 transition-all flex-shrink-0 rounded-lg"
                    title="Delete suite"
                  >
                    <FaTrash className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom stats */}
        <div className="border-t border-slate-200 dark:border-[#252b3b] px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Total Cases</span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">{sidebarStats.totalCases}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Active Plans</span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold">{sidebarStats.activePlans}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Pass Rate</span>
            <span className={`font-semibold ${
              sidebarStats.passRate === null ? "text-slate-600 dark:text-slate-400" :
              sidebarStats.passRate >= 80 ? "text-green-400" :
              sidebarStats.passRate >= 50 ? "text-yellow-400" : "text-red-400"
            }`}>
              {sidebarStats.passRate === null ? "—" : `${sidebarStats.passRate}%`}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-100 dark:bg-[#141720]">
        {!selectedSuite && ["cases", "runs", "analytics"].includes(activeTab) ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
            <FaFlask className="w-14 h-14 mb-4 opacity-20 dark:opacity-30" />
            <p className="text-lg font-semibold text-slate-400 dark:text-slate-300">No suite selected</p>
            <p className="text-sm mt-1 text-center max-w-sm">
              {projectSuites.length === 0
                ? "Create your first test suite to get started."
                : "Select a suite from the sidebar."}
            </p>
            {projectSuites.length === 0 && (
              <button
                onClick={() => setNewSuiteModal(true)}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <FaPlus className="w-3.5 h-3.5" /> New Test Suite
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex items-center gap-1 px-5 pt-4 pb-0 border-b border-slate-200 dark:border-[#252b3b]">
              {[
                { key: "queue",     label: "Queue",       icon: FaTasks },
                { key: "plans",     label: "Test Plans",  icon: FaLayerGroup },
                { key: "cases",     label: "Test Cases",  icon: FaClipboardList },
                { key: "runs",      label: "Test Runs",   icon: FaPlay },
                { key: "coverage",  label: "Coverage",    icon: FaShieldAlt },
                { key: "analytics", label: "Analytics",   icon: FaChartPie },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                    activeTab === key
                      ? "border-blue-500 text-blue-600 dark:text-white bg-blue-50 dark:bg-blue-500/5"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1c2030]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {key === "queue" && projectRuns.filter((run) => run.status === "in-progress").length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-[#232838] text-slate-400 text-xs rounded-full">
                      {projectRuns.filter((run) => run.status === "in-progress").length}
                    </span>
                  )}
                  {key === "plans" && projectPlans.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-[#232838] text-slate-400 text-xs rounded-full">
                      {projectPlans.length}
                    </span>
                  )}
                  {key === "cases" && suiteCases.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-[#232838] text-slate-400 text-xs rounded-full">
                      {suiteCases.length}
                    </span>
                  )}
                  {key === "runs" && suiteRuns.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-[#232838] text-slate-400 text-xs rounded-full">
                      {suiteRuns.length}
                    </span>
                  )}
                  {key === "coverage" && coverageRows.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-slate-100 dark:bg-[#232838] text-slate-400 text-xs rounded-full">
                      {coverageRows.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === "queue" && (
                <QueueTab
                  currentUser={currentUser}
                  plans={projectPlans}
                  runs={projectRuns}
                  suites={projectSuites}
                  releases={releases}
                  onOpenRun={(runId) => {
                    const run = testRuns.find((item) => item.id === runId);
                    if (!run) return;
                    setSelectedSuiteId(run.suiteId);
                    setFocusedRunId(run.id);
                    setActiveTab("runs");
                  }}
                  onRerunFailed={rerunFailedCases}
                />
              )}
              {activeTab === "plans" && (
                <PlansTab
                  plans={projectPlans}
                  projectSuites={projectSuites}
                  releases={releases}
                  users={users}
                  testCases={testCases.filter((testCase) => projectSuiteIds.has(testCase.suiteId))}
                  testRuns={projectRuns}
                  currentUser={currentUser}
                  onCreatePlan={createTestPlan}
                  onUpdatePlan={updateTestPlan}
                  onDeletePlan={deleteTestPlan}
                  onStartPlan={startPlanRuns}
                />
              )}
              {activeTab === "cases" && (
                <TestCasesTab
                  suite={selectedSuite}
                  cases={suiteCases}
                  runs={suiteRuns}
                  allTasks={allTasks}
                  onCreateCase={createTestCase}
                  onUpdateCase={(data) => {
                    // Could be suite update (name/desc) or case update
                    if (data.id === selectedSuite.id) updateTestSuite(data);
                    else updateTestCase(data);
                  }}
                  onDeleteCase={deleteTestCase}
                />
              )}
              {activeTab === "runs" && (
                <TestRunsTab
                  suite={selectedSuite}
                  cases={suiteCases}
                  runs={suiteRuns}
                  releases={releases}
                  users={users}
                  currentUser={currentUser}
                  openRunId={focusedRunId}
                  onConsumeOpenRun={() => setFocusedRunId(null)}
                  onCreateRun={createTestRun}
                  onUpdateRun={updateTestRun}
                  onUpdateResult={updateTestRunResult}
                  onCreateBug={createBugFromFailure}
                  onRerunFailed={rerunFailedCases}
                />
              )}
              {activeTab === "coverage" && (
                <CoverageTab rows={coverageRows} allTasks={allTasks} />
              )}
              {activeTab === "analytics" && (
                <div className="flex-1 overflow-y-auto h-full">
                  <AnalyticsTab cases={suiteCases} runs={suiteRuns} />
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* New Suite Modal */}
      {newSuiteModal && (
        <NewSuiteModal
          onClose={() => setNewSuiteModal(false)}
          onCreate={(data) => {
            createTestSuite(data);
            addToast(`Suite "${data.name}" created.`, "success");
          }}
        />
      )}
    </div>
  );
}
