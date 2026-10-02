import React, { useState, useEffect } from "react";
import { FaCheckCircle, FaInfoCircle, FaPen } from "react-icons/fa";
import { useHR } from "../../../shared/context/HRContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import { Badge, Card, InfoRow } from "../components/HRSharedUI";
import { HRModal, hrPrimaryButton, hrSecondaryButton } from "../components/HRModal";
import { formatMoney } from "../utils/payslips";
import { toLocalIsoDate } from "../utils/dates";
import { DEFAULT_VACATION_DAYS } from "../utils/timeOff";
import { DEFAULT_DAILY_HOURS, getContractStatus } from "../utils/contract";

const DATE_FIELDS = new Set(["startDate", "contractStartDate"]);

function EditContractModal({ open, onClose, employeeProfile, onSave }) {
  const [fields, setFields] = useState({});
  const [initialFields, setInitialFields] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const next = {
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
        vacationDays: employeeProfile?.vacationDays ?? DEFAULT_VACATION_DAYS,
        standardDailyHours: employeeProfile?.standardDailyHours ?? DEFAULT_DAILY_HOURS,
      };
      setFields(next);
      setInitialFields(next);
    }
  }, [open, employeeProfile]);

  const setField = (key, value) => setFields((previous) => ({ ...previous, [key]: value }));
  const dirty = Object.keys(fields).some((key) => String(fields[key] ?? "") !== String(initialFields[key] ?? ""));
  const inputClassName = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  const handleSave = async () => {
    setSaving(true);
    try {
      const vacationDays = Math.max(0, Math.min(365, Number(fields.vacationDays) || 0));
      const standardDailyHours = Math.max(0.5, Math.min(24, Number(fields.standardDailyHours) || DEFAULT_DAILY_HOURS));
      await onSave({ ...fields, vacationDays, standardDailyHours });
      onClose();
    } catch {
      // the caller shows the error toast; keep the modal open
    } finally {
      setSaving(false);
    }
  };

  return (
    <HRModal
      open={open}
      onClose={onClose}
      title="Edit contract details"
      size="lg"
      dirty={dirty}
      footer={(
        <>
          <button type="button" onClick={onClose} className={hrSecondaryButton}>Cancel</button>
          <button type="submit" form="edit-contract-form" disabled={saving} className={hrPrimaryButton}>
            {saving ? "Saving..." : "Save"}
          </button>
        </>
      )}
    >
      <form id="edit-contract-form" onSubmit={(event) => { event.preventDefault(); handleSave(); }} className="space-y-3">
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
            <label htmlFor={`contract-${key}`} className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
            <input
              id={`contract-${key}`}
              type={DATE_FIELDS.has(key) ? "date" : "text"}
              value={fields[key] || ""}
              onChange={(event) => setField(key, event.target.value)}
              className={inputClassName + (DATE_FIELDS.has(key) ? " [color-scheme:light] dark:[color-scheme:dark]" : "")}
            />
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="contract-vacation-days" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Annual leave (days / year)</label>
            <input id="contract-vacation-days" type="number" min={0} max={365} value={fields.vacationDays ?? ""} onChange={(event) => setField("vacationDays", event.target.value)} className={inputClassName} />
          </div>
          <div>
            <label htmlFor="contract-daily-hours" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Standard working day (hours)</label>
            <input id="contract-daily-hours" type="number" min={0.5} max={24} step={0.5} value={fields.standardDailyHours ?? ""} onChange={(event) => setField("standardDailyHours", event.target.value)} className={inputClassName} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="contract-salary-currency" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Currency</label>
            <input id="contract-salary-currency" value={fields.salaryCurrency || ""} onChange={(event) => setField("salaryCurrency", event.target.value.toUpperCase().slice(0, 3))} placeholder="USD" className={inputClassName} />
          </div>
          <div>
            <label htmlFor="contract-salary" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Salary</label>
            <input id="contract-salary" type="number" value={fields.salary || ""} onChange={(event) => setField("salary", event.target.value)} className={inputClassName} />
          </div>
          <div>
            <label htmlFor="contract-salary-type" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Type</label>
            <select id="contract-salary-type" value={fields.salaryType || "Annual"} onChange={(event) => setField("salaryType", event.target.value)} className={inputClassName}>
              <option>Annual</option>
              <option>Monthly</option>
              <option>Hourly</option>
            </select>
          </div>
        </div>
      </form>
    </HRModal>
  );
}

export function ContractTab({ userName, setActiveTab }) {
  const { employeeProfile, updateEmployeeProfile, documents } = useHR();
  const { isAdmin } = useAuth();
  const { addToast } = useToast();
  const [editModal, setEditModal] = useState(false);

  const handleSaveContract = async (fields) => {
    try {
      await updateEmployeeProfile(fields);
      addToast("Contract details saved", "success");
    } catch (error) {
      addToast(error.message || "Could not save contract details", "error");
      throw error;
    }
  };

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
  const salary = profile.salary ? formatMoney(profile.salary, profile.salaryCurrency) : "—";
  const salaryType = profile.salaryType || "Annual";
  const vacationDays = profile.vacationDays ?? DEFAULT_VACATION_DAYS;
  const dailyHours = profile.standardDailyHours ?? DEFAULT_DAILY_HOURS;
  const status = getContractStatus(profile, toLocalIsoDate());
  const signatureDocs = (documents || []).filter((document) => (document.actions || []).includes("sign"));

  return (
    <div>
      <EditContractModal open={editModal} onClose={() => setEditModal(false)} employeeProfile={employeeProfile} onSave={handleSaveContract} />

      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{userName} - {jobTitle}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">{workerType}</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{jobTitle}</span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <Badge color={status.tone}><span className={`w-1.5 h-1.5 rounded-full inline-block ${status.tone === "green" ? "bg-green-500" : status.tone === "amber" ? "bg-amber-500" : "bg-slate-400"}`} /> {status.label}</Badge>
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
          <InfoRow label="Annual leave" value={`${vacationDays} days / year`} />
          <InfoRow label="Standard working day" value={`${dailyHours}h`} />
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Agreement and signatures</h3>
            {signatureDocs.length === 0 ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-[#232838]">
                <FaInfoCircle className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">No documents require your signature</span>
              </div>
            ) : (
              <div className="space-y-2">
                {signatureDocs.map((document) => (
                  <div key={document.id} className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-[#232838]">
                    {document.status === "signed"
                      ? <FaCheckCircle className="w-3.5 h-3.5 text-green-500" />
                      : <FaPen className="w-3 h-3 text-amber-500" />}
                    <span className="text-xs text-slate-700 dark:text-slate-200 flex-1 truncate">{document.name}</span>
                    <span className={`text-[11px] ${document.status === "signed" ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                      {document.status === "signed" ? `Signed${document.signedAt ? ` ${document.signedAt.slice(0, 10)}` : ""}` : "Awaiting signature"}
                    </span>
                  </div>
                ))}
                {setActiveTab && (
                  <button type="button" onClick={() => setActiveTab("documents")} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Open documents</button>
                )}
              </div>
            )}
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
