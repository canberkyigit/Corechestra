import { useCallback, useMemo, useRef } from "react";
import { taskKey } from "../../../shared/utils/helpers";
import {
  TESTS_DEFECT_DENIED_MESSAGE,
  TESTS_EXECUTE_DENIED_MESSAGE,
  TESTS_READ_ONLY_MESSAGE,
} from "../constants/testingConstants";
import { generateTestingId } from "../../../shared/context/hooks/actions/testingRecords";
import { buildImportRecords, casesToCsv, parseCasesCsv } from "../utils/testingCsv";
import { downloadTextFile, fileStamp } from "../utils/testingExport";
import { buildPathIndex, getDescendantIds } from "../utils/testingTree";
import { plural } from "../utils/testingFormat";
import { buildSampleTesting } from "../utils/sampleTesting";

/**
 * Every Tests-module mutation used by the UI, guarded by permissions
 * (`tests:edit`, `tests:execute`, `task:create`). UI hides controls too; the
 * guard covers stale dialogs, keyboard shortcuts and programmatic calls.
 * All writes go through the useApp() testing facade.
 */
export function useTestsActions(context) {
  const ctx = useRef(context);
  ctx.current = context;

  const ensure = useCallback((permission) => {
    const { perms, addToast } = ctx.current;
    if (perms[permission]) return true;
    const message = permission === "canEdit" ? TESTS_READ_ONLY_MESSAGE : permission === "canExecute" ? TESTS_EXECUTE_DENIED_MESSAGE : TESTS_DEFECT_DENIED_MESSAGE;
    addToast(message, "error");
    return false;
  }, []);

  return useMemo(() => {
    const c = () => ctx.current;
    const f = () => ctx.current.facade;
    const toast = (message, tone = "success") => ctx.current.addToast(message, tone);

    const handlers = {
      // ── Folders ──────────────────────────────────────────────────────────
      createFolder({ name, parentId = null, description = "" }) {
        if (!ensure("canEdit")) return null;
        const trimmed = String(name || "").trim();
        if (!trimmed) return null;
        const record = f().createTestSuite({ name: trimmed, parentId, description, projectId: c().currentProjectId });
        toast(parentId ? `Folder "${trimmed}" created` : `Suite "${trimmed}" created`);
        return record;
      },

      renameFolder(suite, name) {
        if (!ensure("canEdit")) return;
        const trimmed = String(name || "").trim();
        if (!trimmed || trimmed === suite.name) return;
        f().updateTestSuite({ id: suite.id, name: trimmed, ...(suite.projectId ? {} : { projectId: c().currentProjectId }) });
        toast("Folder renamed");
      },

      moveFolder(id, parentId, index) {
        if (!ensure("canEdit")) return false;
        const ok = f().moveTestSuite(id, parentId || null, index);
        if (ok === false) toast("A folder can't be moved into itself", "warning");
        return ok !== false;
      },

      deleteFolder(suite) {
        if (!ensure("canEdit")) return;
        const { data } = c();
        const ids = getDescendantIds(suite.id, data.tree.childrenById);
        const caseCount = data.cases.filter((testCase) => ids.has(testCase.suiteId)).length;
        const folderCount = ids.size - 1;
        c().requestConfirm({
          title: `Delete "${suite.name}"?`,
          message: [
            `${plural(caseCount, "test case")}${folderCount ? ` and ${plural(folderCount, "sub-folder")}` : ""} will be deleted.`,
            "Open cycles drop these cases; closed cycles keep their history.",
            "This cannot be undone.",
          ].join("\n"),
          confirmLabel: "Delete",
          onConfirm: () => {
            f().deleteTestSuite(suite.id);
            const nav = c().nav;
            if (nav.folderId && ids.has(nav.folderId)) nav.setFolder(null);
            toast(`Deleted "${suite.name}"`, "info");
          },
        });
      },

      // ── Cases ────────────────────────────────────────────────────────────
      createCase(form) {
        if (!ensure("canEdit")) return null;
        const record = f().createTestCase({ ...form, projectId: c().currentProjectId });
        if (record) toast(`Created test case${record.seq ? ` TC-${record.seq}` : ""}`);
        return record;
      },

      updateCase(id, patch) {
        if (!ensure("canEdit")) return;
        f().updateTestCase({ id, ...patch });
      },

      deleteCases(ids, { onDone } = {}) {
        if (!ensure("canEdit") || !ids?.length) return;
        c().requestConfirm({
          title: ids.length === 1 ? "Delete this test case?" : `Delete ${ids.length} test cases?`,
          message: "Open cycles drop them from scope; results in closed cycles stay in history. This cannot be undone.",
          confirmLabel: ids.length === 1 ? "Delete case" : `Delete ${ids.length} cases`,
          onConfirm: () => {
            f().deleteTestCases(ids);
            const nav = c().nav;
            if (nav.caseId && ids.includes(nav.caseId)) nav.closeCase();
            onDone?.();
            toast(`Deleted ${plural(ids.length, "test case")}`, "info");
          },
        });
      },

      bulkUpdate(ids, patch, label = "Updated") {
        if (!ensure("canEdit") || !ids?.length) return;
        f().bulkUpdateTestCases(ids, patch);
        toast(`${label} ${plural(ids.length, "case")}`);
      },

      moveCases(ids, suiteId, beforeId = null, { silent = false } = {}) {
        if (!ensure("canEdit") || !ids?.length || !suiteId) return;
        f().moveTestCases(ids, suiteId, beforeId);
        if (!silent) {
          const name = c().data.suiteById.get(suiteId)?.name || "folder";
          toast(`Moved ${plural(ids.length, "case")} to ${name}`);
        }
      },

      cloneCases(ids) {
        if (!ensure("canEdit") || !ids?.length) return [];
        const created = f().cloneTestCases(ids) || [];
        toast(`Cloned ${plural(created.length || ids.length, "case")}`);
        return created;
      },

      addComment(caseId, text) {
        if (!ensure("canEdit")) return null;
        return f().addTestCaseComment(caseId, text);
      },

      deleteComment(caseId, commentId) {
        if (!ensure("canEdit")) return;
        f().deleteTestCaseComment(caseId, commentId);
      },

      // ── Shared steps ─────────────────────────────────────────────────────
      createSharedSteps(form) {
        if (!ensure("canEdit")) return null;
        const record = f().createSharedSteps({ ...form, projectId: c().currentProjectId });
        toast(`Shared steps "${record.name}" created`);
        return record;
      },

      updateSharedSteps(id, patch) {
        if (!ensure("canEdit")) return;
        f().updateSharedSteps({ id, ...patch });
        toast("Shared steps saved");
      },

      deleteSharedSteps(group) {
        if (!ensure("canEdit")) return;
        const usedBy = c().data.cases.filter((testCase) => testCase.steps.some((step) => step.sharedStepsId === group.id)).length;
        c().requestConfirm({
          title: `Delete shared steps "${group.name}"?`,
          message: usedBy
            ? `${plural(usedBy, "test case")} call this group. Its steps will be copied into those cases so nothing is lost.`
            : "No test case uses this group.",
          confirmLabel: "Delete group",
          onConfirm: () => {
            f().deleteSharedSteps(group.id);
            toast("Shared steps deleted", "info");
          },
        });
      },

      // ── CSV ──────────────────────────────────────────────────────────────
      previewCsv(text) {
        return parseCasesCsv(text);
      },

      importCsv(rows, defaultSuiteId) {
        if (!ensure("canEdit")) return null;
        const { data, currentProjectId, currentUser } = c();
        const startSeq = data.cases.reduce((max, testCase) => Math.max(max, testCase.displaySeq || 0), 0) + 1;
        const records = buildImportRecords(rows, {
          projectId: currentProjectId,
          suites: data.suites,
          defaultSuiteId,
          startSeq,
          startOrder: (data.casesBySuite.get(defaultSuiteId) || []).length,
          currentUser,
          makeId: (prefix) => generateTestingId(prefix),
        });
        if (!records.cases.length) {
          toast("Nothing to import — choose a target folder for rows without a folder", "warning");
          return null;
        }
        f().importTestingData({ suites: records.suites, cases: records.cases });
        toast(`Imported ${plural(records.cases.length, "test case")}${records.suites.length ? ` and ${plural(records.suites.length, "folder")}` : ""}`);
        return records;
      },

      exportCsv(cases) {
        const { data, taskById } = c();
        const csv = casesToCsv(cases, {
          pathById: buildPathIndex(data.suites),
          taskKeyOf: (id) => (taskById.get(String(id)) ? taskKey(id) : id),
          sharedById: data.sharedById,
        });
        const ok = downloadTextFile(`test-cases-${fileStamp()}.csv`, csv, "text/csv");
        toast(ok ? `Exported ${plural(cases.length, "test case")}` : "Export failed", ok ? "success" : "error");
      },

      // ── Plans ────────────────────────────────────────────────────────────
      createPlan(form) {
        if (!ensure("canEdit")) return null;
        const record = f().createTestPlan({ ...form, projectId: c().currentProjectId, status: "draft", statusOverride: false });
        toast(`Plan "${record.name}" created`);
        return record;
      },

      updatePlan(id, patch) {
        if (!ensure("canEdit")) return;
        f().updateTestPlan({ id, ...patch });
        toast("Plan updated");
      },

      deletePlan(plan) {
        if (!ensure("canEdit")) return;
        c().requestConfirm({
          title: `Delete plan "${plan.name}"?`,
          message: "Its cycles are kept (as unplanned cycles) with all results.",
          confirmLabel: "Delete plan",
          onConfirm: () => {
            f().deleteTestPlan(plan.id);
            toast("Plan deleted", "info");
          },
        });
      },

      // ── Cycles ───────────────────────────────────────────────────────────
      createCycle(form) {
        if (!ensure("canEdit")) return null;
        if (!form.caseIds?.length) {
          toast("Pick at least one test case for the cycle", "warning");
          return null;
        }
        const plan = form.planId ? c().data.planById.get(form.planId) : null;
        const record = f().createTestRun({
          ...form,
          projectId: c().currentProjectId,
          releaseId: form.releaseId || plan?.releaseId || null,
          status: "in-progress",
          results: [],
        });
        if (plan && plan.status === "draft") f().updateTestPlan({ id: plan.id, status: "in-progress", statusOverride: false, startedAt: new Date().toISOString() });
        toast(`Cycle "${record.name}" created with ${plural(form.caseIds.length, "case")}`);
        return record;
      },

      updateCycle(id, patch) {
        if (!ensure("canEdit")) return;
        f().updateTestRun({ id, ...patch });
      },

      updateCycleScope(id, scope, message) {
        if (!ensure("canEdit")) return;
        f().updateTestRunScope(id, scope);
        if (message) toast(message);
      },

      addCasesToCycle(caseIds, run) {
        if (!ensure("canEdit") || !caseIds?.length || !run) return;
        const existing = new Set(run.caseIds);
        const added = caseIds.filter((id) => !existing.has(id));
        f().updateTestRunScope(run.id, { addCaseIds: added });
        toast(added.length ? `Added ${plural(added.length, "case")} to "${run.name}"` : "All selected cases are already in that cycle", added.length ? "success" : "info");
      },

      closeCycle(run, summary) {
        if (!ensure("canEdit")) return;
        const close = () => {
          f().updateTestRun({ id: run.id, status: "completed", completedAt: new Date().toISOString() });
          toast(`Cycle "${run.name}" closed`);
        };
        if (summary?.open > 0) {
          c().requestConfirm({
            title: "Close cycle with open cases?",
            message: `${plural(summary.open, "case")} are untested or marked for retest and will stay that way.`,
            confirmLabel: "Close cycle",
            tone: "primary",
            onConfirm: close,
          });
          return;
        }
        close();
      },

      reopenCycle(run) {
        if (!ensure("canEdit")) return;
        f().updateTestRun({ id: run.id, status: "in-progress", completedAt: null });
        toast(`Cycle "${run.name}" reopened`, "info");
      },

      cloneCycle(run, mode = "all") {
        if (!ensure("canEdit")) return null;
        const statuses = mode === "failed" ? ["failed", "blocked"] : null;
        const created = f().cloneTestRun(run.id, {
          statuses,
          name: mode === "failed" ? `${run.name} — Rerun failed & blocked` : `${run.name} — Copy`,
        });
        if (!created) {
          toast(mode === "failed" ? "No failed or blocked cases to rerun" : "Nothing to clone", "info");
          return null;
        }
        toast(`Created "${created.name}" (${plural(created.caseIds.length, "case")})`);
        return created;
      },

      deleteCycle(run) {
        if (!ensure("canEdit")) return;
        c().requestConfirm({
          title: `Delete cycle "${run.name}"?`,
          message: "All execution results of this cycle are removed from reports, coverage and release quality. This cannot be undone.",
          confirmLabel: "Delete cycle",
          onConfirm: () => {
            f().deleteTestRun(run.id);
            const nav = c().nav;
            if (nav.runId === run.id) nav.closeRunner();
            if (nav.cycleId === run.id) nav.closeCycle();
            toast("Cycle deleted", "info");
          },
        });
      },

      // ── Execution ────────────────────────────────────────────────────────
      recordExecution(run, caseId, input) {
        if (!ensure("canExecute")) return null;
        if (run.status !== "in-progress") {
          toast("Reopen the cycle to record results", "warning");
          return null;
        }
        return f().recordTestExecution(run.id, caseId, input);
      },

      /**
       * Creates a bug task prefilled from a failed execution and links it to
       * the execution and the case. `execution` (optional) is recorded at the
       * same time when the user may execute.
       */
      createDefect({ run, testCase, form, execution = null }) {
        if (!ensure("canCreateDefect")) return null;
        const { labels, backlogSections } = c();
        const qaLabel = (labels || []).find((label) => String(label?.name || "").trim().toLowerCase() === "qa");
        const destination = form.destination === "backlog" && backlogSections?.[0] ? `backlog-${backlogSections[0].id}` : "active";
        const task = f().createTask({
          title: form.title,
          description: form.description,
          type: form.type || "bug",
          priority: form.priority || testCase.priority || "medium",
          storyPoint: 0,
          dueDate: "",
          assignedTo: form.assignedTo || "unassigned",
          labels: qaLabel?.id ? [qaLabel.id] : [],
          linkedItems: [{
            id: `${Date.now()}`,
            targetType: "test-case",
            targetId: testCase.id,
            relationship: "relates to",
            createdAt: new Date().toISOString(),
          }],
        }, destination);
        if (!task?.id) {
          toast("Defect created, but linking it back failed", "warning");
          return null;
        }
        const canRecord = c().perms.canExecute && run && run.status === "in-progress";
        f().linkDefectToExecution(run?.id || null, testCase.id, task.id, canRecord ? execution : null);
        toast(`Defect ${taskKey(task.id)} created and linked to ${testCase.key || "the case"}`);
        return task;
      },

      linkDefect(caseId, taskId, runId = null) {
        if (!ensure("canEdit")) return;
        f().linkDefectToExecution(runId, caseId, taskId, null);
        toast(`Linked ${taskKey(taskId)}`);
      },

      // ── Samples ──────────────────────────────────────────────────────────
      loadSamples({ auto = false } = {}) {
        if (!ensure("canEdit")) return 0;
        const { currentProjectId, tasks, users, releases, currentUser } = c();
        const sample = buildSampleTesting({ projectId: currentProjectId, tasks, users, releases, currentUser, now: new Date() });
        f().importTestingData(sample);
        toast(auto
          ? `Added a sample test workspace (${sample.cases.length} cases, ${sample.runs.length} cycles) to get you started`
          : `Loaded ${sample.cases.length} sample cases and ${sample.runs.length} cycles`);
        return sample.cases.length;
      },

      removeSamples() {
        if (!ensure("canEdit")) return;
        c().requestConfirm({
          title: "Remove sample data?",
          message: "Sample suites, cases, shared steps, plans and cycles of this project are deleted. Your own records stay.",
          confirmLabel: "Remove samples",
          onConfirm: () => {
            f().removeSampleTestingData(c().currentProjectId || null);
            c().nav.update({ case: null, run: null, cycle: null, folder: null, at: null });
            toast("Sample test data removed", "info");
          },
        });
      },
    };
    return handlers;
  }, [ensure]);
}
