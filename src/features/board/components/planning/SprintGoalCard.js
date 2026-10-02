import React, { memo, useEffect, useRef, useState } from "react";
import { FaBullseye, FaCheck } from "react-icons/fa";
import { PlanningCard } from "./PlanningPrimitives";

const GOAL_MAX_LENGTH = 280;

/**
 * Inline-editable sprint goal. Saves on blur or ⌘/Ctrl+Enter, Esc reverts.
 * The draft resyncs from the sprint unless the user is typing.
 */
function SprintGoalCard({ sprint, canEdit, onSave, resetKey }) {
  const [draft, setDraft] = useState(sprint?.goal || "");
  const [savedAt, setSavedAt] = useState(null);
  const [focused, setFocused] = useState(false);
  const focusedRef = useRef(false);
  const skipCommitRef = useRef(false);
  const textareaRef = useRef(null);
  const goal = sprint?.goal || "";

  useEffect(() => {
    if (!focusedRef.current) setDraft(goal);
  }, [resetKey, sprint?.id, goal]);

  useEffect(() => {
    if (!savedAt) return undefined;
    const timer = setTimeout(() => setSavedAt(null), 2000);
    return () => clearTimeout(timer);
  }, [savedAt]);

  const commit = () => {
    focusedRef.current = false;
    setFocused(false);
    if (skipCommitRef.current) {
      skipCommitRef.current = false;
      return;
    }
    const next = draft.trim();
    if (!sprint || next === goal.trim()) return;
    onSave(next);
    setSavedAt(Date.now());
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      textareaRef.current?.blur();
    } else if (event.key === "Escape") {
      skipCommitRef.current = true;
      setDraft(goal);
      textareaRef.current?.blur();
    }
  };

  const editable = Boolean(sprint) && canEdit;

  return (
    <PlanningCard className="flex items-start gap-3 p-4" aria-label="Sprint goal">
      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-300">
        <FaBullseye className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <label htmlFor="planning-sprint-goal" className="text-[11px] font-medium uppercase tracking-[0.06em] text-slate-500 dark:text-slate-400">
            Sprint goal
          </label>
          {savedAt && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400" role="status">
              <FaCheck className="h-2 w-2" /> Saved
            </span>
          )}
          {editable && focused && (
            <span className="ml-auto text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
              {draft.length}/{GOAL_MAX_LENGTH} · ⌘↵ to save · Esc to cancel
            </span>
          )}
        </div>
        <textarea
          id="planning-sprint-goal"
          ref={textareaRef}
          className="mt-1 w-full resize-none rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm leading-relaxed text-slate-800 placeholder-slate-400 transition-colors hover:border-slate-200 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:hover:border-transparent dark:text-slate-100 dark:placeholder-slate-500 dark:hover:border-[#2a3044] dark:focus:bg-[#141720]"
          placeholder="Define the sprint goal — what value will be delivered by the end of this sprint?"
          value={draft}
          maxLength={GOAL_MAX_LENGTH}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => { focusedRef.current = true; setFocused(true); setSavedAt(null); }}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          disabled={!editable}
          rows={2}
        />
      </div>
    </PlanningCard>
  );
}

export default memo(SprintGoalCard);
