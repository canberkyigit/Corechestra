import React, { memo } from "react";
import {
  FaBan,
  FaClone,
  FaCodeBranch,
  FaCopy,
  FaEdit,
  FaFlask,
  FaPaperPlane,
  FaPlay,
  FaRedo,
  FaSnowflake,
  FaTimes,
  FaTrash,
  FaUndo,
} from "react-icons/fa";
import { AppButton } from "../../../../shared/components/AppPrimitives";
import { availableTransitions } from "../../utils/releaseLifecycle";
import { isActiveStatus } from "../../utils/releaseModel";
import { describeTargetDate, formatDate } from "../../utils/releaseUtils";
import OverflowMenu from "../OverflowMenu";
import { OwnerAvatar, StatusPill, VersionBadge } from "../ReleaseBadges";
import LifecycleStepper from "./LifecycleStepper";

function Meta({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-[13px] text-slate-800 truncate">{children}</dd>
    </div>
  );
}

function ReleaseDetailHeader({ release, users, now, canManage, onClose, onTransition, onRequestConfirm, onEdit, onDuplicate, onCopyNotes }) {
  const transitions = availableTransitions(release.status);
  const has = (key) => canManage && transitions.includes(key);
  const active = isActiveStatus(release.status);
  const target = describeTargetDate(release.releaseDate, { active, now });

  const menuItems = [
    { id: "copy", label: "Copy release notes", icon: FaCopy, onSelect: onCopyNotes },
    canManage && { id: "dup-patch", label: "Duplicate as next patch", icon: FaClone, onSelect: () => onDuplicate("patch") },
    canManage && { id: "dup-minor", label: "Duplicate as next minor", icon: FaCodeBranch, onSelect: () => onDuplicate("minor") },
    (has("replan") && active) && { id: "replan-div", divider: true },
    (has("replan") && active) && { id: "replan", label: "Move back to planned", icon: FaUndo, onSelect: () => onTransition("replan") },
    has("unfreeze") && { id: "unfreeze", label: "Lift code freeze", icon: FaPlay, onSelect: () => onTransition("unfreeze") },
    has("cancel") && { id: "cancel", label: "Cancel release", icon: FaBan, onSelect: () => onRequestConfirm("cancel") },
    canManage && { id: "del-div", divider: true },
    canManage && { id: "delete", label: "Delete release", icon: FaTrash, danger: true, onSelect: () => onRequestConfirm("delete") },
  ];

  return (
    <div className="border-b border-slate-200/80 px-5 pt-4 pb-3 dark:border-[#252b3b] md:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <VersionBadge version={release.version} status={release.status} size="lg" />
            <StatusPill status={release.status} size="lg" />
            {release.sample && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                <FaFlask className="h-2.5 w-2.5" /> Sample data
              </span>
            )}
          </div>
          <h2 id="release-detail-title" className="mt-2 text-xl font-bold tracking-tight text-slate-900">
            {release.name || release.version}
          </h2>
          {release.description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{release.description}</p>}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {has("start") && (
            <AppButton variant="primary" size="sm" onClick={() => onTransition("start")} data-testid="release-start">
              <FaPlay className="h-2.5 w-2.5" /> Start
            </AppButton>
          )}
          {has("freeze") && (
            <AppButton size="sm" onClick={() => onTransition("freeze")} data-testid="release-code-freeze">
              <FaSnowflake className="h-3 w-3" /> Code freeze
            </AppButton>
          )}
          {has("release") && (
            <AppButton variant="primary" size="sm" onClick={() => onTransition("release")} data-testid="release-mark-released">
              <FaPaperPlane className="h-3 w-3" /> Release
            </AppButton>
          )}
          {has("rollback") && (
            <AppButton variant="danger" size="sm" onClick={() => onRequestConfirm("rollback")} data-testid="release-rollback">
              <FaUndo className="h-3 w-3" /> Roll back
            </AppButton>
          )}
          {has("replan") && !active && (
            <AppButton size="sm" onClick={() => onTransition("replan")} data-testid="release-move-to-planned">
              <FaRedo className="h-3 w-3" /> Reopen
            </AppButton>
          )}
          {canManage && (
            <AppButton size="sm" onClick={onEdit} aria-label="Edit release">
              <FaEdit className="h-3 w-3" /> <span className="hidden sm:inline">Edit</span>
            </AppButton>
          )}
          <OverflowMenu items={menuItems} label="Release actions" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close release details"
            className="h-9 w-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-500/10 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:hover:text-white"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
        <Meta label="Owner"><OwnerAvatar users={users} owner={release.owner} showName /></Meta>
        <Meta label="Start">{formatDate(release.startDate)}</Meta>
        <Meta label="Code freeze">{formatDate(release.freezeDate)}</Meta>
        <Meta label="Target">
          {formatDate(release.releaseDate)}
          {release.releaseDate && (
            <span className={`ml-1.5 text-xs ${target.tone === "danger" ? "text-red-600 dark:text-red-400 font-medium" : target.tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-slate-500"}`}>
              {target.text}
            </span>
          )}
        </Meta>
        <Meta label="Released">{release.releasedAt ? formatDate(release.releasedAt) : "—"}</Meta>
      </dl>

      <div className="mt-4">
        <LifecycleStepper release={release} />
      </div>
    </div>
  );
}

export default memo(ReleaseDetailHeader);
