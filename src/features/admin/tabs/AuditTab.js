import React, { useMemo, useState } from "react";
import { FaDownload, FaShieldAlt, FaStream } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { AppBadge, AppButton, AppDataCard, AppEmptyState, AppInput, AppSelect } from "../../../shared/components/AppPrimitives";

const PAGE_SIZE = 50;
const RANGE_MS = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};
// Shared stream cap in useActivityActions (task activity + audit events).
const ACTIVITY_LOG_CAP = 200;

function formatActionLabel(action) {
  return String(action || "event")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function entryScope(entry) {
  return entry.scope || "task";
}

function entryTime(entry) {
  const time = Date.parse(entry.timestamp || "");
  return Number.isNaN(time) ? null : time;
}

function severityTone(severity) {
  if (severity === "critical") return "red";
  if (severity === "warning") return "amber";
  return "neutral";
}

function csvCell(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function filterAuditEntries(log, { scope = "audit", severity = "all", actor = "all", range = "all", query = "", now = Date.now() } = {}) {
  const q = query.trim().toLowerCase();
  return (log || [])
    .filter((entry) => {
      const s = entryScope(entry);
      if (scope === "audit") return s === "security" || s === "workspace";
      return scope === "all" || s === scope;
    })
    .filter((entry) => severity === "all" || (entry.severity || "info") === severity)
    .filter((entry) => actor === "all" || (entry.user || "Unknown") === actor)
    .filter((entry) => {
      if (range === "all") return true;
      const time = entryTime(entry);
      return time !== null && now - time <= RANGE_MS[range];
    })
    .filter((entry) => {
      if (!q) return true;
      return [
        entry.action,
        formatActionLabel(entry.action),
        entry.user,
        entry.entityType,
        entry.details?.name,
        entry.details?.entityType,
        entry.details?.email,
        entry.details?.nextRole,
        entry.details?.reason,
      ].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
    });
}

export function AuditTab() {
  const { globalActivityLog } = useApp();
  const [scope, setScope] = useState("audit");
  const [severity, setSeverity] = useState("all");
  const [actor, setActor] = useState("all");
  const [range, setRange] = useState("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const log = useMemo(() => globalActivityLog || [], [globalActivityLog]);

  const actors = useMemo(
    () => [...new Set(log.map((entry) => entry.user || "Unknown"))].sort((a, b) => a.localeCompare(b)),
    [log]
  );

  const matches = useMemo(
    () => filterAuditEntries(log, { scope, severity, actor, range, query }),
    [actor, log, query, range, scope, severity]
  );
  const entries = matches.slice(0, visibleCount);

  const securityCount = log.filter((entry) => entry.scope === "security").length;
  const workspaceCount = log.filter((entry) => entry.scope === "workspace").length;
  const warningCount = log.filter((entry) => entry.severity === "warning" || entry.severity === "critical").length;
  const oldest = log.length ? entryTime(log[log.length - 1]) : null;

  const updateFilter = (setter) => (event) => {
    setter(event.target.value);
    setVisibleCount(PAGE_SIZE);
  };

  const exportCsv = () => {
    const header = ["timestamp", "scope", "severity", "action", "user", "entityType", "target", "email", "previousRole", "nextRole", "reason"];
    const rows = matches.map((entry) => [
      entry.timestamp,
      entryScope(entry),
      entry.severity || "info",
      entry.action,
      entry.user,
      entry.entityType || entry.details?.entityType,
      entry.details?.name,
      entry.details?.email,
      entry.details?.previousRole,
      entry.details?.nextRole,
      entry.details?.reason,
    ].map(csvCell).join(","));
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <AppDataCard className="p-5">
          <div className="app-kicker mb-2">Security Visibility</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{securityCount}</div>
          <div className="mt-1 text-sm app-subtle-copy">Security and role-sensitive events captured in the current audit stream.</div>
        </AppDataCard>
        <AppDataCard className="p-5">
          <div className="app-kicker mb-2">Workspace Changes</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{workspaceCount}</div>
          <div className="mt-1 text-sm app-subtle-copy">Template, project and workspace configuration changes available for review.</div>
        </AppDataCard>
        <AppDataCard className="p-5">
          <div className="app-kicker mb-2">Warnings</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{warningCount}</div>
          <div className="mt-1 text-sm app-subtle-copy">Role changes, deletions and other events flagged as warning or critical.</div>
        </AppDataCard>
      </div>

      <AppDataCard className="p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="app-kicker mb-2">Audit Log</div>
              <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">Review security and workspace changes</h4>
              <p className="mt-2 text-sm app-subtle-copy">
                The stream is shared with task activity and keeps the latest {ACTIVITY_LOG_CAP} events
                {oldest ? ` (oldest kept: ${new Date(oldest).toLocaleString()})` : ""}. Actor names are recorded by the client.
              </p>
            </div>
            <AppButton variant="secondary" onClick={exportCsv} disabled={matches.length === 0}>
              <FaDownload className="w-3 h-3" /> Export CSV
            </AppButton>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label htmlFor="audit-scope" className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Scope</label>
              <AppSelect id="audit-scope" value={scope} onChange={updateFilter(setScope)}>
                <option value="audit">Audit events (security + workspace)</option>
                <option value="all">All events</option>
                <option value="security">Security</option>
                <option value="workspace">Workspace</option>
                <option value="task">Task activity</option>
              </AppSelect>
            </div>
            <div>
              <label htmlFor="audit-severity" className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Severity</label>
              <AppSelect id="audit-severity" value={severity} onChange={updateFilter(setSeverity)}>
                <option value="all">Any severity</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </AppSelect>
            </div>
            <div>
              <label htmlFor="audit-actor" className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Actor</label>
              <AppSelect id="audit-actor" value={actor} onChange={updateFilter(setActor)}>
                <option value="all">Anyone</option>
                {actors.map((name) => <option key={name} value={name}>{name}</option>)}
              </AppSelect>
            </div>
            <div>
              <label htmlFor="audit-range" className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Time range</label>
              <AppSelect id="audit-range" value={range} onChange={updateFilter(setRange)}>
                <option value="all">All time</option>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </AppSelect>
            </div>
            <div>
              <label htmlFor="audit-search" className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Search</label>
              <AppInput id="audit-search" value={query} onChange={updateFilter(setQuery)} placeholder="Action, user, email, reason..." />
            </div>
          </div>
          <div className="text-xs app-subtle-copy">{matches.length} matching event{matches.length === 1 ? "" : "s"}</div>
        </div>

        <div className="mt-4 space-y-3">
          {entries.length === 0 ? (
            <AppEmptyState
              icon={<FaStream className="w-6 h-6" />}
              title="No audit events match this view"
              description="Permission changes, workspace settings updates and sensitive operations will appear here."
              className="shadow-none"
            />
          ) : entries.map((entry) => {
            const time = entryTime(entry);
            const details = entry.details || {};
            return (
              <div key={entry.id} data-testid="audit-entry" className="rounded-2xl border border-slate-200 dark:border-[#2a3044] bg-slate-50/70 dark:bg-[#151a27] px-4 py-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <AppBadge tone={entry.scope === "security" ? "red" : entry.scope === "workspace" ? "blue" : "neutral"}>
                        {entryScope(entry)}
                      </AppBadge>
                      <div className="font-medium text-slate-700 dark:text-slate-200">{formatActionLabel(entry.action)}</div>
                    </div>
                    <div className="mt-2 text-sm app-subtle-copy">
                      {entry.user || "Unknown"} · {time !== null ? new Date(time).toLocaleString() : "Unknown time"}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      {details.name && <span>Target: {details.name}</span>}
                      {details.email && <span>Email: {details.email}</span>}
                      {(entry.entityType || details.entityType) && <span>Entity: {entry.entityType || details.entityType}</span>}
                      {details.nextRole && (
                        <span>Role: {details.previousRole ? `${details.previousRole} → ` : ""}{details.nextRole}</span>
                      )}
                      {Array.isArray(details.changedSections) && details.changedSections.length > 0 && (
                        <span>Changed: {details.changedSections.join(", ")}</span>
                      )}
                      {details.reason && <span className="italic">Reason: “{details.reason}”</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <FaShieldAlt className="h-3.5 w-3.5" />
                    <AppBadge tone={severityTone(entry.severity)}>{entry.severity || "info"}</AppBadge>
                  </div>
                </div>
              </div>
            );
          })}
          {matches.length > entries.length && (
            <div className="flex justify-center pt-1">
              <AppButton variant="secondary" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                Show more ({matches.length - entries.length} remaining)
              </AppButton>
            </div>
          )}
        </div>
      </AppDataCard>
    </div>
  );
}
