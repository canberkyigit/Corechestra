import React, { memo, useCallback, useMemo } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { FaBan, FaExclamationTriangle } from "react-icons/fa";
import { BOARD_COLUMNS, STATUS_META } from "../../constants/releaseMeta";
import { isActiveStatus } from "../../utils/releaseModel";
import { describeTargetDate, formatDate } from "../../utils/releaseUtils";
import { EnvPipeline, OwnerAvatar, ProgressBar, ReadinessRing, RiskBadge, StatusPill, VersionBadge } from "../ReleaseBadges";

const DATE_TONE = {
  muted: "text-slate-500",
  warn: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400 font-medium",
};

const BoardCard = memo(function BoardCard({ release, metrics, users, now, onOpen, dragging }) {
  const active = isActiveStatus(release.status);
  const rel = describeTargetDate(release.releaseDate, { active, now });
  return (
    <div
      className={`rounded-lg border bg-white/100 p-3 text-left transition-shadow dark:bg-[#232838] ${
        dragging ? "border-blue-400 shadow-lg shadow-blue-500/10 dark:border-blue-500/60" : "border-slate-200/90 hover:border-slate-300 dark:border-[#2a3044] dark:hover:border-[#3a4258]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <VersionBadge version={release.version} status={release.status} />
          <button
            type="button"
            onClick={() => onOpen(release.id)}
            className="mt-1.5 block w-full truncate text-left text-sm font-semibold text-slate-900 hover:text-blue-600 focus:outline-none focus-visible:underline dark:hover:text-blue-400"
          >
            {release.name || "Untitled release"}
          </button>
        </div>
        <ReadinessRing score={metrics.readiness.score} size={30} stroke={3} muted={!active && release.status !== "released"} />
      </div>
      {release.status === "rolled-back" && <div className="mt-2"><StatusPill status={release.status} /></div>}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
          <span>{metrics.work.done}/{metrics.work.total} items</span>
          <span>{metrics.work.percent}%</span>
        </div>
        <ProgressBar value={metrics.work.percent} tone={release.status === "released" ? "green" : metrics.riskLevel === "high" ? "red" : "blue"} className="h-1" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <EnvPipeline environments={release.environments} />
        <OwnerAvatar users={users} owner={release.owner} />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-200/70 pt-2 text-[11px] dark:border-[#2a3044]">
        <span className={`${DATE_TONE[rel.tone]} whitespace-nowrap`} title={formatDate(release.releaseDate)}>
          {release.releaseDate ? `${formatDate(release.releaseDate, "MMM d")} · ${rel.text}` : "No target date"}
        </span>
        <span className="flex items-center gap-1.5">
          {metrics.work.blocked > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400" title={`${metrics.work.blocked} blocked`}>
              <FaExclamationTriangle className="w-2.5 h-2.5" />{metrics.work.blocked}
            </span>
          )}
          <RiskBadge level={metrics.riskLevel} />
        </span>
      </div>
    </div>
  );
});

function ReleaseBoardView({ releases, metricsById, users, now, onOpen, canManage, onChangeStatus }) {
  const columns = useMemo(() => BOARD_COLUMNS.map((column) => ({
    ...column,
    items: releases.filter((release) => column.statuses.includes(release.status)),
  })), [releases]);
  const cancelled = useMemo(() => releases.filter((release) => release.status === "cancelled"), [releases]);
  const byId = useMemo(() => new Map(releases.map((release) => [release.id, release])), [releases]);

  const onDragEnd = useCallback((result) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const release = byId.get(draggableId);
    if (!release) return;
    onChangeStatus(release, destination.droppableId);
  }, [byId, onChangeStatus]);

  return (
    <div data-testid="release-board-view">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => (
            <Droppable key={column.id} droppableId={column.id} isDropDisabled={!canManage}>
              {(provided, snapshot) => (
                <section
                  aria-label={`${column.label} releases`}
                  className={`flex min-h-[220px] flex-col rounded-xl border p-2.5 transition-colors ${
                    snapshot.isDraggingOver
                      ? "border-blue-400/70 bg-blue-500/[0.05] dark:border-blue-500/50"
                      : "border-slate-200/80 bg-slate-500/[0.035] dark:border-[#252b3b] dark:bg-[#1a1f2e]"
                  }`}
                >
                  <header className="mb-2 flex items-center justify-between px-1">
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-slate-600">
                      <span className={`h-2 w-2 rounded-full ${STATUS_META[column.id].dot}`} aria-hidden="true" />
                      {column.label}
                    </span>
                    <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600">{column.items.length}</span>
                  </header>
                  <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-1 flex-col gap-2">
                    {column.items.map((release, index) => (
                      <Draggable key={release.id} draggableId={release.id} index={index} isDragDisabled={!canManage}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            aria-label={`${release.version} ${release.name || ""}${canManage ? " — press space to move" : ""}`}
                            data-testid={`release-card-${release.id}`}
                            onKeyDown={(event) => {
                              dragProvided.dragHandleProps?.onKeyDown?.(event);
                              if (event.key === "Enter" && !event.defaultPrevented) onOpen(release.id);
                            }}
                            className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                          >
                            <BoardCard
                              release={release}
                              metrics={metricsById.get(release.id)}
                              users={users}
                              now={now}
                              onOpen={onOpen}
                              dragging={dragSnapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {column.items.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300/70 p-4 text-xs text-slate-500 dark:border-[#2a3044]">
                        {canManage ? "Drop a release here" : "No releases"}
                      </div>
                    )}
                  </div>
                </section>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
      {cancelled.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <FaBan className="w-3 h-3" />
          <span>Cancelled:</span>
          {cancelled.map((release) => (
            <button key={release.id} type="button" onClick={() => onOpen(release.id)} className="rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50">
              <VersionBadge version={release.version} status={release.status} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default memo(ReleaseBoardView);
