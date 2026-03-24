import React, { useState, useMemo } from "react";
import { useApp } from "../context/AppContext";
import {
  FaShieldAlt, FaUsers, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes,
  FaProjectDiagram, FaUserPlus, FaFolder, FaPalette,
  FaUserCircle, FaEnvelope, FaCalendarAlt, FaBolt, FaListUl,
  FaChevronDown,
  FaClock, FaColumns, FaArrowUp, FaArrowDown, FaLock,
  FaSearch, FaUserFriends,
} from "react-icons/fa";

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


const WEEK_DAYS = [
  { id: "mon", label: "Mon" }, { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" }, { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" }, { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
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

function DeleteConfirm({ label, onConfirm, onCancel }) {
  return (
    <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-2 py-1">
      <span className="text-xs text-red-600 dark:text-red-400">{label}</span>
      <button onClick={onConfirm} className="p-0.5 text-red-600 hover:text-red-700"><FaCheck className="w-3 h-3" /></button>
      <button onClick={onCancel}  className="p-0.5 text-slate-400 hover:text-slate-600"><FaTimes className="w-3 h-3" /></button>
    </div>
  );
}

function SectionCard({ children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function FormCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-blue-200 dark:border-blue-800 p-5 shadow-sm space-y-4">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h4>
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
      <div className="grid grid-cols-2 gap-4">
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
        <button onClick={() => { if(!name.trim()) return; onSave({ name:name.trim(), key:derivedKey||"PRJ", color, description:desc }); }}
          disabled={!name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          <FaCheck className="w-3 h-3" /> {initial?.id ? "Save" : "Create Project"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">Cancel</button>
      </div>
    </FormCard>
  );
}

function ProjectCard({ project, teams, onEdit, onDelete, isOnly }) {
  const { users } = useApp();
  const [del, setDel] = useState(false);
  const assigned = teams.filter((t) => (t.projectIds||[]).includes(project.id));
  const members = new Set(assigned.flatMap((t) => t.memberNames||[]));
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
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><FaEdit className="w-3.5 h-3.5" /></button>
          {!del
            ? <button onClick={() => setDel(true)} disabled={isOnly} title={isOnly ? "Cannot delete the last project" : ""} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><FaTrash className="w-3.5 h-3.5" /></button>
            : <DeleteConfirm label="Delete?" onConfirm={onDelete} onCancel={() => setDel(false)} />
          }
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Teams ({assigned.length})</p>
          {assigned.length > 0
            ? <div className="space-y-1">{assigned.map((t) => <div key={t.id} className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} /><span className="text-sm text-slate-600 dark:text-slate-300">{t.name}</span></div>)}</div>
            : <p className="text-xs text-slate-400">No teams assigned</p>}
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Members ({members.size})</p>
          <div className="flex gap-1.5 flex-wrap">
            {[...members].map((m) => { const u = users?.find((x) => x.username === m); const color = u?.color || "#94a3b8"; const label = u?.name || m; return <div key={m} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: color }} title={label}>{label[0].toUpperCase()}</div>; })}
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
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: u.color }}>{u.name[0]}</div>
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
        <button onClick={() => { if(!name.trim()) return; onSave({ name:name.trim(), description:desc, color, memberNames:members, projectIds:projIds }); }}
          disabled={!name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          <FaCheck className="w-3 h-3" /> {initial?.id ? "Save" : "Create Team"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">Cancel</button>
      </div>
    </FormCard>
  );
}

function TeamCard({ team, projects, users, onEdit, onDelete, onUpdateTeam }) {
  const [del,         setDel]         = useState(false);
  const [addingUser,  setAddingUser]  = useState(false);
  const [userSearch,  setUserSearch]  = useState("");

  const assigned = projects.filter((p) => (team.projectIds||[]).includes(p.id));
  const members  = team.memberNames || [];

  const resolveUser = (username) =>
    users?.find((u) => u.username === username) ||
    { name: username, color: "#94a3b8" };

  const nonMembers = useMemo(() => {
    if (!addingUser) return [];
    const q = userSearch.toLowerCase();
    return (users || []).filter(
      (u) => !members.includes(u.username) &&
      (!q || u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
    );
  }, [users, members, userSearch, addingUser]);

  const removeMember = (username) => {
    onUpdateTeam?.({ ...team, memberNames: members.filter((m) => m !== username) });
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ backgroundColor: team.color }}>{team.name[0]}</div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">{team.name}</h3>
            {team.description && <p className="text-xs text-slate-400 mt-0.5">{team.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><FaEdit className="w-3.5 h-3.5" /></button>
          {!del ? <button onClick={() => setDel(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><FaTrash className="w-3.5 h-3.5" /></button>
                : <DeleteConfirm label="Delete?" onConfirm={onDelete} onCancel={() => setDel(false)} />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
                  <button
                    onClick={() => removeMember(m)}
                    className="opacity-0 group-hover:opacity-100 ml-0.5 text-slate-300 hover:text-red-400 transition-all leading-none"
                    title="Remove from team"
                  >
                    <FaTimes className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : null;
            })}
            {!members.length && <p className="text-xs text-slate-400 italic">No members</p>}

            {/* Add member button + dropdown */}
            <div className="relative">
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
                            {u.name[0].toUpperCase()}
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
            </div>
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

function UserForm({ initial, onSave, onCancel }) {
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
          <div className="flex gap-2">
            {ROLES.map((r) => (
              <button key={r.value} onClick={() => setRole(r.value)}
                className={`flex-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${role === r.value ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400"}`}>
                {r.label}
              </button>
            ))}
          </div>
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
        <button onClick={() => { if(!name.trim()||!email.trim()) return; onSave({ name:name.trim(), email:email.trim(), username:user||name.toLowerCase().replace(/\s/g,""), role, color, status:"active" }); }}
          disabled={!name.trim() || !email.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          <FaCheck className="w-3 h-3" /> {initial?.id ? "Save Changes" : "Invite User"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">Cancel</button>
      </div>
    </FormCard>
  );
}

function UserCard({ user, onEdit, onDelete, onToggleStatus }) {
  const [del, setDel] = useState(false);
  const role = ROLES.find((r) => r.value === user.role) || ROLES[1];
  const isActive = user.status === "active";
  return (
    <SectionCard className="p-4">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm" style={{ backgroundColor: user.color }}>
          {user.name[0]?.toUpperCase()}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{user.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: role.color+"20", color: role.color }}>{role.label}</span>
            {!isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-medium">Inactive</span>}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1"><FaEnvelope className="w-3 h-3" />{user.email}</span>
            {user.username && <span className="flex items-center gap-1"><FaUserCircle className="w-3 h-3" />@{user.username}</span>}
            {user.joinedAt && <span className="flex items-center gap-1"><FaCalendarAlt className="w-3 h-3" />Joined {user.joinedAt}</span>}
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><FaEdit className="w-3.5 h-3.5" /></button>
          <button onClick={onToggleStatus}
            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${isActive ? "text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20" : "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"}`}>
            {isActive ? "Deactivate" : "Activate"}
          </button>
          {!del
            ? <button onClick={() => setDel(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><FaTrash className="w-3.5 h-3.5" /></button>
            : <DeleteConfirm label="Remove?" onConfirm={onDelete} onCancel={() => setDel(false)} />
          }
        </div>
      </div>
    </SectionCard>
  );
}

// ─── Sprint Defaults ──────────────────────────────────────────────────────────

function SprintDefaultsTab({ sprintDefaults, updateSprintDefaults, sprint }) {
  const sd = sprintDefaults;
  const sprintNumber = parseInt((sprint?.name || "Sprint 1").match(/\d+/)?.[0] || "1", 10);
  const preview = sd.namingFormat.replace("{n}", sprintNumber + 1);

  const toggleDay = (d) => {
    const days = sd.workingDays.includes(d)
      ? sd.workingDays.filter((x) => x !== d)
      : [...sd.workingDays, d];
    updateSprintDefaults({ workingDays: days });
  };

  return (
    <div className="space-y-5">
      {/* Duration */}
      <SectionCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <FaClock className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sprint Duration</h3>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[7, 10, 14, 21].map((d) => (
            <button key={d} onClick={() => updateSprintDefaults({ duration: d })}
              className={`py-3 rounded-xl border-2 text-center transition-all ${sd.duration === d ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-slate-200 dark:border-[#2a3044] hover:border-slate-300"}`}>
              <p className={`text-lg font-bold ${sd.duration === d ? "text-blue-600" : "text-slate-700 dark:text-slate-200"}`}>{d}</p>
              <p className={`text-xs ${sd.duration === d ? "text-blue-500" : "text-slate-400"}`}>days</p>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">Custom (days):</label>
          <input type="number" min={1} max={90} value={sd.duration}
            onChange={(e) => updateSprintDefaults({ duration: Math.max(1, Math.min(90, parseInt(e.target.value)||14)) })}
            className="w-20 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span className="text-xs text-slate-400">= ~{Math.ceil(sd.duration / 7)} week{Math.ceil(sd.duration/7) !== 1 ? "s" : ""}</span>
        </div>
      </SectionCard>

      {/* Naming */}
      <SectionCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <FaListUl className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Sprint Naming</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {["Sprint {n}", "Week {n}", "Iteration {n}"].map((fmt) => (
            <button key={fmt} onClick={() => updateSprintDefaults({ namingFormat: fmt })}
              className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${sd.namingFormat === fmt ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400"}`}>
              {fmt.replace("{n}", "42")}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">Custom format:</label>
          <input value={sd.namingFormat} onChange={(e) => updateSprintDefaults({ namingFormat: e.target.value })}
            placeholder="Sprint {n}"
            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          Preview: <span className="font-semibold text-slate-600 dark:text-slate-300">{preview}</span>
          <span className="ml-2 opacity-60">(use {"{n}"} for sprint number)</span>
        </p>
      </SectionCard>

      {/* Working days */}
      <SectionCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <FaCalendarAlt className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Working Days</h3>
          <span className="ml-auto text-xs text-slate-400">{sd.workingDays.length} days/week</span>
        </div>
        <div className="flex gap-2">
          {WEEK_DAYS.map(({ id, label }) => (
            <button key={id} onClick={() => toggleDay(id)}
              className={`flex-1 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${sd.workingDays.includes(id) ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600" : "border-slate-200 dark:border-[#2a3044] text-slate-400 dark:text-slate-500"}`}>
              {label}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Auto start + velocity */}
      <SectionCard className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <FaBolt className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Automation & Velocity</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-[#232838]">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Auto-start next sprint</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Automatically start a new sprint when current one ends</p>
            </div>
            <button onClick={() => updateSprintDefaults({ autoStart: !sd.autoStart })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${sd.autoStart ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${sd.autoStart ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Target Velocity (story points)</label>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Story points your team aims to complete per sprint</p>
              <input type="number" min={0} value={sd.velocity || 0}
                onChange={(e) => updateSprintDefaults({ velocity: Math.max(0, parseInt(e.target.value)||0) })}
                className="w-32 px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const {
    teams, createTeam, updateTeam, deleteTeam,
    projects, createProject, updateProject, deleteProject, currentProjectId,
    users, createUser, updateUser, deleteUser,
    sprintDefaults, updateSprintDefaults,
    columns, createColumn, deleteColumn, reorderColumns, renameColumn,
    sprint,
  } = useApp();

  const [activeTab, setActiveTab] = useState("people");

  // Teams
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam,  setEditingTeam]  = useState(null);
  // Projects
  const [showProjForm, setShowProjForm] = useState(false);
  const [editingProj,  setEditingProj]  = useState(null);
  const totalMembers = new Set(teams.flatMap((t) => t.memberNames || [])).size;
  const activeUsers  = users.filter((u) => u.status === "active").length;

  const TABS = [
    { id: "people",   label: "People",          icon: FaUserFriends },
    { id: "projects", label: "Projects",         icon: FaProjectDiagram },
    { id: "teams",    label: "Teams",            icon: FaUsers },
    { id: "sprint",   label: "Sprint Defaults",  icon: FaClock },
    { id: "columns",  label: "Board Columns",    icon: FaColumns },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <FaShieldAlt className="w-5 h-5 text-blue-500" />
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Admin</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500">Manage projects, teams, members and configuration</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Projects",      value: projects.length,    icon: FaFolder,        color: "#a855f7" },
          { label: "Teams",         value: teams.length,       icon: FaUsers,         color: "#3b82f6" },
          { label: "Active Users",  value: activeUsers,        icon: FaUserPlus,      color: "#10b981" },
          { label: "Sprint Days",   value: sprintDefaults.duration, icon: FaClock,    color: "#06b6d4" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-4 shadow-sm">
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
      <div className="flex gap-0.5 border-b border-slate-200 dark:border-[#2a3044] mb-5 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${
              activeTab === id ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* People */}
      {activeTab === "people" && (
        <PeopleTab users={users} teams={teams} updateTeam={updateTeam} updateUser={updateUser} createUser={createUser} deleteUser={deleteUser} />
      )}

      {/* Projects */}
      {activeTab === "projects" && (
        <div className="space-y-4">
          {showProjForm && !editingProj && <ProjectForm onSave={(d) => { createProject(d); setShowProjForm(false); }} onCancel={() => setShowProjForm(false)} />}
          {editingProj && <ProjectForm initial={editingProj} onSave={(d) => { updateProject({...editingProj,...d}); setEditingProj(null); }} onCancel={() => setEditingProj(null)} />}
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} teams={teams} isOnly={projects.length===1}
              onEdit={() => { setEditingProj(p); setShowProjForm(false); }}
              onDelete={() => deleteProject(p.id)} />
          ))}
          {!showProjForm && !editingProj && (
            <button onClick={() => setShowProjForm(true)}
              className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 rounded-xl hover:border-blue-300 hover:text-blue-500 text-sm font-medium w-full justify-center transition-colors">
              <FaPlus className="w-3.5 h-3.5" /> Create New Project
            </button>
          )}
        </div>
      )}

      {/* Teams */}
      {activeTab === "teams" && (
        <div className="space-y-4">
          {showTeamForm && !editingTeam && <TeamForm projects={projects} onSave={(d) => { createTeam(d); setShowTeamForm(false); }} onCancel={() => setShowTeamForm(false)} />}
          {editingTeam && <TeamForm initial={editingTeam} projects={projects} onSave={(d) => { updateTeam({...editingTeam,...d}); setEditingTeam(null); }} onCancel={() => setEditingTeam(null)} />}
          {teams.map((t) => (
            <TeamCard key={t.id} team={t} projects={projects} users={users}
              onEdit={() => { setEditingTeam(t); setShowTeamForm(false); }}
              onDelete={() => deleteTeam(t.id)}
              onUpdateTeam={(updated) => updateTeam(updated)} />
          ))}
          {teams.length===0 && !showTeamForm && <div className="text-center py-12 text-slate-400"><FaUsers className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No teams yet.</p></div>}
          {!showTeamForm && !editingTeam && (
            <button onClick={() => setShowTeamForm(true)}
              className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 rounded-xl hover:border-blue-300 hover:text-blue-500 text-sm font-medium w-full justify-center transition-colors">
              <FaPlus className="w-3.5 h-3.5" /> Create New Team
            </button>
          )}
        </div>
      )}

      {/* Sprint Defaults */}
      {activeTab === "sprint" && (
        <SprintDefaultsTab sprintDefaults={sprintDefaults} updateSprintDefaults={updateSprintDefaults} sprint={sprint} />
      )}

      {/* Board Columns */}
      {activeTab === "columns" && (
        <BoardColumnsTab
          columns={columns}
          currentProjectId={currentProjectId}
          projects={projects}
          createColumn={createColumn}
          deleteColumn={deleteColumn}
          reorderColumns={reorderColumns}
          renameColumn={renameColumn}
        />
      )}
    </div>
  );
}

// ─── Board Columns Tab ─────────────────────────────────────────────────────────

const DEFAULT_COL_IDS = ["todo","inprogress","review","awaiting","blocked","done"];

function BoardColumnsTab({ columns, currentProjectId, projects, createColumn, deleteColumn, reorderColumns, renameColumn }) {
  const [newColName, setNewColName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const currentProject = projects.find((p) => p.id === currentProjectId) || projects[0];

  const handleAdd = () => {
    if (!newColName.trim()) return;
    createColumn(newColName.trim());
    setNewColName("");
  };

  const handleRename = (id) => {
    if (!editTitle.trim()) { setEditingId(null); return; }
    renameColumn(id, editTitle.trim());
    setEditingId(null);
  };

  const move = (idx, dir) => {
    const newCols = [...columns];
    const target = idx + dir;
    if (target < 0 || target >= newCols.length) return;
    [newCols[idx], newCols[target]] = [newCols[target], newCols[idx]];
    reorderColumns(newCols);
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl p-3">
        <p className="text-xs text-blue-700 dark:text-blue-400">
          Columns are per-project. Currently editing: <strong>{currentProject?.name}</strong>.
          Default columns are fixed; custom columns can be renamed, reordered, or deleted.
        </p>
      </div>

      <SectionCard>
        {/* Column list */}
        <div className="divide-y divide-slate-100 dark:divide-[#2a3044]">
          {columns.map((col, idx) => {
            const isDefault = DEFAULT_COL_IDS.includes(col.id);
            const isEditing = editingId === col.id;
            const confirmingDelete = confirmDeleteId === col.id;
            return (
              <div key={col.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#232838] group transition-colors">
                {/* Reorder */}
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => move(idx, -1)} disabled={idx === 0}
                    className="p-0.5 text-slate-300 hover:text-slate-500 disabled:opacity-0">
                    <FaArrowUp className="w-2.5 h-2.5" />
                  </button>
                  <button onClick={() => move(idx, 1)} disabled={idx === columns.length - 1}
                    className="p-0.5 text-slate-300 hover:text-slate-500 disabled:opacity-0">
                    <FaArrowDown className="w-2.5 h-2.5" />
                  </button>
                </div>

                {/* Index badge */}
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-[#2a3044] flex items-center justify-center text-xs text-slate-400 font-medium flex-shrink-0">
                  {idx + 1}
                </span>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      autoFocus
                      className="w-full text-sm border border-blue-300 rounded px-2 py-1 bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(col.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onBlur={() => handleRename(col.id)}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{col.title}</span>
                      {isDefault && (
                        <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 dark:bg-[#2a3044] px-1.5 py-0.5 rounded">
                          <FaLock className="w-2 h-2" /> default
                        </span>
                      )}
                      {col.custom && (
                        <span className="text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">custom</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {!isEditing && !confirmingDelete && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingId(col.id); setEditTitle(col.title); }}
                      className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                      title="Rename"
                    >
                      <FaEdit className="w-3 h-3" />
                    </button>
                    {!isDefault && (
                      <button
                        onClick={() => setConfirmDeleteId(col.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete column"
                      >
                        <FaTrash className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {confirmingDelete && (
                  <DeleteConfirm
                    label="Delete column? Tasks will move to To Do."
                    onConfirm={() => { deleteColumn(col.id); setConfirmDeleteId(null); }}
                    onCancel={() => setConfirmDeleteId(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Add custom column */}
      <FormCard title="Add Custom Column">
        <div className="flex gap-2 items-center">
          <input
            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Column name (e.g. QA Review, Staging)"
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          />
          <button
            onClick={handleAdd}
            disabled={!newColName.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            <FaPlus className="w-3 h-3" /> Add
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1">Custom columns appear on the board after the last default column.</p>
      </FormCard>
    </div>
  );
}

// ─── People Tab ───────────────────────────────────────────────────────────────

const TASK_STATUS_STYLES = {
  todo:       "bg-slate-100 text-slate-500 dark:bg-[#2a3044] dark:text-slate-400",
  inprogress: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  review:     "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  done:       "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
  blocked:    "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400",
  awaiting:   "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-500",
};
const TASK_STATUS_LABELS = {
  todo: "To Do", inprogress: "In Progress", review: "Review",
  done: "Done", blocked: "Blocked", awaiting: "Awaiting",
};
const PRI_DOT = { critical: "#ef4444", high: "#f97316", medium: "#3b82f6", low: "#94a3b8" };

function PeopleTab({ users, teams, updateTeam, updateUser, createUser, deleteUser }) {
  const { allTasks, setActiveTasks, setBacklogSections } = useApp();
  const [search,         setSearch]         = useState("");
  const [filterRole,     setFilterRole]     = useState("all");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [addTeamFor,     setAddTeamFor]     = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [taskSearch,     setTaskSearch]     = useState("");
  const [showUserForm,   setShowUserForm]   = useState(false);
  const [editingUser,    setEditingUser]    = useState(null);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q);
    const matchRole   = filterRole   === "all" || u.role   === filterRole;
    const matchStatus = filterStatus === "all" || u.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  const getUserTeams      = (username) => teams.filter((t) =>  (t.memberNames || []).includes(username));
  const getAvailableTeams = (username) => teams.filter((t) => !(t.memberNames || []).includes(username));

  // Build assignee→tasks map in one pass (avoids O(users × tasks) per render)
  const tasksByUser = useMemo(() => {
    const map = {};
    for (const t of allTasks) {
      const key = t.assignedTo || "unassigned";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [allTasks]);
  const getUserTasks = (username) => tasksByUser[username] || [];

  const addToTeam = (teamId, username) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    updateTeam({ ...team, memberNames: [...(team.memberNames || []), username] });
    setAddTeamFor(null);
  };

  const removeFromTeam = (teamId, username) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    updateTeam({ ...team, memberNames: (team.memberNames || []).filter((n) => n !== username) });
  };

  const assignTask = (taskId, username) => {
    const upd = (tasks) => tasks.map((t) => t.id === taskId ? { ...t, assignedTo: username } : t);
    setActiveTasks((prev) => upd(prev));
    setBacklogSections((prev) => prev.map((s) => ({ ...s, tasks: upd(s.tasks) })));
  };

  const unassignTask = (taskId) => assignTask(taskId, "unassigned");

  const toggleExpand = (userId) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
    setTaskSearch("");
  };

  // Memoized per (expandedUser, taskSearch) — avoids re-filtering on every render
  const expandedUser = users.find((u) => u.id === expandedUserId);
  const assignableTasks = useMemo(() => {
    if (!expandedUser) return [];
    const q = taskSearch.toLowerCase();
    if (!q) {
      return allTasks.filter((t) => !t.assignedTo || t.assignedTo === "unassigned").slice(0, 8);
    }
    return allTasks
      .filter((t) => t.assignedTo !== expandedUser.username && (
        t.title?.toLowerCase().includes(q) || `cy-${t.id}`.includes(q)
      ))
      .slice(0, 8);
  }, [allTasks, expandedUser, taskSearch]);

  return (
    <div className="space-y-4">
      {/* Search + filters bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-slate-400"
            placeholder="Search by name, email or username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="text-sm border border-slate-200 dark:border-[#2a3044] rounded-lg px-3 py-2 bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="member">Member</option>
          <option value="viewer">Viewer</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-slate-200 dark:border-[#2a3044] rounded-lg px-3 py-2 bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-200 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto flex-shrink-0">
          {filtered.length} / {users.length} people
        </span>
      </div>

      {/* User form */}
      {showUserForm && !editingUser && <UserForm onSave={(d) => { createUser(d); setShowUserForm(false); }} onCancel={() => setShowUserForm(false)} />}
      {editingUser && <UserForm initial={editingUser} onSave={(d) => { updateUser({ ...editingUser, ...d }); setEditingUser(null); }} onCancel={() => setEditingUser(null)} />}

      {/* Invite button */}
      {!showUserForm && !editingUser && (
        <button
          onClick={() => setShowUserForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 rounded-xl hover:border-blue-300 hover:text-blue-500 text-sm font-medium w-full justify-center transition-colors"
        >
          <FaPlus className="w-3.5 h-3.5" /> Invite New User
        </button>
      )}

      {/* User cards */}
      <div className="grid gap-3">
        {filtered.map((user) => {
          const userTeams      = getUserTeams(user.username);
          const availableTeams = getAvailableTeams(user.username);
          const roleInfo       = ROLES.find((r) => r.value === user.role);
          const isDropOpen     = addTeamFor === user.id;

          const isExpanded     = expandedUserId === user.id;
          const userTasks      = getUserTasks(user.username);
          const assignable     = isExpanded ? assignableTasks : [];

          return (
            <SectionCard key={user.id} className="hover:border-slate-300 dark:hover:border-[#3a4055] transition-colors overflow-hidden">
              <div className="flex items-start gap-4 p-4">
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: user.color || "#3b82f6" }}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{user.name}</span>
                    <span className="text-xs text-slate-400 font-mono">@{user.username}</span>
                    {roleInfo && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: roleInfo.color + "20", color: roleInfo.color }}>
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

                  {/* Teams chips + add dropdown */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {userTeams.length === 0 && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">No teams</span>
                    )}
                    {userTeams.map((team) => (
                      <span
                        key={team.id}
                        className="group flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-all"
                        style={{ backgroundColor: team.color + "15", borderColor: team.color + "50", color: team.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: team.color }} />
                        {team.name}
                        <button
                          className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-red-500 transition-all leading-none"
                          onClick={() => removeFromTeam(team.id, user.username)}
                          title={`Remove from ${team.name}`}
                        >
                          <FaTimes className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}

                    {availableTeams.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setAddTeamFor(isDropOpen ? null : user.id)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-300 dark:border-[#2a3044] text-slate-400 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
                        >
                          <FaPlus className="w-2 h-2" /> Add to team
                        </button>

                        {isDropOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setAddTeamFor(null)} />
                            <div className="absolute top-full left-0 mt-1.5 z-20 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-xl overflow-hidden min-w-48">
                              <div className="px-3 py-2 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-[#232838] border-b border-slate-100 dark:border-[#2a3044]">
                                Add to team
                              </div>
                              {availableTeams.map((team) => (
                                <button
                                  key={team.id}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors border-b border-slate-50 dark:border-[#2a3044] last:border-0"
                                  onClick={() => addToTeam(team.id, user.username)}
                                >
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
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  {user.joinedAt && (
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide">Joined</div>
                      <div className="text-xs font-medium text-slate-500 dark:text-slate-300">{user.joinedAt}</div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingUser(user); setShowUserForm(false); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Edit user"
                    >
                      <FaEdit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete user"
                    >
                      <FaTrash className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => toggleExpand(user.id)}
                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                        isExpanded
                          ? "border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                          : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-blue-300 hover:text-blue-500"
                      }`}
                    >
                      {userTasks.length > 0
                        ? <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-bold">{userTasks.length}</span>
                        : null}
                      Tasks
                      <FaChevronDown className={`w-2.5 h-2.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                    <button
                      onClick={() => updateUser({ ...user, status: user.status === "active" ? "inactive" : "active" })}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                        user.status === "active"
                          ? "border-slate-200 dark:border-[#2a3044] text-slate-400 hover:border-red-300 hover:text-red-500 dark:hover:border-red-700 dark:hover:text-red-400"
                          : "border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                      }`}
                    >
                      {user.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Task Assignment Panel ── */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-[#2a3044] px-4 py-3 bg-slate-50/60 dark:bg-[#161b27]">
                  {/* Currently assigned */}
                  <div className="mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                      Assigned tasks ({userTasks.length})
                    </div>
                    {userTasks.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No tasks assigned</p>
                    ) : (
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                        {userTasks.map((t) => (
                          <div key={t.id}
                            className="flex items-center gap-2 bg-white dark:bg-[#1c2030] border border-slate-100 dark:border-[#2a3044] rounded-lg px-2.5 py-1.5">
                            {PRI_DOT[t.priority] && (
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: PRI_DOT[t.priority] }} />
                            )}
                            <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">CY-{t.id}</span>
                            <span className="flex-1 text-xs text-slate-700 dark:text-slate-200 truncate min-w-0">{t.title}</span>
                            {t.status && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${TASK_STATUS_STYLES[t.status] || ""}`}>
                                {TASK_STATUS_LABELS[t.status] || t.status}
                              </span>
                            )}
                            <button
                              onClick={() => unassignTask(t.id)}
                              className="flex-shrink-0 text-slate-300 hover:text-red-400 dark:text-slate-600 dark:hover:text-red-400 transition-colors ml-1"
                              title="Unassign"
                            >
                              <FaTimes className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assign more */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
                      Assign task
                    </div>
                    <div className="relative mb-2">
                      <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                      <input
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder-slate-400"
                        placeholder="Search tasks… (empty = show unassigned)"
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                      />
                    </div>
                    {assignable.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No tasks found</p>
                    ) : (
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                        {assignable.map((t) => (
                          <div key={t.id}
                            className="flex items-center gap-2 bg-white dark:bg-[#1c2030] border border-slate-100 dark:border-[#2a3044] rounded-lg px-2.5 py-1.5">
                            {PRI_DOT[t.priority] && (
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: PRI_DOT[t.priority] }} />
                            )}
                            <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">CY-{t.id}</span>
                            <span className="flex-1 text-xs text-slate-700 dark:text-slate-200 truncate min-w-0">{t.title}</span>
                            {t.assignedTo && t.assignedTo !== "unassigned" && (
                              <span className="text-[10px] text-slate-400 flex-shrink-0 italic truncate max-w-16">@{t.assignedTo}</span>
                            )}
                            {t.status && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${TASK_STATUS_STYLES[t.status] || ""}`}>
                                {TASK_STATUS_LABELS[t.status] || t.status}
                              </span>
                            )}
                            <button
                              onClick={() => assignTask(t.id, user.username)}
                              className="flex-shrink-0 flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-medium transition-colors ml-1"
                              title="Assign to this user"
                            >
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
