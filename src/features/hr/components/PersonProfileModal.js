import React from "react";
import { FaBriefcase, FaEnvelope, FaGlobe, FaUserFriends } from "react-icons/fa";
import { Avatar, Badge, InfoRow } from "./HRSharedUI";
import { HRModal, hrSecondaryButton } from "./HRModal";
import { getAllocationsForPerson, personTitle } from "../utils/people";
import { getDirectReports, getManagerChain } from "../utils/orgChart";
import { formatShortDate } from "../utils/dates";

/** Read-only People profile used by HR People, Org chart and Overview. */
export function PersonProfileModal({ person, users, projects, projectAllocations, onClose, onSelectPerson, absences }) {
  const open = !!person;
  const manager = person ? getManagerChain(users, person.id)[0] : null;
  const reports = person ? getDirectReports(users, person.id) : [];
  const allocations = getAllocationsForPerson(person, projectAllocations, projects);
  const totalAllocation = allocations.reduce((sum, item) => sum + (Number(item.allocation) || 0), 0);
  const upcomingAbsences = person
    ? (absences || [])
        .filter((absence) => absence.userId === person.id && absence.status !== "rejected" && absence.status !== "cancelled")
        .sort((a, b) => String(a.fromDate).localeCompare(String(b.fromDate)))
        .slice(0, 3)
    : [];

  const PersonButton = ({ target }) => (
    <button
      type="button"
      onClick={() => onSelectPerson?.(target)}
      className="flex items-center gap-2.5 w-full p-2 rounded-lg bg-slate-50 dark:bg-[#232838] hover:bg-slate-100 dark:hover:bg-[#2a3044] transition-colors text-left"
    >
      <Avatar name={target.name || target.email} color={target.color} size="sm" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 truncate">{target.name || target.email}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{personTitle(target)}</p>
      </div>
    </button>
  );

  return (
    <HRModal
      open={open}
      onClose={onClose}
      title={person ? `${person.name || person.email} — profile` : ""}
      subtitle="People record (workspace directory)"
      size="lg"
      footer={<button type="button" onClick={onClose} className={hrSecondaryButton}>Close</button>}
    >
      {person && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Avatar name={person.name || person.email} color={person.color} size="lg" />
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate">{person.name || person.email}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{personTitle(person)}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {person.role && <Badge color="blue">{person.role}</Badge>}
                <Badge color={person.status === "inactive" ? "slate" : "green"}>{person.status || "active"}</Badge>
              </div>
            </div>
          </div>

          <div>
            <InfoRow label={<span className="inline-flex items-center gap-1.5"><FaEnvelope className="w-3 h-3" /> Email</span>} value={person.email || "—"} />
            <InfoRow label={<span className="inline-flex items-center gap-1.5"><FaGlobe className="w-3 h-3" /> Country</span>} value={person.country ? `${person.flag || ""} ${person.country}`.trim() : "—"} />
            <InfoRow label="Department" value={person.department || "—"} />
            <InfoRow label="Joined" value={person.joinedAt ? formatShortDate(person.joinedAt) : "—"} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Reports to</p>
              {manager ? <PersonButton target={manager} /> : <p className="text-xs text-slate-400 dark:text-slate-500">No manager set</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1">
                <FaUserFriends className="w-3 h-3" /> Direct reports ({reports.length})
              </p>
              {reports.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">None</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {reports.map((report) => <PersonButton key={report.id} target={report} />)}
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-1.5 flex items-center gap-1">
              <FaBriefcase className="w-3 h-3" /> Projects · {totalAllocation}% allocated
            </p>
            {allocations.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">Not allocated to any project</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {allocations.map((allocation) => {
                  const project = (projects || []).find((item) => item.id === allocation.projectId);
                  return (
                    <span key={allocation.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                      {project?.name || allocation.projectId} • {allocation.allocation}%{allocation.role ? ` • ${allocation.role}` : ""}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {upcomingAbsences.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-1.5">Time off</p>
              <div className="space-y-1">
                {upcomingAbsences.map((absence) => (
                  <p key={absence.requestId} className="text-xs text-slate-600 dark:text-slate-300">
                    {absence.typeName || absence.type}: {absence.fromDate} → {absence.toDate}
                    {absence.status === "pending" && <span className="ml-1 text-amber-600 dark:text-amber-400">(pending)</span>}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </HRModal>
  );
}
