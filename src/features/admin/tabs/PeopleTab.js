import React, { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import {
  FaBriefcase,
  FaChevronDown,
  FaEdit,
  FaEnvelope,
  FaExternalLinkAlt,
  FaGlobe,
  FaPlus,
  FaSearch,
  FaSpinner,
  FaTimes,
  FaTrash,
  FaUserCircle,
} from "react-icons/fa";
import { taskKey } from "../../../shared/utils/helpers";
import { useApp } from "../../../shared/context/AppContext";
import { db } from "../../../shared/services/firebase";
import { isE2EMode, readE2EAuthUsers } from "../../../shared/e2e/testMode";

const TASK_STATUS_STYLES = {
  todo: "bg-slate-100 text-slate-500 dark:bg-[#2a3044] dark:text-slate-400",
  inprogress: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  review: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  done: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
  blocked: "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400",
  awaiting: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-500",
};

const TASK_STATUS_LABELS = {
  todo: "To Do",
  inprogress: "In Progress",
  review: "Review",
  done: "Done",
  blocked: "Blocked",
  awaiting: "Awaiting",
};

const PRI_DOT = { critical: "#ef4444", high: "#f97316", medium: "#3b82f6", low: "#94a3b8" };
const PEOPLE_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function dedupUsers(list, deletedUserIds) {
  const deletedSet = new Set(deletedUserIds || []);
  const seen = new Set();
  return list.filter((user) => {
    if (user.email?.endsWith("@corechestra.io")) return false;
    if (deletedSet.has(user.id)) return false;
    const key = user.id || user.email;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function UserProfileModal({ user, onClose, roles }) {
  const { allTasks } = useApp();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const e2eMode = isE2EMode();

  useEffect(() => {
    if (!user) return undefined;

    if (e2eMode) {
      setProfile({
        fullName: user.name,
        name: user.name,
        title: user.role,
        timezone: "Europe/Istanbul",
      });
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    getDoc(doc(db, "users", user.id))
      .then((snapshot) => {
        if (!cancelled) {
          setProfile(snapshot.exists() ? snapshot.data() : {});
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfile({});
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [e2eMode, user]);

  if (!user) return null;

  const myTasks = allTasks.filter((task) => task.assignedTo === user.username);
  const done = myTasks.filter((task) => task.status === "done").length;
  const inProgress = myTasks.filter((task) => task.status === "inprogress").length;
  const points = myTasks.reduce((sum, task) => sum + (task.storyPoint || 0), 0);
  const roleInfo = roles.find((role) => role.value === user.role);
  const displayName = profile?.fullName || profile?.name || user.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-[#1c2030] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a3044] w-full max-w-md overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="h-20 w-full" style={{ background: `linear-gradient(135deg, ${user.color || "#6366f1"}33, ${user.color || "#6366f1"}11)` }} />

        <div className="absolute top-3 right-3">
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/80 dark:bg-[#1c2030]/80 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <FaTimes className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="absolute top-9 left-6">
          <div
            className="w-20 h-20 rounded-full border-4 border-white dark:border-[#1c2030] flex items-center justify-center text-white text-2xl font-bold shadow-lg uppercase"
            style={{ backgroundColor: user.color || "#6366f1" }}
          >
            {displayName?.[0] || "?"}
          </div>
        </div>

        <div className="pt-14 px-6 pb-6">
          {loading ? (
            <div className="flex justify-center py-8"><FaSpinner className="w-5 h-5 text-blue-500 animate-spin" /></div>
          ) : (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{displayName}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">@{user.username}</span>
                  {roleInfo && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: roleInfo.color + "20", color: roleInfo.color }}>
                      {roleInfo.label}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.status === "active"
                      ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-slate-100 text-slate-400 dark:bg-[#2a3044] dark:text-slate-500"
                  }`}>{user.status}</span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <FaEnvelope className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  {user.email}
                </div>
                {(profile?.title || profile?.fullName) && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <FaBriefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    {profile.title || "—"}
                  </div>
                )}
                {profile?.timezone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <FaGlobe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    {profile.timezone}
                  </div>
                )}
                {profile?.bio && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 italic mt-2 border-t border-slate-100 dark:border-[#2a3044] pt-2">
                    "{profile.bio}"
                  </p>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#161b27] border border-slate-100 dark:border-[#2a3044]">
                {[
                  { label: "Assigned", value: myTasks.length, color: "text-blue-600" },
                  { label: "Progress", value: inProgress, color: "text-yellow-600" },
                  { label: "Done", value: done, color: "text-green-600" },
                  { label: "Points", value: points, color: "text-purple-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <div className={`text-lg font-bold ${color}`}>{value}</div>
                    <div className="text-[10px] text-slate-400">{label}</div>
                  </div>
                ))}
              </div>

              {user.joinedAt && <p className="text-xs text-slate-400 mt-3 text-right">Joined {user.joinedAt}</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function PeopleTab({
  users,
  teams,
  updateTeam,
  updateUser,
  createUser,
  deleteUser,
  projects,
  updateProject,
  SectionCard,
  DeleteConfirm,
  UserForm,
  roles,
}) {
  const { allTasks, setActiveTasks, setBacklogSections, deletedUserIds } = useApp();
  const e2eMode = isE2EMode();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [addTeamFor, setAddTeamFor] = useState(null);
  const [addProjectFor, setAddProjectFor] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [taskSearch, setTaskSearch] = useState("");
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [mergedUsers, setMergedUsers] = useState(() => dedupUsers(users, deletedUserIds));

  useEffect(() => {
    if (e2eMode) {
      const deletedSet = new Set(deletedUserIds || []);
      const authUsers = readE2EAuthUsers()
        .filter((user) => !deletedSet.has(user.uid))
        .map((user) => ({
          id: user.uid,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role || "member",
          status: "active",
          color: mergedUsers.find((entry) => entry.id === user.uid)?.color || PEOPLE_COLORS[user.uid.charCodeAt(0) % PEOPLE_COLORS.length],
        }));

      setMergedUsers(dedupUsers([...users, ...authUsers], deletedUserIds));
      return undefined;
    }

    let cancelled = false;

    getDocs(collection(db, "users")).then((snapshot) => {
      if (cancelled) return;
      const deletedSet = new Set(deletedUserIds || []);
      const fbUsers = snapshot.docs
        .map((docSnapshot) => ({ uid: docSnapshot.id, ...docSnapshot.data() }))
        .filter((fb) => !fb.deleted && !deletedSet.has(fb.uid) && !fb.email?.endsWith("@corechestra.io"));

      const base = dedupUsers(users, deletedUserIds);
      const result = [...base];

      fbUsers.forEach((fb) => {
        const exists = result.some((user) => user.id === fb.uid || user.email === fb.email);
        if (!exists) {
          const prefix = fb.email?.split("@")[0] || "user";
          const fbName = fb.fullName || fb.name;
          const name = fbName || (prefix.charAt(0).toUpperCase() + prefix.slice(1));
          const color = PEOPLE_COLORS[fb.uid.charCodeAt(0) % PEOPLE_COLORS.length];
          result.push({ id: fb.uid, name, username: prefix, email: fb.email || "", color, status: "active", role: fb.role || "member", joinedAt: "" });
        } else {
          const fbName = fb.fullName || fb.name;
          if (fbName) {
            const index = result.findIndex((user) => user.id === fb.uid || user.email === fb.email);
            if (index !== -1 && result[index].name !== fbName) {
              result[index] = { ...result[index], name: fbName };
            }
          }
        }
      });

      setMergedUsers(result);
    }).catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [deletedUserIds, e2eMode, refreshTick, users]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setMergedUsers((prev) => {
      const base = dedupUsers(users, deletedUserIds);
      const extras = prev.filter((user) => !base.some((baseUser) => baseUser.id === user.id || baseUser.email === user.email));
      return [...base, ...extras];
    });
  }, [users, deletedUserIds]);

  const filtered = mergedUsers.filter((user) => {
    const query = search.toLowerCase();
    const matchSearch = !query
      || user.name.toLowerCase().includes(query)
      || user.email.toLowerCase().includes(query)
      || user.username.toLowerCase().includes(query);
    const matchRole = filterRole === "all" || user.role === filterRole;
    const matchStatus = filterStatus === "all" || user.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const getUserTeams = (username) => teams.filter((team) => (team.memberNames || []).includes(username));
  const getAvailableTeams = (username) => teams.filter((team) => !(team.memberNames || []).includes(username));
  const getUserProjects = (username) => (projects || []).filter((project) => (project.memberUsernames || []).includes(username));
  const getAvailableProjects = (username) => (projects || []).filter((project) => !(project.memberUsernames || []).includes(username));

  const addToProject = (projectId, username) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    updateProject({ ...project, memberUsernames: [...(project.memberUsernames || []), username] });
    setAddProjectFor(null);
  };

  const removeFromProject = (projectId, username) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;
    updateProject({ ...project, memberUsernames: (project.memberUsernames || []).filter((name) => name !== username) });
  };

  const tasksByUser = useMemo(() => {
    const map = {};
    for (const task of allTasks) {
      const key = task.assignedTo || "unassigned";
      if (!map[key]) map[key] = [];
      map[key].push(task);
    }
    return map;
  }, [allTasks]);

  const getUserTasks = (username) => tasksByUser[username] || [];

  const addToTeam = (teamId, username) => {
    const team = teams.find((item) => item.id === teamId);
    if (!team) return;
    updateTeam({ ...team, memberNames: [...(team.memberNames || []), username] });
    setAddTeamFor(null);
  };

  const removeFromTeam = (teamId, username) => {
    const team = teams.find((item) => item.id === teamId);
    if (!team) return;
    updateTeam({ ...team, memberNames: (team.memberNames || []).filter((name) => name !== username) });
  };

  const assignTask = (taskId, username) => {
    const updateTasks = (tasks) => tasks.map((task) => (
      task.id === taskId ? { ...task, assignedTo: username } : task
    ));
    setActiveTasks((prev) => updateTasks(prev));
    setBacklogSections((prev) => prev.map((section) => ({ ...section, tasks: updateTasks(section.tasks) })));
  };

  const unassignTask = (taskId) => assignTask(taskId, "unassigned");

  const toggleExpand = (userId) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
    setTaskSearch("");
  };

  const expandedUser = mergedUsers.find((user) => user.id === expandedUserId);
  const assignableTasks = useMemo(() => {
    if (!expandedUser) return [];
    const query = taskSearch.toLowerCase();
    if (!query) {
      return allTasks.filter((task) => !task.assignedTo || task.assignedTo === "unassigned").slice(0, 8);
    }
    return allTasks
      .filter((task) => task.assignedTo !== expandedUser.username && (
        task.title?.toLowerCase().includes(query) || `cy-${task.id}`.includes(query)
      ))
      .slice(0, 8);
  }, [allTasks, expandedUser, taskSearch]);

  return (
    <div className="space-y-4">
      {selectedProfileUser && (
        <UserProfileModal user={selectedProfileUser} onClose={() => setSelectedProfileUser(null)} roles={roles} />
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-slate-400"
            placeholder="Search by name, email or username…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select value={filterRole} onChange={(event) => setFilterRole(event.target.value)} className="text-sm border border-slate-200 dark:border-[#2a3044] rounded-lg px-3 py-2 bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-200 focus:outline-none">
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="viewer">Viewer</option>
        </select>
        <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)} className="text-sm border border-slate-200 dark:border-[#2a3044] rounded-lg px-3 py-2 bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-200 focus:outline-none">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto flex-shrink-0">{filtered.length} / {mergedUsers.length} people</span>
        <button onClick={() => setRefreshTick((tick) => tick + 1)} title="Refresh people list" className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex-shrink-0">
          <FaSpinner className="w-3.5 h-3.5" />
        </button>
      </div>

      {showUserForm && !editingUser && <UserForm onSave={(data) => { createUser(data); setShowUserForm(false); }} onCancel={() => setShowUserForm(false)} />}
      {editingUser && <UserForm initial={editingUser} onSave={(data) => { updateUser({ ...editingUser, ...data }); setEditingUser(null); }} onCancel={() => setEditingUser(null)} />}

      {!showUserForm && !editingUser && (
        <button
          onClick={() => setShowUserForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 rounded-xl hover:border-blue-300 hover:text-blue-500 text-sm font-medium w-full justify-center transition-colors"
        >
          <FaPlus className="w-3.5 h-3.5" /> Invite New User
        </button>
      )}

      <div className="grid gap-3">
        {filtered.map((user) => {
          const userTeams = getUserTeams(user.username);
          const availableTeams = getAvailableTeams(user.username);
          const userProjects = getUserProjects(user.username);
          const availableProjects = getAvailableProjects(user.username);
          const roleInfo = roles.find((role) => role.value === user.role);
          const isDropOpen = addTeamFor === user.id;
          const isProjDropOpen = addProjectFor === user.id;
          const isExpanded = expandedUserId === user.id;
          const userTasks = getUserTasks(user.username);
          const assignable = isExpanded ? assignableTasks : [];

          return (
            <SectionCard key={user.id} className="hover:border-slate-300 dark:hover:border-[#3a4055] transition-colors">
              <div className="flex items-start gap-4 p-4">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: user.color || "#3b82f6" }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{user.name}</span>
                    <span className="text-xs text-slate-400 font-mono">@{user.username}</span>
                    {roleInfo && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: roleInfo.color + "20", color: roleInfo.color }}>
                        {roleInfo.label}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      user.status === "active"
                        ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-slate-100 text-slate-400 dark:bg-[#2a3044] dark:text-slate-500"
                    }`}>
                      {user.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2.5">
                    <FaEnvelope className="w-2.5 h-2.5 flex-shrink-0" />
                    {user.email}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {userTeams.length === 0 && <span className="text-xs text-slate-400 dark:text-slate-500 italic">No teams</span>}
                    {userTeams.map((team) => (
                      <span key={team.id} className="group flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-all" style={{ backgroundColor: team.color + "15", borderColor: team.color + "50", color: team.color }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                        {team.name}
                        <button className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-red-500 transition-all leading-none" onClick={() => removeFromTeam(team.id, user.username)} title={`Remove from ${team.name}`}>
                          <FaTimes className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}

                    {availableTeams.length > 0 && (
                      <div className="relative">
                        <button onClick={() => setAddTeamFor(isDropOpen ? null : user.id)} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-300 dark:border-[#2a3044] text-slate-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors">
                          <FaPlus className="w-2 h-2" /> Add to team
                        </button>
                        {isDropOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setAddTeamFor(null)} />
                            <div className="absolute bottom-full left-0 mb-1.5 z-20 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-xl overflow-hidden min-w-48">
                              <div className="px-3 py-2 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-[#232838] border-b border-slate-100 dark:border-[#2a3044]">Add to team</div>
                              {availableTeams.map((team) => (
                                <button key={team.id} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors border-b border-slate-50 dark:border-[#2a3044] last:border-0" onClick={() => addToTeam(team.id, user.username)}>
                                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                                  <span className="flex-1 text-left truncate font-medium">{team.name}</span>
                                  <span className="text-xs text-slate-400">{(team.memberNames || []).length} members</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {userProjects.length === 0 && <span className="text-xs text-slate-400 dark:text-slate-500 italic">No projects</span>}
                    {userProjects.map((project) => (
                      <span key={project.id} className="group flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-all" style={{ backgroundColor: project.color + "15", borderColor: project.color + "50", color: project.color }}>
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                        {project.name}
                        <button className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-red-500 transition-all leading-none" onClick={() => removeFromProject(project.id, user.username)} title={`Remove from ${project.name}`}>
                          <FaTimes className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                    {availableProjects.length > 0 && (
                      <div className="relative">
                        <button onClick={() => setAddProjectFor(isProjDropOpen ? null : user.id)} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-300 dark:border-[#2a3044] text-slate-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors">
                          <FaPlus className="w-2 h-2" /> Add to project
                        </button>
                        {isProjDropOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setAddProjectFor(null)} />
                            <div className="absolute bottom-full left-0 mb-1.5 z-20 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-xl overflow-hidden min-w-48">
                              <div className="px-3 py-2 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-[#232838] border-b border-slate-100 dark:border-[#2a3044]">Add to project</div>
                              {availableProjects.map((project) => (
                                <button key={project.id} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors border-b border-slate-50 dark:border-[#2a3044] last:border-0" onClick={() => addToProject(project.id, user.username)}>
                                  <span className="w-3 h-3 rounded-lg flex-shrink-0" style={{ backgroundColor: project.color }} />
                                  <span className="flex-1 text-left truncate font-medium">{project.name}</span>
                                  <span className="text-[10px] font-mono text-slate-400">{project.key}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {user.joinedAt && (
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide">Joined</div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-300">{user.joinedAt}</div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedProfileUser(user)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="View profile">
                      <FaExternalLinkAlt className="w-3 h-3" />
                    </button>
                    <button onClick={() => { setEditingUser(user); setShowUserForm(false); }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Edit user">
                      <FaEdit className="w-3.5 h-3.5" />
                    </button>
                    {deletingUserId === user.id ? (
                      <DeleteConfirm
                        label="Remove?"
                        onConfirm={() => {
                          deleteUser(user.id);
                          updateDoc(doc(db, "users", user.id), { deleted: true }).catch(() => deleteDoc(doc(db, "users", user.id)).catch(() => {}));
                          setDeletingUserId(null);
                        }}
                        onCancel={() => setDeletingUserId(null)}
                      />
                    ) : (
                      <button onClick={() => setDeletingUserId(user.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Delete user">
                        <FaTrash className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => toggleExpand(user.id)} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      isExpanded
                        ? "border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                        : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-blue-300 hover:text-blue-500"
                    }`}>
                      {userTasks.length > 0 ? <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-bold">{userTasks.length}</span> : null}
                      Tasks
                      <FaChevronDown className={`w-2.5 h-2.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                    <button onClick={() => updateUser({ ...user, status: user.status === "active" ? "inactive" : "active" })} className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      user.status === "active"
                        ? "border-slate-200 dark:border-[#2a3044] text-slate-400 hover:border-red-300 hover:text-red-500 dark:hover:border-red-700 dark:hover:text-red-400"
                        : "border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                    }`}>
                      {user.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-[#2a3044] px-4 py-3 bg-slate-50/60 dark:bg-[#161b27]">
                  <div className="mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Assigned tasks ({userTasks.length})</div>
                    {userTasks.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No tasks assigned</p>
                    ) : (
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                        {userTasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-2 bg-white dark:bg-[#1c2030] border border-slate-100 dark:border-[#2a3044] rounded-lg px-2.5 py-1.5">
                            {PRI_DOT[task.priority] && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: PRI_DOT[task.priority] }} />}
                            <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">{taskKey(task.id)}</span>
                            <span className="flex-1 text-xs text-slate-700 dark:text-slate-200 truncate min-w-0">{task.title}</span>
                            {task.status && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${TASK_STATUS_STYLES[task.status] || ""}`}>{TASK_STATUS_LABELS[task.status] || task.status}</span>}
                            <button onClick={() => unassignTask(task.id)} className="flex-shrink-0 text-slate-300 hover:text-red-400 dark:text-slate-600 dark:hover:text-red-400 transition-colors ml-1" title="Unassign">
                              <FaTimes className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Assign task</div>
                    <div className="relative mb-2">
                      <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                      <input
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-400"
                        placeholder="Search tasks… (empty = show unassigned)"
                        value={taskSearch}
                        onChange={(event) => setTaskSearch(event.target.value)}
                      />
                    </div>
                    {assignable.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No tasks found</p>
                    ) : (
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                        {assignable.map((task) => (
                          <div key={task.id} className="flex items-center gap-2 bg-white dark:bg-[#1c2030] border border-slate-100 dark:border-[#2a3044] rounded-lg px-2.5 py-1.5">
                            {PRI_DOT[task.priority] && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: PRI_DOT[task.priority] }} />}
                            <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">{taskKey(task.id)}</span>
                            <span className="flex-1 text-xs text-slate-700 dark:text-slate-200 truncate min-w-0">{task.title}</span>
                            {task.assignedTo && task.assignedTo !== "unassigned" && <span className="text-[10px] text-slate-400 flex-shrink-0 italic truncate max-w-16">@{task.assignedTo}</span>}
                            {task.status && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${TASK_STATUS_STYLES[task.status] || ""}`}>{TASK_STATUS_LABELS[task.status] || task.status}</span>}
                            <button onClick={() => assignTask(task.id, user.username)} className="flex-shrink-0 flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-medium transition-colors ml-1" title="Assign to this user">
                              <FaPlus className="w-2 h-2" /> Assign
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </SectionCard>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <FaUserCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">No people found</p>
            <p className="text-xs mt-1 opacity-70">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
