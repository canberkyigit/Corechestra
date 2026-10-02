import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../../../shared/context/AppContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import {
  ACTION_PERMISSION_META,
  MODULE_PERMISSION_META,
} from "../../../shared/constants/permissions";
import {
  FaUserCircle, FaEdit, FaCheck, FaBell, FaLock, FaShieldAlt,
  FaSignOutAlt, FaClock, FaEnvelope, FaGoogle, FaKey, FaLifeRing,
} from "react-icons/fa";

const AVATAR_COLORS = [
  "#6366f1", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2",
];

// Categories consumed by useNotificationActions (notificationPreferences.inApp[category]).
export const NOTIF_SETTINGS = [
  { id: "assignments", label: "Assignments",        desc: "When a task is assigned to you"                    },
  { id: "mentions",    label: "Mentions",           desc: "When someone @mentions you"                        },
  { id: "comments",    label: "Comments",           desc: "New comments on tasks and pages"                   },
  { id: "workflow",    label: "Workflow & approvals", desc: "Approvals and workflow transitions"              },
  { id: "releases",    label: "Releases",           desc: "Release status changes"                            },
  { id: "reminders",   label: "Reminders",          desc: "Due date and follow-up reminders"                  },
  { id: "system",      label: "Workspace updates",  desc: "Status changes, sprints, projects and other events" },
];

function buildForm(profile, email, role, defaultName) {
  return {
    name:     profile?.name     || defaultName,
    fullName: profile?.fullName || "",
    email:    email             || "",
    role:     role ? role.charAt(0).toUpperCase() + role.slice(1) : "",
    title:    profile?.title    || "",
    timezone: profile?.timezone || "",
    bio:      profile?.bio      || "",
  };
}

function Field({ label, field, type = "text", form, setForm, editMode, readOnly = false }) {
  const id = `profile-${field}`;
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      {editMode && !readOnly ? (
        type === "textarea" ? (
          <textarea
            id={id}
            value={form[field]}
            onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        ) : (
          <input
            id={id}
            type={type}
            value={form[field]}
            onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        )
      ) : (
        <p className="text-sm text-slate-700 dark:text-slate-200 py-2">
          {form[field] || <span className="text-slate-400 dark:text-slate-500">—</span>}
        </p>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const {
    activeTasks, users, updateUser, globalActivityLog,
    notificationPreferences, setNotificationPreferences, workspaceSettings,
  } = useApp();
  const { user, role, profile, logout, updateProfile, sendPasswordReset } = useAuth();
  const { rolePermissions } = usePermissions();

  // Current user's app record (synced from Firebase on login)
  const appUser = users.find((u) => u.id === user?.uid || u.email === user?.email);

  // Derive display info from Firebase email
  const emailPrefix = user?.email?.split("@")[0] || "";

  // Filter activity log to this user's actions (last 20)
  const myActivity = useMemo(() =>
    (globalActivityLog || []).filter(e => e.user === emailPrefix).slice(0, 20),
    [globalActivityLog, emailPrefix]
  );
  const defaultName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);

  const [editMode,     setEditMode]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [saveError,    setSaveError]    = useState("");
  const [avatarColor,  setAvatarColor]  = useState(profile?.color || appUser?.color || AVATAR_COLORS[0]);
  const [pwResetState, setPwResetState] = useState("idle"); // idle | sending | sent | error
  const [pwResetError, setPwResetError] = useState("");

  const [form, setForm] = useState(() => buildForm(profile, user?.email, role, defaultName));

  // Keep the read-only view in sync with the live profile (e.g. updated from another tab
  // or after the profile snapshot arrives); never clobber an edit in progress.
  useEffect(() => {
    if (editMode) return;
    setForm(buildForm(profile, user?.email, role, defaultName));
    setAvatarColor(profile?.color || appUser?.color || AVATAR_COLORS[0]);
  }, [profile, user?.email, role, defaultName, appUser?.color, editMode]);

  const startEdit = () => {
    setSaveError("");
    setEditMode(true);
  };

  const cancelEdit = () => {
    setForm(buildForm(profile, user?.email, role, defaultName));
    setAvatarColor(profile?.color || appUser?.color || AVATAR_COLORS[0]);
    setSaveError("");
    setEditMode(false);
  };

  const handleSave = async () => {
    if (saving) return;
    const fields = {
      name: form.name.trim() || defaultName,
      fullName: form.fullName.trim(),
      title: form.title.trim(),
      timezone: form.timezone.trim(),
      bio: form.bio,
      color: avatarColor,
    };
    setSaving(true);
    setSaveError("");
    try {
      // Personal profile (users/{uid}) — private fields stay here.
      await updateProfile(fields);
      // Only identity fields shown elsewhere in the product are mirrored to the shared People list.
      if (appUser) {
        const displayName = fields.fullName || fields.name;
        if (appUser.name !== displayName || appUser.color !== fields.color) {
          updateUser({ ...appUser, name: displayName, color: fields.color });
        }
      }
      setSaved(true);
      setEditMode(false);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.warn("[ProfilePage] Failed to save profile:", err?.code || err?.message);
      setSaveError("Could not save your profile. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const inAppPrefs = notificationPreferences?.inApp || {};
  const toggleNotif = (id) => {
    setNotificationPreferences((prev) => ({
      ...(prev || {}),
      inApp: {
        ...(prev?.inApp || {}),
        [id]: (prev?.inApp?.[id]) === false,
      },
    }));
  };

  const handlePasswordReset = async () => {
    if (!user?.email || pwResetState === "sending") return;
    setPwResetState("sending");
    setPwResetError("");
    try {
      await sendPasswordReset(user.email);
      setPwResetState("sent");
      setTimeout(() => setPwResetState("idle"), 5000);
    } catch (err) {
      console.warn("[ProfilePage] Password reset failed:", err?.code || err?.message);
      setPwResetError(err?.code === "auth/too-many-requests"
        ? "Too many requests. Try again later."
        : "Could not send the reset email. Try again later.");
      setPwResetState("error");
    }
  };

  // Sprint stats based on current user's username
  const myTasks       = activeTasks.filter((t) => t.assignedTo === emailPrefix);
  const doneTasks     = myTasks.filter((t) => t.status === "done").length;
  const inProgress    = myTasks.filter((t) => t.status === "inprogress").length;
  const storyPoints   = myTasks.reduce((s, t) => s + (t.storyPoint || 0), 0);

  const allowedModules = MODULE_PERMISSION_META.filter((item) => rolePermissions?.modules?.[item.key]);
  const allowedActions = ACTION_PERMISSION_META.filter((item) => rolePermissions?.actions?.[item.key]);
  const isGoogle = user?.providerData?.[0]?.providerId === "google.com";
  const supportEmail = workspaceSettings?.supportEmail;

  const fieldProps = { form, setForm, editMode };

  return (
    <div className="h-full p-4 md:p-6 max-w-5xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FaUserCircle className="w-5 h-5 text-blue-500" />
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Profile</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500">Manage your account and preferences</p>
        </div>
        {saved && (
          <div className="ml-auto flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800">
            <FaCheck className="w-3.5 h-3.5" />
            Changes saved
          </div>
        )}
      </div>

      {saveError && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-4">

          {/* Avatar card */}
          <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 shadow-md uppercase"
              style={{ backgroundColor: avatarColor }}
            >
              {(form.fullName || form.name || user?.email || "?")[0]}
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200">{form.fullName || form.name || user?.email}</h3>
            {form.title && <p className="text-sm text-slate-500 dark:text-slate-400">{form.title}</p>}
            <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
              {form.role || "Member"}
            </span>

            {/* Avatar color picker (part of the edit form) */}
            {editMode && (
            <div className="mt-4">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Avatar color</p>
              <div className="flex justify-center gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Avatar color ${c}`}
                    aria-pressed={avatarColor === c}
                    onClick={() => setAvatarColor(c)}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: avatarColor === c ? "#fff" : c, outline: avatarColor === c ? `2px solid ${c}` : "none", outlineOffset: 2 }}
                  />
                ))}
              </div>
            </div>
            )}
          </div>

          {/* Sprint stats */}
          <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Sprint Stats</h4>
            <div className="space-y-3">
              {[
                { label: "Assigned tasks", value: myTasks.length, color: "text-blue-600"   },
                { label: "In progress",    value: inProgress,     color: "text-yellow-600" },
                { label: "Completed",      value: doneTasks,      color: "text-green-600"  },
                { label: "Story points",   value: storyPoints,    color: "text-purple-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                  <span className={`text-sm font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Access */}
          <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <FaKey className="w-3.5 h-3.5 text-slate-400" />
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Your access</h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Role <span className="font-semibold text-slate-700 dark:text-slate-200">{form.role || "Viewer"}</span>. Roles are managed by workspace admins.
            </p>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Modules</div>
            <div className="flex flex-wrap gap-1 mb-3">
              {allowedModules.map((item) => (
                <span key={item.key} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#232838] text-slate-600 dark:text-slate-300">{item.label}</span>
              ))}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Actions</div>
            <div className="flex flex-wrap gap-1">
              {allowedActions.length === 0 && <span className="text-xs text-slate-400 dark:text-slate-500">Read-only</span>}
              {allowedActions.map((item) => (
                <span key={item.key} className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300">{item.label}</span>
              ))}
            </div>
          </div>

          {/* Sign out */}
          <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-red-100 dark:border-red-900/30 p-4 shadow-sm">
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 font-medium transition-colors"
            >
              <FaSignOutAlt className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-5">

          {/* Personal info */}
          <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FaUserCircle className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Personal Information</h3>
              </div>
              {!editMode ? (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
                >
                  <FaEdit className="w-3 h-3" /> Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    <FaCheck className="w-3 h-3" /> {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="px-3 py-1 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field {...fieldProps} label="Display Name" field="name"     />
              <Field {...fieldProps} label="Full Name"    field="fullName" />
              <Field {...fieldProps} label="Email"        field="email"    type="email" readOnly />
              <Field {...fieldProps} label="Job Title"    field="title"    />
              <Field {...fieldProps} label="Role"         field="role"     readOnly />
              <Field {...fieldProps} label="Timezone"     field="timezone" />
            </div>
            <div className="mt-4">
              <Field {...fieldProps} label="Bio" field="bio" type="textarea" />
            </div>
          </div>

          {/* Notification preferences */}
          <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <FaBell className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notification Preferences</h3>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
              Controls which events appear in the in-app inbox. Changes apply immediately (same settings as the For You page).
            </p>
            <div className="space-y-0">
              {NOTIF_SETTINGS.map((n, i) => (
                <div
                  key={n.id}
                  className={`flex items-center justify-between py-3 ${i < NOTIF_SETTINGS.length - 1 ? "border-b border-slate-100 dark:border-[#232838]" : ""}`}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{n.label}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{n.desc}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={inAppPrefs[n.id] !== false}
                    aria-label={n.label}
                    onClick={() => toggleNotif(n.id)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                      inAppPrefs[n.id] !== false ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${inAppPrefs[n.id] !== false ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <FaShieldAlt className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Security</h3>
            </div>
            <div className="space-y-3">
              {/* Auth provider */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-[#2a3044]">
                {isGoogle
                  ? <FaGoogle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  : <FaEnvelope className="w-4 h-4 text-slate-400 flex-shrink-0" />
                }
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Sign-in method</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {isGoogle ? "Google" : "Email / Password"}
                  </p>
                </div>
              </div>
              {/* Last sign-in */}
              {user?.metadata?.lastSignInTime && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-[#2a3044]">
                  <FaClock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Last sign-in</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(user.metadata.lastSignInTime).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {/* Change password (only for email/password accounts) */}
              {!isGoogle && (
                <button
                  onClick={handlePasswordReset}
                  disabled={pwResetState === "sending"}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-[#2a3044] hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors text-left disabled:opacity-60"
                >
                  <FaLock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Change Password</p>
                    <p className={`text-xs ${pwResetState === "error" ? "text-red-500 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}`}>
                      {pwResetState === "sent" && "Reset email sent — check your inbox"}
                      {pwResetState === "sending" && "Sending reset email..."}
                      {pwResetState === "error" && pwResetError}
                      {pwResetState === "idle" && "Send a password reset email"}
                    </p>
                  </div>
                  {pwResetState === "sent" && <FaCheck className="w-3.5 h-3.5 text-green-500 ml-auto" />}
                </button>
              )}
              {supportEmail && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-[#2a3044]">
                  <FaLifeRing className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Need help with your account?</p>
                    <a href={`mailto:${supportEmail}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">{supportEmail}</a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <FaClock className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent Activity</h3>
            </div>
            {myActivity.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">No recent activity</p>
            ) : (
              <div className="space-y-0">
                {myActivity.map((entry) => {
                  const task = activeTasks.find(t => t.id === entry.taskId);
                  const taskLabel = task?.title ? `"${task.title}"` : entry.taskId ? `#${entry.taskId}` : "";
                  const relTime = (() => {
                    try {
                      const d = new Date(entry.timestamp);
                      const s = Math.floor((Date.now() - d.getTime()) / 1000);
                      if (s < 60) return "just now";
                      if (s < 3600) return `${Math.floor(s / 60)}m ago`;
                      if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
                      return d.toLocaleDateString();
                    } catch { return ""; }
                  })();
                  return (
                    <div key={entry.id} className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
                      <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-[#232838] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FaClock className="w-2.5 h-2.5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 dark:text-slate-200 leading-snug">
                          <span className="capitalize">{entry.action}</span>
                          {taskLabel && <span className="text-slate-500 dark:text-slate-400"> · {taskLabel}</span>}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{relTime}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
