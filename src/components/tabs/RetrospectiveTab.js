import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import MDEditor from "@uiw/react-md-editor";
import { FaTrash, FaCheck, FaPencilAlt, FaPlus, FaCopy, FaStopwatch } from "react-icons/fa";
import { useApp } from "../../context/AppContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS = [
  {
    key: "wentWell",
    label: "Went Well",
    icon: "✓",
    header: "bg-green-500",
    card: "border-green-100 dark:border-green-900/30",
    badge: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    addBtn: "hover:bg-green-50 dark:hover:bg-green-900/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  {
    key: "wentWrong",
    label: "Went Wrong",
    icon: "✗",
    header: "bg-red-500",
    card: "border-red-100 dark:border-red-900/30",
    badge: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    addBtn: "hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  },
  {
    key: "canImprove",
    label: "Can Improve",
    icon: "💡",
    header: "bg-blue-500",
    card: "border-blue-100 dark:border-blue-900/30",
    badge: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    addBtn: "hover:bg-blue-50 dark:hover:bg-blue-900/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
  {
    key: "actionItems",
    label: "Action Items",
    icon: "🎯",
    header: "bg-violet-500",
    card: "border-violet-100 dark:border-violet-900/30",
    badge: "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400",
    addBtn: "hover:bg-violet-50 dark:hover:bg-violet-900/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800",
  },
];

// ─── Timer ────────────────────────────────────────────────────────────────────

function RetroTimer() {
  const [seconds, setSeconds]   = useState(0);
  const [running, setRunning]   = useState(false);
  const [preset,  setPreset]    = useState(null); // countdown start value
  const intervalRef = useRef(null);

  const PRESETS = [5 * 60, 10 * 60, 15 * 60];

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (preset !== null && s <= 0) {
            setRunning(false);
            return 0;
          }
          return preset !== null ? s - 1 : s + 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, preset]);

  const reset = () => {
    setRunning(false);
    setSeconds(preset ?? 0);
  };

  const startPreset = (p) => {
    setPreset(p);
    setSeconds(p);
    setRunning(true);
  };

  const mins = Math.floor(Math.abs(seconds) / 60);
  const secs = Math.abs(seconds) % 60;
  const display = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const isWarning = preset !== null && seconds <= 60 && seconds > 0 && running;
  const isDone    = preset !== null && seconds === 0 && !running;

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <FaStopwatch className={`w-3.5 h-3.5 ${isWarning ? "text-red-500 animate-pulse" : isDone ? "text-green-500" : "text-slate-400 dark:text-slate-500"}`} />
      <span className={`font-mono text-sm font-bold tabular-nums ${
        isWarning ? "text-red-500" : isDone ? "text-green-500 dark:text-green-400" : "text-slate-600 dark:text-slate-300"
      }`}>
        {display}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setRunning((v) => !v)}
          className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
        >
          {running ? "Pause" : "Start"}
        </button>
        <button
          onClick={reset}
          className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-slate-300 transition-colors"
        >
          Reset
        </button>
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => startPreset(p)}
            className="text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
          >
            {p / 60}m
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Retro Card ───────────────────────────────────────────────────────────────

function RetroCard({ item, col, onVote, onEdit, onDelete, isEditing, editText, setEditText, onSave }) {
  const scoreColor =
    item.score > 3 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : item.score < 0 ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
    : "bg-slate-100 text-slate-600 dark:bg-[#2a3044] dark:text-slate-400";

  return (
    <div className={`group relative bg-white dark:bg-[#1c2030] rounded-xl border ${col.card} shadow-sm p-3 transition-all hover:shadow-md`}>
      {/* Body */}
      {isEditing ? (
        <input
          autoFocus
          className="w-full text-sm bg-transparent border-b border-blue-400 text-slate-700 dark:text-slate-200 outline-none pb-1 mb-2"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={onSave}
          onKeyDown={(e) => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onSave(); }}
        />
      ) : (
        <p className={`text-sm text-slate-700 dark:text-slate-200 leading-relaxed mb-2 pr-12 ${item.checked ? "line-through opacity-40" : ""}`}>
          {item.text || <span className="italic text-slate-400">Empty item</span>}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-2">
        {/* Upvote */}
        <button
          onClick={() => onVote(1)}
          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${scoreColor}`}
        >
          +1
          {item.score !== 0 && <span className="font-bold">{item.score > 0 ? `+${item.score}` : item.score}</span>}
        </button>
        {item.score !== 0 && (
          <button
            onClick={() => onVote(-1)}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors"
            title="Downvote"
          >
            −1
          </button>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          title="Edit"
        >
          <FaPencilAlt className="w-3 h-3" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          title="Delete"
        >
          <FaTrash className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Retro Board ──────────────────────────────────────────────────────────────

function RetroBoard() {
  const {
    retrospectiveItems,
    addRetroItem,
    updateRetroItem,
    deleteRetroItem,
    voteRetroItem,
    setRetroItemEditing,
  } = useApp();

  const [editingItem, setEditingItem] = useState(null); // { category, id }
  const [editText,    setEditText]    = useState("");

  const handleEdit = (category, id) => {
    const item = retrospectiveItems[category].find((i) => i.id === id);
    setEditingItem({ category, id });
    setEditText(item?.text || "");
    setRetroItemEditing(category, id, true);
  };

  const handleSave = useCallback(() => {
    if (!editingItem) return;
    updateRetroItem(editingItem.category, editingItem.id, editText);
    setEditingItem(null);
    setEditText("");
  }, [editingItem, editText, updateRetroItem]);

  const handleExport = () => {
    const lines = COLUMNS.map((col) => {
      const items = retrospectiveItems[col.key];
      if (!items.length) return null;
      return `## ${col.icon} ${col.label}\n${items.map((i) => `- ${i.text}${i.score > 0 ? ` (+${i.score})` : ""}`).join("\n")}`;
    }).filter(Boolean).join("\n\n");
    navigator.clipboard.writeText(`# Sprint Retrospective\n\n${lines}`);
  };

  // Sentiment bar
  const wellCount   = retrospectiveItems.wentWell?.length || 0;
  const wrongCount  = retrospectiveItems.wentWrong?.length || 0;
  const totalSent   = wellCount + wrongCount;
  const wellPct     = totalSent > 0 ? Math.round((wellCount / totalSent) * 100) : 50;

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Sentiment bar */}
        {totalSent > 0 && (
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <span className="text-xs text-green-500 font-medium flex-shrink-0">{wellCount} ✓</span>
            <div className="flex-1 h-2 bg-red-200 dark:bg-red-900/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 rounded-full transition-all duration-500"
                style={{ width: `${wellPct}%` }}
              />
            </div>
            <span className="text-xs text-red-500 font-medium flex-shrink-0">{wrongCount} ✗</span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          <RetroTimer />
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
            title="Copy to clipboard as Markdown"
          >
            <FaCopy className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      {/* 4-column board */}
      <div className="grid grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const items = retrospectiveItems[col.key] || [];
          return (
            <div key={col.key} className="flex flex-col gap-2">
              {/* Column header */}
              <div className={`${col.header} rounded-xl px-3 py-2 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-bold">{col.icon}</span>
                  <span className="text-white text-xs font-semibold">{col.label}</span>
                </div>
                <span className="text-white/70 text-xs font-medium">{items.length}</span>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-2 min-h-16">
                {items.map((item) => {
                  const isEditing = editingItem?.category === col.key && editingItem?.id === item.id;
                  return (
                    <RetroCard
                      key={item.id}
                      item={item}
                      col={col}
                      isEditing={isEditing}
                      editText={editText}
                      setEditText={setEditText}
                      onSave={handleSave}
                      onEdit={() => handleEdit(col.key, item.id)}
                      onDelete={() => deleteRetroItem(col.key, item.id)}
                      onVote={(delta) => voteRetroItem(col.key, item.id, delta)}
                    />
                  );
                })}
              </div>

              {/* Add button */}
              <button
                onClick={() => addRetroItem(col.key)}
                className={`flex items-center gap-1.5 w-full text-xs py-2 px-3 rounded-xl border border-dashed transition-colors ${col.addBtn}`}
              >
                <FaPlus className="w-2.5 h-2.5" /> Add item
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Statistics ───────────────────────────────────────────────────────────────

function StatisticsContent({ retrospectiveItems, activeTasks }) {
  const totalSP = activeTasks.reduce((s, t) => s + (t.storyPoint || 0), 0);
  const doneSP  = activeTasks.filter((t) => t.status === "done").reduce((s, t) => s + (t.storyPoint || 0), 0);

  return (
    <div>
      {/* Retro category summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {COLUMNS.map((col) => {
          const items    = retrospectiveItems[col.key] || [];
          const resolved = items.filter((i) => i.checked).length;
          return (
            <div key={col.key} className={`rounded-xl border p-4 ${col.card} bg-white dark:bg-[#1c2030]`}>
              <div className={`text-2xl font-bold ${col.badge.split(" ").find((c) => c.startsWith("text-")) || ""}`}>
                {items.length}
              </div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">{col.label}</div>
              <div className="text-xs text-slate-400 mt-1">{resolved} resolved</div>
            </div>
          );
        })}
      </div>

      {/* Resolution progress bars */}
      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 mb-6">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Resolution Progress</h4>
        <div className="space-y-3">
          {COLUMNS.map((col) => {
            const items = retrospectiveItems[col.key] || [];
            const done  = items.filter((i) => i.checked).length;
            const pct   = items.length > 0 ? Math.round((done / items.length) * 100) : 0;
            const barColor = col.header.replace("bg-", "bg-");
            return (
              <div key={col.key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{col.label}</span>
                  <span className="text-slate-400">{done}/{items.length} ({pct}%)</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-[#2a3044] rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sprint stats */}
      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Sprint Task Statistics</h4>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Total",       value: activeTasks.length, color: "text-slate-700 dark:text-slate-200",  bg: "bg-slate-50 dark:bg-[#232838] border-slate-200 dark:border-[#2a3044]" },
            { label: "Done",        value: activeTasks.filter((t) => t.status === "done").length,       color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30" },
            { label: "In Progress", value: activeTasks.filter((t) => t.status === "inprogress").length, color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30" },
            { label: "Blocked",     value: activeTasks.filter((t) => t.status === "blocked").length,    color: "text-red-600 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-xl border p-3 text-center ${bg}`}>
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-50 dark:bg-[#232838] rounded-lg p-3 border border-slate-100 dark:border-[#2a3044]">
            <div className="font-semibold text-slate-700 dark:text-slate-200 mb-2 text-xs uppercase tracking-wide">Story Points</div>
            {[
              { label: "Total",     value: totalSP,            color: "" },
              { label: "Completed", value: doneSP,             color: "text-green-600 dark:text-green-400" },
              { label: "Remaining", value: totalSP - doneSP,   color: "text-orange-500 dark:text-orange-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between py-0.5">
                <span className="text-slate-500 dark:text-slate-400 text-xs">{label}</span>
                <span className={`font-semibold text-xs ${color}`}>{value}</span>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 dark:bg-[#232838] rounded-lg p-3 border border-slate-100 dark:border-[#2a3044]">
            <div className="font-semibold text-slate-700 dark:text-slate-200 mb-2 text-xs uppercase tracking-wide">Priority</div>
            {["critical", "high", "medium", "low"].map((p) => (
              <div key={p} className="flex justify-between py-0.5">
                <span className="text-slate-500 dark:text-slate-400 text-xs capitalize">{p}</span>
                <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">
                  {activeTasks.filter((t) => (t.priority || "").toLowerCase() === p).length}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function BurndownChart({ activeTasks }) {
  const total     = activeTasks.reduce((s, t) => s + (t.storyPoint || 0), 0);
  const done      = activeTasks.filter((t) => t.status === "done").reduce((s, t) => s + (t.storyPoint || 0), 0);
  const remaining = total - done;
  const pct       = total > 0 ? Math.round((done / total) * 100) : 0;

  const days  = Array.from({ length: 10 }, (_, i) => ({
    day:    i + 1,
    ideal:  Math.max(0, Math.round(total - (total / 9) * i)),
    actual: i < 7 ? Math.max(0, Math.round(total - (done / 6) * i)) : remaining,
  }));

  const maxY = total || 1;
  const W = 500, H = 200, padL = 40, padB = 30, padT = 10, padR = 20;
  const xScale = (i) => padL + ((W - padL - padR) / (days.length - 1)) * i;
  const yScale = (v) => padT + (H - padT - padB) * (1 - v / maxY);
  const polyline = (key) => days.map((d, i) => `${xScale(i)},${yScale(d[key])}`).join(" ");

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "Total SP",    value: total,     color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30" },
          { label: "Completed",   value: done,      color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30" },
          { label: "Remaining",   value: remaining, color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border p-3 text-center ${bg}`}>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>
      <div className="bg-slate-50 dark:bg-[#232838] rounded-xl border border-slate-200 dark:border-[#2a3044] p-4">
        <div className="flex items-center gap-4 mb-2 text-xs">
          <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-red-400" /><span className="text-slate-500 dark:text-slate-400">Ideal</span></div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-blue-500" /><span className="text-slate-500 dark:text-slate-400">Actual</span></div>
          <span className="ml-auto font-semibold text-slate-600 dark:text-slate-300">{pct}% complete</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <line key={p} x1={padL} x2={W - padR} y1={yScale(maxY * p)} y2={yScale(maxY * p)} stroke="#e2e8f0" strokeWidth="1" />
          ))}
          {[0, 0.5, 1].map((p) => (
            <text key={p} x={padL - 5} y={yScale(maxY * p) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{Math.round(maxY * p)}</text>
          ))}
          {days.filter((_, i) => i % 2 === 0).map((d) => (
            <text key={d.day} x={xScale(d.day - 1)} y={H - 5} textAnchor="middle" fontSize="10" fill="#94a3b8">D{d.day}</text>
          ))}
          <polyline points={polyline("ideal")} fill="none" stroke="#f87171" strokeWidth="2" strokeDasharray="5,3" />
          <polyline points={polyline("actual")} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
          {days.map((d, i) => (
            <circle key={i} cx={xScale(i)} cy={yScale(d.actual)} r="3" fill="#3b82f6" />
          ))}
        </svg>
      </div>
    </div>
  );
}

function VelocityChart({ activeTasks }) {
  const currentCommitted = activeTasks.reduce((s, t) => s + (t.storyPoint || 0), 0);
  const currentCompleted = activeTasks.filter((t) => t.status === "done").reduce((s, t) => s + (t.storyPoint || 0), 0);
  const sprints = [
    { name: "Sprint 83", committed: 34, completed: 28 },
    { name: "Sprint 84", committed: 40, completed: 36 },
    { name: "Sprint 85", committed: 38, completed: 38 },
    { name: "Current",   committed: currentCommitted, completed: currentCompleted },
  ];
  const maxVal = Math.max(...sprints.flatMap((s) => [s.committed, s.completed]), 1);
  const barW = 28, gap = 14, groupW = barW * 2 + gap, sprintGap = 30;
  const chartW = sprints.length * (groupW + sprintGap);
  const chartH = 160, padB = 30;

  return (
    <div className="bg-slate-50 dark:bg-[#232838] rounded-xl border border-slate-200 dark:border-[#2a3044] p-4">
      <div className="flex items-center gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1.5"><div className="w-4 h-3 bg-blue-300 dark:bg-blue-700 rounded-sm" /><span className="text-slate-500 dark:text-slate-400">Committed</span></div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-3 bg-green-400 rounded-sm" /><span className="text-slate-500 dark:text-slate-400">Completed</span></div>
      </div>
      <svg viewBox={`0 0 ${chartW + 20} ${chartH}`} className="w-full" style={{ height: 150 }}>
        {sprints.map((s, i) => {
          const x          = 10 + i * (groupW + sprintGap);
          const committedH = (s.committed / maxVal) * (chartH - padB - 10);
          const completedH = (s.completed / maxVal) * (chartH - padB - 10);
          return (
            <g key={s.name}>
              <rect x={x} y={chartH - padB - committedH} width={barW} height={committedH} fill="#93c5fd" rx="3" />
              <rect x={x + barW + gap} y={chartH - padB - completedH} width={barW} height={completedH} fill="#4ade80" rx="3" />
              <text x={x + barW + gap / 2} y={chartH - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">{s.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ChartsContent({ activeTasks }) {
  const [chartType, setChartType] = useState("burndown");
  const CHART_TABS = [
    { key: "burndown", label: "Burndown" },
    { key: "velocity", label: "Velocity" },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {CHART_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setChartType(key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              chartType === key
                ? "bg-blue-600 text-white shadow"
                : "bg-slate-100 dark:bg-[#232838] text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#2a3044]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {chartType === "burndown" && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Burndown Chart</h3>
          <BurndownChart activeTasks={activeTasks} />
        </div>
      )}
      {chartType === "velocity" && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Velocity Chart</h3>
          <VelocityChart activeTasks={activeTasks} />
        </div>
      )}
    </div>
  );
}

// ─── Notes ────────────────────────────────────────────────────────────────────

function NotesContent() {
  const { notesList, addNote, deleteNote } = useApp();
  const [draft,    setDraft]    = useState("");
  const [openNote, setOpenNote] = useState(null);

  return (
    <div className="max-w-2xl mx-auto">
      <div data-color-mode="light">
        <MDEditor
          value={draft}
          onChange={setDraft}
          height={240}
          preview="edit"
          textareaProps={{ placeholder: "Write your sprint notes here…" }}
        />
      </div>
      <button
        className="mt-3 w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
        onClick={() => { addNote(draft); setDraft(""); }}
        disabled={!draft.trim()}
      >
        Save Note
      </button>

      {notesList.length > 0 && (
        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Saved Notes ({notesList.length})
          </h4>
          {notesList.map((note) => {
            const summary = note.content.replace(/[#*_>\-[\]!`]/g, "").split("\n")[0].slice(0, 80);
            const isOpen  = openNote === note.id;
            return (
              <div key={note.id} className="bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-xl overflow-hidden">
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
                  onClick={() => setOpenNote(isOpen ? null : note.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">{isOpen ? "▼" : "▶"}</span>
                    <span className="text-slate-700 dark:text-slate-200 font-medium text-sm truncate max-w-md">{summary || "Note"}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete note"
                  >
                    <FaTrash className="w-3 h-3" />
                  </button>
                </div>
                {isOpen && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-[#232838]">
                    <MDEditor.Markdown source={note.content} style={{ background: "transparent", fontSize: 14 }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const SUB_TABS = [
  { key: "retro",       label: "Retro Board" },
  { key: "statistics",  label: "Statistics" },
  { key: "charts",      label: "Charts" },
  { key: "notes",       label: "Notes" },
];

export default function RetrospectiveTab() {
  const { retrospectiveItems, activeTasks } = useApp();
  const [subTab, setSubTab] = useState("retro");

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 px-4 py-4 overflow-y-auto pb-12">
      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-1 w-fit">
        {SUB_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSubTab(key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              subTab === key
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#232838]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-5 ${subTab === "retro" ? "overflow-x-auto" : ""}`}>
        {subTab === "retro" && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Sprint Retrospective</h2>
            </div>
            <RetroBoard />
          </>
        )}

        {subTab === "statistics" && (
          <>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-5">Statistics & Metrics</h2>
            <StatisticsContent retrospectiveItems={retrospectiveItems} activeTasks={activeTasks} />
          </>
        )}

        {subTab === "charts" && (
          <>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-5">Sprint Charts</h2>
            <ChartsContent activeTasks={activeTasks} />
          </>
        )}

        {subTab === "notes" && (
          <>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-5">Notes</h2>
            <NotesContent />
          </>
        )}
      </div>
    </div>
  );
}
