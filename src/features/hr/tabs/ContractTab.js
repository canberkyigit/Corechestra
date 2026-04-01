import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaInfoCircle, FaPen, FaTimes } from "react-icons/fa";
import { useHR } from "../../../shared/context/HRContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { Badge, Card, InfoRow } from "../components/HRSharedUI";

function EditContractModal({ open, onClose, employeeProfile, onSave }) {
  const [fields, setFields] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFields({
        jobTitle: employeeProfile?.jobTitle || "",
        employmentType: employeeProfile?.employmentType || "",
        seniorityLevel: employeeProfile?.seniorityLevel || "",
        workLocation: employeeProfile?.workLocation || "",
        startDate: employeeProfile?.startDate || "",
        contractStartDate: employeeProfile?.contractStartDate || "",
        workerType: employeeProfile?.workerType || "",
        workSchedule: employeeProfile?.workSchedule || "",
        salary: employeeProfile?.salary || "",
        salaryCurrency: employeeProfile?.salaryCurrency || "",
        salaryType: employeeProfile?.salaryType || "Annual",
        nationalId: employeeProfile?.nationalId || "",
        employeeNumber: employeeProfile?.employeeNumber || "",
      });
    }
  }, [open, employeeProfile]);

  const setField = (key, value) => setFields((previous) => ({ ...previous, [key]: value }));
  const inputClassName = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(fields);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div key="md" initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a3044] max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#2a3044] sticky top-0 bg-white dark:bg-[#1a1f2e] z-10">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Edit contract details</h2>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                {[
                  ["Job title", "jobTitle"],
                  ["Employment type", "employmentType"],
                  ["Worker type", "workerType"],
                  ["Seniority level", "seniorityLevel"],
                  ["Work location", "workLocation"],
                  ["Work schedule", "workSchedule"],
                  ["Start date", "startDate"],
                  ["Contract start date", "contractStartDate"],
                  ["National ID", "nationalId"],
                  ["Employee number", "employeeNumber"],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                    <input value={fields[key] || ""} onChange={(event) => setField(key, event.target.value)} className={inputClassName} />
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Currency</label>
                    <input value={fields.salaryCurrency || ""} onChange={(event) => setField("salaryCurrency", event.target.value)} placeholder="USD" className={inputClassName} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Salary</label>
                    <input type="number" value={fields.salary || ""} onChange={(event) => setField("salary", event.target.value)} className={inputClassName} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Type</label>
                    <select value={fields.salaryType || "Annual"} onChange={(event) => setField("salaryType", event.target.value)} className={inputClassName}>
                      <option>Annual</option>
                      <option>Monthly</option>
                      <option>Hourly</option>
                    </select>
                  </div>
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

export function ContractTab({ userName }) {
  const { employeeProfile, updateEmployeeProfile } = useHR();
  const { isAdmin } = useAuth();
  const [editModal, setEditModal] = useState(false);

  const profile = employeeProfile || {};
  const jobTitle = profile.jobTitle || "—";
  const employmentType = profile.employmentType || "—";
  const workerType = profile.workerType || "Direct Employee";
  const seniority = profile.seniorityLevel || "—";
  const country = profile.country || "—";
  const startDate = profile.startDate || "—";
  const contractStartDate = profile.contractStartDate || "—";
  const workSchedule = profile.workSchedule || "Not specified";
  const nationalId = profile.nationalId || "—";
  const employeeNumber = profile.employeeNumber || "—";
  const salary = profile.salary ? `${profile.salaryCurrency || ""}${profile.salary}` : "—";
  const salaryType = profile.salaryType || "Annual";

  return (
    <div>
      <EditContractModal open={editModal} onClose={() => setEditModal(false)} employeeProfile={employeeProfile} onSave={updateEmployeeProfile} />

      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{userName} - {jobTitle}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">{workerType}</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{jobTitle}</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <Badge color="green"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Active</Badge>
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setEditModal(true)} className="flex items-center gap-1.5 px-4 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
              <FaPen className="w-3 h-3" /> Edit contract
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Agreement details</h3>
          <InfoRow label="Contract start date" value={contractStartDate} />
          <InfoRow label="Worker type" value={workerType} />
          <InfoRow label="Employment type" value={employmentType} />
          <InfoRow label="Work schedule" value={workSchedule === "Not specified" ? <span className="text-slate-400 dark:text-slate-500">{workSchedule}</span> : workSchedule} />
          <InfoRow label="Job title" value={jobTitle} />
          <InfoRow label="Seniority level" value={seniority} />
          <InfoRow label="Country" value={country} />
          <InfoRow label="Start date" value={startDate} />
          <InfoRow label="Employee number" value={employeeNumber} />
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Agreement and signatures</h3>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-[#232838]">
              <FaInfoCircle className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">No uploaded employment agreement</span>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Compensation details</h3>
            <InfoRow label="Compensation type" value={salaryType} />
            <InfoRow label="Gross salary" value={<span className="font-semibold">{salary}</span>} />
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Additional details</h3>
            <InfoRow label="National ID" value={nationalId} />
          </Card>
        </div>
      </div>
    </div>
  );
}
