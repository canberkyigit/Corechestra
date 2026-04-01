import React, { useMemo, useState } from "react";
import { FaBell, FaBookOpen, FaClipboardList, FaComments, FaFlask, FaLayerGroup } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { buildUniversalTimeline } from "../../../shared/utils/universalTimeline";
import { AppBadge, AppEmptyState, AppSectionHeader } from "../../../shared/components/AppPrimitives";

const CATEGORY_META = {
  all: { label: "All", tone: "neutral", icon: FaLayerGroup },
  activity: { label: "Workspace", tone: "blue", icon: FaBell },
  comment: { label: "Comments", tone: "purple", icon: FaComments },
  doc: { label: "Docs", tone: "green", icon: FaBookOpen },
  release: { label: "Releases", tone: "orange", icon: FaClipboardList },
  test: { label: "Testing", tone: "cyan", icon: FaFlask },
};

export default function ActivityPage() {
  const {
    currentUser,
    globalActivityLog,
    activeTasks,
    backlogSections,
    docPages,
    releases,
    testRuns,
    dbReady,
  } = useApp();
  const [filter, setFilter] = useState("all");

  const timeline = useMemo(() => buildUniversalTimeline({
    currentUser,
    globalActivityLog,
    activeTasks,
    backlogSections,
    docPages,
    releases,
    testRuns,
  }), [activeTasks, backlogSections, currentUser, docPages, globalActivityLog, releases, testRuns]);

  const visibleEntries = useMemo(
    () => timeline.filter((entry) => filter === "all" || entry.category === filter),
    [filter, timeline]
  );

  if (!dbReady) return null;

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-[#141720]">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <AppSectionHeader
          kicker="Workspace Signals"
          title="Activity Center"
          subtitle="A filterable workspace timeline across tasks, docs, releases, test runs and comments."
          action={
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORY_META).map(([key, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFilter(key)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      filter === key
                        ? "bg-blue-600 text-white"
                        : "app-surface-muted text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          }
        />

        {visibleEntries.length === 0 ? (
          <AppEmptyState
            icon={<FaBell className="w-6 h-6" />}
            title="No activity for this filter"
            description="When teams create tasks, comments, releases or test runs, the timeline will show them here."
          />
        ) : (
          <div className="space-y-3">
            {visibleEntries.map((entry) => {
              const meta = CATEGORY_META[entry.category] || CATEGORY_META.all;
              return (
                <div key={entry.id} className="app-surface p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <AppBadge tone={meta.tone}>{meta.label}</AppBadge>
                        {entry.mentionsCurrentUser && <AppBadge tone="purple">Mention</AppBadge>}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{entry.title}</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{entry.subtitle}</p>
                    </div>
                    <div className="text-right text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      <div>{new Date(entry.timestamp).toLocaleDateString()}</div>
                      <div className="mt-1">{entry.actor || "System"}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
