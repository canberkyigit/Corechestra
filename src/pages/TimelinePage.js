import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  parseISO, format, isValid, differenceInDays,
  addDays, startOfMonth, endOfMonth, eachMonthOfInterval,
} from "date-fns";
import {
  FaRocket, FaChevronLeft, FaChevronRight,
  FaSearchPlus, FaSearchMinus, FaCalendarAlt, FaEdit,
} from "react-icons/fa";

// ─── Zoom levels: label → px per day ─────────────────────────────────────────
const ZOOM_LEVELS = [
  { label: "Month", cellW: 10 },
  { label: "Week",  cellW: 20 },
  { label: "Day",   cellW: 36 },
];
const LEFT_W = 220; // px — left label column width

function getDateRange(epics, sprint) {
  const dates = [];
  epics.forEach((e) => {
    if (e.startDate) dates.push(parseISO(e.startDate));
    if (e.endDate)   dates.push(parseISO(e.endDate));
  });
  if (sprint?.startDate) dates.push(parseISO(sprint.startDate));
  if (sprint?.endDate)   dates.push(parseISO(sprint.endDate));
  const valid = dates.filter(isValid);
  if (valid.length === 0) {
    const now = new Date();
    return { start: startOfMonth(addDays(now, -30)), end: endOfMonth(addDays(now, 150)) };
  }
  const minDate = new Date(Math.min(...valid.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...valid.map((d) => d.getTime())));
  return {
    start: startOfMonth(addDays(minDate, -14)),
    end:   endOfMonth(addDays(maxDate, 30)),
  };
}

// ─── Gantt bar (draggable) ────────────────────────────────────────────────────
function GanttBar({ epic, rangeStart, totalDays, allTasks, onDragDates, cellW }) {
  const dragRef = useRef(null);

  let start = null, end = null, valid = false;
  try {
    if (epic.startDate && epic.endDate) {
      start = parseISO(epic.startDate);
      end   = parseISO(epic.endDate);
      valid = isValid(start) && isValid(end);
    }
  } catch { valid = false; }

  const offsetDays = valid ? differenceInDays(start, rangeStart) : 0;
  const spanDays   = valid ? Math.max(1, differenceInDays(end, start) + 1) : 1;

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const origOffset = offsetDays;
    const origSpan   = spanDays;

    const onMove = (ev) => {
      const daysDelta = Math.round((ev.clientX - startX) / cellW);
      if (daysDelta === 0) return;
      const newStart = addDays(rangeStart, origOffset + daysDelta);
      const newEnd   = addDays(newStart, origSpan - 1);
      onDragDates(epic.id, format(newStart, "yyyy-MM-dd"), format(newEnd, "yyyy-MM-dd"));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [epic.id, offsetDays, spanDays, rangeStart, onDragDates, cellW]);

  if (!valid) return null;
  if (offsetDays > totalDays || offsetDays + spanDays < 0) return null;

  const epicTasks  = allTasks.filter((t) => t.epicId === epic.id);
  const done       = epicTasks.filter((t) => t.status === "done").length;
  const pct        = epicTasks.length > 0 ? Math.round((done / epicTasks.length) * 100) : 0;
  const leftPx     = Math.max(0, offsetDays) * cellW;
  const widthPx    = Math.max(cellW, Math.min(spanDays, totalDays - offsetDays) * cellW - 3);

  return (
    <div
      ref={dragRef}
      onMouseDown={handleMouseDown}
      className="absolute top-1/2 -translate-y-1/2 h-7 rounded-full flex items-center px-2.5 cursor-grab active:cursor-grabbing hover:brightness-110 transition-all shadow group select-none z-10"
      style={{ left: leftPx, width: widthPx, backgroundColor: epic.color + "dd", minWidth: 32 }}
      title={`${epic.title}: ${format(start, "MMM d")} – ${format(end, "MMM d")} · ${pct}% done · drag to reschedule`}
    >
      {/* Progress fill */}
      <div className="absolute inset-0 rounded-full opacity-25" style={{ width: `${pct}%`, backgroundColor: "white" }} />
      <FaRocket className="w-2.5 h-2.5 text-white flex-shrink-0 mr-1 relative z-10 opacity-90" />
      <span className="text-white text-[11px] font-semibold truncate relative z-10 flex-1">{epic.title}</span>
      {widthPx > 80 && (
        <span className="text-white/75 text-[10px] relative z-10 flex-shrink-0 ml-1">{pct}%</span>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TimelinePage() {
  const { epics, updateEpic, activeTasks, sprint, currentProjectId } = useApp();

  const [zoomIdx,    setZoomIdx]    = useState(1);           // default: Week
  const [viewOffset, setViewOffset] = useState(0);           // months offset
  const [editId,     setEditId]     = useState(null);
  const [editStart,  setEditStart]  = useState("");
  const [editEnd,    setEditEnd]    = useState("");
  const scrollRef = useRef(null);

  const cellW = ZOOM_LEVELS[zoomIdx].cellW;

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
  const viewEnd   = addDays(viewStart, 180);   // always show 6 months
  const totalDays = differenceInDays(viewEnd, viewStart) + 1;

  const months = useMemo(() => {
    try { return eachMonthOfInterval({ start: viewStart, end: viewEnd }); }
    catch { return []; }
  }, [viewStart, viewEnd]);

  // Auto-scroll to today on first render
  useEffect(() => {
    if (!scrollRef.current) return;
    const todayOffset = differenceInDays(new Date(), viewStart);
    if (todayOffset > 0 && todayOffset < totalDays) {
      scrollRef.current.scrollLeft = Math.max(0, todayOffset * cellW - 200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToToday = () => {
    const todayOffset = differenceInDays(new Date(), viewStart);
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = Math.max(0, todayOffset * cellW - 200);
    }
  };

  const handleEditSave = () => {
    if (!editId) return;
    const epic = projectEpics.find((e) => e.id === editId);
    if (epic) updateEpic({ ...epic, startDate: editStart, endDate: editEnd });
    setEditId(null);
  };

  const handleDragDates = useCallback((epicId, newStart, newEnd) => {
    const epic = epics.find((e) => e.id === epicId);
    if (epic) updateEpic({ ...epic, startDate: newStart, endDate: newEnd });
  }, [epics, updateEpic]);

  const totalGridWidth = totalDays * cellW;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-[#141720]">

      {/* ── Top toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 py-3 flex items-center gap-3 border-b border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030]">
        <div>
          <h2 className="font-bold text-slate-800 dark:text-slate-200 text-base leading-tight">Timeline / Roadmap</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Epic-level Gantt · drag bars to reschedule</p>
        </div>

        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          {/* Zoom */}
          <div className="flex items-center border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
            <button
              onClick={() => setZoomIdx((z) => Math.max(0, z - 1))}
              disabled={zoomIdx === 0}
              className="px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-[#232838] text-slate-500 dark:text-slate-400 disabled:opacity-30 transition-colors"
              title="Zoom out"
            >
              <FaSearchMinus className="w-3 h-3" />
            </button>
            <span className="px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 border-x border-slate-200 dark:border-[#2a3044]">
              {ZOOM_LEVELS[zoomIdx].label}
            </span>
            <button
              onClick={() => setZoomIdx((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))}
              disabled={zoomIdx === ZOOM_LEVELS.length - 1}
              className="px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-[#232838] text-slate-500 dark:text-slate-400 disabled:opacity-30 transition-colors"
              title="Zoom in"
            >
              <FaSearchPlus className="w-3 h-3" />
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-200 dark:bg-[#2a3044]" />

          {/* Pan left/right */}
          <button
            className="p-1.5 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] text-slate-500 dark:text-slate-400 transition-colors"
            onClick={() => setViewOffset((v) => v - 1)}
            title="Earlier"
          >
            <FaChevronLeft className="w-3 h-3" />
          </button>
          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium px-1 min-w-[130px] text-center">
            {format(viewStart, "MMM yyyy")} – {format(viewEnd, "MMM yyyy")}
          </span>
          <button
            className="p-1.5 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] text-slate-500 dark:text-slate-400 transition-colors"
            onClick={() => setViewOffset((v) => v + 1)}
            title="Later"
          >
            <FaChevronRight className="w-3 h-3" />
          </button>

          {/* Today */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-700/40 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            onClick={() => { setViewOffset(0); scrollToToday(); }}
          >
            <FaCalendarAlt className="w-3 h-3" />
            Today
          </button>
        </div>
      </div>

      {/* ── Gantt area ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Fixed left column (doesn't scroll horizontally) ─────────────── */}
        <div
          className="flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] z-20"
          style={{ width: LEFT_W }}
        >
          {/* Month header placeholder */}
          <div className="h-8 border-b border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#141720]" />
          {/* Day header placeholder */}
          <div className="h-8 flex items-center px-3 border-b border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#141720]">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">Epic</span>
          </div>
          {/* Epic label rows */}
          {projectEpics.map((epic) => {
            const epicTasks = allTasks.filter((t) => t.epicId === epic.id);
            const done      = epicTasks.filter((t) => t.status === "done").length;
            return (
              <div
                key={epic.id}
                className="flex items-center gap-2 px-3 border-b border-slate-100 dark:border-[#232838] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex-shrink-0"
                style={{ height: 52 }}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: epic.color }} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{epic.title}</div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">{done}/{epicTasks.length} tasks</div>
                </div>
                <button
                  className="flex-shrink-0 p-1 rounded hover:bg-slate-100 dark:hover:bg-[#232838] text-slate-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                  onClick={() => { setEditId(epic.id); setEditStart(epic.startDate || ""); setEditEnd(epic.endDate || ""); }}
                  title="Edit dates"
                >
                  <FaEdit className="w-3 h-3" />
                </button>
              </div>
            );
          })}
          {/* Sprint label row */}
          {sprint && (
            <div
              className="flex items-center gap-2 px-3 border-b border-slate-200 dark:border-[#2a3044] bg-blue-50/40 dark:bg-blue-900/10 flex-shrink-0"
              style={{ height: 44 }}
            >
              <FaRocket className="w-3 h-3 text-blue-500 flex-shrink-0" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400 truncate">{sprint.name}</span>
            </div>
          )}
          {/* Empty state placeholder */}
          {projectEpics.length === 0 && (
            <div className="flex-1" />
          )}
        </div>

        {/* ── Scrollable right panel ────────────────────────────────────────── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto overflow-y-auto relative"
        >
          <div style={{ width: totalGridWidth, minWidth: "100%" }}>

            {/* Month header row */}
            <div className="flex sticky top-0 z-10 border-b border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#141720]" style={{ height: 32 }}>
              {months.map((month) => {
                const monthEnd    = endOfMonth(month);
                const startOffset = Math.max(0, differenceInDays(month, viewStart));
                const endOffset   = Math.min(totalDays, differenceInDays(monthEnd, viewStart) + 1);
                const width       = (endOffset - startOffset) * cellW;
                return (
                  <div
                    key={month.toISOString()}
                    className="flex-shrink-0 border-r border-slate-200 dark:border-[#2a3044] flex items-center px-2"
                    style={{ width }}
                  >
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                      {format(month, width > 60 ? "MMMM yyyy" : "MMM yy")}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Day header row */}
            <div className="flex sticky top-8 z-10 border-b border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#141720]" style={{ height: 32 }}>
              {Array.from({ length: totalDays }, (_, i) => {
                const day       = addDays(viewStart, i);
                const isToday   = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                const isMonday  = day.getDay() === 1;
                // Only show day numbers for Day/Week zoom; Month zoom shows week markers
                const showLabel = cellW >= 20 || (cellW < 20 && isMonday);
                return (
                  <div
                    key={i}
                    className={`flex-shrink-0 flex items-center justify-center border-r text-[10px] font-medium transition-colors ${
                      isToday
                        ? "bg-blue-500 text-white border-blue-500"
                        : isWeekend
                        ? "bg-slate-100/80 dark:bg-[#1a1f2e] text-slate-400 dark:text-slate-600 border-slate-100 dark:border-[#232838]"
                        : "text-slate-400 dark:text-slate-500 border-slate-100 dark:border-[#232838]"
                    }`}
                    style={{ width: cellW }}
                  >
                    {showLabel ? day.getDate() : ""}
                  </div>
                );
              })}
            </div>

            {/* Epic rows */}
            {projectEpics.length === 0 ? (
              <div className="flex items-center justify-center py-24 text-slate-400 dark:text-slate-500">
                <div className="text-center">
                  <FaRocket className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No epics found. Create epics in the Epics tab and set dates.</p>
                </div>
              </div>
            ) : (
              projectEpics.map((epic) => (
                <div
                  key={epic.id}
                  className="relative border-b border-slate-100 dark:border-[#232838] hover:bg-blue-50/20 dark:hover:bg-white/[0.02] transition-colors"
                  style={{ height: 52, width: totalGridWidth }}
                >
                  {/* Weekend shading */}
                  {Array.from({ length: totalDays }, (_, i) => {
                    const day = addDays(viewStart, i);
                    return (day.getDay() === 0 || day.getDay() === 6) ? (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 bg-slate-100/50 dark:bg-black/15"
                        style={{ left: i * cellW, width: cellW }}
                      />
                    ) : null;
                  })}

                  {/* Today line */}
                  {(() => {
                    const offset = differenceInDays(new Date(), viewStart);
                    return offset >= 0 && offset <= totalDays ? (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-blue-400/60 z-10"
                        style={{ left: offset * cellW }}
                      />
                    ) : null;
                  })()}

                  <GanttBar
                    epic={epic}
                    rangeStart={viewStart}
                    totalDays={totalDays}
                    allTasks={allTasks}
                    onDragDates={handleDragDates}
                    cellW={cellW}
                  />
                </div>
              ))
            )}

            {/* Sprint row */}
            {sprint && (
              <div
                className="relative border-b border-slate-200 dark:border-[#2a3044] bg-blue-50/30 dark:bg-blue-900/10"
                style={{ height: 44, width: totalGridWidth }}
              >
                {/* Today line */}
                {(() => {
                  const offset = differenceInDays(new Date(), viewStart);
                  return offset >= 0 && offset <= totalDays ? (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-blue-400/60 z-10"
                      style={{ left: offset * cellW }}
                    />
                  ) : null;
                })()}
                {sprint.startDate && sprint.endDate && (() => {
                  try {
                    const s = parseISO(sprint.startDate);
                    const e = parseISO(sprint.endDate);
                    if (!isValid(s) || !isValid(e)) return null;
                    const left  = Math.max(0, differenceInDays(s, viewStart)) * cellW;
                    const width = Math.max(cellW, Math.min(
                      differenceInDays(e, s) + 1,
                      totalDays - Math.max(0, differenceInDays(s, viewStart))
                    ) * cellW - 3);
                    return (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-5 rounded-full bg-blue-400/40 border border-blue-400/60 flex items-center px-2"
                        style={{ left, width }}
                      >
                        <span className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold truncate">{sprint.name}</span>
                      </div>
                    );
                  } catch { return null; }
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Date editor modal ────────────────────────────────────────────────── */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setEditId(null)}>
          <div
            className="bg-white dark:bg-[#1c2030] rounded-xl shadow-xl p-5 w-80 space-y-3 border border-slate-200 dark:border-[#2a3044]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FaEdit className="w-3.5 h-3.5 text-blue-500" /> Set Epic Dates
            </h3>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block font-medium">Start Date</label>
              <input
                type="date"
                className="w-full border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#141720] text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={editStart}
                onChange={(e) => setEditStart(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block font-medium">End Date</label>
              <input
                type="date"
                className="w-full border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#141720] text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                onClick={handleEditSave}
              >
                Save
              </button>
              <button
                className="flex-1 px-3 py-2 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] text-sm transition-colors"
                onClick={() => setEditId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
