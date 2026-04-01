import React, { useEffect, useState } from "react";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { FaKey, FaLock, FaSpinner, FaShieldAlt } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { db } from "../../../shared/services/firebase";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import {
  E2E_AUTH_USERS_KEY,
  isE2EMode,
  readE2EAuthUsers,
  subscribeE2EKey,
  updateE2EAuthUserRole,
} from "../../../shared/e2e/testMode";

const ROLE_META = {
  admin: { label: "Admin", color: "text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" },
  member: { label: "Member", color: "text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" },
  viewer: { label: "Viewer", color: "text-slate-500 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700" },
};

export function AccessTab({ currentUid }) {
  const { users, updateUser, logAuditEvent } = useApp();
  const { addToast } = useToast();
  const { canPerform, sensitiveActionPolicy } = usePermissions();
  const [firebaseUsers, setFirebaseUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const e2eMode = isE2EMode();

  useEffect(() => {
    let cancelled = false;

    if (e2eMode) {
      const applyUsers = () => {
        if (cancelled) return;
        setFirebaseUsers(readE2EAuthUsers());
        setLoading(false);
      };

      applyUsers();
      const unsubscribe = subscribeE2EKey(E2E_AUTH_USERS_KEY, applyUsers);

      return () => {
        cancelled = true;
        unsubscribe();
      };
    }

    async function loadUsers() {
      setLoading(true);
      const snap = await getDocs(collection(db, "users"));
      if (!cancelled) {
        setFirebaseUsers(snap.docs.map((snapshot) => ({ uid: snapshot.id, ...snapshot.data() })));
        setLoading(false);
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [e2eMode]);

  const handleRoleChange = async (uid, newRole) => {
    if (!canPerform("role:manage")) {
      addToast("You do not have permission to change roles.", "error");
      return;
    }
    if (sensitiveActionPolicy?.protectRoleChanges !== false) {
      const confirmed = window.confirm(`Apply ${newRole} role to this user? This change is audited and will take effect on next login.`);
      if (!confirmed) return;
    }
    setUpdating(uid);
    const targetUser = firebaseUsers.find((entry) => entry.uid === uid);
    if (e2eMode) {
      updateE2EAuthUserRole(uid, newRole);
    } else {
      await updateDoc(doc(db, "users", uid), { role: newRole });
    }
    setFirebaseUsers((prev) => prev.map((user) => (
      user.uid === uid ? { ...user, role: newRole } : user
    )));
    const appUser = users.find((user) => user.id === uid);
    if (appUser) {
      updateUser({ ...appUser, role: newRole });
    }
    logAuditEvent?.("role_changed", {
      entityType: "user",
      entityId: uid,
      name: appUser?.name || targetUser?.email,
      email: targetUser?.email,
      nextRole: newRole,
      severity: "warning",
      scope: "security",
    });
    setUpdating(null);
  };

  if (loading) {
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
          <div>
            <div className="font-medium">Role changes are security-sensitive</div>
            <div className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
              Updates are written to the audit stream and take effect on the user&apos;s next login.
            </div>
          </div>
        </div>
      </div>
      {firebaseUsers.map((user) => {
        const isSelf = user.uid === currentUid;
        const isUpdating = updating === user.uid;
        const meta = ROLE_META[user.role] || ROLE_META.member;

        return (
          <div
            key={user.uid}
            className="flex items-center gap-4 px-5 py-4 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl"
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
                  value={user.role || "member"}
                  onChange={(event) => handleRoleChange(user.uid, event.target.value)}
                  disabled={!!updating || !canPerform("role:manage")}
                  data-testid={`access-role-toggle-${user.uid}`}
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
