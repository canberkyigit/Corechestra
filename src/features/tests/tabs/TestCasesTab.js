import React, { memo, useCallback, useMemo, useState } from "react";
import { FaChevronDown, FaChevronRight, FaClipboardList, FaEdit, FaLink, FaPlus, FaSearch, FaTimes, FaTrash } from "react-icons/fa";
import { taskKey } from "../../../shared/utils/helpers";
import SavedViewsBar from "../../../shared/components/SavedViewsBar";
import { useSavedViews } from "../../../shared/context/hooks/useSavedViews";
import {
  FILTER_SELECT_CLASS,
  PRIMARY_BUTTON_CLASS,
  PRIORITY_BORDER,
  TEST_PRIORITY_OPTIONS,
  TEST_RESULT_STATUS_OPTIONS,
} from "../constants/testingConstants";
import { buildLatestExecutedResultMap, normalizeTestSteps } from "../utils/testingOperations";
import { EditableField, PriorityBadge, StatusChip } from "../components/TestingPrimitives";
import TestCaseModal from "../modals/TestCaseModal";

function DetailBox({ label, children }) {
  return (
    <div className="bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-[#2a3044] rounded-lg p-3">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-slate-600 dark:text-slate-300">{children}</p>
    </div>
  );
}

const CaseRow = memo(function CaseRow({ testCase, effectiveStatus, isExpanded, linkedTask, linkedBugTask, readOnly, onToggle, onEdit, onDelete }) {
  const caseSteps = normalizeTestSteps(testCase.steps);
  const packs = testCase.regressionPacks || [];
  const hasDetails = testCase.description || testCase.requirement || testCase.preconditions || testCase.testData || testCase.component
    || caseSteps.length || testCase.expectedResult || linkedTask || linkedBugTask || packs.length;
  return (
    <div className={`bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] border-l-[3px] rounded-xl overflow-hidden transition-shadow ${PRIORITY_BORDER[testCase.priority] || "border-l-slate-500"}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button type="button" onClick={() => onToggle(testCase.id)} aria-label={isExpanded ? "Collapse case" : "Expand case"} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors flex-shrink-0">
          {isExpanded ? <FaChevronDown className="w-3 h-3" /> : <FaChevronRight className="w-3 h-3" />}
        </button>
        <div className="flex-1 min-w-0">
          <button type="button" onClick={() => onToggle(testCase.id)} className="text-sm font-medium text-slate-800 dark:text-white hover:text-blue-500 dark:hover:text-blue-300 text-left truncate block w-full transition-colors">
            {testCase.title}
          </button>
        </div>
        <PriorityBadge priority={testCase.priority} />
        <StatusChip status={effectiveStatus} />
        {!readOnly && (
          <>
            <button type="button" onClick={() => onEdit(testCase)} className="p-1.5 text-slate-500 hover:text-blue-400 rounded transition-colors" title="Edit" aria-label={`Edit case ${testCase.title}`}>
              <FaEdit className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => onDelete(testCase)} className="p-1.5 text-slate-500 hover:text-red-400 rounded transition-colors" title="Delete" aria-label={`Delete case ${testCase.title}`}>
              <FaTrash className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-200 dark:border-[#252b3b] space-y-3">
          {testCase.description && <p className="text-sm text-slate-600 dark:text-slate-400">{testCase.description}</p>}
          {testCase.requirement && (
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-300 uppercase tracking-wide mb-1">Requirement</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{testCase.requirement}</p>
            </div>
          )}
          {(testCase.preconditions || testCase.testData || testCase.component) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {testCase.preconditions && <DetailBox label="Preconditions">{testCase.preconditions}</DetailBox>}
              {testCase.testData && <DetailBox label="Test Data">{testCase.testData}</DetailBox>}
              {testCase.component && <DetailBox label="Component">{testCase.component}</DetailBox>}
            </div>
          )}
          {caseSteps.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Steps</p>
              <ol className="space-y-1.5">
                {caseSteps.map((step, index) => (
                  <li key={index} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-[#232838] text-slate-500 dark:text-slate-400 text-xs flex items-center justify-center flex-shrink-0 font-mono mt-0.5">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {testCase.expectedResult && <DetailBox label="Expected Result">{testCase.expectedResult}</DetailBox>}
          {linkedTask && (
            <div className="flex items-center gap-2 text-xs">
              <FaLink className="w-3 h-3 text-blue-500 dark:text-blue-400" />
              <span className="text-slate-500 dark:text-slate-400">Requirement task</span>
              <span className="font-mono text-slate-500 dark:text-slate-400">{taskKey(linkedTask.id)}</span>
              <span className="text-blue-600 dark:text-blue-400">{linkedTask.title}</span>
            </div>
          )}
          {linkedBugTask && (
            <div className="flex items-center gap-2 text-xs">
              <FaLink className="w-3 h-3 text-red-500 dark:text-red-400" />
              <span className="text-slate-500 dark:text-slate-400">Bug link</span>
              <span className="font-mono text-slate-500 dark:text-slate-400">{taskKey(linkedBugTask.id)}</span>
              <span className="text-red-600 dark:text-red-400">{linkedBugTask.title}</span>
            </div>
          )}
          {packs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {packs.map((pack) => (
                <span key={pack} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                  {pack}
                </span>
              ))}
            </div>
          )}
          {!hasDetails && <p className="text-sm text-slate-500 dark:text-slate-400 italic">No additional details.</p>}
        </div>
      )}
    </div>
  );
});

export default function TestCasesTab({ suite, cases, runs, allTasks, currentProjectId, readOnly = false, onCreateCase, onUpdateCase, onDeleteCase, onUpdateSuite }) {
  const [search, setSearch] = useState("");
  const [priFilter, setPriFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [packFilter, setPackFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [caseModal, setCaseModal] = useState(null); // null | "new" | case
  const [editingSuiteName, setEditingSuiteName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);

  // Latest executed verdict per case; seeded "untested" rows of newer runs don't hide it.
  const latestResultMap = useMemo(() => buildLatestExecutedResultMap(runs), [runs]);
  const taskById = useMemo(() => new Map(allTasks.map((task) => [task.id, task])), [allTasks]);
  const getEffectiveStatus = useCallback(
    (testCase) => latestResultMap[testCase.id]?.status || testCase.status || "untested",
    [latestResultMap]
  );

  const displayCases = useMemo(() => {
    const query = search.toLowerCase();
    return cases.filter((testCase) => {
      const haystack = `${testCase.title || ""} ${testCase.requirement || ""} ${testCase.component || ""}`.toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (priFilter !== "all" && testCase.priority !== priFilter) return false;
      if (statusFilter !== "all" && getEffectiveStatus(testCase) !== statusFilter) return false;
      if (packFilter !== "all" && !(testCase.regressionPacks || []).includes(packFilter)) return false;
      return true;
    });
  }, [cases, search, priFilter, statusFilter, packFilter, getEffectiveStatus]);

  const regressionPackOptions = useMemo(
    () => [...new Set(cases.flatMap((testCase) => testCase.regressionPacks || []))].sort(),
    [cases]
  );
  const activeFilterCount = [Boolean(search), priFilter !== "all", statusFilter !== "all", packFilter !== "all"].filter(Boolean).length;
  const viewState = useMemo(() => ({ suiteId: suite.id, search, priFilter, statusFilter, packFilter }), [packFilter, priFilter, search, statusFilter, suite.id]);
  const { views: savedTestViews, activeViewId, saveCurrentView, deleteView } = useSavedViews("tests", `${currentProjectId}:${suite.id}`, viewState);

  const toggleExpanded = useCallback((id) => setExpandedId((prev) => (prev === id ? null : id)), []);
  const clearFilters = () => {
    setSearch("");
    setPriFilter("all");
    setStatusFilter("all");
    setPackFilter("all");
  };

  const saveSuiteField = (field, value) => {
    const trimmed = String(value ?? "").trim();
    if (field === "name" && !trimmed) return; // suite name is required
    if (trimmed !== (suite[field] || "")) onUpdateSuite({ id: suite.id, [field]: trimmed });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-[#252b3b]">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <EditableField
              value={suite.name}
              isEditing={editingSuiteName}
              disabled={readOnly}
              ariaLabel="Suite name"
              onStartEdit={() => setEditingSuiteName(true)}
              onSave={(value) => { saveSuiteField("name", value); setEditingSuiteName(false); }}
              onCancel={() => setEditingSuiteName(false)}
              className="text-lg font-bold text-slate-800 dark:text-white"
              placeholder="Suite name"
            />
            <EditableField
              value={suite.description || ""}
              isEditing={editingDesc}
              disabled={readOnly}
              ariaLabel="Suite description"
              onStartEdit={() => setEditingDesc(true)}
              onSave={(value) => { saveSuiteField("description", value); setEditingDesc(false); }}
              onCancel={() => setEditingDesc(false)}
              className="text-sm text-slate-500 dark:text-slate-400 mt-0.5"
              placeholder={readOnly ? "No description" : "Add a description..."}
              multiline
            />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-[#232838] rounded-full flex-shrink-0">
            {cases.length} {cases.length === 1 ? "case" : "cases"}
          </span>
        </div>
      </div>

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
            aria-label="Search cases"
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="text-slate-500 hover:text-slate-800 dark:hover:text-white"><FaTimes className="w-3 h-3" /></button>
          )}
        </div>
        <select aria-label="Filter by priority" value={priFilter} onChange={(e) => setPriFilter(e.target.value)} className={FILTER_SELECT_CLASS}>
          <option value="all">All Priorities</option>
          {TEST_PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={FILTER_SELECT_CLASS}>
          <option value="all">All Statuses</option>
          {TEST_RESULT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select aria-label="Filter by pack" value={packFilter} onChange={(e) => setPackFilter(e.target.value)} className={FILTER_SELECT_CLASS}>
          <option value="all">All Packs</option>
          {regressionPackOptions.map((pack) => <option key={pack} value={pack}>{pack}</option>)}
        </select>
        {activeFilterCount > 0 && (
          <button type="button" onClick={clearFilters} className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-200 dark:hover:bg-[#2a3044] transition-colors">
            Clear filters ({activeFilterCount})
          </button>
        )}
        {!readOnly && (
          <button type="button" onClick={() => setCaseModal("new")} className={`${PRIMARY_BUTTON_CLASS} ml-auto`}>
            <FaPlus className="w-3 h-3" /> New Test Case
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {displayCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400">
            <FaClipboardList className="w-8 h-8 mb-3 opacity-40" />
            <p className="text-sm text-center">{cases.length === 0 ? "No test cases yet." : "No cases match your filters."}</p>
            {cases.length === 0 && !readOnly && (
              <button type="button" onClick={() => setCaseModal("new")} className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
                Create First Case
              </button>
            )}
          </div>
        ) : (
          displayCases.map((testCase) => (
            <CaseRow
              key={testCase.id}
              testCase={testCase}
              effectiveStatus={getEffectiveStatus(testCase)}
              isExpanded={expandedId === testCase.id}
              linkedTask={testCase.linkedTaskId ? taskById.get(testCase.linkedTaskId) : null}
              linkedBugTask={testCase.linkedBugTaskId ? taskById.get(testCase.linkedBugTaskId) : null}
              readOnly={readOnly}
              onToggle={toggleExpanded}
              onEdit={setCaseModal}
              onDelete={onDeleteCase}
            />
          ))
        )}
      </div>

      {caseModal && (
        <TestCaseModal
          initialData={caseModal === "new" ? null : caseModal}
          allTasks={allTasks}
          onClose={() => setCaseModal(null)}
          onSave={(data) => {
            if (caseModal === "new") onCreateCase(data);
            else onUpdateCase(data);
          }}
        />
      )}
    </div>
  );
}
