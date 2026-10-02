import React, { useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaChevronLeft, FaChevronRight, FaSyncAlt, FaUmbrellaBeach } from "react-icons/fa";
import { useHR } from "../../../shared/context/HRContext";
import { useToast } from "../../../shared/context/ToastContext";
import { Badge, Card } from "../components/HRSharedUI";
import { HRModal, hrPrimaryButton, hrSecondaryButton } from "../components/HRModal";
import { toLocalIsoDate } from "../utils/dates";
import { getStandardDailyHours } from "../utils/contract";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const ENTRY_TYPES = [
  { value: "work", label: "Work" },
  { value: "sick", label: "Sick leave" },
  { value: "vacation", label: "Vacation" },
  { value: "other", label: "Other" },
];

export function computeWorkHours(startTime, endTime, breakMinutes) {
  if (!startTime || !endTime) return 0;
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const diff = (endHour * 60 + endMinute) - (startHour * 60 + startMinute) - (Number(breakMinutes) || 0);
  return Math.max(0, Math.round(diff / 6) / 10);
}

/**
 * Builds the entry payload. Work entries are computed from start/end/break; leave entries
 * (sick/vacation/other) record the credited hours explicitly (default: the contract's
 * standard working day) and carry no time period.
 */
export function buildTimeEntry({ date, type, startTime, endTime, breakMinutes, leaveHours }) {
  if (type === "work") {
    return {
      date,
      type,
      startTime,
      endTime,
      breakMinutes: Number(breakMinutes) || 0,
      hours: computeWorkHours(startTime, endTime, breakMinutes),
    };
  }
  const hours = Math.max(0, Math.min(24, Math.round((Number(leaveHours) || 0) * 10) / 10));
  return { date, type, startTime: null, endTime: null, breakMinutes: 0, hours };
}

function SubmitHoursModal({ open, onClose, prefillDate, existingEntry, dailyHours }) {
  const { submitHours, deleteTimeEntry } = useHR();
  const { addToast } = useToast();
  const [date, setDate] = useState("");
  const [type, setType] = useState("work");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [leaveHours, setLeaveHours] = useState(dailyHours);
  const [saving, setSaving] = useState(false);
  const [initialValues, setInitialValues] = useState(null);

  useEffect(() => {
    if (!open) return;
    const next = {
      date: existingEntry?.date || prefillDate || toLocalIsoDate(),
      type: existingEntry?.type || "work",
      startTime: existingEntry?.startTime || "09:00",
      endTime: existingEntry?.endTime || "18:00",
      breakMinutes: existingEntry?.breakMinutes ?? 60,
      leaveHours: existingEntry && existingEntry.type !== "work" ? existingEntry.hours ?? dailyHours : dailyHours,
    };
    setDate(next.date);
    setType(next.type);
    setStartTime(next.startTime);
    setEndTime(next.endTime);
    setBreakMinutes(next.breakMinutes);
    setLeaveHours(next.leaveHours);
    setInitialValues(next);
  }, [dailyHours, existingEntry, open, prefillDate]);

  const current = { date, type, startTime, endTime, breakMinutes, leaveHours };
  const dirty = Boolean(initialValues) && Object.keys(current).some((key) => String(current[key] ?? "") !== String(initialValues[key] ?? ""));

  const totalHours = useMemo(() => computeWorkHours(startTime, endTime, breakMinutes), [startTime, endTime, breakMinutes]);
  const invalidWork = type === "work" && totalHours <= 0;
  const invalidLeave = type !== "work" && !(Number(leaveHours) >= 0 && Number(leaveHours) <= 24);

  const handleSave = async () => {
    if (!date || saving || invalidWork || invalidLeave) return;
    setSaving(true);
    try {
      await submitHours(buildTimeEntry({ date, type, startTime, endTime, breakMinutes, leaveHours }));
      addToast("Hours submitted for approval", "success");
      onClose();
    } catch (error) {
      addToast(error.message || "Could not submit hours", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async () => {
    if (!existingEntry?.id || saving) return;
    setSaving(true);
    try {
      await deleteTimeEntry(existingEntry.id);
      addToast("Entry withdrawn", "info");
      onClose();
    } catch (error) {
      addToast(error.message || "Could not withdraw the entry", "error");
    } finally {
      setSaving(false);
    }
  };

  const inputClassName = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <HRModal
      open={open}
      onClose={onClose}
      title={existingEntry ? "Update hours" : "Submit hours"}
      size="md"
      dirty={dirty}
      footer={(
        <>
          {existingEntry?.id && existingEntry.status !== "approved" && (
            <button type="button" onClick={handleWithdraw} disabled={saving} className="mr-auto px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors disabled:opacity-50">
              Withdraw
            </button>
          )}
          <button type="button" onClick={onClose} className={hrSecondaryButton}>Cancel</button>
          <button type="submit" form="submit-hours-form" disabled={!date || saving || invalidWork || invalidLeave} className={hrPrimaryButton}>
            {saving ? "Saving..." : existingEntry ? "Resubmit" : "Submit"}
          </button>
        </>
      )}
    >
      <form id="submit-hours-form" onSubmit={(event) => { event.preventDefault(); handleSave(); }} className="space-y-3">
        {existingEntry?.status === "rejected" && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            Rejected{existingEntry.resolvedByName ? ` by ${existingEntry.resolvedByName}` : ""}{existingEntry.decisionNote ? `: ${existingEntry.decisionNote}` : ""}. Update and resubmit.
          </div>
        )}
        <div>
          <label htmlFor="time-entry-date" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Date</label>
          <input id="time-entry-date" type="date" value={date} disabled={!!existingEntry} onChange={(event) => setDate(event.target.value)} className={inputClassName + " disabled:opacity-60 [color-scheme:light] dark:[color-scheme:dark]"} />
        </div>
        <div>
          <label htmlFor="time-entry-type" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Type</label>
          <select id="time-entry-type" value={type} onChange={(event) => setType(event.target.value)} className={inputClassName}>
            {ENTRY_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        {type === "work" ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="time-entry-start" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Start time</label>
                <input id="time-entry-start" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={inputClassName} />
              </div>
              <div>
                <label htmlFor="time-entry-end" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">End time</label>
                <input id="time-entry-end" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className={inputClassName} />
              </div>
              <div>
                <label htmlFor="time-entry-break" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Break (min)</label>
                <input id="time-entry-break" type="number" min={0} max={480} value={breakMinutes} onChange={(event) => setBreakMinutes(event.target.value)} className={inputClassName} />
              </div>
            </div>
            <div className={`flex items-center justify-between p-3 rounded-lg ${invalidWork ? "bg-red-50 dark:bg-red-900/10" : "bg-slate-50 dark:bg-[#232838]"}`}>
              <span className="text-xs text-slate-500 dark:text-slate-400">{invalidWork ? "End time must be after start time plus break" : "Total hours"}</span>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{totalHours}h</span>
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="time-entry-leave-hours" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Hours credited</label>
            <input id="time-entry-leave-hours" type="number" min={0} max={24} step={0.5} value={leaveHours} onChange={(event) => setLeaveHours(event.target.value)} className={inputClassName} />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Defaults to your standard working day ({dailyHours}h). Use a lower value for a partial day. Leave hours are tracked separately from hours worked.
            </p>
          </div>
        )}
      </form>
    </HRModal>
  );
}

export function summarizeMonth(timeEntries, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const inMonth = (timeEntries || []).filter((entry) => String(entry.date).startsWith(prefix));
  const sum = (list) => Math.round(list.reduce((total, entry) => total + (Number(entry.hours) || 0), 0) * 10) / 10;
  const work = inMonth.filter((entry) => (entry.type || "work") === "work");
  return {
    approved: sum(work.filter((entry) => entry.status === "approved")),
    pending: sum(work.filter((entry) => entry.status === "pending")),
    leave: sum(inMonth.filter((entry) => (entry.type || "work") !== "work" && entry.status !== "rejected")),
  };
}

export function TimeTrackingTab() {
  const { timeEntries, employeeProfile } = useHR();
  const [viewDate, setViewDate] = useState(new Date());
  const [submitModal, setSubmitModal] = useState(null);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const dailyHours = getStandardDailyHours(employeeProfile);

  const monthEntries = useMemo(() => {
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const entries = [];
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(viewYear, viewMonth, day);
      const dayOfWeek = date.getDay();
      const dateString = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const saved = (timeEntries || []).find((entry) => entry.date === dateString);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const type = saved?.type || (isWeekend ? "weekend" : "work");
      entries.push({
        dateStr: dateString,
        label: `${DAY_NAMES[dayOfWeek]} ${MONTH_NAMES[viewMonth].slice(0, 3)} ${day}`,
        type,
        hours: saved?.hours ?? null,
        startTime: saved?.startTime || null,
        endTime: saved?.endTime || null,
        breakMins: saved?.breakMinutes || null,
        status: saved?.status || null,
        saved: saved || null,
        submittable: !isWeekend || !!saved,
      });
    }
    return entries;
  }, [viewYear, viewMonth, timeEntries]);

  const summary = summarizeMonth(timeEntries, viewYear, viewMonth);

  const typeStyle = {
    weekend: "text-slate-400 dark:text-slate-500",
    work: "text-slate-600 dark:text-slate-300",
    sick: "text-blue-500 dark:text-blue-400",
    vacation: "text-amber-500 dark:text-amber-400",
    other: "text-slate-600 dark:text-slate-300",
  };
  const typeLabel = { weekend: "Non-working day", work: "Work", sick: "Sick leave", vacation: "Vacation", other: "Other" };
  const typeIcon = { weekend: "🚫", work: "⏰", sick: "💊", vacation: "🏖️", other: "📝" };

  return (
    <div>
      <SubmitHoursModal
        open={submitModal !== null}
        onClose={() => setSubmitModal(null)}
        prefillDate={submitModal?.date || ""}
        existingEntry={submitModal?.entry || null}
        dailyHours={dailyHours}
      />

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Time tracking</h2>
        <button
          onClick={() => {
            const today = toLocalIsoDate();
            setSubmitModal({ date: today, entry: (timeEntries || []).find((entry) => entry.date === today && entry.status !== "approved") || null });
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
        >
          Submit hours
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <button aria-label="Previous month" onClick={() => setViewDate(new Date(viewYear, viewMonth - 1, 1))} className="p-2 text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
          <FaChevronLeft className="w-3 h-3" />
        </button>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button aria-label="Next month" onClick={() => setViewDate(new Date(viewYear, viewMonth + 1, 1))} className="p-2 text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
          <FaChevronRight className="w-3 h-3" />
        </button>
        <button onClick={() => setViewDate(new Date())} className="px-3 py-2 text-xs border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
          Today
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          { label: "Approved hours", value: summary.approved, suffix: "hours worked", icon: FaCheckCircle, color: "text-green-500" },
          { label: "Pending approval", value: summary.pending, suffix: "hours worked", icon: FaSyncAlt, color: "text-amber-500" },
          { label: "Leave", value: summary.leave, suffix: "hours", icon: FaUmbrellaBeach, color: "text-blue-500" },
        ].map(({ label, value, suffix, icon: Icon, color }) => (
          <Card key={label} className="p-4 flex items-center gap-4">
            <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label} · {MONTH_NAMES[viewMonth].slice(0, 3)}</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">{suffix}</span></p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-[#2a3044]">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total {monthEntries.length} days · standard day {dailyHours}h</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#2a3044]">
                {["Date", "Type", "Time period", "Total hours", "Break", "Status"].map((header) => (
                  <th key={header} className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthEntries.map((entry) => (
                <tr key={entry.dateStr} className="border-b border-slate-100 dark:border-[#2a3044]/50 last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium ${entry.type === "weekend" ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}>{entry.label}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`flex items-center gap-1.5 text-xs ${typeStyle[entry.type] || typeStyle.work}`}>
                      <span>{typeIcon[entry.type] || "⏰"}</span>
                      {typeLabel[entry.type] || "Work"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5"><span className="text-xs text-slate-500 dark:text-slate-400">{entry.startTime && entry.endTime ? `${entry.startTime} – ${entry.endTime}` : "—"}</span></td>
                  <td className="px-4 py-2.5"><span className="text-xs text-slate-500 dark:text-slate-400">{entry.hours !== null && entry.hours !== undefined ? `${entry.hours}h` : "—"}</span></td>
                  <td className="px-4 py-2.5"><span className="text-xs text-slate-400">{entry.breakMins ? `${entry.breakMins}m` : "—"}</span></td>
                  <td className="px-4 py-2.5">
                    {entry.status === "approved" ? (
                      <span title={entry.saved?.resolvedByName ? `Approved by ${entry.saved.resolvedByName}` : undefined}><Badge color="green">Approved</Badge></span>
                    ) : entry.status === "pending" ? (
                      <button type="button" onClick={() => setSubmitModal({ date: entry.dateStr, entry: entry.saved })} title="Edit or withdraw" className="hover:opacity-80">
                        <Badge color="amber">Pending</Badge>
                      </button>
                    ) : entry.status === "rejected" ? (
                      <button type="button" onClick={() => setSubmitModal({ date: entry.dateStr, entry: entry.saved })} title={entry.saved?.decisionNote || "Rejected — click to resubmit"} className="hover:opacity-80">
                        <Badge color="red">Rejected</Badge>
                      </button>
                    ) : entry.submittable ? (
                      <button onClick={() => setSubmitModal({ date: entry.dateStr, entry: null })} className="text-xs px-2.5 py-1 border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                        Submit
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
