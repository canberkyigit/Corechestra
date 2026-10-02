import React, { memo } from "react";
import { FaUsers } from "react-icons/fa";
import { getLoadTone } from "../../utils/planningMetrics";
import { Avatar, EmptyState, LOAD_TONE_BAR, LOAD_TONE_TEXT, PanelHeader, PlanningCard } from "./PlanningPrimitives";

const LOAD_LABEL = { ok: "On track", near: "Near limit", over: "Overloaded", idle: "No work" };

function MemberRow({ row, users, canEdit, onCapacityChange }) {
  const { member, pct, capacity, assigned, items } = row;
  const name = member.name || member.id;
  const tone = getLoadTone(assigned, capacity);
  const width = capacity > 0 ? Math.min(100, (assigned / capacity) * 100) : assigned > 0 ? 100 : 0;

  return (
    <li className="space-y-1.5 rounded-lg px-2 py-2 hover:bg-slate-50 dark:hover:bg-[#1f2433]">
      <div className="flex items-center gap-2">
        <Avatar name={name} colorKey={member.username || member.id} users={users} color={member.color} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">{name}</p>
          <p className={`text-[10px] font-medium ${LOAD_TONE_TEXT[tone]}`} title={`${items} item${items !== 1 ? "s" : ""} assigned`}>
            {LOAD_LABEL[tone]}
          </p>
        </div>
        <span className="text-right text-[11px] tabular-nums text-slate-500 dark:text-slate-400" title="Assigned / capacity">
          <span className={`font-semibold ${LOAD_TONE_TEXT[tone]}`}>{assigned}</span>
          {" / "}
          {capacity} SP
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-[#232838]" aria-hidden="true">
        <div className={`h-full rounded-full transition-all duration-300 ${LOAD_TONE_BAR[tone]}`} style={{ width: `${width}%` }} />
      </div>
      <div className="flex items-center gap-2">
        <span className="w-14 text-[10px] text-slate-400 dark:text-slate-500">Availability</span>
        <input
          type="range"
          aria-label={`${name} capacity`}
          min={0}
          max={100}
          step={10}
          value={pct}
          disabled={!canEdit}
          onChange={(event) => onCapacityChange(member.id, event.target.value)}
          className="h-1 flex-1 cursor-pointer accent-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <span className="w-8 text-right text-[10px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">{pct}%</span>
      </div>
    </li>
  );
}

function TeamCapacityPanel({ load, capacitySP, users, canEdit, onCapacityChange, onReset }) {
  const { rows, unassignedSP, unassignedItems, otherSP } = load;

  return (
    <PlanningCard className="flex flex-col overflow-hidden" aria-label="Team capacity">
      <PanelHeader
        icon={FaUsers}
        title="Team capacity"
        meta={rows.length ? `${rows.length} people` : null}
        actions={canEdit && rows.length > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-md px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-[#232838] dark:hover:text-slate-200"
          >
            Reset to 100%
          </button>
        )}
      />

      {rows.length === 0 ? (
        <EmptyState icon={FaUsers} title="No team members" hint="Add people to this project to plan capacity." />
      ) : (
        <ul className="max-h-[420px] space-y-0.5 overflow-y-auto px-2 py-2">
          {rows.map((row) => (
            <MemberRow key={row.member.id} row={row} users={users} canEdit={canEdit} onCapacityChange={onCapacityChange} />
          ))}
        </ul>
      )}

      <dl className="space-y-1 border-t border-slate-200 px-4 py-3 text-xs dark:border-[#252b3b]">
        {unassignedItems > 0 && (
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <dt>Unassigned work</dt>
            <dd className="font-semibold tabular-nums">{unassignedSP} SP · {unassignedItems} item{unassignedItems !== 1 ? "s" : ""}</dd>
          </div>
        )}
        {otherSP > 0 && (
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <dt>Assigned outside team</dt>
            <dd className="font-semibold tabular-nums">{otherSP} SP</dd>
          </div>
        )}
        <div className="flex items-center justify-between">
          <dt className="text-slate-500 dark:text-slate-400">Total capacity</dt>
          <dd className="text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400" data-testid="planning-total-capacity">{capacitySP} SP</dd>
        </div>
      </dl>
    </PlanningCard>
  );
}

export default memo(TeamCapacityPanel);
