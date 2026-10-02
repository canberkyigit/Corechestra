import React, { useEffect, useState } from "react";
import { FaHistory } from "react-icons/fa";
import { AppButton } from "../../../shared/components/AppPrimitives";
import { TIMELINE_TYPE_LABELS } from "../constants/releaseMeta";
import { formatDate } from "../utils/releaseUtils";

const EMPTY_TIMELINE_DRAFT = { eventType: "deploy", text: "" };

/**
 * Deployment timeline with an inline "Add Event" form. Mount with
 * `key={release.id}` so the draft resets when another release is selected.
 * `onAddEvent(draft)` returns true when the event was recorded.
 */
export default function DeploymentTimelineCard({ timelineEvents, canManage, onAddEvent }) {
  const [showTimelineEntry, setShowTimelineEntry] = useState(false);
  const [timelineDraft, setTimelineDraft] = useState(EMPTY_TIMELINE_DRAFT);

  useEffect(() => {
    if (!canManage) setShowTimelineEntry(false);
  }, [canManage]);

  function submit() {
    if (!timelineDraft.text.trim()) return;
    if (onAddEvent(timelineDraft)) setTimelineDraft(EMPTY_TIMELINE_DRAFT);
    setShowTimelineEntry(false);
  }

  return (
    <div className="app-surface overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#252b3b]">
        <div className="flex items-center gap-2">
          <FaHistory className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span className="text-slate-800 dark:text-white font-semibold text-sm">Deployment Timeline</span>
        </div>
        {canManage && (
          <AppButton
            onClick={() => setShowTimelineEntry((prev) => !prev)}
            variant="secondary"
            size="sm"
          >
            Add Event
          </AppButton>
        )}
      </div>
      {showTimelineEntry && canManage && (
        <div className="px-5 py-4 border-b border-slate-200 dark:border-[#252b3b] bg-slate-50 dark:bg-[#1c2030] flex flex-col gap-2">
          <div className="flex gap-2">
            <select
              value={timelineDraft.eventType}
              onChange={(e) => setTimelineDraft((prev) => ({ ...prev, eventType: e.target.value }))}
              className="bg-white dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="deploy">Deployment</option>
              <option value="incident">Incident</option>
              <option value="hotfix">Hotfix</option>
              <option value="monitoring">Monitoring</option>
            </select>
            <input
              value={timelineDraft.text}
              onChange={(e) => setTimelineDraft((prev) => ({ ...prev, text: e.target.value }))}
              placeholder="What happened in this release step?"
              className="flex-1 bg-white dark:bg-[#232838] border border-slate-200 dark:border-[#2a3044] text-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowTimelineEntry(false)}
              className="text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] px-3 py-1.5 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!timelineDraft.text.trim()}
              className="text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg font-medium"
            >
              Save Event
            </button>
          </div>
        </div>
      )}
      <div className="px-5 py-4 space-y-3">
        {timelineEvents.length === 0 ? (
          <p className="text-sm app-subtle-copy italic">No deployment events yet.</p>
        ) : (
          timelineEvents.map((event, index) => (
            <div key={event.id || `event-${index}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5" />
                <span className="w-px flex-1 bg-slate-200 dark:bg-[#2a3044]" />
              </div>
              <div className="pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">{TIMELINE_TYPE_LABELS[event.type] || event.type}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(event.timestamp)}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{event.text}</p>
                {event.actor && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">by {event.actor}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
