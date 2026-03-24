import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FaTimes, FaCalendarAlt, FaPlus, FaTrash, FaRocket } from "react-icons/fa";
import { useApp } from "../context/AppContext";
import { plannedSprintSchema } from "../schemas";
import { format, parseISO } from "date-fns";

const fmt = (d) => {
  if (!d) return "—";
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
};

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
      <span>⚠</span> {message}
    </p>
  );
}

export default function FuturePlansModal({ open, onClose }) {
  const { plannedSprints, createPlannedSprint, deletePlannedSprint } = useApp();
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(plannedSprintSchema),
    defaultValues: { name: "", goal: "", startDate: "", endDate: "" },
  });

  if (!open) return null;

  const onSubmit = (data) => {
    createPlannedSprint(data);
    reset();
  };

  const sorted = [...plannedSprints].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const inputCls = (hasError) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
      hasError
        ? "border-red-500 focus:ring-red-400 bg-red-500/10 text-red-300 placeholder-red-400/60"
        : "border-[#2a3044] focus:ring-indigo-400 bg-[#232838] text-slate-300 placeholder-slate-500"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-[#1c2030] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between bg-indigo-600">
          <div className="flex items-center gap-3 text-white">
            <FaCalendarAlt className="w-4 h-4" />
            <h2 className="font-semibold text-lg">Future Sprints</h2>
            {plannedSprints.length > 0 && (
              <span className="bg-white/20 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                {plannedSprints.length}
              </span>
            )}
          </div>
          <button className="text-white/70 hover:text-white transition-colors" onClick={onClose}>
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        <div className="flex divide-x divide-[#252b3b]" style={{ minHeight: 360 }}>

          {/* Left — list */}
          <div className="flex-1 p-5 space-y-2 overflow-y-auto" style={{ maxHeight: 460 }}>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Planned Sprints
            </div>

            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FaRocket className="w-8 h-8 text-slate-700 mb-3" />
                <p className="text-sm text-slate-500">No future sprints planned yet.</p>
                <p className="text-xs text-slate-600 mt-1">Use the form to plan ahead.</p>
              </div>
            ) : (
              sorted.map((s) => (
                <div key={s.id} className="group relative border border-[#2a3044] rounded-xl p-3.5 bg-[#1a1f2e] hover:border-indigo-700 transition-colors">
                  {confirmDeleteId === s.id && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-[#1c2030]/95 rounded-xl">
                      <span className="text-xs text-slate-400">Delete this sprint?</span>
                      <button className="px-2.5 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700"
                        onClick={() => { deletePlannedSprint(s.id); setConfirmDeleteId(null); }}>
                        Delete
                      </button>
                      <button className="px-2.5 py-1 text-xs text-slate-400 border border-[#2a3044] rounded-lg hover:bg-[#232838]"
                        onClick={() => setConfirmDeleteId(null)}>
                        Cancel
                      </button>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-slate-200 truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-3.5">
                        <FaCalendarAlt className="w-2.5 h-2.5 flex-shrink-0" />
                        <span>{fmt(s.startDate)} → {fmt(s.endDate)}</span>
                      </div>
                      {s.goal && (
                        <p className="text-xs text-slate-500 mt-1.5 ml-3.5 line-clamp-2 italic">"{s.goal}"</p>
                      )}
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-red-400 transition-all flex-shrink-0 rounded-lg hover:bg-red-900/20"
                      onClick={() => setConfirmDeleteId(s.id)}
                    >
                      <FaTrash className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right — form */}
          <div className="w-72 flex-shrink-0 p-5 space-y-4 bg-[#141720]/50">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Plan a New Sprint
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Sprint Name *</label>
                <input {...register("name")} className={inputCls(!!errors.name)} placeholder="e.g. Sprint 12" />
                <FieldError message={errors.name?.message} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">Goal</label>
                <textarea {...register("goal")} rows={2}
                  className={`${inputCls(false)} resize-none`}
                  placeholder="What's the goal?" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Start *</label>
                  <input type="date" {...register("startDate")} className={inputCls(!!errors.startDate)} />
                  <FieldError message={errors.startDate?.message} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">End *</label>
                  <input type="date" {...register("endDate")} className={inputCls(!!errors.endDate)} />
                  <FieldError message={errors.endDate?.message} />
                </div>
              </div>

              <button type="submit"
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                <FaPlus className="w-3 h-3" /> Add Sprint
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#252b3b] flex justify-end">
          <button className="px-4 py-1.5 text-sm text-slate-400 border border-[#2a3044] rounded-lg hover:bg-[#232838] transition-colors"
            onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
