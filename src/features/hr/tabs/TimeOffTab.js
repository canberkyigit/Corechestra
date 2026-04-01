import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaCalendarAlt, FaCheckCircle, FaChevronDown, FaChevronLeft, FaChevronRight, FaInfoCircle, FaPlus, FaTimes } from "react-icons/fa";
import { useHR } from "../../../shared/context/HRContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useApp } from "../../../shared/context/AppContext";
import { Badge, Card } from "../components/HRSharedUI";
import { PUBLIC_HOLIDAYS } from "../constants/publicHolidays";

const TIME_OFF_TYPES = [
  "Vacation",
  "Sick leave",
  "Unpaid leave",
  "Parental leave",
  "Bereavement leave",
];

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function RequestTimeOffModal({ open, onClose, onSubmit }) {
  const [type, setType] = useState(TIME_OFF_TYPES[0]);
  const [typeOpen, setTypeOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [description, setDescription] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) {
      setType(TIME_OFF_TYPES[0]);
      setTypeOpen(false);
      setFromDate("");
      setToDate("");
      setDescription("");
      setDragOver(false);
      setFile(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const canSubmit = fromDate && toDate && fromDate <= toDate;

  const handleFile = (nextFile) => {
    if (!nextFile) return;
    const allowed = ["image/jpeg", "image/png", "image/heic", "application/pdf"];
    if (allowed.includes(nextFile.type) && nextFile.size <= 5 * 1024 * 1024) {
      setFile(nextFile);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        type,
        typeName: type,
        fromDate,
        toDate,
        description,
        fileName: file?.name,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div key="modal" initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.22, ease: "easeOut" }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-lg bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a3044] overflow-hidden" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2a3044]">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Request time off</h2>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="relative">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Type</label>
                  <button type="button" onClick={() => setTypeOpen((value) => !value)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-sm text-slate-800 dark:text-slate-100 hover:border-blue-400 dark:hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <span>{type}</span>
                    <FaChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${typeOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {typeOpen && (
                      <motion.ul initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.12 }} className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl shadow-xl overflow-hidden">
                        {TIME_OFF_TYPES.map((value) => (
                          <li key={value}>
                            <button type="button" onClick={() => { setType(value); setTypeOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${value === type ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium" : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#232838]"}`}>
                              {value}
                            </button>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">From <span className="text-red-400">*</span></label>
                    <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors [color-scheme:light] dark:[color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">To <span className="text-red-400">*</span></label>
                    <input type="date" value={toDate} min={fromDate} onChange={(event) => setToDate(event.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors [color-scheme:light] dark:[color-scheme:dark]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Description (optional)</label>
                  <textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, 280))} rows={4} placeholder="Add a note for your manager..." className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors" />
                  <div className="flex justify-end mt-1">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">{description.length} / 280</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Attachment (optional)</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(event) => { event.preventDefault(); setDragOver(false); handleFile(event.dataTransfer.files[0]); }}
                    className={`relative flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                      dragOver
                        ? "border-blue-400 bg-blue-50 dark:bg-blue-900/10"
                        : file
                        ? "border-green-400 bg-green-50 dark:bg-green-900/10"
                        : "border-slate-200 dark:border-[#2a3044] hover:border-blue-400/60 hover:bg-slate-50 dark:hover:bg-[#232838]/60"
                    }`}
                  >
                    <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.heic,.pdf" className="hidden" onChange={(event) => handleFile(event.target.files[0])} />
                    {file ? (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <FaCheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium truncate max-w-xs">{file.name}</span>
                        <button type="button" onClick={(event) => { event.stopPropagation(); setFile(null); }} className="ml-1 text-slate-400 hover:text-red-400 transition-colors">
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-blue-500 dark:text-blue-400 font-medium">Click here or drag file to upload</p>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">Supported formats: JPEG, PNG, HEIC, PDF. Max file size: 5MB.</p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 dark:border-[#2a3044] flex justify-end">
                <button type="button" disabled={!canSubmit || submitting} onClick={handleSubmit} className={`px-8 py-2.5 rounded-xl text-sm font-semibold transition-all ${canSubmit && !submitting ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 hover:shadow-blue-500/30" : "bg-slate-200 dark:bg-[#232838] text-slate-400 dark:text-slate-500 cursor-not-allowed"}`}>
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function TimeOffTab() {
  const { timeOffRequests, addTimeOffRequest, employeeProfile } = useHR();
  const { user, profile } = useAuth();
  const { users } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());

  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();

  const calendarWeeks = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const cells = Array(firstDay).fill(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks = [];
    for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
    return weeks;
  }, [calendarYear, calendarMonth]);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth;

  const getDayType = (day) => {
    if (!day) return null;
    const dateString = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const request = (timeOffRequests || []).find((item) => item.fromDate <= dateString && item.toDate >= dateString);
    return request?.type || null;
  };

  const handleSubmitTimeOff = async (request) => {
    const currentUser = (users || []).find((item) => item.id === user?.uid);
    await addTimeOffRequest(request, {
      name: profile?.fullName || currentUser?.name || "Unknown",
      color: currentUser?.color || "#6366f1",
      title: currentUser?.role || currentUser?.title || "Team Member",
    });
  };

  const vacationDays = employeeProfile?.vacationDays ?? 20;

  return (
    <div>
      <RequestTimeOffModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmitTimeOff} />

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Time off</h2>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 text-xs border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
            <FaCalendarAlt className="w-3 h-3" /> Team calendar
          </button>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-3 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
            <FaPlus className="w-3 h-3" /> Request time off
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Time off balances</h3>
            <div className="flex items-start justify-between p-3 rounded-lg bg-slate-50 dark:bg-[#232838] mb-2">
              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1">
                  Annual leave <FaInfoCircle className="w-3 h-3 text-slate-400" />
                </p>
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{vacationDays} days available</span>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Time off requests</h3>
            {(!timeOffRequests || timeOffRequests.length === 0) ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">No requests yet</p>
            ) : (
              <div className="space-y-2">
                {timeOffRequests.map((request) => {
                  const isSick = request.type?.toLowerCase().includes("sick");
                  return (
                    <div key={request.id} className="flex items-start gap-2.5 py-2 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isSick ? "bg-blue-100 dark:bg-blue-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                        <span className="text-sm">{isSick ? "💊" : "🏖️"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-blue-500">{request.fromDate} – {request.toDate}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{request.typeName || request.type}</p>
                      </div>
                      <Badge color="purple">Submitted</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Public holidays</h3>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-base">🇹🇷</span>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">Turkey public holidays</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{PUBLIC_HOLIDAYS.length} holidays in {calendarYear}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-[#232838] text-slate-500 transition-colors">
                  <FaChevronLeft className="w-3 h-3" />
                </button>
                <button onClick={() => setCalendarDate(new Date())} className="px-3 py-1 text-xs border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors text-slate-600 dark:text-slate-400">
                  Today
                </button>
                <button onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-[#232838] text-slate-500 transition-colors">
                  <FaChevronRight className="w-3 h-3" />
                </button>
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{MONTH_NAMES[calendarMonth]} {calendarYear}</span>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((dayName) => (
                <div key={dayName} className="text-center text-[11px] font-medium text-slate-500 dark:text-slate-400 py-1">{dayName}</div>
              ))}
            </div>

            {calendarWeeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1 mb-1">
                {week.map((day, dayIndex) => {
                  if (!day) return <div key={dayIndex} />;
                  const isToday = isCurrentMonth && day === today.getDate();
                  const dayType = getDayType(day);
                  const dayOfWeek = new Date(calendarYear, calendarMonth, day).getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  return (
                    <div key={dayIndex} className={`min-h-[52px] p-1 rounded-lg relative ${
                      isToday ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-[#1c2030]" : ""
                    } ${
                      dayType === "sick" || dayType?.includes("sick") ? "bg-purple-50 dark:bg-purple-900/10" :
                      dayType === "vacation" || dayType?.includes("vacation") ? "bg-amber-50 dark:bg-amber-900/10" :
                      ""
                    }`}>
                      <span className={`text-xs font-medium block text-center ${
                        isToday ? "text-blue-600 dark:text-blue-400 font-bold" :
                        isWeekend ? "text-slate-400 dark:text-slate-500" :
                        "text-slate-700 dark:text-slate-300"
                      }`}>
                        {day === 1 ? `1 ${MONTH_NAMES[calendarMonth].slice(0, 3)}` : day}
                      </span>
                      {dayType?.includes("sick") && <div className="mt-0.5 px-1 py-0.5 rounded text-[9px] bg-purple-200 dark:bg-purple-800/40 text-purple-700 dark:text-purple-300 truncate">Sick leave</div>}
                      {dayType?.includes("vacation") && <div className="mt-0.5 px-1 py-0.5 rounded text-[9px] bg-amber-200 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 truncate">Vacation</div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
