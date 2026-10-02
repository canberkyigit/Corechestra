import React, { memo } from "react";
import { FaDatabase, FaFileCsv, FaLock, FaPlus, FaTrashAlt } from "react-icons/fa";
import { AppButton } from "../../../shared/components/AppPrimitives";
import OverflowMenu from "./OverflowMenu";

function ReleasesHeader({
  projectName,
  totalCount,
  sampleCount,
  canManage,
  onCreate,
  onLoadSamples,
  onRemoveSamples,
  onExportCsv,
}) {
  const menuItems = [
    canManage && { id: "load", label: "Load sample data", icon: FaDatabase, onSelect: onLoadSamples },
    canManage && { id: "remove", label: `Remove sample data${sampleCount ? ` (${sampleCount})` : ""}`, icon: FaTrashAlt, onSelect: onRemoveSamples, disabled: sampleCount === 0, danger: true },
    canManage && { id: "div", divider: true },
    { id: "csv", label: "Export CSV", icon: FaFileCsv, onSelect: onExportCsv, disabled: totalCount === 0 },
  ];

  return (
    <header>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="uppercase tracking-[0.08em]">Release management</span>
            {projectName && (
              <>
                <span aria-hidden="true">/</span>
                <span className="truncate text-slate-700">{projectName}</span>
              </>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Releases
            <span className="ml-2 align-middle text-sm font-medium text-slate-500 tabular-nums">{totalCount}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!canManage && (
            <span
              data-testid="releases-read-only-hint"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-500/25 dark:text-amber-300"
            >
              <FaLock className="w-2.5 h-2.5" />
              Read-only access
            </span>
          )}
          <OverflowMenu items={menuItems} label="Release options" />
          {canManage && (
            <AppButton variant="primary" onClick={onCreate} data-testid="release-new" aria-label="New release">
              <FaPlus className="w-3 h-3" />
              <span className="hidden sm:inline">New release</span>
            </AppButton>
          )}
        </div>
      </div>

    </header>
  );
}

export default memo(ReleasesHeader);
