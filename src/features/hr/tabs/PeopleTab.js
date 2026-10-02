import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaBriefcase, FaFilter, FaSearch } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useHR } from "../../../shared/context/HRContext";
import { useToast } from "../../../shared/context/ToastContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { Avatar, Card } from "../components/HRSharedUI";
import { HRModal, hrPrimaryButton, hrSecondaryButton } from "../components/HRModal";
import { useConfirm } from "../../../shared/context/ConfirmContext";
import { PersonProfileModal } from "../components/PersonProfileModal";
import { getAllocationsForPerson, personTitle } from "../utils/people";

function SetManagerModal({ open, onClose, employee, allUsers, onSave }) {
  const [selected, setSelected] = useState(employee?.managerId || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(employee?.managerId || "");
    }
  }, [open, employee]);

  // Exclude the employee and everyone below them so a manager change cannot create a cycle.
  const blocked = useMemo(() => {
    const result = new Set([employee?.id]);
    const queue = [employee?.id];
    while (queue.length) {
      const managerId = queue.shift();
      (allUsers || []).forEach((user) => {
        if (user.managerId === managerId && !result.has(user.id)) {
          result.add(user.id);
          queue.push(user.id);
        }
      });
    }
    return result;
  }, [allUsers, employee?.id]);
  const options = [...new Map((allUsers || []).map((user) => [user.id, user])).values()].filter((user) => !blocked.has(user.id));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(employee, selected || null);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const dirty = selected !== (employee?.managerId || "");

  return (
    <HRModal
      open={open}
      onClose={onClose}
      title={`Set manager for ${employee?.name || ""}`}
      size="sm"
      dirty={dirty}
      footer={(
        <>
          <button type="button" onClick={onClose} className={hrSecondaryButton}>Cancel</button>
          <button type="submit" form="set-manager-form" disabled={saving} className={hrPrimaryButton}>
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      )}
    >
      <form id="set-manager-form" onSubmit={(event) => { event.preventDefault(); handleSave(); }}>
        <select
          aria-label="Select manager"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">— No manager —</option>
          {options.map((user) => (
            <option key={user.id} value={user.id}>{user.name || user.email}</option>
          ))}
        </select>
      </form>
    </HRModal>
  );
}

function SetAllocationModal({ open, onClose, employee, projects, allocations, onSave, onRemove }) {
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [allocation, setAllocation] = useState(100);
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);
  const initialisedRef = useRef(false);

  const applyProject = (nextProjectId) => {
    const existing = (allocations || []).find((item) => item.projectId === nextProjectId);
    setProjectId(nextProjectId);
    setAllocation(existing?.allocation ?? 100);
    setRole(existing?.role || "");
  };

  useEffect(() => {
    if (!open) {
      initialisedRef.current = false;
      return;
    }
    if (initialisedRef.current) return;
    initialisedRef.current = true;
    applyProject((allocations || [])[0]?.projectId || projects[0]?.id || "");
  }, [allocations, open, projects]); // eslint-disable-line react-hooks/exhaustive-deps

  const explicitForProject = (allocations || []).find((item) => item.projectId === projectId && !item.derived);
  const clampedAllocation = Math.max(0, Math.min(100, Number(allocation) || 0));

  const handleSave = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      await onSave({
        userId: employee.id,
        projectId,
        allocation: clampedAllocation,
        role,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!explicitForProject) return;
    setSaving(true);
    try {
      await onRemove({ userId: employee.id, projectId });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const inputClassName = "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const savedForProject = (allocations || []).find((item) => item.projectId === projectId);
  const dirty = String(allocation) !== String(savedForProject?.allocation ?? 100) || role !== (savedForProject?.role || "");

  return (
    <HRModal
      open={open}
      onClose={onClose}
      title={`Project allocation for ${employee?.name || ""}`}
      size="sm"
      dirty={dirty}
      footer={(
        <>
          {explicitForProject && (
            <button type="button" onClick={handleRemove} disabled={saving} className="mr-auto px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors disabled:opacity-50">
              Remove
            </button>
          )}
          <button type="button" onClick={onClose} className={hrSecondaryButton}>Cancel</button>
          <button type="submit" form="set-allocation-form" disabled={saving || !projectId} className={hrPrimaryButton}>
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      )}
    >
      <form id="set-allocation-form" onSubmit={(event) => { event.preventDefault(); handleSave(); }} className="space-y-3">
        <div>
          <label htmlFor="allocation-project" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Project</label>
          <select id="allocation-project" value={projectId} onChange={(event) => applyProject(event.target.value)} className={inputClassName}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="allocation-percent" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Allocation %</label>
          <input id="allocation-percent" type="number" min={0} max={100} value={allocation} onChange={(event) => setAllocation(event.target.value)} className={inputClassName} />
        </div>
        <div>
          <label htmlFor="allocation-role" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Project role</label>
          <input id="allocation-role" value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Tech lead" className={inputClassName} />
        </div>
      </form>
    </HRModal>
  );
}

const EMPTY_FILTERS = { manager: "any", country: "", status: "", projectId: "" };

function PeopleFilterMenu({ open, onClose, filters, setFilters, countries, projects }) {
  const menuRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) onClose();
    };
    const keyHandler = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    window.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", keyHandler);
    };
  }, [onClose, open]);

  if (!open) return null;
  const selectClassName = "w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const update = (key, value) => setFilters((previous) => ({ ...previous, [key]: value }));

  return (
    <div ref={menuRef} role="dialog" aria-label="Filter people" className="absolute right-0 top-full mt-2 z-30 w-64 p-4 rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1a1f2e] shadow-xl space-y-3">
      <div>
        <label htmlFor="people-filter-manager" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Manager</label>
        <select id="people-filter-manager" value={filters.manager} onChange={(event) => update("manager", event.target.value)} className={selectClassName}>
          <option value="any">Anyone</option>
          <option value="has">Has a manager</option>
          <option value="none">No manager</option>
          <option value="managers">People managers</option>
        </select>
      </div>
      <div>
        <label htmlFor="people-filter-country" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Country</label>
        <select id="people-filter-country" value={filters.country} onChange={(event) => update("country", event.target.value)} className={selectClassName}>
          <option value="">All countries</option>
          {countries.map((country) => <option key={country} value={country}>{country}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="people-filter-status" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Status</label>
        <select id="people-filter-status" value={filters.status} onChange={(event) => update("status", event.target.value)} className={selectClassName}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div>
        <label htmlFor="people-filter-project" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">Project</label>
        <select id="people-filter-project" value={filters.projectId} onChange={(event) => update("projectId", event.target.value)} className={selectClassName}>
          <option value="">All projects</option>
          <option value="__none__">Unassigned</option>
          {(projects || []).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
      </div>
      <div className="flex justify-between pt-1">
        <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">Clear filters</button>
        <button type="button" onClick={onClose} className="text-xs font-medium text-blue-600 dark:text-blue-400">Done</button>
      </div>
    </div>
  );
}

export function PeopleTab({ employees, currentUserId }) {
  const { canPerform } = usePermissions();
  // Manager, allocation and offboarding changes edit People records → require "Manage users".
  const canManagePeople = canPerform("user:manage");
  const { updateUser, projects, templateRegistry } = useApp();
  const { projectAllocations, upsertProjectAllocation, removeProjectAllocation, createOnboardingWorkflow, onboardingWorkflows, allAbsences } = useHR();
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");
  const [managerModal, setManagerModal] = useState(null);
  const [allocationModal, setAllocationModal] = useState(null);
  const [profilePerson, setProfilePerson] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const deduped = useMemo(
    () => [...new Map((employees || []).map((user) => [user.id, user])).values()],
    [employees],
  );

  const countries = useMemo(
    () => [...new Set(deduped.map((employee) => employee.country).filter(Boolean))].sort(),
    [deduped],
  );
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => (key === "manager" ? value !== "any" : !!value)).length;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return deduped.filter((employee) => {
      if (query && ![employee.name, employee.role, employee.title, employee.email, employee.department]
        .some((value) => String(value || "").toLowerCase().includes(query))) return false;
      if (filters.manager === "has" && !employee.managerId) return false;
      if (filters.manager === "none" && employee.managerId) return false;
      if (filters.manager === "managers" && !deduped.some((user) => user.managerId === employee.id)) return false;
      if (filters.country && employee.country !== filters.country) return false;
      if (filters.status && (employee.status || "active") !== filters.status) return false;
      if (filters.projectId) {
        const allocations = getAllocationsForPerson(employee, projectAllocations, projects);
        if (filters.projectId === "__none__" ? allocations.length > 0 : !allocations.some((item) => item.projectId === filters.projectId)) return false;
      }
      return true;
    });
  }, [deduped, filters, projectAllocations, projects, search]);

  const getManagerName = (managerId) => {
    if (!managerId) return null;
    const manager = deduped.find((user) => user.id === managerId);
    return manager?.name || null;
  };

  const getDirectReports = (userId) => deduped.filter((user) => user.managerId === userId).length;
  const getAllocations = (employee) => getAllocationsForPerson(employee, projectAllocations, projects);

  const handleSaveManager = async (employee, managerId) => {
    if (!canManagePeople) {
      addToast("You do not have permission to manage people", "error");
      return;
    }
    try {
      await updateUser({ ...employee, managerId: managerId || null });
      addToast(managerId ? `Manager updated for ${employee.name}` : `Manager removed for ${employee.name}`, "success");
    } catch (error) {
      addToast(error.message || "Could not update manager", "error");
      throw error;
    }
  };

  const handleSaveAllocation = async (payload) => {
    if (!canManagePeople) return;
    try {
      await upsertProjectAllocation(payload);
      addToast("Allocation saved", "success");
    } catch (error) {
      addToast(error.message || "Could not save allocation", "error");
      throw error;
    }
  };

  const handleRemoveAllocation = async (payload) => {
    if (!canManagePeople) return;
    try {
      await removeProjectAllocation(payload);
      addToast("Allocation removed", "success");
    } catch (error) {
      addToast(error.message || "Could not remove allocation", "error");
      throw error;
    }
  };

  const hasActiveOffboarding = (employee) => (onboardingWorkflows || []).some((workflow) => (
    workflow.type === "offboarding" && workflow.userId === employee.id && workflow.status !== "completed" && workflow.status !== "cancelled"
  ));

  const handleStartOffboarding = async (employee) => {
    if (!canManagePeople) return;
    if (hasActiveOffboarding(employee)) {
      addToast(`${employee.name} already has an active offboarding workflow`, "info");
      return;
    }
    const ok = await confirm({
      title: `Start offboarding for ${employee.name}?`,
      description: "A checklist will appear on the HR overview. Access is not revoked automatically — complete the \"Revoke workspace access\" step in Admin.",
      confirmLabel: "Start offboarding",
      tone: "warning",
    });
    if (!ok) return;
    const template = (templateRegistry?.offboarding || [])[0];
    try {
      await createOnboardingWorkflow({
        userId: employee.id,
        type: "offboarding",
        title: `${employee.name} offboarding`,
        templateId: template?.id || null,
        steps: template?.steps || [
          "Confirm final working day",
          "Revoke workspace access",
          "Collect company assets",
          "Schedule exit handover",
        ],
      });
      addToast(`Offboarding workflow created for ${employee.name}`, "success");
    } catch (error) {
      addToast(error.message || "Could not start offboarding", "error");
    }
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
          projects={projects || []}
          allocations={getAllocations(allocationModal)}
          onSave={handleSaveAllocation}
          onRemove={handleRemoveAllocation}
        />
      )}
      <PersonProfileModal
        person={profilePerson}
        users={deduped}
        projects={projects}
        projectAllocations={projectAllocations}
        absences={allAbsences}
        onClose={() => setProfilePerson(null)}
        onSelectPerson={setProfilePerson}
      />

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, title, email..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="relative ml-auto">
          <button
            type="button"
            aria-label="Filter people"
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((value) => !value)}
            className={`relative flex items-center gap-1.5 px-3 py-2 text-xs border rounded-lg transition-colors ${activeFilterCount > 0 ? "border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838]"}`}
          >
            <FaFilter className="w-3 h-3" /> Filters
            {activeFilterCount > 0 && <span className="ml-0.5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-semibold">{activeFilterCount}</span>}
          </button>
          <PeopleFilterMenu
            open={filterOpen}
            onClose={() => setFilterOpen(false)}
            filters={filters}
            setFilters={setFilters}
            countries={countries}
            projects={projects}
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-[#2a3044]">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {filtered.length === deduped.length ? `Total ${filtered.length} people` : `Showing ${filtered.length} of ${deduped.length} people`}
          </span>
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
                {canManagePeople && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canManagePeople ? 6 : 5} className="px-4 py-10 text-center text-xs text-slate-400 dark:text-slate-500">No people match the current search or filters.</td>
                </tr>
              )}
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
                          <button type="button" onClick={() => setProfilePerson(employee)} className="text-xs font-medium text-blue-500 hover:text-blue-400 hover:underline text-left">
                            {employee.name || employee.email} {employee.id === currentUserId && <span className="text-[10px] text-slate-400 dark:text-slate-500">(You)</span>}
                          </button>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {personTitle(employee)}
                            {employee.status === "inactive" && <span className="ml-1 text-slate-400">· inactive</span>}
                          </p>
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
                            const project = (projects || []).find((item) => item.id === allocation.projectId);
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
                    {canManagePeople && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
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
                            disabled={hasActiveOffboarding(employee)}
                            title={hasActiveOffboarding(employee) ? "Offboarding already in progress" : undefined}
                            className="disabled:opacity-50 disabled:cursor-not-allowed text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-2.5 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
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
