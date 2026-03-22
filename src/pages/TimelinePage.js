import React, { useState, useMemo, useRef, useCallback } from "react";
import { useApp } from "../context/AppContext";
import { parseISO, format, isValid, differenceInDays, addDays, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { FaRocket, FaChevronLeft, FaChevronRight } from "react-icons/fa";

const CELL_W = 32; // px per day

function getDateRange(epics, sprint) {
  const dates = [];
  epics.forEach((e) => {
    if (e.startDate) dates.push(parseISO(e.startDate));
    if (e.endDate) dates.push(parseISO(e.endDate));
  });
  if (sprint?.startDate) dates.push(parseISO(sprint.startDate));
  if (sprint?.endDate) dates.push(parseISO(sprint.endDate));
  const valid = dates.filter(isValid);
  if (valid.length === 0) {
    const now = new Date();
    return { start: startOfMonth(now), end: endOfMonth(addDays(now, 60)) };
  }
  const minDate = new Date(Math.min(...valid.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...valid.map((d) => d.getTime())));
  return {
    start: startOfMonth(minDate),
    end: endOfMonth(addDays(maxDate, 14)),
  };
}

function GanttBar({ epic, rangeStart, totalDays, allTasks, onDragDates }) {
  // Hooks must be called unconditionally
  const dragRef = useRef(null);

  let start = null, end = null, valid = false;
  try {
    if (epic.startDate && epic.endDate) {
      start = parseISO(epic.startDate);
      end = parseISO(epic.endDate);
      valid = isValid(start) && isValid(end);
    }
  } catch { valid = false; }

  const offsetDays = valid ? differenceInDays(start, rangeStart) : 0;
  const spanDays   = valid ? Math.max(1, differenceInDays(end, start) + 1) : 1;

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const origStartDays = offsetDays;
    const origSpanDays = spanDays;

    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const daysDelta = Math.round(dx / CELL_W);
      if (daysDelta === 0) return;
      const newStart = addDays(rangeStart, origStartDays + daysDelta);
      const newEnd = addDays(newStart, origSpanDays - 1);
      onDragDates(epic.id, format(newStart, "yyyy-MM-dd"), format(newEnd, "yyyy-MM-dd"));
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [epic.id, offsetDays, spanDays, rangeStart, onDragDates]);

  if (!valid) return null;
  if (offsetDays > totalDays || offsetDays + spanDays < 0) return null;

  const epicTasks = allTasks.filter((t) => t.epicId === epic.id);
  const done = epicTasks.filter((t) => t.status === "done").length;
  const pct = epicTasks.length > 0 ? Math.round((done / epicTasks.length) * 100) : 0;

  return (
    <div
      ref={dragRef}
      onMouseDown={handleMouseDown}
      className="absolute top-1/2 -translate-y-1/2 h-7 rounded-full flex items-center px-2 cursor-grab active:cursor-grabbing hover:brightness-110 transition-all shadow-sm group select-none"
      style={{
        left: Math.max(0, offsetDays) * CELL_W,
        width: Math.min(spanDays, totalDays - offsetDays) * CELL_W - 4,
        backgroundColor: epic.color + "dd",
        minWidth: 40,
      }}
      title={`${epic.title}: ${format(start, "MMM d")} – ${format(end, "MMM d")} (${pct}%) — drag to reschedule`}
    >
      {/* Progress fill */}
      <div
        className="absolute inset-0 rounded-full opacity-30"
        style={{ width: `${pct}%`, backgroundColor: "white" }}
      />
      <FaRocket className="w-3 h-3 text-white flex-shrink-0 mr-1.5 relative z-10" />
      <span className="text-white text-xs font-medium truncate relative z-10">{epic.title}</span>
      <span className="ml-auto text-white/80 text-xs relative z-10 flex-shrink-0 ml-1">{pct}%</span>
    </div>
  );
}

export default function TimelinePage() {
  const { epics, updateEpic, activeTasks, sprint, currentProjectId } = useApp();
  const [viewOffset, setViewOffset] = useState(0); // offset in months

  const projectEpics = useMemo(
    () => epics.filter((e) => (e.projectId || "proj-1") === currentProjectId),
    [epics, currentProjectId]
  );
  const allTasks = useMemo(
    () => activeTasks.filter((t) => (t.projectId || "proj-1") === currentProjectId),
    [activeTasks, currentProjectId]
  );

  const { start: rangeStart } = useMemo(
    () => getDateRange(projectEpics, sprint),
    [projectEpics, sprint]
  );

  const viewStart = addDays(rangeStart, viewOffset * 30);
  const viewEnd = addDays(viewStart, 90);
  const totalDays = differenceInDays(viewEnd, viewStart) + 1;

  const months = useMemo(() => {
    try {
      return eachMonthOfInterval({ start: viewStart, end: viewEnd });
    } catch { return []; }
  }, [viewStart, viewEnd]);

  // Inline date editing
  const [editId, setEditId] = useState(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  const handleEditSave = () => {
    if (!editId) return;
    const epic = projectEpics.find((e) => e.id === editId);
    if (epic) updateEpic({ ...epic, startDate: editStart, endDate: editEnd });
    setEditId(null);
  };

  // Drag-to-reschedule callback
  const handleDragDates = useCallback((epicId, newStart, newEnd) => {
    const epic = epics.find((e) => e.id === epicId);
    if (epic) updateEpic({ ...epic, startDate: newStart, endDate: newEnd });
  }, [epics, updateEpic]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-4 border-b border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] transition-colors">
        <div>
          <h2 className="font-bold text-slate-800 dark:text-slate-200 text-lg">Timeline / Roadmap</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500">Epic-level Gantt view · drag bars to reschedule</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="p-1.5 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] text-slate-500 dark:text-slate-400 transition-colors"
            onClick={() => setViewOffset((v) => v - 1)}
          >
            <FaChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm text-slate-600 dark:text-slate-300 font-medium px-2">
            {format(viewStart, "MMM yyyy")} – {format(viewEnd, "MMM yyyy")}
          </span>
          <button
            className="p-1.5 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] text-slate-500 dark:text-slate-400 transition-colors"
            onClick={() => setViewOffset((v) => v + 1)}
          >
            <FaChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            className="ml-2 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
            onClick={() => setViewOffset(0)}
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: totalDays * CELL_W + 220 }}>
          {/* Month headers */}
          <div className="flex sticky top-0 z-20 bg-white dark:bg-[#1c2030] border-b border-slate-200 dark:border-[#2a3044] transition-colors">
            <div className="w-52 flex-shrink-0 border-r border-slate-200 dark:border-[#2a3044]" />
            <div className="flex">
              {months.map((month) => {
                const monthStart = month;
                const monthEnd = endOfMonth(month);
                const startOffset = Math.max(0, differenceInDays(monthStart, viewStart));
                const endOffset = Math.min(totalDays, differenceInDays(monthEnd, viewStart) + 1);
                const width = (endOffset - startOffset) * CELL_W;
                return (
                  <div
                    key={month.toISOString()}
                    className="border-r border-slate-200 dark:border-[#2a3044] text-xs text-slate-500 dark:text-slate-400 font-medium px-2 py-2 flex-shrink-0"
                    style={{ width }}
                  >
                    {format(month, "MMM yyyy")}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day header */}
          <div className="flex sticky top-8 z-20 bg-slate-50 dark:bg-[#141720] border-b border-slate-200 dark:border-[#2a3044] transition-colors">
            <div className="w-52 flex-shrink-0 border-r border-slate-200 dark:border-[#2a3044]" />
            <div className="flex">
              {Array.from({ length: totalDays }, (_, i) => {
                const day = addDays(viewStart, i);
                const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={`text-center flex-shrink-0 text-xs py-1 border-r border-slate-100 dark:border-[#232838] ${
                      isToday ? "bg-blue-500 text-white font-bold" :
                      isWeekend ? "bg-slate-100 dark:bg-[#1a1f2e] text-slate-400 dark:text-slate-600" :
                      "text-slate-400 dark:text-slate-500"
                    }`}
                    style={{ width: CELL_W }}
                  >
                    {day.getDate()}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Epic rows */}
          {projectEpics.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500">
              <FaRocket className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No epics to display. Create epics in the Epics tab and set start/end dates.</p>
            </div>
          ) : (
            projectEpics.map((epic) => {
              const epicTasks = allTasks.filter((t) => t.epicId === epic.id);
              const done = epicTasks.filter((t) => t.status === "done").length;

              return (
                <div key={epic.id} className="flex border-b border-slate-100 dark:border-[#232838] hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors" style={{ height: 52 }}>
                  {/* Left label */}
                  <div className="w-52 flex-shrink-0 flex items-center gap-2 px-3 border-r border-slate-200 dark:border-[#2a3044]">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: epic.color }} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{epic.title}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500">{done}/{epicTasks.length} tasks</div>
                    </div>
                    <button
                      className="ml-auto text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 flex-shrink-0 text-xs"
                      onClick={() => {
                        setEditId(epic.id);
                        setEditStart(epic.startDate || "");
                        setEditEnd(epic.endDate || "");
                      }}
                      title="Set dates"
                    >
                      ✎
                    </button>
                  </div>

                  {/* Gantt area */}
                  <div className="relative flex-1">
                    {/* Weekend shading */}
                    {Array.from({ length: totalDays }, (_, i) => {
                      const day = addDays(viewStart, i);
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return isWeekend ? (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 bg-slate-100/60 dark:bg-black/20"
                          style={{ left: i * CELL_W, width: CELL_W }}
                        />
                      ) : null;
                    })}

                    {/* Today line */}
                    {(() => {
                      const todayOffset = differenceInDays(new Date(), viewStart);
                      if (todayOffset >= 0 && todayOffset <= totalDays) {
                        return (
                          <div
                            className="absolute top-0 bottom-0 w-px bg-blue-400 z-10"
                            style={{ left: todayOffset * CELL_W }}
                          />
                        );
                      }
                      return null;
                    })()}

                    <GanttBar
                      epic={epic}
                      rangeStart={viewStart}
                      totalDays={totalDays}
                      allTasks={allTasks}
                      onDragDates={handleDragDates}
                    />
                  </div>
                </div>
              );
            })
          )}

          {/* Sprint row */}
          {sprint && (
            <div className="flex border-b border-slate-200 dark:border-[#2a3044] bg-blue-50/30 dark:bg-blue-900/10 transition-colors" style={{ height: 44 }}>
              <div className="w-52 flex-shrink-0 flex items-center gap-2 px-3 border-r border-slate-200 dark:border-[#2a3044]">
                <FaRocket className="w-3 h-3 text-blue-500 flex-shrink-0" />
                <div className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">{sprint.name}</div>
              </div>
              <div className="relative flex-1">
                {sprint.startDate && sprint.endDate && (() => {
                  try {
                    const s = parseISO(sprint.startDate);
                    const e = parseISO(sprint.endDate);
                    if (!isValid(s) || !isValid(e)) return null;
                    const left = Math.max(0, differenceInDays(s, viewStart)) * CELL_W;
                    const width = Math.max(1, differenceInDays(e, s) + 1) * CELL_W - 4;
                    return (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-5 rounded-full bg-blue-400/50 border border-blue-400 flex items-center px-2"
                        style={{ left, width: Math.min(width, totalDays * CELL_W - left) }}
                      >
                        <span className="text-xs text-blue-700 dark:text-blue-300 font-medium truncate">{sprint.name}</span>
                      </div>
                    );
                  } catch { return null; }
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inline date editor */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white dark:bg-[#1c2030] rounded-xl shadow-xl p-5 w-80 space-y-3 border border-slate-200 dark:border-[#2a3044]">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">Set Epic Dates</h3>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Start Date</label>
              <input type="date" className="w-full border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#141720] text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={editStart} onChange={(e) => setEditStart(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">End Date</label>
              <input type="date" className="w-full border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#141720] text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <button className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700" onClick={handleEditSave}>Save</button>
              <button className="flex-1 px-3 py-1.5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] text-sm" onClick={() => setEditId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
