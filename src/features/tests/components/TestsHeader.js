import React, { memo } from "react";
import { FaDatabase, FaFileCsv, FaFileImport, FaLayerGroup, FaPlay, FaPlus, FaTrashAlt } from "react-icons/fa";
import { BTN_PRIMARY, BTN_SECONDARY } from "../constants/testingConstants";
import OverflowMenu from "./OverflowMenu";
import { ReadOnlyPill } from "./ui";

function TestsHeader({
  projectName,
  caseCount,
  sampleCount,
  canEdit,
  canExecute,
  onNewCase,
  onNewCycle,
  onLoadSamples,
  onRemoveSamples,
  onImportCsv,
  onExportCsv,
  onSharedSteps,
}) {
  const menuItems = [
    canEdit && { id: "import", label: "Import cases from CSV", icon: FaFileImport, onSelect: onImportCsv },
    { id: "export", label: "Export all cases (CSV)", icon: FaFileCsv, onSelect: onExportCsv, disabled: caseCount === 0 },
    { id: "shared", label: "Shared steps library", icon: FaLayerGroup, onSelect: onSharedSteps },
    canEdit && { id: "div", divider: true },
    canEdit && { id: "load", label: "Load sample data", icon: FaDatabase, onSelect: onLoadSamples },
    canEdit && { id: "remove", label: `Remove sample data${sampleCount ? ` (${sampleCount})` : ""}`, icon: FaTrashAlt, onSelect: onRemoveSamples, disabled: sampleCount === 0, danger: true },
  ];

  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="uppercase tracking-[0.08em]">Test management</span>
          {projectName && (
            <>
              <span aria-hidden="true">/</span>
              <span className="truncate text-slate-700">{projectName}</span>
            </>
          )}
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Tests
          <span className="ml-2 align-middle text-sm font-medium text-slate-500 tabular-nums">{caseCount} cases</span>
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!canEdit && <ReadOnlyPill>{canExecute ? "Execute-only access" : "Read-only access"}</ReadOnlyPill>}
        <OverflowMenu items={menuItems} label="Test options" testId="tests-options" />
        {canEdit && (
          <button type="button" onClick={onNewCycle} className={BTN_SECONDARY} data-testid="tests-new-cycle">
            <FaPlay className="h-2.5 w-2.5" />
            <span className="hidden sm:inline">New cycle</span>
            <span className="sr-only sm:hidden">New cycle</span>
          </button>
        )}
        {canEdit && (
          <button type="button" onClick={onNewCase} className={BTN_PRIMARY} data-testid="tests-new-case">
            <FaPlus className="h-3 w-3" />
            <span className="hidden sm:inline">New test case</span>
            <span className="sr-only sm:hidden">New test case</span>
          </button>
        )}
      </div>
    </header>
  );
}

export default memo(TestsHeader);
