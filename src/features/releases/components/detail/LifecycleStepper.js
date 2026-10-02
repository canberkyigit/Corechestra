import React, { memo } from "react";
import { FaBan, FaCheck, FaUndo } from "react-icons/fa";
import { LIFECYCLE_STEPS, STATUS_META } from "../../constants/releaseMeta";
import { formatDate } from "../../utils/releaseUtils";

function stepDate(release, step) {
  if (step === "planned") return release.createdAt;
  if (step === "in-progress") return release.startDate;
  if (step === "code-freeze") return release.freezeDate;
  return release.releasedAt || (release.status === "released" ? release.releaseDate : "");
}

function cancelledReach(release) {
  const firstMissing = LIFECYCLE_STEPS.findIndex((step) => !stepDate(release, step));
  return firstMissing === -1 ? LIFECYCLE_STEPS.length - 1 : firstMissing - 1;
}

/** Planned → In progress → Code freeze → Released (+ terminal Rolled back / Cancelled). */
function LifecycleStepper({ release }) {
  const terminal = release.status === "rolled-back" || release.status === "cancelled";
  const reachedIndex = release.status === "rolled-back"
    ? LIFECYCLE_STEPS.length - 1
    : release.status === "cancelled"
      ? cancelledReach(release)
      : LIFECYCLE_STEPS.indexOf(release.status);

  return (
    <ol className="flex items-center gap-0 overflow-x-auto scrollbar-none" aria-label="Release lifecycle">
      {LIFECYCLE_STEPS.map((step, index) => {
        const done = terminal
          ? index <= reachedIndex
          : index < reachedIndex || (step === "released" && release.status === "released");
        const current = index === reachedIndex && !terminal && !done;
        const date = stepDate(release, step);
        return (
          <li key={step} className="flex items-center flex-shrink-0" aria-current={current ? "step" : undefined}>
            {index > 0 && (
              <span className={`mx-2 h-px w-6 sm:w-10 ${index <= reachedIndex ? "bg-blue-500/60" : "bg-slate-300 dark:bg-[#334155]"}`} aria-hidden="true" />
            )}
            <span className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ring-1 ring-inset ${
                  done
                    ? "bg-blue-600 text-white ring-blue-600"
                    : current
                      ? "bg-blue-500/10 text-blue-700 ring-blue-500 dark:text-blue-300"
                      : "bg-transparent text-slate-500 ring-slate-300 dark:ring-[#334155]"
                }`}
              >
                {done ? <FaCheck className="h-2.5 w-2.5" /> : index + 1}
              </span>
              <span className="leading-tight">
                <span className={`block text-xs font-semibold ${current ? "text-blue-700 dark:text-blue-300" : done ? "text-slate-800" : "text-slate-500"}`}>
                  {STATUS_META[step].label}
                </span>
                <span className="block text-[10px] text-slate-500 tabular-nums">{date ? formatDate(date, "MMM d") : "—"}</span>
              </span>
            </span>
          </li>
        );
      })}
      {terminal && (
        <li className="flex items-center flex-shrink-0">
          <span className="mx-2 h-px w-6 sm:w-10 bg-slate-300 dark:bg-[#334155]" aria-hidden="true" />
          <span className="flex items-center gap-2" aria-current="step">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-white ${release.status === "rolled-back" ? "bg-orange-500" : "bg-rose-400"}`}>
              {release.status === "rolled-back" ? <FaUndo className="h-2.5 w-2.5" /> : <FaBan className="h-2.5 w-2.5" />}
            </span>
            <span className={`text-xs font-semibold ${release.status === "rolled-back" ? "text-orange-700 dark:text-orange-300" : "text-rose-700 dark:text-rose-300"}`}>
              {STATUS_META[release.status].label}
            </span>
          </span>
        </li>
      )}
    </ol>
  );
}

export default memo(LifecycleStepper);
