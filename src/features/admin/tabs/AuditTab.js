import React, { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query as firestoreQuery } from "firebase/firestore";
import { FaShieldAlt, FaStream } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { AppBadge, AppDataCard, AppEmptyState, AppInput, AppSelect } from "../../../shared/components/AppPrimitives";
import { db } from "../../../shared/services/firebase";
import { isE2EMode } from "../../../shared/e2e/testMode";

function formatActionLabel(action) {
  return String(action || "event")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeServerEvent(snapshot) {
  const data = snapshot.data();
  const type = data.type || "event";
  const payload = data.payload || {};
  const timestamp = typeof data.createdAt?.toDate === "function"
    ? data.createdAt.toDate().toISOString()
    : data.createdAt;
  const scope = type.startsWith("user.") || type.startsWith("approval.")
    ? "security"
    : "workspace";

  return {
    id: snapshot.id,
    action: type.replace(/\./g, "_"),
    user: payload.actorEmail || payload.actorUid || "System",
    timestamp: timestamp || new Date(0).toISOString(),
    details: {
      ...payload,
      name: payload.targetName || payload.name,
      email: payload.targetEmail || payload.email,
      entityType: type.startsWith("user.") ? "user" : payload.entityType,
    },
    severity: scope === "security" ? "warning" : "info",
    scope,
  };
}

export function AuditTab() {
  const { globalActivityLog } = useApp();
  const [scope, setScope] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [serverEntries, setServerEntries] = useState([]);
  const [auditError, setAuditError] = useState("");
  const e2eMode = isE2EMode();

  useEffect(() => {
    if (e2eMode) return undefined;
    const auditQuery = firestoreQuery(
      collection(db, "auditLogs"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    return onSnapshot(auditQuery, (snapshot) => {
      setServerEntries(snapshot.docs.map(normalizeServerEvent));
      setAuditError("");
    }, (error) => {
      console.warn("[AuditTab] Audit stream failed:", error.code || error.message);
      setAuditError("The server audit stream could not be loaded.");
    });
  }, [e2eMode]);

  const sourceEntries = useMemo(
    () => (e2eMode ? (globalActivityLog || []) : serverEntries),
    [e2eMode, globalActivityLog, serverEntries]
  );

  const entries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sourceEntries
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
  }, [searchQuery, scope, sourceEntries]);

  const securityCount = sourceEntries.filter((entry) => entry.scope === "security").length;
  const workspaceCount = sourceEntries.filter((entry) => entry.scope === "workspace").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <AppDataCard className="p-5">
          <div className="app-kicker mb-2">Security Visibility</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{securityCount}</div>
          <div className="mt-1 text-sm app-subtle-copy">Server-recorded role and account events that clients cannot alter.</div>
        </AppDataCard>
        <AppDataCard className="p-5">
          <div className="app-kicker mb-2">Workspace Changes</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{workspaceCount}</div>
          <div className="mt-1 text-sm app-subtle-copy">Server-recorded workspace resets and protected operations.</div>
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
              <AppInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Filter by action, user, email..." />
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {auditError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/10 dark:text-red-300">
              {auditError}
            </div>
          )}
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
