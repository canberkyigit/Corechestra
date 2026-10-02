import React, { useState, useMemo } from "react";
import { useApp } from "../../../shared/context/AppContext";
import { useAuth } from "../../../shared/context/AuthContext";
import {
  FaShieldAlt, FaUsers, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes,
  FaProjectDiagram, FaUserPlus, FaFolder, FaPalette,
  FaUserFriends, FaKey, FaCog, FaStream,
} from "react-icons/fa";
import { AccessTab } from "../tabs/AccessTab";
import { AuditTab } from "../tabs/AuditTab";
import { PeopleTab, dedupUsers } from "../tabs/PeopleTab";
import { WorkspaceTab } from "../tabs/WorkspaceTab";
import { AppButton, AppEmptyState } from "../../../shared/components/AppPrimitives";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { requiresConfirmation } from "../../../shared/constants/permissions";
import { useConfirm } from "../../../shared/context/ConfirmContext";
import { PanelSkeleton } from "../../../shared/components/Skeleton";
import { useToast } from "../../../shared/context/ToastContext";

// ─── Constants ────────────────────────────────────────────────────────────────


const PALETTE = [
  "#2563eb","#7c3aed","#059669","#d97706","#dc2626",
  "#0891b2","#6366f1","#db2777","#ea580c","#16a34a",
];

const ROLES = [
  { value: "admin",  label: "Admin",  desc: "Full access, manage settings",   color: "#ef4444" },
  { value: "member", label: "Member", desc: "Create and edit tasks",           color: "#3b82f6" },
  { value: "viewer", label: "Viewer", desc: "Read-only access",                color: "#94a3b8" },
];


// ─── Shared UI ────────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PALETTE.map((c) => (
        <button key={c} onClick={() => onChange(c)}
          className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
          style={{ backgroundColor: c, borderColor: value === c ? "#fff" : c,
            outline: value === c ? `2px solid ${c}` : "none", outlineOffset: 2 }} />
      ))}
    </div>
  );
}

/** Inline confirm with labelled, finger-sized buttons (used in People rows). */
function DeleteConfirm({ label, onConfirm, onCancel, confirmLabel = "Remove" }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg pl-2.5 pr-1 py-1">
      <span className="text-xs text-red-600 dark:text-red-400">{label}</span>
      <button type="button" onClick={onConfirm} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
        <FaCheck className="w-2.5 h-2.5" aria-hidden="true" /> {confirmLabel}
      </button>
      <button type="button" onClick={onCancel} autoFocus className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
        <FaTimes className="w-2.5 h-2.5" aria-hidden="true" /> Cancel
      </button>
    </div>
  );
}

function SectionCard({ children, className = "" }) {
  return (
    <div className={`app-surface ${className}`}>
      {children}
    </div>
  );
}

function ReadOnlyNotice({ children }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#1a1f2e] px-4 py-2.5 text-xs text-slate-500 dark:text-slate-400">
      {children}
    </div>
  );
}

function FormCard({ title, children }) {
  return (
    <div className="app-surface p-5 space-y-4 border-blue-200/80 dark:border-blue-900/50">
      <div className="app-kicker">Admin Form</div>
      <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h4>
      {children}
    </div>
  );
}

// ─── Project Form & Card ───────────────────────────────────────────────────────

function ProjectForm({ initial, onSave, onCancel }) {
  const [name,  setName]  = useState(initial?.name  || "");
  const [key,   setKey]   = useState(initial?.key   || "");
  const [color, setColor] = useState(initial?.color || PALETTE[0]);
  const [desc,  setDesc]  = useState(initial?.description || "");
  const derivedKey = key || name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);

  return (
    <FormCard title={initial?.id ? "Edit Project" : "Create New Project"}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Project Name *</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mobile App"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Key <span className="text-slate-400">(auto)</span></label>
          <input value={key} onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,6))}
            placeholder={derivedKey || "KEY"}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] text-sm font-mono uppercase text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <p className="text-[10px] text-slate-400 mt-0.5">Prefix: {derivedKey || "KEY"}-42</p>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description..."
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2"><FaPalette className="inline w-3 h-3 mr-1" />Color</label>
        <div className="flex items-center gap-3">
          <ColorPicker value={color} onChange={setColor} />
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow" style={{ backgroundColor: color }}>
            {derivedKey?.slice(0,2) || "P"}
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <AppButton onClick={() => { if(!name.trim()) return; onSave({ name:name.trim(), key:derivedKey||"PRJ", color, description:desc }); }}
          disabled={!name.trim()}>
          <FaCheck className="w-3 h-3" /> {initial?.id ? "Save" : "Create Project"}
        </AppButton>
        <AppButton variant="secondary" onClick={onCancel}>Cancel</AppButton>
      </div>
    </FormCard>
  );
}

function ProjectCard({ project, teams, onEdit, onDelete, isOnly, canManage = true, confirmDelete = true }) {
  const { users, activeTasks } = useApp();
  const confirm = useConfirm();
  const handleDelete = async () => {
    if (confirmDelete) {
      const taskCount = (activeTasks || []).filter((task) => task.projectId === project.id).length;
      const ok = await confirm({
        title: `Delete project "${project.name}"?`,
        description: `It disappears for everyone. Its ${taskCount} sprint task${taskCount === 1 ? "" : "s"}, backlog and sprints are kept and the project can be restored from the Archive.`,
        confirmLabel: "Delete project",
        requireText: project.name,
      });
      if (!ok) return;
    }
    onDelete();
  };
  const assigned = teams.filter((t) => (t.projectIds||[]).includes(project.id));
  const members = new Set([
    ...assigned.flatMap((t) => t.memberNames||[]),
    ...(project.memberUsernames||[]),
  ]);
  return (
    <SectionCard className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-sm" style={{ backgroundColor: project.color }}>{project.key}</div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">{project.name}</h3>
            <p className="text-xs font-mono text-slate-400 dark:text-slate-500">Key: {project.key}</p>
            {project.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{project.description}</p>}
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={onEdit} aria-label={`Edit project ${project.name}`} title="Edit project" className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><FaEdit className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={handleDelete} disabled={isOnly} aria-label={`Delete project ${project.name}`} title={isOnly ? "Cannot delete the last project" : "Delete project"} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"><FaTrash className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Teams ({assigned.length})</p>
          {assigned.length > 0
            ? <div className="space-y-1">{assigned.map((t) => <div key={t.id} className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} /><span className="text-sm text-slate-600 dark:text-slate-300">{t.name}</span></div>)}</div>
            : <p className="text-xs text-slate-400">No teams assigned</p>}
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Members ({members.size})</p>
          <div className="flex gap-1.5 flex-wrap">
            {[...members].map((m) => { const u = users?.find((x) => x.username === m); const color = u?.color || "#94a3b8"; const label = u?.name || m; return <div key={m} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: color }} title={label}>{(label?.[0] || "?").toUpperCase()}</div>; })}
            {members.size === 0 && <p className="text-xs text-slate-400">No members</p>}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Team Form & Card ─────────────────────────────────────────────────────────

function TeamForm({ initial, projects, onSave, onCancel }) {
  const { users } = useApp();
  const [name, setName] = useState(initial?.name || "");
  const [desc, setDesc] = useState(initial?.description || "");
  const [color, setColor] = useState(initial?.color || PALETTE[0]);
  const [members, setMembers] = useState(initial?.memberNames || []);
  const [projIds, setProjIds] = useState(initial?.projectIds || []);
  const toggle = (arr, set, val) => set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  return (
    <FormCard title={initial?.id ? "Edit Team" : "Create New Team"}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Team Name *</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Frontend Team"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Team focus area..."
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>
      <div><label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Color</label><ColorPicker value={color} onChange={setColor} /></div>
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Members</label>
        <div className="flex gap-2 flex-wrap">
          {(users || []).filter((u) => u.status === "active").map((u) => (
            <button key={u.username} onClick={() => toggle(members, setMembers, u.username)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${members.includes(u.username) ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "border-slate-200 dark:border-[#2a3044] text-slate-600 dark:text-slate-400"}`}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: u.color }}>{u.name?.[0] || "?"}</div>
              {u.name} {members.includes(u.username) && <FaCheck className="w-2.5 h-2.5" />}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Projects</label>
        <div className="flex gap-2 flex-wrap">
          {projects.map((p) => (
            <button key={p.id} onClick={() => toggle(projIds, setProjIds, p.id)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${projIds.includes(p.id) ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "border-slate-200 dark:border-[#2a3044] text-slate-600 dark:text-slate-400"}`}>
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />{p.name}
              {projIds.includes(p.id) && <FaCheck className="w-2.5 h-2.5" />}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <AppButton onClick={() => { if(!name.trim()) return; onSave({ name:name.trim(), description:desc, color, memberNames:members, projectIds:projIds }); }}
          disabled={!name.trim()}>
          <FaCheck className="w-3 h-3" /> {initial?.id ? "Save" : "Create Team"}
        </AppButton>
        <AppButton variant="secondary" onClick={onCancel}>Cancel</AppButton>
      </div>
    </FormCard>
  );
}

function TeamCard({ team, projects, users, onEdit, onDelete, onUpdateTeam, canManage = true, confirmDelete = true }) {
  const confirm = useConfirm();
  const { addToast } = useToast();
  const handleDelete = async () => {
    if (confirmDelete) {
      const ok = await confirm({
        title: `Delete team "${team.name}"?`,
        description: `${(team.memberNames || []).length} member(s) lose this team. People and projects are not deleted.`,
        confirmLabel: "Delete team",
      });
      if (!ok) return;
    }
    onDelete();
  };
  const [addingUser,  setAddingUser]  = useState(false);
  const [userSearch,  setUserSearch]  = useState("");

  const assigned = projects.filter((p) => (team.projectIds||[]).includes(p.id));
  const members  = useMemo(() => team.memberNames || [], [team.memberNames]);

  const resolveUser = (username) =>
    users?.find((u) => u.username === username) ||
    { name: username, color: "#94a3b8" };

  const nonMembers = useMemo(() => {
    if (!addingUser) return [];
    const q = userSearch.toLowerCase();
    return (users || []).filter(
      (u) => !members.includes(u.username) &&
      (!q || (u.name || "").toLowerCase().includes(q) || (u.username || "").toLowerCase().includes(q))
    );
  }, [users, members, userSearch, addingUser]);

  const removeMember = (username) => {
    const previous = team;
    onUpdateTeam?.({ ...team, memberNames: members.filter((m) => m !== username) });
    addToast(`${resolveUser(username).name || username} removed from ${team.name}`, "info", {
      action: { label: "Undo", onClick: () => onUpdateTeam?.(previous) },
    });
  };

  const addMember = (username) => {
    onUpdateTeam?.({ ...team, memberNames: [...members, username] });
    setAddingUser(false);
    setUserSearch("");
  };

  return (
    <SectionCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ backgroundColor: team.color }}>{team.name?.[0] || "T"}</div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">{team.name}</h3>
            {team.description && <p className="text-xs text-slate-400 mt-0.5">{team.description}</p>}
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={onEdit} aria-label={`Edit team ${team.name}`} title="Edit team" className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><FaEdit className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={handleDelete} aria-label={`Delete team ${team.name}`} title="Delete team" className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"><FaTrash className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Members — inline add/remove */}
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            Members ({members.length})
          </p>
          <div className="flex gap-1.5 flex-wrap items-center">
            {members.map((m) => {
              const u = resolveUser(m);
              return u ? (
                <div key={m}
                  className="group flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-[#232838] border border-slate-100 dark:border-[#2a3044]">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ backgroundColor: u.color || "#3b82f6" }}>
                    {(u.label || u.name || "?")[0].toUpperCase()}
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-300 capitalize">{u.label || u.name}</span>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => removeMember(m)}
                      className="opacity-60 sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 ml-0.5 p-0.5 rounded text-slate-400 hover:text-red-500 transition-all leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                      title="Remove from team"
                      aria-label={`Remove ${u.label || u.name} from team`}
                    >
                      <FaTimes className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              ) : null;
            })}
            {!members.length && <p className="text-xs text-slate-400 italic">No members</p>}

            {/* Add member button + dropdown */}
            {canManage && <div className="relative">
              <button
                onClick={() => { setAddingUser((p) => !p); setUserSearch(""); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-slate-300 dark:border-[#2a3044] text-slate-400 hover:border-blue-400 hover:text-blue-500 text-xs transition-colors"
                title="Add member"
              >
                <FaPlus className="w-2.5 h-2.5" />
              </button>
              {addingUser && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => { setAddingUser(false); setUserSearch(""); }} />
                  <div className="absolute top-full left-0 mt-1.5 z-20 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-xl overflow-hidden w-52">
                    <div className="px-2 py-1.5 border-b border-slate-100 dark:border-[#2a3044]">
                      <input
                        autoFocus
                        className="w-full text-xs px-2 py-1 rounded-lg bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="Search users…"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {nonMembers.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-3 italic">No users available</p>
                      ) : nonMembers.map((u) => (
                        <button
                          key={u.id}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
                          onClick={() => addMember(u.username)}
                        >
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                            style={{ backgroundColor: u.color || "#3b82f6" }}>
                            {(u.name?.[0] || "?").toUpperCase()}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="text-xs font-medium truncate">{u.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">@{u.username}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Projects ({assigned.length})</p>
          <div className="flex gap-1.5 flex-wrap">
            {assigned.map((p) => <span key={p.id} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border" style={{ backgroundColor: p.color+"18", borderColor: p.color+"44", color: p.color }}><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: p.color }} />{p.name}</span>)}
            {!assigned.length && <p className="text-xs text-slate-400">No projects</p>}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ─── User Management ──────────────────────────────────────────────────────────

function UserForm({ initial, onSave, onCancel, canEditRole = true, busy = false, roleHint = "" }) {
  const [name,  setName]  = useState(initial?.name  || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [user,  setUser]  = useState(initial?.username || "");
  const [role,  setRole]  = useState(initial?.role  || "member");
  const [color, setColor] = useState(initial?.color || PALETTE[0]);

  return (
    <FormCard title={initial?.id ? "Edit User" : "Invite New User"}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Full Name *</label>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Doe"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Username</label>
          <input value={user} onChange={(e) => setUser(e.target.value.toLowerCase().replace(/\s/g,""))} placeholder="e.g. janedoe"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] text-sm font-mono text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.io"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Role</label>
          <div className="flex gap-2" role="radiogroup" aria-label="Role">
            {ROLES.map((r) => (
              <button key={r.value} type="button" onClick={() => setRole(r.value)} disabled={!canEditRole}
                role="radio" aria-checked={role === r.value} title={r.desc}
                className={`flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${role === r.value ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400"}`}>
                {r.label}
              </button>
            ))}
          </div>
          {(roleHint || !canEditRole) && (
            <p className="text-[10px] text-slate-400 mt-1">
              {canEditRole ? roleHint : "You cannot change this role."}
            </p>
          )}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Avatar Color</label>
        <div className="flex items-center gap-3">
          <ColorPicker value={color} onChange={setColor} />
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shadow" style={{ backgroundColor: color }}>
            {name[0]?.toUpperCase() || "?"}
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <AppButton onClick={() => { if(busy||!name.trim()||!email.trim()) return; onSave({ name:name.trim(), email:email.trim(), username:user||name.toLowerCase().replace(/\s/g,""), role, color }); }}
          disabled={busy || !name.trim() || !email.trim()}>
          <FaCheck className="w-3 h-3" /> {busy ? "Saving..." : initial?.id ? "Save Changes" : "Invite User"}
        </AppButton>
        <AppButton variant="secondary" onClick={onCancel}>Cancel</AppButton>
      </div>
    </FormCard>
  );
}

export default function AdminPage() {
  const {
    teams, createTeam, updateTeam, deleteTeam,
    projects, createProject, updateProject, deleteProject,
    users, deletedUserIds, createUser, updateUser, deleteUser,
    workspaceSettings, dbReady,
  } = useApp();

  const { user: authUser } = useAuth();
  const { canPerform, sensitiveActionPolicy } = usePermissions();
  const [activeTab, setActiveTab] = useState("people");
  const canManageProjects = canPerform("project:manage");
  const canManageTeams = canPerform("team:manage");
  const confirmDestructive = requiresConfirmation(sensitiveActionPolicy, "destructive");
  // NOTE: legacy demo-data clean-up is an explicit action in the People tab
  // (no silent data mutation on mount).

  // Teams
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam,  setEditingTeam]  = useState(null);
  // Projects
  const [showProjForm, setShowProjForm] = useState(false);
  const [editingProj,  setEditingProj]  = useState(null);
  const activeUsers  = useMemo(
    () => dedupUsers(users, deletedUserIds).filter((u) => u.status === "active").length,
    [users, deletedUserIds]
  );

  const TABS = [
    { id: "people",   label: "People",          icon: FaUserFriends },
    { id: "projects", label: "Projects",         icon: FaProjectDiagram },
    { id: "teams",    label: "Teams",            icon: FaUsers },
    { id: "access",   label: "Access",           icon: FaKey },
    ...(canPerform("workspace:manage") ? [{ id: "workspace", label: "Workspace", icon: FaCog }] : []),
    ...(canPerform("audit:view") ? [{ id: "audit", label: "Audit", icon: FaStream }] : []),
  ];

  // Avoid flashing "No teams yet" / zero stats before the workspace loads.
  if (dbReady === false) {
    return (
      <div className="h-full overflow-y-auto p-4 md:p-6 max-w-6xl mx-auto">
        <PanelSkeleton testId="admin-skeleton" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 max-w-6xl mx-auto">
      <div className="app-surface p-6 mb-6">
        <div className="app-kicker mb-3">Workspace Control</div>
        <div className="flex items-center gap-3">
          <FaShieldAlt className="w-5 h-5 text-blue-500" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Admin</h2>
            <p className="text-sm app-subtle-copy mt-1">
              {workspaceSettings?.displayName ? `${workspaceSettings.displayName} · ` : ""}Manage projects, teams, members and configuration
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Projects",      value: projects.length,    icon: FaFolder,        color: "#a855f7" },
          { label: "Teams",         value: teams.length,       icon: FaUsers,         color: "#3b82f6" },
          { label: "Active Users",  value: activeUsers,        icon: FaUserPlus,      color: "#10b981" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="app-surface p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color+"22" }}>
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">{value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="app-surface-muted flex gap-0.5 border-b app-divider mb-5 overflow-x-auto px-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === id ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* People */}
      {activeTab === "people" && (
        <PeopleTab
          users={users}
          teams={teams}
          updateTeam={updateTeam}
          updateUser={updateUser}
          createUser={createUser}
          deleteUser={deleteUser}
          projects={projects}
          updateProject={updateProject}
          SectionCard={SectionCard}
          DeleteConfirm={DeleteConfirm}
          UserForm={UserForm}
          roles={ROLES}
          currentUid={authUser?.uid}
        />
      )}

      {/* Access */}
      {activeTab === "access" && (
        <AccessTab currentUid={authUser?.uid} />
      )}

      {activeTab === "workspace" && canPerform("workspace:manage") && (
        <WorkspaceTab />
      )}

      {activeTab === "audit" && canPerform("audit:view") && (
        <AuditTab />
      )}

      {/* Projects */}
      {activeTab === "projects" && (
        <div className="space-y-4">
          {!canManageProjects && <ReadOnlyNotice>You can view projects but not create, edit or delete them (requires “Manage projects”).</ReadOnlyNotice>}
          {canManageProjects && showProjForm && !editingProj && <ProjectForm onSave={(d) => { createProject(d); setShowProjForm(false); }} onCancel={() => setShowProjForm(false)} />}
          {canManageProjects && editingProj && <ProjectForm initial={editingProj} onSave={(d) => { updateProject({...editingProj,...d}); setEditingProj(null); }} onCancel={() => setEditingProj(null)} />}
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} teams={teams} isOnly={projects.length===1}
              canManage={canManageProjects} confirmDelete={confirmDestructive}
              onEdit={() => { setEditingProj(p); setShowProjForm(false); }}
              onDelete={() => deleteProject(p.id)} />
          ))}
          {canManageProjects && !showProjForm && !editingProj && (
            <button onClick={() => setShowProjForm(true)}
              className="app-surface-muted flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 rounded-xl hover:border-blue-300 hover:text-blue-500 text-sm font-medium w-full justify-center transition-colors">
              <FaPlus className="w-3.5 h-3.5" /> Create New Project
            </button>
          )}
        </div>
      )}

      {/* Teams */}
      {activeTab === "teams" && (
        <div className="space-y-4">
          {!canManageTeams && <ReadOnlyNotice>You can view teams but not change them (requires “Manage teams”).</ReadOnlyNotice>}
          {canManageTeams && showTeamForm && !editingTeam && <TeamForm projects={projects} onSave={(d) => { createTeam(d); setShowTeamForm(false); }} onCancel={() => setShowTeamForm(false)} />}
          {canManageTeams && editingTeam && <TeamForm initial={editingTeam} projects={projects} onSave={(d) => { updateTeam({...editingTeam,...d}); setEditingTeam(null); }} onCancel={() => setEditingTeam(null)} />}
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} projects={projects} users={users}
              canManage={canManageTeams} confirmDelete={confirmDestructive}
              onEdit={() => { setEditingTeam(t); setShowTeamForm(false); }}
              onDelete={() => deleteTeam(t.id)}
              onUpdateTeam={(updated) => updateTeam(updated)} />
          ))}
          {teams.length===0 && !showTeamForm && (
            <AppEmptyState
              icon={<FaUsers className="w-7 h-7" />}
              title="No teams yet"
              description="Create your first team to start assigning people across projects."
              className="shadow-none"
            />
          )}
          {canManageTeams && !showTeamForm && !editingTeam && (
            <button onClick={() => setShowTeamForm(true)}
              className="app-surface-muted flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 rounded-xl hover:border-blue-300 hover:text-blue-500 text-sm font-medium w-full justify-center transition-colors">
              <FaPlus className="w-3.5 h-3.5" /> Create New Team
            </button>
          )}
        </div>
      )}

    </div>
  );
}
