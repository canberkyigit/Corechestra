import React from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { FaClipboardList, FaPlus, FaRegStar, FaStar } from "react-icons/fa";
import { CANDIDATE_COLORS } from "./interviewConfig";

export function StarRating({ rating, size = "sm", onClick }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" onClick={onClick ? () => onClick(star) : undefined} className={onClick ? "cursor-pointer" : "cursor-default"}>
          {star <= (rating || 0)
            ? <FaStar className={`${size === "sm" ? "w-3 h-3" : "w-4 h-4"} text-amber-400`} />
            : <FaRegStar className={`${size === "sm" ? "w-3 h-3" : "w-4 h-4"} text-slate-300 dark:text-slate-600`} />}
        </button>
      ))}
    </div>
  );
}

function CandidateCard({ candidate, dragProvided, onClick, scorecards }) {
  const hasScorecard = scorecards.some((scorecard) => scorecard.candidateId === candidate.id);
  const initials = (candidate.name || "?").split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase();
  const colorIndex = candidate.name ? candidate.name.charCodeAt(0) % CANDIDATE_COLORS.length : 0;

  return (
    <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} {...dragProvided.dragHandleProps} onClick={() => onClick(candidate)} className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] p-4 mb-3 cursor-pointer hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 hover:-translate-y-0.5 transition-all select-none group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold text-white shadow-sm" style={{ backgroundColor: CANDIDATE_COLORS[colorIndex] }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">{candidate.name}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{candidate.sourceLabel}</p>
        </div>
        {hasScorecard && (
          <span title="Has scorecard" className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity">
            <FaClipboardList className="w-2.5 h-2.5 text-indigo-500" />
          </span>
        )}
      </div>
      {candidate.rating > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#2a3044]">
          <StarRating rating={candidate.rating} />
        </div>
      )}
    </div>
  );
}

export function PipelineColumn({ stage, candidates, onCandidateClick, onAddCandidate, scorecards }) {
  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      <div className="rounded-t-xl px-4 py-3 border-t-[3px] bg-white dark:bg-[#1a1f2e] border-x border-b border-slate-200 dark:border-[#2a3044] mb-0" style={{ borderTopColor: stage.hex }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{stage.label}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: `${stage.hex}cc` }}>{candidates.length}</span>
        </div>
      </div>
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 rounded-b-xl p-3 min-h-[240px] transition-colors border-x border-b ${snapshot.isDraggingOver ? "bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-700" : "bg-slate-50/60 dark:bg-[#141720] border-slate-200 dark:border-[#2a3044]"}`}>
            {candidates.map((candidate, index) => (
              <Draggable key={candidate.id} draggableId={candidate.id} index={index}>
                {(dragProvided) => (
                  <CandidateCard candidate={candidate} dragProvided={dragProvided} onClick={onCandidateClick} scorecards={scorecards} />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {stage.id === "pool" && onAddCandidate && (
              <button onClick={onAddCandidate} className="w-full mt-1 py-2.5 text-xs text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/10 border border-dashed border-slate-200 dark:border-[#2a3044] hover:border-blue-300 dark:hover:border-blue-700">
                <FaPlus className="w-2.5 h-2.5" /> Add candidate
              </button>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
