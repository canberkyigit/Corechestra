import React, { useMemo, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { ConfirmDialog } from "../../../shared/ui/Modal";
import { AppDataCard } from "../../../shared/components/AppPrimitives";

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * Workspace reset lives in Admin → Workspace (not Board Settings) and needs
 * the workspace name typed, with an exact list of what gets erased.
 */
export function WorkspaceDangerZone({ reloadAfterReset = true }) {
  const {
    projects = [],
    activeTasks = [],
    epics = [],
    users = [],
    teams = [],
    spaces = [],
    docPages = [],
    releases = [],
    testCases = [],
    testRuns = [],
    archivedTasks = [],
    workspaceSettings,
    resetAllData,
  } = useApp();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);

  const workspaceName = workspaceSettings?.displayName || "Corechestra Workspace";

  const erased = useMemo(() => [
    plural(projects.length, "project"),
    `${plural(activeTasks.length, "sprint task")}, all backlogs, sprints and sprint history`,
    plural(epics.length, "epic"),
    `${plural(spaces.length, "doc space")} and ${plural(docPages.length, "page")}`,
    plural(releases.length, "release"),
    `${plural(testCases.length, "test case")} and ${plural(testRuns.length, "test run")}`,
    `${plural(users.length, "person")} and ${plural(teams.length, "team")} in People`,
    `${plural(archivedTasks.length, "archived task")}, retros, notes, activity and notifications`,
    "Workspace settings, templates and the permission matrix",
  ], [activeTasks.length, archivedTasks.length, docPages.length, epics.length, projects.length, releases.length, spaces.length, teams.length, testCases.length, testRuns.length, users.length]);

  const handleReset = async () => {
    const didReset = await resetAllData();
    if (!didReset) {
      addToast("Workspace could not be reset. Nothing was deleted.", "error");
      return;
    }
    setOpen(false);
    addToast("Workspace reset. Reloading…", "success");
    // Start from a clean hydration instead of a half-reset in-memory store.
    if (reloadAfterReset) window.setTimeout(() => window.location.reload(), 600);
  };

  return (
    <AppDataCard className="p-5 border-red-200 dark:border-red-900/50" data-testid="workspace-danger-zone">
      <div className="app-kicker mb-2 text-red-600 dark:text-red-400">Danger Zone</div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">Reset all workspace data</h4>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Permanently erases every project, task, doc, release, test and person for everyone in this workspace. This cannot be undone.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex flex-shrink-0 items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <FaTrash className="w-3.5 h-3.5" />
          Reset workspace…
        </button>
      </div>

      <ConfirmDialog
        open={open}
        title="Reset the entire workspace?"
        description="This permanently deletes the following for every user. Export anything you need first."
        details={(
          <ul className="list-disc pl-5 space-y-1">
            {erased.map((line) => <li key={line}>{line}</li>)}
          </ul>
        )}
        requireText={workspaceName}
        confirmLabel="Erase everything"
        tone="danger"
        onCancel={() => setOpen(false)}
        onConfirm={handleReset}
        testId="workspace-reset-dialog"
      />
    </AppDataCard>
  );
}
