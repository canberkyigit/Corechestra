import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaCheckCircle, FaChevronDown, FaChevronLeft, FaChevronRight, FaInfoCircle, FaPlus, FaTimes, FaUser, FaUsers } from "react-icons/fa";
import { useHR } from "../../../shared/context/HRContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { Avatar, Badge, Card } from "../components/HRSharedUI";
import { HRModal } from "../components/HRModal";
import { useConfirm } from "../../../shared/context/ConfirmContext";
import { PUBLIC_HOLIDAY_COUNTRY, PUBLIC_HOLIDAYS, getHolidaysForYear } from "../constants/publicHolidays";
import {
  TIME_OFF_KIND_STYLES,
  TIME_OFF_TYPES,
  computeVacationBalance,
  countBusinessDays,
  getRequestStatus,
  getTimeOffKind,
  isActiveTimeOff,
  requestsOnDate,
} from "../utils/timeOff";
import { findPersonForAuth } from "../utils/people";

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
      setFileError("");
    }
  }, [open]);

  const canSubmit = fromDate && toDate && fromDate <= toDate;
  const [fileError, setFileError] = useState("");
  const dirty = Boolean(type !== TIME_OFF_TYPES[0] || fromDate || toDate || description.trim() || file);
  const workingDays = canSubmit ? countBusinessDays(fromDate, toDate, PUBLIC_HOLIDAYS.map((holiday) => holiday.date)) : 0;

  const handleFile = (nextFile) => {
    if (!nextFile) return;
    const allowed = ["image/jpeg", "image/png", "image/heic", "application/pdf"];
    if (!allowed.includes(nextFile.type)) {
      setFileError("Unsupported file type. Use JPEG, PNG, HEIC or PDF.");
      return;
    }
    if (nextFile.size > 5 * 1024 * 1024) {
      setFileError("File is larger than 5MB.");
      return;
    }
    setFileError("");
    setFile(nextFile);
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
    } catch {
      // the caller shows an error toast; keep the modal open so nothing is lost
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <HRModal
      open={open}
      onClose={onClose}
      title="Request time off"
      size="lg"
      dirty={dirty}
      footer={(
        <button type="submit" form="request-time-off-form" disabled={!canSubmit || submitting} className={`px-8 py-2.5 rounded-xl text-sm font-semibold transition-all ${canSubmit && !submitting ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/25 hover:shadow-blue-500/30" : "bg-slate-200 dark:bg-[#232838] text-slate-400 dark:text-slate-500 cursor-not-allowed"}`}>
          {submitting ? "Submitting..." : "Submit"}
        </button>
      )}
    >
      <form id="request-time-off-form" onSubmit={(event) => { event.preventDefault(); handleSubmit(); }} className="space-y-4">
        <div
          className="relative"
          onKeyDown={(event) => {
            if (event.key === "Escape" && typeOpen) {
              event.preventDefault();
              setTypeOpen(false);
            }
          }}
        >
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
        {canSubmit && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-2">
            {workingDays} working day{workingDays === 1 ? "" : "s"} (weekends and public holidays excluded)
          </p>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Description (optional)</label>
          <textarea value={description} onChange={(event) => setDescription(event.target.value.slice(0, 280))} rows={4} placeholder="Add a note for your manager..." className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors" />
          <div className="flex justify-end mt-1">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">{description.length} / 280</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Attachment reference (optional)</label>
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
          {fileError && <p className="text-[11px] text-red-500 mt-1.5">{fileError}</p>}
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">Supported formats: JPEG, PNG, HEIC, PDF. Max file size: 5MB. File storage is not connected — only the file name is recorded with the request; share the document with your manager directly.</p>
        </div>
      </form>
    </HRModal>
  );
}

const STATUS_BADGE = {
  pending: { color: "amber", label: "Pending" },
  approved: { color: "green", label: "Approved" },
  rejected: { color: "red", label: "Rejected" },
  cancelled: { color: "slate", label: "Cancelled" },
};

export function TimeOffTab() {
  const { timeOffRequests, addTimeOffRequest, deleteTimeOffRequest, employeeProfile, allAbsences } = useHR();
  const { user, profile } = useAuth();
  const { users } = useApp();
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [modalOpen, setModalOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("mine");
  const [busyId, setBusyId] = useState(null);

  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const holidayDates = useMemo(() => PUBLIC_HOLIDAYS.map((holiday) => holiday.date), []);
  const holidayByDate = useMemo(() => Object.fromEntries(PUBLIC_HOLIDAYS.map((holiday) => [holiday.date, holiday])), []);

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
  const monthPrefix = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}`;
  const monthStart = `${monthPrefix}-01`;
  const monthEnd = `${monthPrefix}-${String(new Date(calendarYear, calendarMonth + 1, 0).getDate()).padStart(2, "0")}`;

  const myActiveRequests = useMemo(() => (timeOffRequests || []).filter(isActiveTimeOff), [timeOffRequests]);
  const teamAbsences = useMemo(() => (allAbsences || []).filter(isActiveTimeOff), [allAbsences]);
  const calendarItems = calendarView === "team" ? teamAbsences : myActiveRequests;
  const teamThisMonth = useMemo(
    () => teamAbsences
      .filter((absence) => absence.fromDate <= monthEnd && absence.toDate >= monthStart)
      .sort((a, b) => String(a.fromDate).localeCompare(String(b.fromDate))),
    [monthEnd, monthStart, teamAbsences],
  );

  const dateKey = (day) => `${monthPrefix}-${String(day).padStart(2, "0")}`;

  const handleSubmitTimeOff = async (request) => {
    const currentUser = findPersonForAuth(users, user);
    try {
      await addTimeOffRequest(request, {
        name: profile?.fullName || currentUser?.name || user?.email?.split("@")[0] || "Unknown",
        color: currentUser?.color || "#6366f1",
        title: currentUser?.title || currentUser?.role || "Team Member",
      });
      addToast("Time off requested — waiting for approval", "success");
    } catch (error) {
      addToast(error.message || "Could not submit the request", "error");
      throw error;
    }
  };

  const handleCancel = async (request) => {
    const ok = await confirm({
      title: `Withdraw your ${request.typeName || request.type} request?`,
      description: `The request for ${request.fromDate} → ${request.toDate} will be withdrawn and removed from your approver's queue.`,
      confirmLabel: "Withdraw request",
      cancelLabel: "Keep request",
      tone: "warning",
    });
    if (!ok) return;
    setBusyId(request.id);
    try {
      await deleteTimeOffRequest(request.id);
      addToast("Request withdrawn", "info");
    } catch (error) {
      addToast(error.message || "Could not withdraw the request", "error");
    } finally {
      setBusyId(null);
    }
  };

  const balance = computeVacationBalance(timeOffRequests, employeeProfile?.vacationDays, calendarYear, holidayDates);
  const sortedRequests = [...(timeOffRequests || [])].sort((a, b) => String(b.fromDate).localeCompare(String(a.fromDate)));
  const holidaysThisYear = getHolidaysForYear(calendarYear);

  return (
    <div>
      <RequestTimeOffModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmitTimeOff} />

      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Time off</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-[#2a3044] overflow-hidden" role="group" aria-label="Calendar view">
            <button
              type="button"
              aria-pressed={calendarView === "mine"}
              onClick={() => setCalendarView("mine")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors ${calendarView === "mine" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838]"}`}
            >
              <FaUser className="w-3 h-3" /> My calendar
            </button>
            <button
              type="button"
              aria-pressed={calendarView === "team"}
              onClick={() => setCalendarView("team")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs border-l border-slate-200 dark:border-[#2a3044] transition-colors ${calendarView === "team" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838]"}`}
            >
              <FaUsers className="w-3 h-3" /> Team calendar
            </button>
          </div>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-3 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
            <FaPlus className="w-3 h-3" /> Request time off
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Time off balances · {calendarYear}</h3>
            <div className="flex items-start justify-between p-3 rounded-lg bg-slate-50 dark:bg-[#232838] mb-2">
              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1" title="Allowance minus approved vacation working days. Set the allowance in Contract.">
                  Annual leave <FaInfoCircle className="w-3 h-3 text-slate-400" />
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {balance.used} used · {balance.pending} pending · {balance.total} total
                </p>
              </div>
              <span className={`text-sm font-semibold ${balance.remaining < 0 ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-200"}`} data-testid="vacation-remaining">
                {balance.remaining} days available
              </span>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">My requests</h3>
            {sortedRequests.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">No requests yet</p>
            ) : (
              <div className="space-y-2">
                {sortedRequests.map((request) => {
                  const kind = getTimeOffKind(request.type || request.typeName);
                  const status = getRequestStatus(request);
                  const badge = STATUS_BADGE[status] || STATUS_BADGE.pending;
                  const days = countBusinessDays(request.fromDate, request.toDate, holidayDates);
                  return (
                    <div key={request.id} className="flex items-start gap-2.5 py-2 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${kind === "sick" ? "bg-purple-100 dark:bg-purple-900/30" : "bg-amber-100 dark:bg-amber-900/30"}`}>
                        <span className="text-sm">{kind === "sick" ? "💊" : "🏖️"}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-blue-500">{request.fromDate} – {request.toDate}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{request.typeName || request.type} · {days} working day{days === 1 ? "" : "s"}</p>
                        {status === "rejected" && request.decisionNote && (
                          <p className="text-[11px] text-red-500 dark:text-red-400 mt-0.5">“{request.decisionNote}”</p>
                        )}
                        {request.resolvedByName && status !== "pending" && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">by {request.resolvedByName}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge color={badge.color}>{badge.label}</Badge>
                        {status !== "approved" && (
                          <button type="button" disabled={busyId === request.id} onClick={() => handleCancel(request)} className="text-[10px] text-slate-400 hover:text-red-500 disabled:opacity-50">
                            {status === "pending" ? "Withdraw" : "Remove"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Public holidays</h3>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-base">{PUBLIC_HOLIDAY_COUNTRY.flag}</span>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{PUBLIC_HOLIDAY_COUNTRY.name} public holidays</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{holidaysThisYear.length} holiday{holidaysThisYear.length === 1 ? "" : "s"} configured for {calendarYear}</p>
              </div>
            </div>
            {holidaysThisYear.filter((holiday) => holiday.date.startsWith(monthPrefix)).map((holiday) => (
              <p key={holiday.date} className="text-[11px] text-red-600 dark:text-red-400">{holiday.date.slice(8)} {holiday.name}</p>
            ))}
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button aria-label="Previous month" onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth - 1, 1))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-[#232838] text-slate-500 transition-colors">
                  <FaChevronLeft className="w-3 h-3" />
                </button>
                <button onClick={() => setCalendarDate(new Date())} className="px-3 py-1 text-xs border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors text-slate-600 dark:text-slate-400">
                  Today
                </button>
                <button aria-label="Next month" onClick={() => setCalendarDate(new Date(calendarYear, calendarMonth + 1, 1))} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-[#232838] text-slate-500 transition-colors">
                  <FaChevronRight className="w-3 h-3" />
                </button>
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {MONTH_NAMES[calendarMonth]} {calendarYear}
                <span className="ml-2 text-[11px] font-normal text-slate-400">{calendarView === "team" ? "Team" : "My"} calendar</span>
              </span>
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
                  const iso = dateKey(day);
                  const isToday = isCurrentMonth && day === today.getDate();
                  const items = requestsOnDate(calendarItems, iso);
                  const holiday = holidayByDate[iso];
                  const primaryKind = items.length ? getTimeOffKind(items[0].type || items[0].typeName) : null;
                  const dayOfWeek = new Date(calendarYear, calendarMonth, day).getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const cellStyle = holiday
                    ? "bg-red-50 dark:bg-red-900/10"
                    : primaryKind ? TIME_OFF_KIND_STYLES[primaryKind]?.cell : "";
                  return (
                    <div
                      key={dayIndex}
                      data-testid={`timeoff-day-${iso}`}
                      data-kind={primaryKind || (holiday ? "holiday" : "")}
                      title={[holiday?.name, ...items.map((item) => `${item.userName ? `${item.userName}: ` : ""}${item.typeName || item.type} (${getRequestStatus(item)})`)].filter(Boolean).join("\n") || undefined}
                      className={`min-h-[52px] p-1 rounded-lg relative ${isToday ? "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-[#1c2030]" : ""} ${cellStyle}`}
                    >
                      <span className={`text-xs font-medium block text-center ${
                        isToday ? "text-blue-600 dark:text-blue-400 font-bold" :
                        isWeekend ? "text-slate-400 dark:text-slate-500" :
                        "text-slate-700 dark:text-slate-300"
                      }`}>
                        {day === 1 ? `1 ${MONTH_NAMES[calendarMonth].slice(0, 3)}` : day}
                      </span>
                      {holiday && <div className="mt-0.5 px-1 py-0.5 rounded text-[9px] bg-red-200 dark:bg-red-800/40 text-red-700 dark:text-red-300 truncate">{holiday.name}</div>}
                      {calendarView === "mine" && items.slice(0, 1).map((item) => {
                        const kind = getTimeOffKind(item.type || item.typeName);
                        const style = TIME_OFF_KIND_STYLES[kind] || TIME_OFF_KIND_STYLES.other;
                        return (
                          <div key={item.id || item.requestId} className={`mt-0.5 px-1 py-0.5 rounded text-[9px] truncate ${style.chip} ${getRequestStatus(item) === "pending" ? "opacity-60 border border-dashed border-current" : ""}`}>
                            {item.typeName || style.label}
                          </div>
                        );
                      })}
                      {calendarView === "team" && items.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-0.5 justify-center">
                          {items.slice(0, 3).map((item) => {
                            const kind = getTimeOffKind(item.type || item.typeName);
                            return (
                              <span key={item.requestId} className={`w-4 h-4 rounded-full text-[8px] font-semibold text-white flex items-center justify-center ring-2 ${kind === "sick" ? "ring-purple-400" : "ring-amber-400"} ${getRequestStatus(item) === "pending" ? "opacity-60" : ""}`} style={{ backgroundColor: item.userColor || "#6366f1" }}>
                                {String(item.userName || "?").charAt(0).toUpperCase()}
                              </span>
                            );
                          })}
                          {items.length > 3 && <span className="text-[9px] text-slate-500">+{items.length - 3}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-[#2a3044]">
              {["vacation", "sick", "parental", "unpaid", "other"].map((kind) => (
                <span key={kind} className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className={`w-2 h-2 rounded-full ${TIME_OFF_KIND_STYLES[kind].dot}`} /> {TIME_OFF_KIND_STYLES[kind].label}
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Public holiday
              </span>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">Faded = pending approval</span>
            </div>
          </Card>

          {calendarView === "team" && (
            <Card className="p-4" data-testid="team-absences">
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3">Team absences in {MONTH_NAMES[calendarMonth]}</h3>
              {teamThisMonth.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500">Nobody is away this month.</p>
              ) : (
                <div className="space-y-2">
                  {teamThisMonth.map((absence) => (
                    <div key={absence.requestId} className="flex items-center gap-3 py-1.5">
                      <Avatar name={absence.userName || "?"} color={absence.userColor} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{absence.userName || "Unknown"}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{absence.typeName || absence.type} · {absence.fromDate} → {absence.toDate}</p>
                      </div>
                      {getRequestStatus(absence) === "pending" ? <Badge color="amber">Pending</Badge> : <Badge color="green">Approved</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
