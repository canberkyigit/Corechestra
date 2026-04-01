import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaCheckCircle, FaChevronLeft, FaChevronRight, FaSyncAlt, FaTimes } from "react-icons/fa";
import { useHR } from "../../../shared/context/HRContext";
import { Badge, Card } from "../components/HRSharedUI";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function SubmitHoursModal({ open, onClose, prefillDate }) {
  const { submitHours } = useHR();
  const [date, setDate] = useState("");
  const [type, setType] = useState("work");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(prefillDate || new Date().toISOString().slice(0, 10));
      setType("work");
      setStartTime("09:00");
      setEndTime("18:00");
      setBreakMinutes(60);
    }
  }, [open, prefillDate]);

  const totalHours = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    const diff = (endHour * 60 + endMinute) - (startHour * 60 + startMinute) - Number(breakMinutes);
    return Math.max(0, Math.round(diff / 6) / 10);
  }, [startTime, endTime, breakMinutes]);

  const handleSave = async () => {
    if (!date || saving) return;
    setSaving(true);
    try {
      await submitHours({
        date,
        type,
        startTime,
        endTime,
        breakMinutes: Number(breakMinutes),
        hours: totalHours,
        status: "pending",
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const inputClassName = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div key="md" initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-md bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a3044]" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#2a3044]">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Submit hours</h2>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Date</label>
                  <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClassName + " [color-scheme:light] dark:[color-scheme:dark]"} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Type</label>
                  <select value={type} onChange={(event) => setType(event.target.value)} className={inputClassName}>
                    <option value="work">Work</option>
                    <option value="sick">Sick leave</option>
                    <option value="vacation">Vacation</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {type === "work" && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Start time</label>
                      <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={inputClassName} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">End time</label>
                      <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className={inputClassName} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Break (min)</label>
                      <input type="number" min={0} max={480} value={breakMinutes} onChange={(event) => setBreakMinutes(event.target.value)} className={inputClassName} />
                    </div>
                  </div>
                )}
                {type === "work" && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-[#232838]">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Total hours</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{totalHours}h</span>
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-slate-200 dark:border-[#2a3044] flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!date || saving} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
                  {saving ? "Saving..." : "Submit"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function TimeTrackingTab() {
  const { timeEntries } = useHR();
  const [viewDate, setViewDate] = useState(new Date());
  const [submitModal, setSubmitModal] = useState(null);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

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
        hours: saved?.hours || null,
        startTime: saved?.startTime || null,
        endTime: saved?.endTime || null,
        breakMins: saved?.breakMinutes || null,
        status: saved?.status || null,
        submittable: !isWeekend,
      });
    }
    return entries;
  }, [viewYear, viewMonth, timeEntries]);

  const approvedHours = (timeEntries || []).filter((entry) => entry.status === "approved").reduce((sum, entry) => sum + (entry.hours || 0), 0);
  const pendingHours = (timeEntries || []).filter((entry) => entry.status === "pending").reduce((sum, entry) => sum + (entry.hours || 0), 0);

  const typeStyle = {
    weekend: "text-slate-400 dark:text-slate-500",
    work: "text-slate-600 dark:text-slate-300",
    sick: "text-blue-500 dark:text-blue-400",
    vacation: "text-amber-500 dark:text-amber-400",
    other: "text-slate-600 dark:text-slate-300",
  };

  const typeIcon = { weekend: "🚫", work: "⏰", sick: "💊", vacation: "🏖️", other: "⏰" };

  return (
    <div>
      <SubmitHoursModal open={submitModal !== null} onClose={() => setSubmitModal(null)} prefillDate={submitModal || ""} />

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Time tracking</h2>
        <button onClick={() => setSubmitModal(new Date().toISOString().slice(0, 10))} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
          Submit hours
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setViewDate(new Date(viewYear, viewMonth - 1, 1))} className="p-2 text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
          <FaChevronLeft className="w-3 h-3" />
        </button>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{MONTH_NAMES[viewMonth]} {viewYear}</span>
        <button onClick={() => setViewDate(new Date(viewYear, viewMonth + 1, 1))} className="p-2 text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
          <FaChevronRight className="w-3 h-3" />
        </button>
        <button onClick={() => setViewDate(new Date())} className="px-3 py-2 text-xs border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
          Today
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        {[
          { label: "Approved hours", value: approvedHours, icon: FaCheckCircle, color: "text-green-500" },
          { label: "Pending hours", value: pendingHours, icon: FaSyncAlt, color: "text-amber-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-4 flex items-center gap-4">
            <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">hours worked</span></p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-[#2a3044]">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total {monthEntries.length} days</span>
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
              {monthEntries.map((entry, index) => (
                <tr key={index} className="border-b border-slate-100 dark:border-[#2a3044]/50 last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-medium ${entry.type === "weekend" ? "text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-200"}`}>{entry.label}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`flex items-center gap-1.5 text-xs ${typeStyle[entry.type] || typeStyle.work}`}>
                      <span>{typeIcon[entry.type] || "⏰"}</span>
                      {entry.type === "weekend" ? "Non-working day" : entry.type === "sick" ? "Sick leave" : entry.type === "vacation" ? "Vacation" : "Work"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5"><span className="text-xs text-slate-500 dark:text-slate-400">{entry.startTime && entry.endTime ? `${entry.startTime} – ${entry.endTime}` : "—"}</span></td>
                  <td className="px-4 py-2.5"><span className="text-xs text-slate-500 dark:text-slate-400">{entry.hours ? `${entry.hours}h` : "—"}</span></td>
                  <td className="px-4 py-2.5"><span className="text-xs text-slate-400">{entry.breakMins ? `${entry.breakMins}m` : "—"}</span></td>
                  <td className="px-4 py-2.5">
                    {entry.status === "approved" ? (
                      <Badge color="green">Approved</Badge>
                    ) : entry.status === "pending" ? (
                      <Badge color="amber">Pending</Badge>
                    ) : entry.submittable ? (
                      <button onClick={() => setSubmitModal(entry.dateStr)} className="text-xs px-2.5 py-1 border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
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
