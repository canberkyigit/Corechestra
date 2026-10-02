import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FaRocket, FaCheckCircle } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { sprintSchema } from "../../../shared/schemas";
import { format, parseISO } from "date-fns";
import { isInProject } from "../../../shared/utils/helpers";
import { Modal } from "../../../shared/ui/Modal";
import { useToast } from "../../../shared/context/ToastContext";

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
  const { sprint, activeTasks, backlogSections: backlogSectionsRaw, currentProjectId, startSprint, completeSprint, updateSprint } = useApp();
  const { addToast } = useToast();
  const backlogSections = useMemo(() => backlogSectionsRaw || [], [backlogSectionsRaw]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
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

  // Keep the target section valid when sections load later or change.
  useEffect(() => {
    if (!open) return;
    setMoveBacklogId((current) => (
      backlogSections.some((section) => section.id === current) ? current : (backlogSections[0]?.id ?? null)
    ));
  }, [open, backlogSections]);

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

  // Counts must match what completeSprint acts on: the current project only.
  const projectTasks = (activeTasks || []).filter((t) => !currentProjectId || isInProject(t, currentProjectId));
  const incomplete = projectTasks.filter((t) => t.status !== "done");
  const completedCount = projectTasks.length - incomplete.length;

  const onSubmit = (data) => {
    if (mode === "start") {
      startSprint({ ...sprint, ...data, id: sprint?.id || `sprint-${Date.now()}` });
      addToast(`Sprint "${data.name}" started`, "success");
    } else if (mode === "edit") {
      updateSprint(data);
      addToast("Sprint updated", "success");
    }
    onClose();
  };

  const handleComplete = () => {
    completeSprint(moveBacklogId);
    addToast(
      incomplete.length > 0
        ? `Sprint "${sprint?.name || ""}" completed · ${incomplete.length} unfinished task${incomplete.length === 1 ? "" : "s"} moved to the backlog`
        : `Sprint "${sprint?.name || ""}" completed`,
      "success"
    );
    onClose();
  };

  const inputCls = (hasError) =>
    `w-full border rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 transition-colors ${
      hasError
        ? "border-red-400 focus:ring-red-300 bg-red-50 dark:bg-red-900/20"
        : "border-slate-200 dark:border-[#2a3044] focus:ring-blue-400 bg-white dark:bg-[#232838]"
    }`;
  const labelCls = "text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1.5";

  const title = mode === "start" ? "Start Sprint" : mode === "complete" ? "Complete Sprint" : "Edit Sprint";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      icon={(
        <span className={`w-8 h-8 rounded-full flex items-center justify-center ${mode === "complete" ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"}`}>
          {mode === "complete" ? <FaCheckCircle className="w-4 h-4" /> : <FaRocket className="w-4 h-4" />}
        </span>
      )}
      size="md"
      confirmClose={mode !== "complete" && isDirty}
      closeOnBackdrop={mode === "complete" || !isDirty}
      testId="sprint-modal"
      footer={(
        <>
          <button
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors"
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
        </>
      )}
    >
      <div className="space-y-4">
        {mode === "complete" ? (
          <>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800/50">
              <div className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="font-semibold text-green-700 dark:text-green-300">Complete "{sprint?.name}"</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-green-600 dark:text-green-400">{completedCount}</span> tasks completed.
                {incomplete.length > 0 && (
                  <> <span className="font-semibold text-orange-500">{incomplete.length}</span> incomplete tasks will be moved.</>
                )}
              </p>
            </div>
            {incomplete.length > 0 && (
              <div>
                <label htmlFor="sprint-modal-move-target" className={labelCls}>Move incomplete tasks to</label>
                {backlogSections.length > 0 ? (
                  <select
                    id="sprint-modal-move-target"
                    className="w-full border border-slate-200 dark:border-[#2a3044] rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-[#232838] focus:outline-none focus:ring-2 focus:ring-green-400"
                    value={moveBacklogId ?? ""}
                    onChange={(e) => setMoveBacklogId(Number(e.target.value))}
                  >
                    {backlogSections.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] rounded-lg px-3 py-2">
                    No backlog section exists yet — a new "Backlog" section will be created for them.
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <form id="sprint-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="sprint-modal-name" className={labelCls}>Sprint Name</label>
              <input
                id="sprint-modal-name"
                {...register("name")}
                className={inputCls(!!errors.name)}
                placeholder="e.g. Sprint 87"
                data-autofocus
              />
              <FieldError message={errors.name?.message} />
            </div>

            <div>
              <label htmlFor="sprint-modal-goal" className={labelCls}>Sprint Goal</label>
              <textarea
                id="sprint-modal-goal"
                {...register("goal")}
                className={`${inputCls(false)} resize-none`}
                rows={3}
                placeholder="What is the goal of this sprint?"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sprint-modal-start-date" className={labelCls}>Start Date</label>
                <input id="sprint-modal-start-date" type="date" {...register("startDate")} className={`${inputCls(!!errors.startDate)} [color-scheme:light] dark:[color-scheme:dark]`} />
                <FieldError message={errors.startDate?.message} />
              </div>
              <div>
                <label htmlFor="sprint-modal-end-date" className={labelCls}>End Date</label>
                <input id="sprint-modal-end-date" type="date" {...register("endDate")} className={`${inputCls(!!errors.endDate)} [color-scheme:light] dark:[color-scheme:dark]`} />
                <FieldError message={errors.endDate?.message} />
              </div>
            </div>

            {sprint?.status === "active" && (
              <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-[#232838] rounded-lg p-3 border border-slate-200 dark:border-[#2a3044]">
                Running: {fmt(sprint.startDate)} → {fmt(sprint.endDate)}
              </div>
            )}
          </form>
        )}
      </div>
    </Modal>
  );
}
