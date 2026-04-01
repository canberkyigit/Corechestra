import React, { useMemo, useState } from "react";
import { FaShieldAlt, FaStream } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { AppBadge, AppDataCard, AppEmptyState, AppInput, AppSelect } from "../../../shared/components/AppPrimitives";

function formatActionLabel(action) {
  return String(action || "event")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function AuditTab() {
  const { globalActivityLog } = useApp();
  const [scope, setScope] = useState("all");
  const [query, setQuery] = useState("");

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (globalActivityLog || [])
      .filter((entry) => scope === "all" || (entry.scope || "task") === scope)
      .filter((entry) => {
        if (!q) return true;
        return [
          entry.action,
          entry.user,
          entry.details?.name,
          entry.details?.entityType,
          entry.details?.email,
        ].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
      })
      .slice(0, 80);
  }, [globalActivityLog, query, scope]);

  const securityCount = (globalActivityLog || []).filter((entry) => entry.scope === "security").length;
  const workspaceCount = (globalActivityLog || []).filter((entry) => entry.scope === "workspace").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>

      <AppDataCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="app-kicker mb-2">Audit Log</div>
            <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">Review security and workspace changes</h4>
            <p className="mt-2 text-sm app-subtle-copy">This stream helps admins understand who changed access, workspace configuration and other sensitive controls.</p>
          </div>
          <div className="flex gap-3">
            <div className="min-w-[180px]">
              <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Scope</label>
              <AppSelect value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="all">All events</option>
                <option value="security">Security</option>
                <option value="workspace">Workspace</option>
                <option value="task">Task activity</option>
              </AppSelect>
            </div>
            <div className="min-w-[240px]">
              <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Search</label>
              <AppInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by action, user, email..." />
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {entries.length === 0 ? (
            <AppEmptyState
              icon={<FaStream className="w-6 h-6" />}
              title="No audit events match this view"
              description="Permission changes, workspace settings updates and sensitive operations will appear here."
              className="shadow-none"
            />
          ) : entries.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-slate-200 dark:border-[#2a3044] bg-slate-50/70 dark:bg-[#151a27] px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <AppBadge tone={entry.scope === "security" ? "red" : entry.scope === "workspace" ? "blue" : "neutral"}>
                      {entry.scope || "task"}
                    </AppBadge>
                    <div className="font-medium text-slate-700 dark:text-slate-200">{formatActionLabel(entry.action)}</div>
                  </div>
                  <div className="mt-2 text-sm app-subtle-copy">
                    {entry.user || "Unknown"} · {new Date(entry.timestamp).toLocaleString()}
                  </div>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {entry.details?.name && <span className="mr-3">Target: {entry.details.name}</span>}
                    {entry.details?.email && <span className="mr-3">Email: {entry.details.email}</span>}
                    {entry.details?.entityType && <span>Entity: {entry.details.entityType}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <FaShieldAlt className="h-3.5 w-3.5" />
                  {entry.severity && <span className="text-xs uppercase tracking-wide">{entry.severity}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </AppDataCard>
    </div>
  );
}
