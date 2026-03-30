import React, { useState, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { auth } from "../services/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import {
  FaUserCircle, FaEdit, FaCheck, FaBell, FaLock, FaShieldAlt,
  FaSignOutAlt, FaClock, FaEnvelope, FaGoogle,
} from "react-icons/fa";

const AVATAR_COLORS = [
  "#6366f1", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2",
];

const NOTIF_SETTINGS = [
  { id: "task_assigned",  label: "Task assigned to me",   desc: "When someone assigns a task to you"     },
  { id: "task_comment",   label: "Comments on my tasks",  desc: "When someone comments on your tasks"    },
  { id: "task_mentioned", label: "Mentions",              desc: "When someone @mentions you"             },
  { id: "sprint_start",   label: "Sprint events",         desc: "Sprint start, complete, and updates"    },
  { id: "task_overdue",   label: "Due date reminders",    desc: "When your tasks are nearing due date"   },
];

function Field({ label, field, type = "text", form, setForm, editMode, readOnly = false }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      {editMode && !readOnly ? (
        type === "textarea" ? (
          <textarea
            value={form[field]}
            onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        ) : (
          <input
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
  const { activeTasks, users, updateUser, globalActivityLog } = useApp();
  const { user, role, profile, logout, updateProfile } = useAuth();

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
  const [saved,        setSaved]        = useState(false);
  const [avatarColor,  setAvatarColor]  = useState(appUser?.color || AVATAR_COLORS[0]);
  const [pwResetSent,  setPwResetSent]  = useState(false);

  // Sync avatar color when appUser loads (e.g. on first render before AppContext hydrates)
  useEffect(() => {
    if (appUser?.color) setAvatarColor(appUser.color);
  }, [appUser?.color]); // eslint-disable-line

  const [form, setForm] = useState({
    name:     profile?.name     || defaultName,
    fullName: profile?.fullName || "",
    email:    user?.email       || "",
    role:     role ? role.charAt(0).toUpperCase() + role.slice(1) : "",
    title:    profile?.title    || "",
    timezone: profile?.timezone || "",
    bio:      profile?.bio      || "",
  });

  const [notifPrefs, setNotifPrefs] = useState(
    profile?.notifPrefs ?? Object.fromEntries(NOTIF_SETTINGS.map((n) => [n.id, true]))
  );

  const handleSave = async () => {
    const fields = {
      name: form.name, fullName: form.fullName,
      title: form.title, timezone: form.timezone, bio: form.bio,
      color: avatarColor,
      notifPrefs,
    };
    // Persist to Firestore
    await updateProfile(fields);
    // Sync to AppContext People list (color + name visible everywhere)
    if (appUser) updateUser({ ...appUser, ...fields });
    setSaved(true);
    setEditMode(false);
    setTimeout(() => setSaved(false), 2500);
  };

  // Sprint stats based on current user's username
  const myTasks       = activeTasks.filter((t) => t.assignedTo === emailPrefix);
  const doneTasks     = myTasks.filter((t) => t.status === "done").length;
  const inProgress    = myTasks.filter((t) => t.status === "inprogress").length;
  const storyPoints   = myTasks.reduce((s, t) => s + (t.storyPoint || 0), 0);

  const fieldProps = { form, setForm, editMode };

  return (
    <div className="p-6 max-w-4xl mx-auto overflow-y-auto">
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

      <div className="grid grid-cols-3 gap-6">
        {/* Left column */}
        <div className="col-span-1 space-y-4">

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

            {/* Avatar color picker */}
            <div className="mt-4">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Avatar color</p>
              <div className="flex justify-center gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAvatarColor(c)}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: c, borderColor: avatarColor === c ? "#fff" : c, outline: avatarColor === c ? `2px solid ${c}` : "none", outlineOffset: 2 }}
                  />
                ))}
              </div>
            </div>
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
        <div className="col-span-2 space-y-5">

          {/* Personal info */}
          <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FaUserCircle className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Personal Information</h3>
              </div>
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
                >
                  <FaEdit className="w-3 h-3" /> Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FaCheck className="w-3 h-3" /> Save
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-3 py-1 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            <div className="flex items-center gap-2 mb-4">
              <FaBell className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notification Preferences</h3>
            </div>
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
                    onClick={() => setNotifPrefs((p) => ({ ...p, [n.id]: !p[n.id] }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${
                      notifPrefs[n.id] ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${notifPrefs[n.id] ? "translate-x-4" : "translate-x-0.5"}`} />
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
                {user?.providerData?.[0]?.providerId === "google.com"
                  ? <FaGoogle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  : <FaEnvelope className="w-4 h-4 text-slate-400 flex-shrink-0" />
                }
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Sign-in method</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {user?.providerData?.[0]?.providerId === "google.com" ? "Google" : "Email / Password"}
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
              {user?.providerData?.[0]?.providerId !== "google.com" && (
                <button
                  onClick={async () => {
                    if (!user?.email) return;
                    await sendPasswordResetEmail(auth, user.email);
                    setPwResetSent(true);
                    setTimeout(() => setPwResetSent(false), 5000);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-[#2a3044] hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors text-left"
                >
                  <FaLock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Change Password</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {pwResetSent ? "Reset email sent — check your inbox" : "Send a password reset email"}
                    </p>
                  </div>
                  {pwResetSent && <FaCheck className="w-3.5 h-3.5 text-green-500 ml-auto" />}
                </button>
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
