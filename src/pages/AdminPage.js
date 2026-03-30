import React, { useState, useMemo, useEffect } from "react";
import { taskKey } from "../utils/helpers";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { db } from "../services/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import {
  FaShieldAlt, FaUsers, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes,
  FaProjectDiagram, FaUserPlus, FaFolder, FaPalette,
  FaUserCircle, FaEnvelope, FaCalendarAlt, FaChevronDown, FaLock,
  FaSearch, FaUserFriends, FaKey, FaSpinner, FaExternalLinkAlt,
  FaBriefcase, FaGlobe,
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
  const members  = useMemo(() => team.memberNames || [], [team.memberNames]);

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

// ─── Main ─────────────────────────────────────────────────────────────────────

// ─── Access / Role Management Tab ─────────────────────────────────────────────

const ROLE_META = {
  admin:  { label: "Admin",  color: "text-red-500   bg-red-50   dark:bg-red-900/20   border-red-200   dark:border-red-800"   },
  member: { label: "Member", color: "text-blue-500  bg-blue-50  dark:bg-blue-900/20  border-blue-200  dark:border-blue-800"  },
};

function AccessTab({ currentUid }) {
  const { users, updateUser } = useApp();
  const [firebaseUsers, setFirebaseUsers] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [updating,      setUpdating]      = useState(null); // uid being updated

  const loadUsers = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "users"));
    setFirebaseUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRoleChange = async (uid, newRole) => {
    setUpdating(uid);
    await updateDoc(doc(db, "users", uid), { role: newRole });
    setFirebaseUsers((prev) =>
      prev.map((u) => u.uid === uid ? { ...u, role: newRole } : u)
    );
    // Sync to AppContext so People tab reflects the change immediately
    const appUser = users.find((u) => u.id === uid);
    if (appUser) updateUser({ ...appUser, role: newRole });
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
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Manage Firebase Auth user roles. Changes take effect on next login.
      </p>
      {firebaseUsers.map((u) => {
        const isSelf    = u.uid === currentUid;
        const isUpdating = updating === u.uid;
        const meta      = ROLE_META[u.role] || ROLE_META.member;
        const otherRole = u.role === "admin" ? "member" : "admin";
        return (
          <div
            key={u.uid}
            className="flex items-center gap-4 px-5 py-4 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl"
          >
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 uppercase">
              {u.email?.[0] || "?"}
            </div>

            {/* Email + UID */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                {u.email}
                {isSelf && <span className="ml-2 text-[10px] text-slate-400">(you)</span>}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate mt-0.5">{u.uid}</p>
            </div>

            {/* Role badge */}
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${meta.color}`}>
              {meta.label}
            </span>

            {/* Toggle role button — disabled for self */}
            {isSelf ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 px-3 py-1.5" title="Cannot change your own role">
                <FaLock className="w-3 h-3" />
              </div>
            ) : (
              <button
                onClick={() => handleRoleChange(u.uid, otherRole)}
                disabled={!!updating}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors disabled:opacity-50"
              >
                {isUpdating
                  ? <FaSpinner className="w-3 h-3 animate-spin" />
                  : <FaKey className="w-3 h-3" />
                }
                Make {ROLE_META[otherRole].label}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminPage() {
  const {
    teams, createTeam, updateTeam, deleteTeam,
    projects, createProject, updateProject, deleteProject,
    users, deletedUserIds, createUser, updateUser, deleteUser,
    setActiveTasks, setBacklogSections,
  } = useApp();

  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState("people");

  // On mount: clean up all seed data remnants
  useEffect(() => {
    const SEED_NAMES = new Set(["alice", "bob", "carol", "dave"]);

    // Unassign tasks still assigned to seed usernames
    const clearSeed = (tasks) => tasks.map((t) =>
      SEED_NAMES.has(t.assignedTo) ? { ...t, assignedTo: "unassigned" } : t
    );
    setActiveTasks((prev) => clearSeed(prev));
    setBacklogSections((prev) => prev.map((s) => ({ ...s, tasks: clearSeed(s.tasks) })));

    // Remove seed users + duplicates from AppContext (one-time cleanup persisted to Firestore)
    const clean = dedupUsers(users, deletedUserIds);
    users.forEach((u) => {
      if (u.email?.endsWith("@corechestra.io") || clean.findIndex((c) => c.id === u.id) === -1) {
        deleteUser(u.id);
      }
    });

    // Remove seed usernames from all teams
    teams.forEach((team) => {
      const cleaned = (team.memberNames || []).filter((n) => !SEED_NAMES.has(n));
      if (cleaned.length !== (team.memberNames || []).length) {
        updateTeam({ ...team, memberNames: cleaned });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Teams
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam,  setEditingTeam]  = useState(null);
  // Projects
  const [showProjForm, setShowProjForm] = useState(false);
  const [editingProj,  setEditingProj]  = useState(null);
  const activeUsers  = dedupUsers(users, deletedUserIds).filter((u) => u.status === "active").length;

  const TABS = [
    { id: "people",   label: "People",          icon: FaUserFriends },
    { id: "projects", label: "Projects",         icon: FaProjectDiagram },
    { id: "teams",    label: "Teams",            icon: FaUsers },
{ id: "access",   label: "Access",           icon: FaKey },
  ];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <FaShieldAlt className="w-5 h-5 text-blue-500" />
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Admin</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500">Manage projects, teams, members and configuration</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Projects",      value: projects.length,    icon: FaFolder,        color: "#a855f7" },
          { label: "Teams",         value: teams.length,       icon: FaUsers,         color: "#3b82f6" },
          { label: "Active Users",  value: activeUsers,        icon: FaUserPlus,      color: "#10b981" },
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
        <PeopleTab users={users} teams={teams} updateTeam={updateTeam} updateUser={updateUser} createUser={createUser} deleteUser={deleteUser} projects={projects} updateProject={updateProject} />
      )}

      {/* Access */}
      {activeTab === "access" && (
        <AccessTab currentUid={authUser?.uid} />
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

const PEOPLE_COLORS = ["#6366f1","#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899"];

function dedupUsers(list, deletedUserIds) {
  const deletedSet = new Set(deletedUserIds || []);
  const seen = new Set();
  return list.filter((u) => {
    if (u.email?.endsWith("@corechestra.io")) return false;
    if (deletedSet.has(u.id)) return false;
    const key = u.id || u.email;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function UserProfileModal({ user, onClose }) {
  const { allTasks } = useApp();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    // Try fetching Firestore profile by uid (id field)
    getDoc(doc(db, "users", user.id)).then((snap) => {
      setProfile(snap.exists() ? snap.data() : {});
      setLoading(false);
    }).catch(() => { setProfile({}); setLoading(false); });
  }, [user]);

  if (!user) return null;

  const myTasks     = allTasks.filter((t) => t.assignedTo === user.username);
  const done        = myTasks.filter((t) => t.status === "done").length;
  const inProgress  = myTasks.filter((t) => t.status === "inprogress").length;
  const points      = myTasks.reduce((s, t) => s + (t.storyPoint || 0), 0);
  const roleInfo    = ROLES.find((r) => r.value === user.role);
  const displayName = profile?.fullName || profile?.name || user.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-[#1c2030] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a3044] w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header banner */}
        <div className="h-20 w-full" style={{ background: `linear-gradient(135deg, ${user.color || "#6366f1"}33, ${user.color || "#6366f1"}11)` }} />

        {/* Avatar + close */}
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
              {/* Name + role */}
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">{displayName}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">@{user.username}</span>
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
                  }`}>{user.status}</span>
                </div>
              </div>

              {/* Info fields */}
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

              {/* Sprint stats */}
              <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#161b27] border border-slate-100 dark:border-[#2a3044]">
                {[
                  { label: "Assigned", value: myTasks.length, color: "text-blue-600"   },
                  { label: "Progress", value: inProgress,     color: "text-yellow-600" },
                  { label: "Done",     value: done,           color: "text-green-600"  },
                  { label: "Points",   value: points,         color: "text-purple-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <div className={`text-lg font-bold ${color}`}>{value}</div>
                    <div className="text-[10px] text-slate-400">{label}</div>
                  </div>
                ))}
              </div>

              {user.joinedAt && (
                <p className="text-xs text-slate-400 mt-3 text-right">Joined {user.joinedAt}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PeopleTab({ users, teams, updateTeam, updateUser, createUser, deleteUser, projects, updateProject }) {
  const { allTasks, setActiveTasks, setBacklogSections, deletedUserIds } = useApp();
  const [search,         setSearch]         = useState("");
  const [filterRole,     setFilterRole]     = useState("all");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [addTeamFor,     setAddTeamFor]     = useState(null);
  const [addProjectFor,  setAddProjectFor]  = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [taskSearch,     setTaskSearch]     = useState("");
  const [showUserForm,        setShowUserForm]        = useState(false);
  const [editingUser,         setEditingUser]         = useState(null);
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const [deletingUserId,      setDeletingUserId]      = useState(null);
  const [refreshTick,         setRefreshTick]         = useState(0);

  // Merge display: AppContext users + any Firestore users not yet in AppContext (display-only, no AppContext mutation)
  const [mergedUsers, setMergedUsers] = useState(() => dedupUsers(users, deletedUserIds));

  useEffect(() => {
    let cancelled = false;
    getDocs(collection(db, "users")).then((snap) => {
      if (cancelled) return;
      const deletedSet = new Set(deletedUserIds || []);
      const fbUsers = snap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((fb) => !fb.deleted && !deletedSet.has(fb.uid) && !fb.email?.endsWith("@corechestra.io"));

      // Start from current AppContext users (deduplicated)
      const base = dedupUsers(users, deletedUserIds);
      const result = [...base];

      fbUsers.forEach((fb) => {
        const exists = result.some((u) => u.id === fb.uid || u.email === fb.email);
        if (!exists) {
          const prefix = fb.email?.split("@")[0] || "user";
          const fbName = fb.fullName || fb.name;
          const name   = fbName || (prefix.charAt(0).toUpperCase() + prefix.slice(1));
          const color  = PEOPLE_COLORS[fb.uid.charCodeAt(0) % PEOPLE_COLORS.length];
          result.push({ id: fb.uid, name, username: prefix, email: fb.email || "", color, status: "active", role: fb.role || "member", joinedAt: "" });
        } else {
          // Apply Firestore name override to existing entry
          const fbName = fb.fullName || fb.name;
          if (fbName) {
            const idx = result.findIndex((u) => u.id === fb.uid || u.email === fb.email);
            if (idx !== -1 && result[idx].name !== fbName) result[idx] = { ...result[idx], name: fbName };
          }
        }
      });
      setMergedUsers(result);
    }).catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  // Keep in sync when AppContext users changes (e.g. after delete/update), preserve Firestore extras
  useEffect(() => {
    setMergedUsers((prev) => {
      const base = dedupUsers(users, deletedUserIds);
      // Re-apply any Firestore-only entries that were in prev but aren't in AppContext
      const extras = prev.filter((u) => !base.some((b) => b.id === u.id || b.email === u.email));
      return [...base, ...extras];
    });
  }, [users, deletedUserIds]); // eslint-disable-line

  const filtered = mergedUsers.filter((u) => {
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

  const getUserProjects      = (username) => (projects || []).filter((p) =>  (p.memberUsernames || []).includes(username));
  const getAvailableProjects = (username) => (projects || []).filter((p) => !(p.memberUsernames || []).includes(username));

  const addToProject      = (projectId, username) => {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;
    updateProject({ ...p, memberUsernames: [...(p.memberUsernames || []), username] });
    setAddProjectFor(null);
  };
  const removeFromProject = (projectId, username) => {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;
    updateProject({ ...p, memberUsernames: (p.memberUsernames || []).filter((n) => n !== username) });
  };

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
  const expandedUser = mergedUsers.find((u) => u.id === expandedUserId);
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
      {selectedProfileUser && (
        <UserProfileModal user={selectedProfileUser} onClose={() => setSelectedProfileUser(null)} />
      )}
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
          {filtered.length} / {mergedUsers.length} people
        </span>
        <button
          onClick={() => setRefreshTick((t) => t + 1)}
          title="Refresh people list"
          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex-shrink-0"
        >
          <FaSpinner className="w-3.5 h-3.5" />
        </button>
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
          const userTeams        = getUserTeams(user.username);
          const availableTeams   = getAvailableTeams(user.username);
          const userProjects     = getUserProjects(user.username);
          const availableProjects= getAvailableProjects(user.username);
          const roleInfo         = ROLES.find((r) => r.value === user.role);
          const isDropOpen       = addTeamFor    === user.id;
          const isProjDropOpen   = addProjectFor === user.id;

          const isExpanded     = expandedUserId === user.id;
          const userTasks      = getUserTasks(user.username);
          const assignable     = isExpanded ? assignableTasks : [];

          return (
            <SectionCard key={user.id} className="hover:border-slate-300 dark:hover:border-[#3a4055] transition-colors">
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
                            <div className="absolute bottom-full left-0 mb-1.5 z-20 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-xl overflow-hidden min-w-48">
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

                  {/* Projects chips + add dropdown */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {userProjects.length === 0 && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 italic">No projects</span>
                    )}
                    {userProjects.map((proj) => (
                      <span
                        key={proj.id}
                        className="group flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium transition-all"
                        style={{ backgroundColor: proj.color + "15", borderColor: proj.color + "50", color: proj.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: proj.color }} />
                        {proj.name}
                        <button
                          className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-red-500 transition-all leading-none"
                          onClick={() => removeFromProject(proj.id, user.username)}
                          title={`Remove from ${proj.name}`}
                        >
                          <FaTimes className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                    {availableProjects.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setAddProjectFor(isProjDropOpen ? null : user.id)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-dashed border-slate-300 dark:border-[#2a3044] text-slate-400 hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-colors"
                        >
                          <FaPlus className="w-2 h-2" /> Add to project
                        </button>
                        {isProjDropOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setAddProjectFor(null)} />
                            <div className="absolute bottom-full left-0 mb-1.5 z-20 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-xl overflow-hidden min-w-48">
                              <div className="px-3 py-2 text-[10px] text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-[#232838] border-b border-slate-100 dark:border-[#2a3044]">
                                Add to project
                              </div>
                              {availableProjects.map((proj) => (
                                <button
                                  key={proj.id}
                                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors border-b border-slate-50 dark:border-[#2a3044] last:border-0"
                                  onClick={() => addToProject(proj.id, user.username)}
                                >
                                  <span className="w-3 h-3 rounded-lg flex-shrink-0" style={{ backgroundColor: proj.color }} />
                                  <span className="flex-1 text-left truncate font-medium">{proj.name}</span>
                                  <span className="text-[10px] font-mono text-slate-400">{proj.key}</span>
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
                      onClick={() => setSelectedProfileUser(user)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      title="View profile"
                    >
                      <FaExternalLinkAlt className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => { setEditingUser(user); setShowUserForm(false); }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="Edit user"
                    >
                      <FaEdit className="w-3.5 h-3.5" />
                    </button>
                    {deletingUserId === user.id ? (
                      <DeleteConfirm
                        label="Remove?"
                        onConfirm={() => {
                          deleteUser(user.id);
                          updateDoc(doc(db, "users", user.id), { deleted: true }).catch(() =>
                            deleteDoc(doc(db, "users", user.id)).catch(() => {})
                          );
                          setDeletingUserId(null);
                        }}
                        onCancel={() => setDeletingUserId(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setDeletingUserId(user.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete user"
                      >
                        <FaTrash className="w-3.5 h-3.5" />
                      </button>
                    )}
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
                            <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">{taskKey(t.id)}</span>
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
                            <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">{taskKey(t.id)}</span>
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
