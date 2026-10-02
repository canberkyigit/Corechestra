import React, { memo } from "react";
import {
  FaCheckSquare, FaClone, FaFolderOpen, FaPlay, FaRobot, FaTimes, FaTrashAlt, FaUser, FaFlag, FaTag,
} from "react-icons/fa";
import OverflowMenu from "../components/OverflowMenu";
import { folderOptions } from "../components/FolderSelect";
import {
  AUTOMATION_OPTIONS, CASE_STATUS_OPTIONS, PRIORITY_OPTIONS,
} from "../constants/testingConstants";
import { userLabel } from "../utils/testingFormat";

const TRIGGER = "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:text-slate-200";

/** Sticky bar for multi-select bulk operations (one store write per action). */
function BulkActionBar({
  count, tree, users, openRuns, canEdit, onMove, onPatch, onAddToCycle, onNewCycle, onClone, onDelete, onClear, onExport,
}) {
  const people = (users || []).filter((user) => user?.username && user.status !== "inactive");
  return (
    <div role="toolbar" aria-label="Bulk actions" data-testid="tests-bulk-bar" className="flex flex-wrap items-center gap-1 border-b border-blue-500/20 bg-blue-500/[0.06] px-3 py-1.5 dark:bg-blue-500/[0.08]">
      <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
        <FaCheckSquare className="h-3 w-3" /> {count} selected
      </span>
      {canEdit && (
        <>
          <OverflowMenu
            label="Move to folder"
            align="left"
            triggerClassName={TRIGGER}
            menuClassName="max-h-80 overflow-y-auto"
            items={folderOptions(tree).map((option) => ({ id: option.value, label: option.label, onSelect: () => onMove(option.value) }))}
          >
            <><FaFolderOpen className="h-3 w-3" /> Move</>
          </OverflowMenu>
          <OverflowMenu label="Set priority" align="left" triggerClassName={TRIGGER} items={PRIORITY_OPTIONS.map((option) => ({ id: option.value, label: option.label, onSelect: () => onPatch({ priority: option.value }, "Set priority on") }))}>
            <><FaFlag className="h-3 w-3" /> Priority</>
          </OverflowMenu>
          <OverflowMenu label="Set status" align="left" triggerClassName={TRIGGER} items={CASE_STATUS_OPTIONS.map((option) => ({ id: option.value, label: option.label, onSelect: () => onPatch({ status: option.value }, "Set status on") }))}>
            <><FaTag className="h-3 w-3" /> Status</>
          </OverflowMenu>
          <OverflowMenu label="Set owner" align="left" triggerClassName={TRIGGER} menuClassName="max-h-80 overflow-y-auto" items={[
            ...people.map((user) => ({ id: user.username, label: userLabel(users, user.username), onSelect: () => onPatch({ owner: user.username }, "Reassigned") })),
            { id: "none", label: "Unassigned", onSelect: () => onPatch({ owner: null }, "Unassigned") },
          ]}
          >
            <><FaUser className="h-3 w-3" /> Owner</>
          </OverflowMenu>
          <OverflowMenu label="Set automation" align="left" triggerClassName={TRIGGER} items={AUTOMATION_OPTIONS.map((option) => ({ id: option.value, label: option.label, onSelect: () => onPatch({ automation: option.value }, "Updated automation on") }))}>
            <><FaRobot className="h-3 w-3" /> Automation</>
          </OverflowMenu>
          <OverflowMenu label="Add to cycle" align="left" triggerClassName={TRIGGER} testId="tests-bulk-add-to-cycle" items={[
            { id: "new", label: "New cycle with selection…", icon: FaPlay, onSelect: onNewCycle },
            openRuns.length ? { id: "div", divider: true } : null,
            ...openRuns.map((run) => ({ id: run.id, label: run.name, onSelect: () => onAddToCycle(run) })),
          ]}
          >
            <><FaPlay className="h-2.5 w-2.5" /> Add to cycle</>
          </OverflowMenu>
          <button type="button" onClick={onClone} className={TRIGGER}><FaClone className="h-3 w-3" /> Clone</button>
        </>
      )}
      <button type="button" onClick={onExport} className={TRIGGER}>Export CSV</button>
      {canEdit && (
        <button type="button" onClick={onDelete} className={`${TRIGGER} text-red-600 hover:bg-red-500/10 dark:text-red-400`} data-testid="tests-bulk-delete">
          <FaTrashAlt className="h-3 w-3" /> Delete
        </button>
      )}
      <div className="flex-1" />
      <button type="button" onClick={onClear} className={TRIGGER} aria-label="Clear selection">
        <FaTimes className="h-3 w-3" /> Clear
      </button>
    </div>
  );
}

export default memo(BulkActionBar);
