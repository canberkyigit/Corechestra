import React, { useMemo, useState } from "react";
import { FaBolt, FaLayerGroup, FaPlus } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { useBoardPermissions } from "../../board/hooks/useBoardPermissions";
import { requestOpenTask } from "../../../shared/components/appNavigation";
import { isInProject, taskKey } from "../../../shared/utils/helpers";
import { makeDescribeLookups } from "../../../shared/automation/automationDescribe";
import { AUTOMATION_TEMPLATES, buildRuleFromTemplate } from "../../../shared/automation/automationTemplates";
import { getActiveAutomationRunner } from "../../../shared/automation/useAutomationRunner";
import AutomationRuleCard from "./AutomationRuleCard";
import AutomationRuleEditor from "./AutomationRuleEditor";
import AutomationTemplateGallery, { TemplateCard } from "./AutomationTemplateGallery";
import AutomationLogPanel from "./AutomationLogPanel";
import { relativeTime } from "./automationControls";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function StatTile({ label, value, helper, tone = "text-slate-800 dark:text-white" }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
      {helper && <p className="text-xs text-slate-400 dark:text-slate-500">{helper}</p>}
    </div>
  );
}

function RuleGroup({ title, hint, rules, ...cardProps }) {
  if (rules.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h3>
        <span className="text-xs text-slate-400 dark:text-slate-500">{hint}</span>
      </div>
      {rules.map((rule) => (
        <AutomationRuleCard key={rule.id} rule={rule} {...cardProps} canEdit={cardProps.canEditRule(rule)} />
      ))}
    </div>
  );
}

export default function AutomationTab() {
  const {
    automationRules,
    automationLog,
    createAutomationRule,
    updateAutomationRule,
    toggleAutomationRule,
    duplicateAutomationRule,
    deleteAutomationRule,
    clearAutomationLog,
    currentProjectId,
    projects,
    columns,
    users,
    labels,
    epics,
    allTasks,
  } = useApp();
  const { canManageAutomation, canManageWorkspace } = useBoardPermissions();
  const { addToast } = useToast();
  const [editor, setEditor] = useState(null);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const project = (projects || []).find((item) => item.id === currentProjectId);
  const canManageGlobal = canManageAutomation && canManageWorkspace;
  const canEditRule = (rule) => canManageAutomation && (Boolean(rule.projectId) || canManageGlobal);

  const options = useMemo(() => ({
    statuses: (columns || []).map((column) => ({ value: column.id, label: column.title })),
    users: (users || [])
      .filter((user) => user && user.status !== "deleted" && user.status !== "inactive")
      .map((user) => ({ value: user.username || user.id, label: user.name || user.username || user.email || user.id })),
    labels: (labels || []).map((label) => ({ value: label.id, label: label.name || label.id })),
    epics: (epics || [])
      .filter((epic) => isInProject(epic, currentProjectId))
      .map((epic) => ({ value: epic.id, label: epic.title || epic.id })),
  }), [columns, currentProjectId, epics, labels, users]);

  const lookups = useMemo(
    () => makeDescribeLookups({ columns: columns || [], users: users || [], labels: labels || [], epics: epics || [] }),
    [columns, epics, labels, users]
  );

  const projectRules = useMemo(
    () => (automationRules || []).filter((rule) => rule.projectId === currentProjectId),
    [automationRules, currentProjectId]
  );
  const globalRules = useMemo(() => (automationRules || []).filter((rule) => !rule.projectId), [automationRules]);
  const projectLog = useMemo(
    () => (automationLog || []).filter((entry) => !entry.projectId || entry.projectId === currentProjectId),
    [automationLog, currentProjectId]
  );

  const stats = useMemo(() => {
    const since = Date.now() - WEEK_MS;
    const recent = projectLog.filter((entry) => new Date(entry.at).getTime() >= since);
    return {
      active: [...projectRules, ...globalRules].filter((rule) => rule.enabled).length,
      runs: recent.length,
      problems: recent.filter((entry) => entry.status !== "success").length,
      lastRun: projectLog[0]?.at || null,
    };
  }, [globalRules, projectLog, projectRules]);

  const testTasks = useMemo(
    () => (allTasks || []).slice(0, 200).map((task) => ({ id: task.id, label: `${taskKey(task.id)} · ${task.title || "Untitled"}` })),
    [allTasks]
  );

  const openEditor = (rule, isEditing) => setEditor({ rule, isEditing, session: Date.now() });

  const handleUseTemplate = (template) => {
    setGalleryOpen(false);
    openEditor({ ...buildRuleFromTemplate(template), projectId: currentProjectId }, false);
  };

  const handleSave = (draft) => {
    if (editor?.isEditing && editor.rule?.id) {
      updateAutomationRule(editor.rule.id, draft);
      addToast(`Rule "${draft.name}" updated`);
    } else {
      createAutomationRule(draft);
      addToast(`Rule "${draft.name}" created`);
    }
    setEditor(null);
  };

  const handleTestRun = (draft, taskId) => {
    const runner = getActiveAutomationRunner();
    if (!runner) {
      addToast("Automation runner is not available.", "error");
      return;
    }
    const entry = runner.runRuleNow({ ...draft, id: editor?.rule?.id || "draft-test", name: draft.name || "Draft rule" }, taskId);
    if (!entry) addToast("The conditions do not match this task. Nothing ran.", "info");
    else if (entry.status === "success") addToast(`Ran on ${taskKey(taskId)}: ${entry.message}`);
    else addToast(entry.message, entry.status === "partial" ? "warning" : "error");
  };

  const handleOpenTask = (taskId) => {
    const task = (allTasks || []).find((item) => item.id === taskId);
    if (task) requestOpenTask(task);
    else addToast("That task is no longer in this project.", "info");
  };

  const handleDuplicate = (ruleId) => {
    duplicateAutomationRule(ruleId);
    addToast("Rule duplicated (paused)");
  };

  const hasRules = projectRules.length > 0 || globalRules.length > 0;

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">
            <FaBolt className="h-4 w-4 text-amber-500" /> Automation
          </h2>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Rules run automatically when work changes in {project?.name || "this project"}.
          </p>
        </div>
        {canManageAutomation && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setGalleryOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#232838]">
              <FaLayerGroup className="h-3 w-3" /> Templates
            </button>
            <button type="button" onClick={() => openEditor(null, false)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <FaPlus className="h-3 w-3" /> New rule
            </button>
          </div>
        )}
      </div>

      {!canManageAutomation && (
        <p className="mb-4 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#141720] px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
          You can view rules and their runs. Ask an admin for the "Create and edit automation rules" permission to change them.
        </p>
      )}

      {!hasRules ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-[#2a3044] p-8">
          <div className="mx-auto max-w-lg text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-900/20">
              <FaBolt className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-base font-semibold text-slate-700 dark:text-slate-200">Put repetitive work on autopilot</h3>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              A rule says <em>when</em> something happens, <em>if</em> it matches, <em>then</em> do these actions. Start from a template or build your own.
            </p>
          </div>
          {canManageAutomation && (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {AUTOMATION_TEMPLATES.slice(0, 4).map((template) => (
                  <TemplateCard key={template.id} template={template} lookups={lookups} onUse={handleUseTemplate} compact />
                ))}
              </div>
              <div className="mt-4 flex justify-center gap-3 text-sm">
                <button type="button" onClick={() => setGalleryOpen(true)} className="text-blue-600 hover:underline dark:text-blue-400">Browse all templates</button>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <button type="button" onClick={() => openEditor(null, false)} className="text-blue-600 hover:underline dark:text-blue-400">Build from scratch</button>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Active rules" value={stats.active} helper={`${projectRules.length + globalRules.length} total`} />
            <StatTile label="Runs (7 days)" value={stats.runs} />
            <StatTile label="Problems (7 days)" value={stats.problems} tone={stats.problems > 0 ? "text-red-500" : "text-slate-800 dark:text-white"} />
            <StatTile label="Last run" value={stats.lastRun ? relativeTime(stats.lastRun) : "—"} />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <RuleGroup
                title="This project"
                hint={`${projectRules.length} rule${projectRules.length === 1 ? "" : "s"}`}
                rules={projectRules}
                lookups={lookups}
                canEditRule={canEditRule}
                onToggle={toggleAutomationRule}
                onEdit={(rule) => openEditor(rule, true)}
                onDuplicate={handleDuplicate}
                onDelete={deleteAutomationRule}
              />
              <RuleGroup
                title="All projects"
                hint="Workspace-wide rules, managed by admins"
                rules={globalRules}
                lookups={lookups}
                canEditRule={canEditRule}
                onToggle={toggleAutomationRule}
                onEdit={(rule) => openEditor(rule, true)}
                onDuplicate={handleDuplicate}
                onDelete={deleteAutomationRule}
              />
              {projectRules.length === 0 && canManageAutomation && (
                <button type="button" onClick={() => setGalleryOpen(true)} className="w-full rounded-xl border border-dashed border-slate-300 dark:border-[#2a3044] py-4 text-sm text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-[#141720]">
                  No rules for this project yet. Start from a template →
                </button>
              )}
            </div>
            <AutomationLogPanel
              entries={projectLog}
              onOpenTask={handleOpenTask}
              canClear={canManageAutomation}
              onClear={() => clearAutomationLog(currentProjectId)}
            />
          </div>
        </>
      )}

      {editor && (
        <AutomationRuleEditor
          key={editor.session}
          open
          initialRule={editor.rule}
          isEditing={editor.isEditing}
          currentProjectId={currentProjectId}
          canManageGlobal={canManageGlobal}
          options={options}
          lookups={lookups}
          testTasks={testTasks}
          onSave={handleSave}
          onTestRun={handleTestRun}
          onClose={() => setEditor(null)}
        />
      )}
      <AutomationTemplateGallery open={galleryOpen} lookups={lookups} onUse={handleUseTemplate} onClose={() => setGalleryOpen(false)} />
    </div>
  );
}
