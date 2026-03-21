import React, { useState } from "react";
import { FaTimes, FaRocket, FaCheckCircle } from "react-icons/fa";
import { useApp } from "../context/AppContext";
import { format, parseISO } from "date-fns";

export default function SprintModal({ open, onClose, mode = "start" }) {
  const { sprint, activeTasks, backlogSections, startSprint, completeSprint, updateSprint } = useApp();

  const [name, setName] = useState(sprint?.name || "");
  const [goal, setGoal] = useState(sprint?.goal || "");
  const [startDate, setStartDate] = useState(sprint?.startDate || "");
  const [endDate, setEndDate] = useState(sprint?.endDate || "");
  const [moveBacklogId, setMoveBacklogId] = useState(backlogSections[0]?.id ?? null);

  if (!open) return null;

  const incomplete = activeTasks.filter((t) => t.status !== "done");

  const handleStart = () => {
    startSprint({ ...sprint, name, goal, startDate, endDate, id: sprint?.id || `sprint-${Date.now()}` });
    onClose();
  };

  const handleComplete = () => {
    completeSprint(moveBacklogId);
    onClose();
  };

  const handleEdit = () => {
    updateSprint({ name, goal, startDate, endDate });
    onClose();
  };

  const fmt = (d) => {
    if (!d) return "-";
    try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1c2030] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between ${
          mode === "complete" ? "bg-green-600" : "bg-blue-600"
        }`}>
          <div className="flex items-center gap-3 text-white">
            {mode === "complete" ? <FaCheckCircle className="w-5 h-5" /> : <FaRocket className="w-5 h-5" />}
            <h2 className="font-semibold text-lg">
              {mode === "start" ? "Start Sprint" : mode === "complete" ? "Complete Sprint" : "Edit Sprint"}
            </h2>
          </div>
          <button className="text-white/70 hover:text-white" onClick={onClose}>
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {mode === "complete" ? (
            <>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <FaCheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-700">Complete "{sprint?.name}"</span>
                </div>
                <p className="text-sm text-slate-600">
                  <span className="font-semibold text-green-600">{activeTasks.filter((t) => t.status === "done").length}</span> tasks completed.
                  {incomplete.length > 0 && (
                    <> <span className="font-semibold text-orange-500">{incomplete.length}</span> incomplete tasks will be moved.</>
                  )}
                </p>
              </div>
              {incomplete.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Move incomplete tasks to</label>
                  <select
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-400"
                    value={moveBacklogId}
                    onChange={(e) => setMoveBacklogId(Number(e.target.value))}
                  >
                    {backlogSections.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Sprint Name</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sprint 87"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Sprint Goal</label>
                <textarea
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                  rows={3}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="What is the goal of this sprint?"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Start Date</label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">End Date</label>
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              {sprint?.status === "active" && (
                <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3 border border-slate-200">
                  Running: {fmt(sprint.startDate)} → {fmt(sprint.endDate)}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 pb-6 flex justify-end gap-3">
          <button
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          {mode === "start" && (
            <button
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={handleStart}
            >
              Start Sprint
            </button>
          )}
          {mode === "edit" && (
            <button
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={handleEdit}
            >
              Save Changes
            </button>
          )}
          {mode === "complete" && (
            <button
              className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              onClick={handleComplete}
            >
              Complete Sprint
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
