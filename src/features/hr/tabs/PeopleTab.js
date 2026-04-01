import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaBriefcase, FaSearch, FaTimes } from "react-icons/fa";
import { useAuth } from "../../../shared/context/AuthContext";
import { useApp } from "../../../shared/context/AppContext";
import { useHR } from "../../../shared/context/HRContext";
import { useToast } from "../../../shared/context/ToastContext";
import { Avatar, Card } from "../components/HRSharedUI";

function SetManagerModal({ open, onClose, employee, allUsers, onSave }) {
  const [selected, setSelected] = useState(employee?.managerId || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(employee?.managerId || "");
    }
  }, [open, employee]);

  const options = [...new Map((allUsers || []).map((user) => [user.id, user])).values()].filter((user) => user.id !== employee?.id);

  const handleSave = async () => {
    setSaving(true);
    await onSave(employee, selected || null);
    setSaving(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full max-w-sm bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a3044] overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#2a3044]">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Set manager for {employee?.name}</h2>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <select
                  value={selected}
                  onChange={(event) => setSelected(event.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— No manager —</option>
                  {options.map((user) => (
                    <option key={user.id} value={user.id}>{user.name || user.email}</option>
                  ))}
                </select>
              </div>
              <div className="px-5 py-4 border-t border-slate-200 dark:border-[#2a3044] flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SetAllocationModal({ open, onClose, employee, projects, allocations, onSave }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [allocation, setAllocation] = useState(100);
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const existing = (allocations || [])[0];
    setProjectId(existing?.projectId || projects[0]?.id || "");
    setAllocation(existing?.allocation || 100);
    setRole(existing?.role || "");
  }, [allocations, open, projects]);

  const handleSave = async () => {
    if (!projectId) return;
    setSaving(true);
    await onSave({
      userId: employee.id,
      projectId,
      allocation: Number(allocation) || 0,
      role,
    });
    setSaving(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-sm bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a3044] overflow-hidden" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#2a3044]">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Project allocation for {employee?.name}</h2>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Project</label>
                  <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Allocation %</label>
                  <input type="number" min={0} max={100} value={allocation} onChange={(event) => setAllocation(event.target.value)} className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Project role</label>
                  <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Tech lead" className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-200 dark:border-[#2a3044] flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function PeopleTab({ employees, currentUserId }) {
  const { isAdmin } = useAuth();
  const { updateUser, projects, templateRegistry } = useApp();
  const { projectAllocations, upsertProjectAllocation, createOnboardingWorkflow } = useHR();
  const { addToast } = useToast();
  const [search, setSearch] = useState("");
  const [managerModal, setManagerModal] = useState(null);
  const [allocationModal, setAllocationModal] = useState(null);

  const deduped = useMemo(
    () => [...new Map((employees || []).map((user) => [user.id, user])).values()],
    [employees],
  );

  const filtered = useMemo(
    () => deduped.filter((employee) =>
      (employee.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (employee.role || "").toLowerCase().includes(search.toLowerCase())),
    [search, deduped],
  );

  const getManagerName = (managerId) => {
    if (!managerId) return null;
    const manager = deduped.find((user) => user.id === managerId);
    return manager?.name || null;
  };

  const getDirectReports = (userId) => deduped.filter((user) => user.managerId === userId).length;
  const getAllocations = (employee) => {
    const explicitAllocations = (projectAllocations || []).filter((item) => item.userId === employee.id);
    if (explicitAllocations.length > 0) return explicitAllocations;
    return (projects || [])
      .filter((project) => (
        (project.members || []).some((member) => member.userId === employee.id)
        || (project.memberUsernames || []).includes(employee.username)
      ))
      .map((project) => ({
        id: `derived-${project.id}-${employee.id}`,
        userId: employee.id,
        projectId: project.id,
        allocation: 100,
        role: "Team member",
      }));
  };

  const handleSaveManager = async (employee, managerId) => {
    await updateUser({ ...employee, managerId: managerId || null });
  };

  const handleStartOffboarding = async (employee) => {
    await createOnboardingWorkflow({
      userId: employee.id,
      type: "offboarding",
      title: `${employee.name} offboarding`,
      templateId: (templateRegistry?.approval || [])[0]?.id || null,
      steps: [
        "Confirm final working day",
        "Revoke workspace access",
        "Collect company assets",
        "Schedule exit handover",
      ],
    });
    addToast(`Offboarding workflow created for ${employee.name}`, "success");
  };

  return (
    <div>
      {managerModal && (
        <SetManagerModal
          open={!!managerModal}
          onClose={() => setManagerModal(null)}
          employee={managerModal}
          allUsers={deduped}
          onSave={handleSaveManager}
        />
      )}
      {allocationModal && (
        <SetAllocationModal
          open={!!allocationModal}
          onClose={() => setAllocationModal(null)}
          employee={allocationModal}
          projects={projects}
          allocations={getAllocations(allocationModal)}
          onSave={upsertProjectAllocation}
        />
      )}

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <button className="ml-auto p-2 text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-[#2a3044]">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total {filtered.length} people</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#2a3044]">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">Person</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">Country</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">Manager</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">Reports</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">Projects / Capacity</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((employee) => {
                const managerName = getManagerName(employee.managerId);
                const reportsCount = getDirectReports(employee.id);
                const allocations = getAllocations(employee);

                return (
                  <tr
                    key={employee.id}
                    className={`border-b border-slate-100 dark:border-[#2a3044]/50 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors last:border-0 ${employee.id === currentUserId ? "bg-blue-50/30 dark:bg-blue-900/10" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={employee.name || "?"} color={employee.color} size="sm" />
                        <div>
                          <p className="text-xs font-medium text-blue-500 hover:text-blue-400 cursor-pointer">
                            {employee.name} {employee.id === currentUserId && <span className="text-[10px] text-slate-400 dark:text-slate-500">(You)</span>}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{employee.role || employee.status || "Team Member"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {employee.country ? (
                        <div className="flex items-center gap-1.5">
                          {employee.flag && <span className="text-base">{employee.flag}</span>}
                          <span className="text-xs text-slate-600 dark:text-slate-400">{employee.country}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {managerName ? (
                        <span className="text-xs text-blue-500">{managerName}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {reportsCount > 0 ? (
                        <span className="text-xs text-slate-600 dark:text-slate-300">{reportsCount} report{reportsCount !== 1 ? "s" : ""}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {allocations.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {allocations.slice(0, 2).map((allocation) => {
                            const project = projects.find((item) => item.id === allocation.projectId);
                            return (
                              <span key={allocation.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                                <FaBriefcase className="w-2.5 h-2.5" />
                                {project?.name || allocation.projectId} • {allocation.allocation}%
                              </span>
                            );
                          })}
                          {allocations.length > 2 && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">+{allocations.length - 2} more</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Unassigned</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setAllocationModal(employee)}
                            className="text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] px-2.5 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
                          >
                            Allocation
                          </button>
                          <button
                            onClick={() => setManagerModal(employee)}
                            className="text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] px-2.5 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
                          >
                            Set manager
                          </button>
                          <button
                            onClick={() => handleStartOffboarding(employee)}
                            className="text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-2.5 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                          >
                            Offboarding
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
