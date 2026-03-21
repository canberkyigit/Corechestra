import React, { useState } from "react";
import { FaCheckCircle, FaRegCircle, FaStickyNote } from "react-icons/fa";
import { useApp } from "../../context/AppContext";

const PRI_COLOR = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  high:     "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  medium:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
  low:      "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
};

export default function SprintReviewTab({ onTaskClick }) {
  const { activeTasks, setActiveTasks, sprint } = useApp();
  const [meetingNotes, setMeetingNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);

  const doneTasks = activeTasks.filter((t) => t.status === "done");
  const notDone   = activeTasks.filter((t) => t.status !== "done");
  const totalSP   = activeTasks.reduce((s, t) => s + (Number(t.storyPoint) || 0), 0);
  const doneSP    = doneTasks.reduce((s, t) => s + (Number(t.storyPoint) || 0), 0);
  const pct       = totalSP > 0 ? Math.round((doneSP / totalSP) * 100) : 0;

  const toggleDemo = (taskId) => {
    setActiveTasks((prev) =>
      prev.map((t) => t.id === taskId ? { ...t, demoReady: !t.demoReady } : t)
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-4 px-4 py-4 overflow-y-auto pb-12">

      {/* Header */}
      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Sprint Review</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {sprint?.name || "Current sprint"} · Review completed work before the retrospective
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{pct}%</div>
            <div className="text-xs text-slate-400">goal complete</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-slate-100 dark:bg-[#2a3044] rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Tasks", value: activeTasks.length, color: "text-slate-700 dark:text-slate-200", bg: "bg-slate-50 dark:bg-[#232838] border-slate-200 dark:border-[#2a3044]" },
            { label: "Completed",   value: doneTasks.length,   color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30" },
            { label: "Total SP",    value: totalSP,            color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30" },
            { label: "Completed SP",value: doneSP,             color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl border p-3 ${bg}`}>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Completed tasks */}
      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
          Completed ({doneTasks.length})
          <span className="ml-2 text-xs font-normal text-slate-400">— mark items as demo-ready for the review meeting</span>
        </h3>

        {doneTasks.length === 0 ? (
          <p className="text-sm text-slate-400 italic py-4 text-center">No completed tasks yet</p>
        ) : (
          <div className="space-y-2">
            {doneTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-[#2a3044] bg-slate-50/50 dark:bg-[#161b27] hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors group"
              >
                {/* Demo ready toggle */}
                <button
                  onClick={() => toggleDemo(task.id)}
                  className={`flex-shrink-0 transition-colors ${task.demoReady ? "text-green-500" : "text-slate-300 dark:text-slate-600 hover:text-green-400"}`}
                  title={task.demoReady ? "Demo ready" : "Mark as demo ready"}
                >
                  {task.demoReady
                    ? <FaCheckCircle className="w-4 h-4" />
                    : <FaRegCircle className="w-4 h-4" />}
                </button>

                <span className="text-[10px] font-mono text-slate-400 flex-shrink-0">CY-{task.id}</span>

                <span
                  className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 truncate"
                  onClick={() => onTaskClick?.(task)}
                >
                  {task.title}
                </span>

                {task.priority && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${PRI_COLOR[task.priority] || ""}`}>
                    {task.priority}
                  </span>
                )}

                {task.assignedTo && task.assignedTo !== "unassigned" && (
                  <span className="text-xs text-slate-400 flex-shrink-0 capitalize">{task.assignedTo}</span>
                )}

                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex-shrink-0 w-8 text-right">
                  {task.storyPoint ? `${task.storyPoint} SP` : "—"}
                </span>

                {task.demoReady && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium flex-shrink-0">
                    Demo Ready
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incomplete tasks */}
      {notDone.length > 0 && (
        <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
            Not Completed ({notDone.length})
          </h3>
          <div className="space-y-1.5">
            {notDone.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 px-3 py-2 rounded-xl border border-slate-100 dark:border-[#2a3044] opacity-60 hover:opacity-80 transition-opacity"
              >
                <span className="text-[10px] font-mono text-slate-400">CY-{task.id}</span>
                <span
                  className="flex-1 text-sm text-slate-600 dark:text-slate-300 cursor-pointer truncate"
                  onClick={() => onTaskClick?.(task)}
                >
                  {task.title}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  task.status === "blocked" ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                  : task.status === "inprogress" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                  : "bg-slate-100 text-slate-500 dark:bg-[#2a3044] dark:text-slate-400"
                }`}>
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meeting notes */}
      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FaStickyNote className="w-3.5 h-3.5 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Meeting Notes</h3>
          </div>
          {!editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
            >
              {meetingNotes ? "Edit" : "+ Add notes"}
            </button>
          )}
        </div>

        {editingNotes ? (
          <div>
            <textarea
              autoFocus
              className="w-full min-h-32 px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] text-sm text-slate-700 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-slate-400"
              placeholder="Add review meeting notes, decisions, stakeholder feedback…"
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setEditingNotes(false)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:bg-slate-50 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : meetingNotes ? (
          <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{meetingNotes}</p>
        ) : (
          <p className="text-sm text-slate-400 italic">No notes yet</p>
        )}
      </div>
    </div>
  );
}
