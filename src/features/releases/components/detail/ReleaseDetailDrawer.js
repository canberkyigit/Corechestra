import React, { useCallback, useEffect, useRef, useState } from "react";
import { DETAIL_TABS } from "../../constants/releaseMeta";
import ConfirmDialog from "../ConfirmDialog";
import DeploymentsTab from "./DeploymentsTab";
import OverviewTab from "./OverviewTab";
import QualityTab from "./QualityTab";
import ReleaseDetailHeader from "./ReleaseDetailHeader";
import ReleaseNotesTab from "./ReleaseNotesTab";
import WorkItemsTab from "./WorkItemsTab";

const CONFIRM_COPY = {
  delete: (release) => ({
    title: `Delete ${release.version}?`,
    message: "The release, its notes, checklist and deployment history are removed. Linked work items are not affected.",
    confirmLabel: "Delete release",
    tone: "danger",
  }),
  rollback: (release) => ({
    title: `Roll back ${release.version}?`,
    message: "Marks the release as rolled back and records a production rollback in the deployment timeline.",
    confirmLabel: "Roll back",
    tone: "danger",
  }),
  cancel: (release) => ({
    title: `Cancel ${release.version}?`,
    message: "Cancelled releases stay in history and can be reopened later.",
    confirmLabel: "Cancel release",
    tone: "warning",
  }),
};

function tabBadge(tabId, release, metrics) {
  if (tabId === "work") return metrics.work.total;
  if (tabId === "notes") return release.changelog.length;
  if (tabId === "quality") return metrics.quality.failed ? `${metrics.quality.failed} failed` : metrics.runs.length || null;
  return null;
}

/**
 * Wide right-side drawer with the full release workspace. Rendered inside the
 * page (absolute) so it never covers the app sidebar; Esc closes it.
 */
export default function ReleaseDetailDrawer({
  release,
  metrics,
  users,
  now,
  canManage,
  actions,
  allTasks,
  testCases,
  otherReleases,
  activeTab,
  onTabChange,
  onClose,
  onEdit,
  onOpenRelease,
}) {
  const [confirm, setConfirm] = useState(null);
  const panelRef = useRef(null);
  const tabRefs = useRef({});

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, [release.id]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Drop pending confirmations when rights are revoked mid-session.
  useEffect(() => {
    if (!canManage) setConfirm(null);
  }, [canManage]);

  const onTabKeyDown = (event) => {
    const index = DETAIL_TABS.findIndex((tab) => tab.id === activeTab);
    let next = null;
    if (event.key === "ArrowRight") next = DETAIL_TABS[(index + 1) % DETAIL_TABS.length];
    if (event.key === "ArrowLeft") next = DETAIL_TABS[(index - 1 + DETAIL_TABS.length) % DETAIL_TABS.length];
    if (event.key === "Home") next = DETAIL_TABS[0];
    if (event.key === "End") next = DETAIL_TABS[DETAIL_TABS.length - 1];
    if (next) {
      event.preventDefault();
      onTabChange(next.id);
      tabRefs.current[next.id]?.focus();
    }
  };

  const handleConfirm = useCallback(() => {
    const kind = confirm;
    setConfirm(null);
    if (kind === "delete") {
      actions.remove(release);
      onClose();
    } else if (kind === "rollback") {
      actions.transition(release, "rollback");
    } else if (kind === "cancel") {
      actions.transition(release, "cancel");
    }
  }, [actions, confirm, onClose, release]);

  const handleDuplicate = useCallback((kind) => {
    const created = actions.duplicate(release, kind);
    if (created?.id) onOpenRelease(created.id);
  }, [actions, onOpenRelease, release]);

  const copy = confirm ? CONFIRM_COPY[confirm]?.(release) : null;

  return (
    <div className="absolute inset-0 z-30 flex justify-end" data-testid="release-detail">
      <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-[1px] dark:bg-black/50" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="release-detail-title"
        className="animate-slide-in-right relative flex h-full w-full flex-col border-l border-slate-200/80 bg-slate-50 shadow-2xl focus:outline-none dark:border-[#252b3b] dark:bg-[#141720] lg:w-[min(1120px,86%)]"
      >
        <div className="flex-shrink-0 bg-white/100 dark:bg-[#1a1f2e]">
          <ReleaseDetailHeader
            release={release}
            users={users}
            now={now}
            canManage={canManage}
            onClose={onClose}
            onTransition={(key) => actions.transition(release, key)}
            onRequestConfirm={setConfirm}
            onEdit={onEdit}
            onDuplicate={handleDuplicate}
            onCopyNotes={() => actions.copyNotes(release)}
          />
          <div role="tablist" aria-label="Release sections" onKeyDown={onTabKeyDown} className="flex gap-1 overflow-x-auto scrollbar-none border-b border-slate-200/80 px-3 dark:border-[#252b3b] md:px-4">
            {DETAIL_TABS.map((tab) => {
              const selected = tab.id === activeTab;
              const badge = tabBadge(tab.id, release, metrics);
              return (
                <button
                  key={tab.id}
                  ref={(node) => { tabRefs.current[tab.id] = node; }}
                  type="button"
                  role="tab"
                  id={`release-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`release-tabpanel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => onTabChange(tab.id)}
                  className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50 ${
                    selected ? "text-blue-600 dark:text-blue-400" : "text-slate-600 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                  {badge !== null && badge !== 0 && (
                    <span className={`rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${String(badge).includes("failed") ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-slate-500/10 text-slate-600"}`}>{badge}</span>
                  )}
                  {selected && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-blue-600 dark:bg-blue-400" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>

        <div
          role="tabpanel"
          id={`release-tabpanel-${activeTab}`}
          aria-labelledby={`release-tab-${activeTab}`}
          className="flex-1 overflow-y-auto px-4 py-5 md:px-6"
        >
          {activeTab === "overview" && <OverviewTab release={release} metrics={metrics} canManage={canManage} actions={actions} />}
          {activeTab === "work" && (
            <WorkItemsTab release={release} metrics={metrics} allTasks={allTasks} users={users} otherReleases={otherReleases} canManage={canManage} actions={actions} />
          )}
          {activeTab === "notes" && <ReleaseNotesTab release={release} metrics={metrics} canManage={canManage} actions={actions} />}
          {activeTab === "quality" && <QualityTab metrics={metrics} testCases={testCases} />}
          {activeTab === "deployments" && <DeploymentsTab release={release} users={users} canManage={canManage} actions={actions} />}
        </div>
      </aside>

      {copy && canManage && (
        <ConfirmDialog {...copy} onConfirm={handleConfirm} onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}
