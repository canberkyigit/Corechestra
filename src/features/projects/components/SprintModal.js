import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FaTimes, FaRocket, FaCheckCircle } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { sprintSchema } from "../../../shared/schemas";
import { format, parseISO } from "date-fns";

const fmt = (d) => {
  if (!d) return "-";
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
};

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
      <span>⚠</span> {message}
    </p>
  );
}

export default function SprintModal({ open, onClose, mode = "start" }) {
  const { sprint, activeTasks, backlogSections, startSprint, completeSprint, updateSprint } = useApp();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(sprintSchema),
    defaultValues: {
      name:      sprint?.name || "",
      goal:      sprint?.goal || "",
      startDate: sprint?.startDate || "",
      endDate:   sprint?.endDate || "",
    },
  });

  const [moveBacklogId, setMoveBacklogId] = React.useState(backlogSections[0]?.id ?? null);

  // Re-sync form values when modal opens
  useEffect(() => {
    if (open) {
      reset({
        name:      sprint?.name || "",
        goal:      sprint?.goal || "",
        startDate: sprint?.startDate || "",
        endDate:   sprint?.endDate || "",
      });
    }
  }, [open, sprint, reset]);

  if (!open) return null;

  const incomplete = activeTasks.filter((t) => t.status !== "done");

  const onSubmit = (data) => {
    if (mode === "start") {
      startSprint({ ...sprint, ...data, id: sprint?.id || `sprint-${Date.now()}` });
    } else if (mode === "edit") {
      updateSprint(data);
    }
    onClose();
  };

  const handleComplete = () => {
    completeSprint(moveBacklogId);
    onClose();
  };

  const inputCls = (hasError) =>
    `w-full border rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 transition-colors ${
      hasError
        ? "border-red-400 focus:ring-red-300 bg-red-50"
        : "border-slate-200 focus:ring-blue-400 bg-white"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1c2030] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 flex items-center justify-between ${mode === "complete" ? "bg-green-600" : "bg-blue-600"}`}>
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

        {/* Body */}
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
            <form id="sprint-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Sprint Name</label>
                <input
                  {...register("name")}
                  className={inputCls(!!errors.name)}
                  placeholder="e.g. Sprint 87"
                />
                <FieldError message={errors.name?.message} />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Sprint Goal</label>
                <textarea
                  {...register("goal")}
                  className={`${inputCls(false)} resize-none`}
                  rows={3}
                  placeholder="What is the goal of this sprint?"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">Start Date</label>
                  <input type="date" {...register("startDate")} className={inputCls(!!errors.startDate)} />
                  <FieldError message={errors.startDate?.message} />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1.5">End Date</label>
                  <input type="date" {...register("endDate")} className={inputCls(!!errors.endDate)} />
                  <FieldError message={errors.endDate?.message} />
                </div>
              </div>

              {sprint?.status === "active" && (
                <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3 border border-slate-200">
                  Running: {fmt(sprint.startDate)} → {fmt(sprint.endDate)}
                </div>
              )}
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          {mode === "start" && (
            <button form="sprint-form" type="submit"
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Start Sprint
            </button>
          )}
          {mode === "edit" && (
            <button form="sprint-form" type="submit"
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Save Changes
            </button>
          )}
          {mode === "complete" && (
            <button type="button" onClick={handleComplete}
              className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Complete Sprint
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
