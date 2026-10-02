import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaKey, FaLock, FaSpinner, FaShieldAlt, FaSyncAlt } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import {
  E2E_AUTH_USERS_KEY,
  isE2EMode,
  subscribeE2EKey,
} from "../../../shared/e2e/testMode";
import {
  getSensitiveAuditMeta,
  isValidRole,
  runSensitiveActionGate,
} from "../../../shared/constants/permissions";
import {
  countActiveAdmins,
  isAccountDeleted,
  isAccountDisabled,
  listAccounts,
  setAccountRole,
} from "../services/userAccounts";

const ROLE_META = {
  admin: { label: "Admin", color: "text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" },
  member: { label: "Member", color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" },
  viewer: { label: "Viewer", color: "text-slate-500 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700" },
};

export function AccessTab({ currentUid }) {
  const { users, updateUser, logAuditEvent } = useApp();
  const { addToast } = useToast();
  const { canPerform, sensitiveActionPolicy } = usePermissions();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updating, setUpdating] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const e2eMode = isE2EMode();
  const canManageRoles = canPerform("role:manage");

  // Stable reference so the loader does not re-run whenever the toast function identity changes.
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  const loadAccounts = useCallback(async (isCancelled = () => false) => {
    setLoading(true);
    setLoadError("");
    try {
      const list = await listAccounts();
      if (!isCancelled()) setAccounts(list || []);
    } catch (err) {
      console.warn("[AccessTab] Failed to load Firebase users:", err?.code || err?.message);
      if (!isCancelled()) {
        setAccounts([]);
        setLoadError("Could not load sign-in accounts. Check Firestore permissions and try again.");
        addToastRef.current?.("Could not load Firebase users. Check Firestore permissions.", "error");
      }
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    loadAccounts(isCancelled);
    const unsubscribe = e2eMode
      ? subscribeE2EKey(E2E_AUTH_USERS_KEY, () => loadAccounts(isCancelled))
      : null;
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [e2eMode, loadAccounts, refreshTick]);

  // Soft-deleted accounts are hidden; they cannot sign in anymore.
  const visibleAccounts = useMemo(
    () => accounts.filter((account) => !isAccountDeleted(account)),
    [accounts]
  );
  const activeAdmins = useMemo(() => countActiveAdmins(visibleAccounts), [visibleAccounts]);

  const handleRoleChange = async (uid, newRole) => {
    if (!canManageRoles) {
      addToast("You do not have permission to change roles.", "error");
      return;
    }
    if (!isValidRole(newRole)) {
      addToast(`"${newRole}" is not a valid role.`, "error");
      return;
    }
    if (uid === currentUid) {
      addToast("You cannot change your own role.", "error");
      return;
    }
    const targetAccount = accounts.find((entry) => entry.uid === uid);
    if (!targetAccount || targetAccount.role === newRole) return;
    if (
      targetAccount.role === "admin"
      && newRole !== "admin"
      && !isAccountDisabled(targetAccount)
      && activeAdmins <= 1
    ) {
      addToast("This is the last active admin. Promote another admin first.", "error");
      return;
    }

    const gate = runSensitiveActionGate(
      sensitiveActionPolicy,
      "role",
      `Apply ${newRole} role to ${targetAccount.email || "this user"}? This change is audited and takes effect immediately.`
    );
    if (!gate.ok) {
      if (gate.missingReason) addToast("A reason is required for role changes.", "warning");
      return;
    }

    setUpdating(uid);
    try {
      await setAccountRole(uid, newRole);
      setAccounts((prev) => prev.map((account) => (
        account.uid === uid ? { ...account, role: newRole } : account
      )));
      // Keep the product People record in sync with the effective role.
      const appUser = users.find((user) => user.id === uid)
        || (targetAccount.email ? users.find((user) => user.email === targetAccount.email) : null);
      if (appUser) {
        updateUser({ ...appUser, role: newRole });
      }
      logAuditEvent?.("role_changed", {
        entityType: "user",
        entityId: uid,
        name: appUser?.name || targetAccount.email,
        email: targetAccount.email,
        previousRole: targetAccount.role || "member",
        nextRole: newRole,
        ...(gate.reason ? { reason: gate.reason } : {}),
        ...getSensitiveAuditMeta(sensitiveActionPolicy, "role"),
      });
      addToast(`${targetAccount.email || "User"} is now ${ROLE_META[newRole].label}.`, "success");
    } catch (err) {
      console.warn("[AccessTab] Role change failed:", err?.code || err?.message);
      addToast(`Could not change role: ${err?.message || "unknown error"}`, "error");
    } finally {
      setUpdating(null);
    }
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <FaSpinner className="w-5 h-5 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
        <div className="flex items-start gap-2">
          <FaShieldAlt className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium">Role changes are security-sensitive</div>
            <div className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
              Updates are written to the audit stream and take effect immediately in active sessions.
              The last active admin cannot be demoted.
            </div>
          </div>
          <button
            onClick={() => setRefreshTick((tick) => tick + 1)}
            className="p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30"
            title="Reload accounts"
            aria-label="Reload accounts"
          >
            <FaSyncAlt className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-400">
          {loadError}
        </div>
      )}

      {!loadError && visibleAccounts.length === 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] px-4 py-6 text-center text-sm text-slate-400">
          No sign-in accounts found.
        </div>
      )}

      {visibleAccounts.map((user) => {
        const isSelf = user.uid === currentUid;
        const isUpdating = updating === user.uid;
        const disabled = isAccountDisabled(user);
        const meta = ROLE_META[user.role] || ROLE_META.member;
        const isLastAdmin = user.role === "admin" && !disabled && activeAdmins <= 1;

        return (
          <div
            key={user.uid}
            data-testid={`access-row-${user.uid}`}
            className="flex flex-wrap items-center gap-4 px-5 py-4 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 uppercase">
              {user.email?.[0] || "?"}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                {user.email}
                {isSelf && <span className="ml-2 text-[10px] text-slate-400">(you)</span>}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate mt-0.5">{user.uid}</p>
            </div>

            {disabled && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border text-slate-500 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-[#232838] dark:border-[#2a3044]">
                Deactivated
              </span>
            )}

            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${meta.color}`}>
              {meta.label}
            </span>

            {isSelf ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 px-3 py-1.5" title="Cannot change your own role">
                <FaLock className="w-3 h-3" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  value={isValidRole(user.role) ? user.role : "member"}
                  onChange={(event) => handleRoleChange(user.uid, event.target.value)}
                  disabled={!!updating || !canManageRoles}
                  data-testid={`access-role-toggle-${user.uid}`}
                  title={isLastAdmin ? "Last active admin — promote another admin before demoting" : undefined}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-[#2a3044] dark:bg-[#1c2030] dark:text-slate-300"
                >
                  {Object.entries(ROLE_META).map(([value, item]) => (
                    <option key={value} value={value}>{item.label}</option>
                  ))}
                </select>
                {isUpdating && <FaSpinner className="w-3 h-3 animate-spin text-slate-400" />}
                {!isUpdating && <FaKey className="w-3 h-3 text-slate-400" />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
