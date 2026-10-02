import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaLink, FaPlus, FaSearch, FaTimes } from "react-icons/fa";
import { taskKey } from "../../../shared/utils/helpers";
import { INPUT_CLASS, TEST_PRIORITY_OPTIONS, TEST_RESULT_STATUS_OPTIONS } from "../constants/testingConstants";
import { normalizeTestSteps } from "../utils/testingOperations";
import { FormError, LabeledField, ModalFooter, ModalHeader, ModalOverlay } from "../components/TestingPrimitives";

function TaskSearchField({ label, placeholder, linkedTask, tone, query, onQueryChange, results, onSelect, onClear }) {
  const [open, setOpen] = useState(false);
  const isBug = tone === "bug";
  return (
    <div className="relative">
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
        <FaLink className="inline w-3 h-3 mr-1 text-slate-500" /> {label}
      </label>
      {linkedTask ? (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isBug ? "bg-red-500/10 border-red-500/30" : "bg-blue-600/10 border-blue-500/30"}`}>
          <span className={`text-xs font-mono ${isBug ? "text-red-500" : "text-blue-500 dark:text-blue-400"}`}>{taskKey(linkedTask.id)}</span>
          <span className="text-sm text-slate-800 dark:text-white flex-1 truncate">{linkedTask.title}</span>
          <button type="button" onClick={onClear} aria-label={`Clear ${label}`} className="text-slate-500 hover:text-red-400 transition-colors">
            <FaTimes className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] rounded-lg">
            <FaSearch className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            <input
              value={query}
              onChange={(e) => { onQueryChange(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
            />
          </div>
          {open && query && results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-2xl overflow-hidden">
              {results.map((task) => (
                <button
                  type="button"
                  key={task.id}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors text-left"
                  onClick={() => { onSelect(task.id); setOpen(false); }}
                >
                  <span className={`text-xs font-mono flex-shrink-0 ${isBug ? "text-red-500" : "text-slate-500 dark:text-slate-400"}`}>{taskKey(task.id)}</span>
                  <span className="text-sm text-slate-800 dark:text-white truncate">{task.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TestCaseModal({ initialData, allTasks = [], onClose, onSave }) {
  const isEdit = Boolean(initialData?.id);

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [preconditions, setPreconditions] = useState(initialData?.preconditions || "");
  const [testData, setTestData] = useState(initialData?.testData || "");
  const [component, setComponent] = useState(initialData?.component || "");
  const [priority, setPriority] = useState(initialData?.priority || "medium");
  const [steps, setSteps] = useState(() => {
    const normalized = normalizeTestSteps(initialData?.steps);
    return normalized.length > 0 ? normalized : [""];
  });
  const [expectedResult, setExpectedResult] = useState(initialData?.expectedResult || "");
  const [status, setStatus] = useState(initialData?.status || "untested");
  const [linkedTaskId, setLinkedTaskId] = useState(initialData?.linkedTaskId || "");
  const [linkedBugTaskId, setLinkedBugTaskId] = useState(initialData?.linkedBugTaskId || "");
  const [requirement, setRequirement] = useState(initialData?.requirement || "");
  const [regressionPacks, setRegressionPacks] = useState(initialData?.regressionPacks || []);
  const [packDraft, setPackDraft] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [bugSearch, setBugSearch] = useState("");
  const [error, setError] = useState("");
  const titleRef = useRef(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const filteredTasks = useMemo(() => {
    const query = taskSearch.toLowerCase();
    return allTasks
      .filter((task) => task.title?.toLowerCase().includes(query) || taskKey(task.id).toLowerCase().includes(query))
      .slice(0, 8);
  }, [allTasks, taskSearch]);

  const filteredBugTasks = useMemo(() => {
    const query = bugSearch.toLowerCase();
    return allTasks
      .filter((task) => {
        const type = (task.type || "").toLowerCase();
        return type === "bug" || type === "defect";
      })
      .filter((task) => !query || task.title?.toLowerCase().includes(query) || taskKey(task.id).toLowerCase().includes(query))
      .slice(0, 8);
  }, [allTasks, bugSearch]);

  const addStep = () => setSteps((prev) => [...prev, ""]);
  const updateStep = (index, value) => setSteps((prev) => prev.map((step, idx) => (idx === index ? value : step)));
  const removeStep = (index) => setSteps((prev) => prev.filter((_, idx) => idx !== index));
  const moveStep = (index, dir) => {
    setSteps((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const linkedTask = allTasks.find((task) => task.id === linkedTaskId);
  const linkedBugTask = allTasks.find((task) => task.id === linkedBugTaskId);

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
      title: title.trim(),
      description: description.trim(),
      preconditions: preconditions.trim(),
      testData: testData.trim(),
      component: component.trim(),
      priority,
      steps: normalizeTestSteps(steps),
      expectedResult: expectedResult.trim(),
      status,
      linkedTaskId: linkedTaskId || null,
      linkedBugTaskId: linkedBugTaskId || null,
      requirement: requirement.trim(),
      regressionPacks,
    });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose} labelledBy="test-case-modal-title">
      <div className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col">
        <ModalHeader id="test-case-modal-title" title={isEdit ? "Edit Test Case" : "New Test Case"} onClose={onClose} />

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <FormError message={error} />

          <LabeledField label="Title *" htmlFor="case-title">
            <input
              id="case-title"
              ref={titleRef}
              value={title}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder="e.g. Verify login with valid credentials"
              className={INPUT_CLASS}
            />
          </LabeledField>

          <LabeledField label="Description" htmlFor="case-description">
            <textarea id="case-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this test case validating?" rows={2} className={`${INPUT_CLASS} resize-none`} />
          </LabeledField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <LabeledField label="Preconditions" htmlFor="case-preconditions">
              <textarea id="case-preconditions" value={preconditions} onChange={(e) => setPreconditions(e.target.value)} placeholder="User exists, feature flag enabled..." rows={2} className={`${INPUT_CLASS} resize-none`} />
            </LabeledField>
            <LabeledField label="Test Data" htmlFor="case-test-data">
              <textarea id="case-test-data" value={testData} onChange={(e) => setTestData(e.target.value)} placeholder="demo@corechestra.com / valid order #123" rows={2} className={`${INPUT_CLASS} resize-none`} />
            </LabeledField>
          </div>

          <LabeledField label="Component / Area" htmlFor="case-component">
            <input id="case-component" value={component} onChange={(e) => setComponent(e.target.value)} placeholder="Auth / Checkout / Calendar" className={INPUT_CLASS} />
          </LabeledField>

          <LabeledField label="Requirement / Acceptance Criteria" htmlFor="case-requirement">
            <textarea id="case-requirement" value={requirement} onChange={(e) => setRequirement(e.target.value)} placeholder="Which requirement or expected behavior does this case validate?" rows={2} className={`${INPUT_CLASS} resize-none`} />
          </LabeledField>

          <div className="grid grid-cols-2 gap-3">
            <LabeledField label="Priority" htmlFor="case-priority">
              <select id="case-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className={INPUT_CLASS}>
                {TEST_PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </LabeledField>
            <LabeledField label="Baseline Status" htmlFor="case-status">
              <select id="case-status" value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT_CLASS}>
                {TEST_RESULT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </LabeledField>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Test Steps</span>
              <button type="button" onClick={addStep} className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-400 transition-colors">
                <FaPlus className="w-2.5 h-2.5" /> Add Step
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-[#232838] text-slate-500 dark:text-slate-400 text-xs flex items-center justify-center flex-shrink-0 font-mono">
                    {index + 1}
                  </span>
                  <input
                    value={step}
                    onChange={(e) => updateStep(index, e.target.value)}
                    placeholder={`Step ${index + 1}`}
                    aria-label={`Step ${index + 1}`}
                    className={`${INPUT_CLASS} flex-1 py-1.5`}
                  />
                  <button type="button" onClick={() => moveStep(index, -1)} disabled={index === 0} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-20 transition-colors text-xs px-1" title="Move up">▲</button>
                  <button type="button" onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-20 transition-colors text-xs px-1" title="Move down">▼</button>
                  {steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(index)} aria-label={`Remove step ${index + 1}`} className="text-slate-500 hover:text-red-400 transition-colors">
                      <FaTimes className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <LabeledField label="Expected Result" htmlFor="case-expected">
            <textarea id="case-expected" value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)} placeholder="What should happen after executing the steps?" rows={2} className={`${INPUT_CLASS} resize-none`} />
          </LabeledField>

          <TaskSearchField
            label="Link to Task (optional)"
            placeholder="Search tasks..."
            linkedTask={linkedTask}
            query={taskSearch}
            onQueryChange={setTaskSearch}
            results={filteredTasks}
            onSelect={(id) => { setLinkedTaskId(id); setTaskSearch(""); }}
            onClear={() => setLinkedTaskId("")}
          />

          <TaskSearchField
            label="Linked Bug / Defect (optional)"
            placeholder="Search bugs or defects..."
            tone="bug"
            linkedTask={linkedBugTask}
            query={bugSearch}
            onQueryChange={setBugSearch}
            results={filteredBugTasks}
            onSelect={(id) => { setLinkedBugTaskId(id); setBugSearch(""); }}
            onClear={() => setLinkedBugTaskId("")}
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="block text-xs font-medium text-slate-600 dark:text-slate-300">Regression Packs</span>
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
                aria-label="Regression pack"
                className={`${INPUT_CLASS} flex-1`}
              />
              <button onClick={addRegressionPack} type="button" className="px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors">
                Add Pack
              </button>
            </div>
            {regressionPacks.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {regressionPacks.map((pack) => (
                  <span key={pack} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                    {pack}
                    <button type="button" aria-label={`Remove pack ${pack}`} onClick={() => setRegressionPacks((prev) => prev.filter((item) => item !== pack))}>
                      <FaTimes className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <ModalFooter onCancel={onClose} onSubmit={handleSubmit} submitLabel={isEdit ? "Save Changes" : "Create Test Case"} />
      </div>
    </ModalOverlay>
  );
}
