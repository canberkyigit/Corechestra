import React, { useEffect, useState } from "react";
import { FaEdit, FaPaperPlane, FaRocket, FaTrash } from "react-icons/fa";
import { AppBadge, AppButton } from "../../../shared/components/AppPrimitives";
import { formatDate } from "../utils/releaseUtils";
import { StatusBadge, VersionBadge } from "./ReleaseBadges";

/**
 * Release title block with lifecycle actions (start / release / replan / edit /
 * delete). Mount with `key={release.id}` so a pending delete confirmation does
 * not carry over to another release.
 */
export default function ReleaseHeader({
  release, template, owner, canManage,
  onStart, onMarkReleased, onMoveToPlanned, onEdit, onDelete,
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Drop a pending delete confirmation when manage rights are revoked.
  useEffect(() => {
    if (!canManage) setConfirmingDelete(false);
  }, [canManage]);

  return (
        <div className="app-surface p-6 flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="app-kicker">Release Overview</div>
          <div className="flex items-center gap-3 flex-wrap">
              <VersionBadge version={release.version} status={release.status} size="lg" />
              <StatusBadge status={release.status} />
              {release.releaseDate && (
                <span className="text-slate-500 dark:text-slate-400 text-sm">{formatDate(release.releaseDate)}</span>
              )}
              {template && (
                <AppBadge tone="purple">
                  {template.name}
                </AppBadge>
              )}
            </div>
            <h1 className="text-slate-800 dark:text-white text-2xl font-bold leading-tight">
              {release.name || release.version}
            </h1>
            <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400">
              <span>Owner: {owner?.name || release.owner || "Unassigned"}</span>
              <span>Updated {release.updatedAt ? formatDate(release.updatedAt) : formatDate(release.createdAt)}</span>
            </div>
          </div>

          {canManage && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {release.status === "in-progress" && (
              <AppButton
                onClick={onMoveToPlanned}
                variant="secondary"
                data-testid="release-move-to-planned"
              >
                Move to Planned
              </AppButton>
            )}
            {release.status === "planned" && (
              <AppButton
                onClick={onStart}
                data-testid="release-start"
              >
                <FaRocket className="w-3 h-3" />
                Start Release
              </AppButton>
            )}
            {release.status === "in-progress" && (
              <AppButton
                onClick={onMarkReleased}
                data-testid="release-mark-released"
              >
                <FaPaperPlane className="w-3 h-3" />
                Mark as Released
              </AppButton>
            )}
            <AppButton
              onClick={onEdit}
              variant="secondary"
            >
              <FaEdit className="w-3 h-3" />
              Edit
            </AppButton>
            {confirmingDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-red-400 text-xs">Delete?</span>
                <AppButton
                  onClick={onDelete}
                  variant="danger"
                  size="sm"
                >
                  Yes
                </AppButton>
                <AppButton
                  onClick={() => setConfirmingDelete(false)}
                  variant="secondary"
                  size="sm"
                >
                  No
                </AppButton>
              </div>
            ) : (
              <AppButton
                onClick={() => setConfirmingDelete(true)}
                variant="secondary"
              >
                <FaTrash className="w-3 h-3" />
                Delete
              </AppButton>
            )}
          </div>
          )}
        </div>
  );
}
