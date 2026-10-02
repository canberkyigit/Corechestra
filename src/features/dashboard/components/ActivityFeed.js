import React, { memo } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { FaHistory } from "react-icons/fa";
import { parseValidDate } from "../utils/dashboardMetrics";
import { Avatar, EmptyHint, Panel, PanelLink } from "./DashboardPrimitives";

function relative(timestamp) {
  const date = parseValidDate(timestamp);
  if (!date) return "";
  return `${formatDistanceToNowStrict(date)} ago`;
}

function ActivityFeed({ entries, onViewAll, limit = 8 }) {
  return (
    <Panel
      title="Recent activity"
      icon={FaHistory}
      action={onViewAll ? <PanelLink onClick={onViewAll}>View all</PanelLink> : null}
      testId="activity-feed"
      className="h-full"
    >
      {entries.length === 0 ? (
        <EmptyHint icon={FaHistory} title="No activity yet">Changes to this project will show up here.</EmptyHint>
      ) : (
        <ol className="relative space-y-3 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-slate-200 dark:before:bg-[#2a3044]">
          {entries.slice(0, limit).map((entry) => (
            <li key={entry.id} className="relative flex items-start gap-3">
              <span className="relative z-[1] rounded-full ring-2 ring-white dark:ring-[#1a1f2e]">
                <Avatar name={entry.user || "?"} size={22} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[13px] leading-snug text-slate-600 dark:text-slate-300">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{entry.user || "Someone"}</span>{" "}
                  {entry.action}
                  {entry.details?.name && <span className="font-medium text-slate-800 dark:text-slate-100"> {entry.details.name}</span>}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{relative(entry.timestamp)}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

export default memo(ActivityFeed);
