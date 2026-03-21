import React, { useState, useMemo } from "react";
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

function GanttBar({ epic, rangeStart, totalDays, allTasks }) {
  if (!epic.startDate || !epic.endDate) return null;
  let start, end;
  try {
    start = parseISO(epic.startDate);
    end = parseISO(epic.endDate);
    if (!isValid(start) || !isValid(end)) return null;
  } catch { return null; }

  const offsetDays = differenceInDays(start, rangeStart);
  const spanDays = Math.max(1, differenceInDays(end, start) + 1);
  const epicTasks = allTasks.filter((t) => t.epicId === epic.id);
  const done = epicTasks.filter((t) => t.status === "done").length;
  const pct = epicTasks.length > 0 ? Math.round((done / epicTasks.length) * 100) : 0;

  if (offsetDays > totalDays || offsetDays + spanDays < 0) return null;

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 h-7 rounded-full flex items-center px-2 cursor-pointer hover:brightness-110 transition-all shadow-sm group"
      style={{
        left: Math.max(0, offsetDays) * CELL_W,
        width: Math.min(spanDays, totalDays - offsetDays) * CELL_W - 4,
        backgroundColor: epic.color + "dd",
        minWidth: 40,
      }}
      title={`${epic.title}: ${format(start, "MMM d")} – ${format(end, "MMM d")} (${pct}%)`}
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
  const { epics, updateEpic, activeTasks, sprint } = useApp();
  const [viewOffset, setViewOffset] = useState(0); // offset in months

  const allTasks = activeTasks;

  const { start: rangeStart } = useMemo(
    () => getDateRange(epics, sprint),
    [epics, sprint]
  );

  const viewStart = addDays(rangeStart, viewOffset * 30);
  const viewEnd = addDays(viewStart, 90);
  const totalDays = differenceInDays(viewEnd, viewStart) + 1;

  const months = useMemo(() => {
    try {
      return eachMonthOfInterval({ start: viewStart, end: viewEnd });
    } catch { return []; }
  }, [viewStart, viewEnd]);

  // Editing inline dates
  const [editId, setEditId] = useState(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  const handleEditSave = () => {
    if (!editId) return;
    updateEpic(epics.find((e) => e.id === editId) ? { ...epics.find((e) => e.id === editId), startDate: editStart, endDate: editEnd } : null);
    setEditId(null);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-4 border-b border-slate-200 bg-white">
        <div>
          <h2 className="font-bold text-slate-800 text-lg">Timeline / Roadmap</h2>
          <p className="text-sm text-slate-400">Epic-level Gantt view</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
            onClick={() => setViewOffset((v) => v - 1)}
          >
            <FaChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-sm text-slate-600 font-medium px-2">
            {format(viewStart, "MMM yyyy")} – {format(viewEnd, "MMM yyyy")}
          </span>
          <button
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
            onClick={() => setViewOffset((v) => v + 1)}
          >
            <FaChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            className="ml-2 px-3 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            onClick={() => setViewOffset(0)}
          >
            Today
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: totalDays * CELL_W + 220 }}>
          {/* Month headers */}
          <div className="flex sticky top-0 z-20 bg-white border-b border-slate-200">
            <div className="w-52 flex-shrink-0 border-r border-slate-200" />
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
                    className="border-r border-slate-200 text-xs text-slate-500 font-medium px-2 py-2 flex-shrink-0"
                    style={{ width }}
                  >
                    {format(month, "MMM yyyy")}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day header */}
          <div className="flex sticky top-8 z-20 bg-slate-50 border-b border-slate-200">
            <div className="w-52 flex-shrink-0 border-r border-slate-200" />
            <div className="flex">
              {Array.from({ length: totalDays }, (_, i) => {
                const day = addDays(viewStart, i);
                const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={`text-center flex-shrink-0 text-xs py-1 border-r border-slate-100 ${
                      isToday ? "bg-blue-500 text-white font-bold" :
                      isWeekend ? "bg-slate-100 text-slate-400" :
                      "text-slate-400"
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
          {epics.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FaRocket className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No epics to display. Create epics in the Epics tab and set start/end dates.</p>
            </div>
          ) : (
            epics.map((epic) => {
              const epicTasks = allTasks.filter((t) => t.epicId === epic.id);
              const done = epicTasks.filter((t) => t.status === "done").length;

              return (
                <div key={epic.id} className="flex border-b border-slate-100 hover:bg-slate-50/50 transition-colors" style={{ height: 52 }}>
                  {/* Left label */}
                  <div className="w-52 flex-shrink-0 flex items-center gap-2 px-3 border-r border-slate-200">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: epic.color }} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-700 truncate">{epic.title}</div>
                      <div className="text-xs text-slate-400">{done}/{epicTasks.length} tasks</div>
                    </div>
                    <button
                      className="ml-auto text-slate-300 hover:text-blue-500 flex-shrink-0 text-xs"
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
                          className="absolute top-0 bottom-0 bg-slate-100/60"
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
                    />
                  </div>
                </div>
              );
            })
          )}

          {/* Sprint row */}
          {sprint && (
            <div className="flex border-b border-slate-200 bg-blue-50/30" style={{ height: 44 }}>
              <div className="w-52 flex-shrink-0 flex items-center gap-2 px-3 border-r border-slate-200">
                <FaRocket className="w-3 h-3 text-blue-500 flex-shrink-0" />
                <div className="text-sm font-medium text-blue-600 truncate">{sprint.name}</div>
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
                        <span className="text-xs text-blue-700 font-medium truncate">{sprint.name}</span>
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
          <div className="bg-white rounded-xl shadow-xl p-5 w-80 space-y-3">
            <h3 className="font-semibold text-slate-700">Set Epic Dates</h3>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Start Date</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={editStart} onChange={(e) => setEditStart(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">End Date</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <button className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700" onClick={handleEditSave}>Save</button>
              <button className="flex-1 px-3 py-1.5 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm" onClick={() => setEditId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
