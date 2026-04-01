import React, { useCallback, useMemo, useRef, useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { FaLink, FaPlus, FaSearch, FaUserPlus, FaUserTie } from "react-icons/fa";
import { useHR } from "../../../shared/context/HRContext";
import { useApp } from "../../../shared/context/AppContext";
import { useHorizontalWheelScroll } from "../../../shared/hooks/useHorizontalWheelScroll";
import { Badge } from "../components/HRSharedUI";
import { PipelineColumn } from "../components/interview/InterviewPipeline";
import { CANDIDATE_SOURCES, JOB_STATUS_COLORS, JOB_TYPES, PIPELINE_STAGES, PRIORITY_DOT } from "../components/interview/interviewConfig";
import { CandidateDetailModal, HireConfirmationModal, NewJobReqModal, ScorecardModal } from "../components/interview/InterviewModals";

export function InterviewTab() {
  const { pipeline, moveCandidate } = useHR();
  const { activeTasks } = useApp();
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [candidateModal, setCandidateModal] = useState(null);
  const [scorecardModal, setScorecardModal] = useState(null);
  const [hireModal, setHireModal] = useState(null);
  const [jobSearch, setJobSearch] = useState("");
  const boardRef = useRef(null);

  const { jobRequisitions, candidates, scorecards } = pipeline;
  useHorizontalWheelScroll(boardRef, [selectedJobId, candidates.length]);
  const selectedJob = jobRequisitions.find((job) => job.id === selectedJobId) || null;
  const boardCandidates = useMemo(() => candidates.filter((candidate) => candidate.jobReqId === selectedJobId && candidate.stage !== "rejected"), [candidates, selectedJobId]);
  const filteredJobs = useMemo(() => jobRequisitions.filter((job) => !jobSearch || job.title?.toLowerCase().includes(jobSearch.toLowerCase()) || job.department?.toLowerCase().includes(jobSearch.toLowerCase())), [jobRequisitions, jobSearch]);
  const boardCandidatesWithSource = useMemo(() => boardCandidates.map((candidate) => ({
    ...candidate,
    sourceLabel: CANDIDATE_SOURCES.find((item) => item.value === candidate.source)?.label || candidate.source,
  })), [boardCandidates]);

  const handleDragEnd = useCallback(({ draggableId, source, destination }) => {
    if (!destination || destination.droppableId === source.droppableId) return;
    moveCandidate(draggableId, destination.droppableId);
  }, [moveCandidate]);

  const getLinkedTask = (taskId) => taskId ? (activeTasks || []).find((task) => task.id === taskId) : null;
  const getCandidateCount = (jobId) => candidates.filter((candidate) => candidate.jobReqId === jobId && candidate.stage !== "rejected").length;

  return (
    <div className="flex gap-6" style={{ minHeight: "70vh" }}>
      <div className="w-72 flex-shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Job Requisitions</h3>
          <button onClick={() => setShowNewJobModal(true)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <FaPlus className="w-2.5 h-2.5" /> New
          </button>
        </div>

        <div className="relative">
          <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input value={jobSearch} onChange={(event) => setJobSearch(event.target.value)} placeholder="Search roles..." className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="space-y-1.5 overflow-y-auto flex-1">
          {filteredJobs.length === 0 && (
            <div className="text-center py-8">
              <FaUserTie className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-400 dark:text-slate-500">No requisitions yet</p>
              <button onClick={() => setShowNewJobModal(true)} className="mt-2 text-xs text-blue-500 hover:underline">Create one</button>
            </div>
          )}
          {filteredJobs.map((job) => {
            const task = getLinkedTask(job.linkedTaskId);
            const count = getCandidateCount(job.id);
            const isSelected = job.id === selectedJobId;
            return (
              <button key={job.id} onClick={() => setSelectedJobId(job.id === selectedJobId ? null : job.id)} className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all ${isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm" : "border-transparent bg-white dark:bg-[#1c2030] hover:bg-slate-50 dark:hover:bg-[#232838] hover:border-slate-200 dark:hover:border-[#2a3044]"}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[job.priority] || "bg-slate-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">{job.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{job.department || "No department"} · {count} candidate{count !== 1 ? "s" : ""}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge color={JOB_STATUS_COLORS[job.status] || "slate"}>{job.status}</Badge>
                      {task && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                          <FaLink className="w-2 h-2" />{task.id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {!selectedJob ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-[#1a1f2e] flex items-center justify-center mx-auto mb-4">
                <FaUserTie className="w-7 h-7 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Select a job requisition</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">to see the hiring pipeline</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between flex-shrink-0 pb-2 border-b border-slate-200 dark:border-[#2a3044]">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{selectedJob.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {[selectedJob.department, JOB_TYPES.find((item) => item.value === selectedJob.type)?.label, selectedJob.location, selectedJob.headcount > 1 ? `${selectedJob.headcount} open seats` : null].filter(Boolean).join("  ·  ")}
                </p>
              </div>
              <button onClick={() => setCandidateModal({ _new: true, jobReqId: selectedJobId })} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                <FaUserPlus className="w-3.5 h-3.5" /> Add Candidate
              </button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <div ref={boardRef} className="flex gap-4 overflow-x-auto pb-6" style={{ minWidth: 0 }}>
                {PIPELINE_STAGES.map((stage) => (
                  <PipelineColumn
                    key={stage.id}
                    stage={stage}
                    candidates={boardCandidatesWithSource.filter((candidate) => candidate.stage === stage.id)}
                    onCandidateClick={(candidate) => setCandidateModal(candidate)}
                    onAddCandidate={stage.id === "pool" ? () => setCandidateModal({ _new: true, jobReqId: selectedJobId }) : undefined}
                    scorecards={scorecards}
                  />
                ))}
              </div>
            </DragDropContext>
          </>
        )}
      </div>

      <NewJobReqModal open={showNewJobModal} onClose={() => setShowNewJobModal(false)} activeTasks={activeTasks} />
      <CandidateDetailModal open={!!candidateModal} candidate={candidateModal} jobReq={selectedJob} onClose={() => setCandidateModal(null)} onAddScorecard={(candidate) => { setCandidateModal(null); setScorecardModal(candidate); }} onHire={(candidate) => { setCandidateModal(null); setHireModal(candidate); }} />
      <ScorecardModal open={!!scorecardModal} candidate={scorecardModal} onClose={() => setScorecardModal(null)} />
      <HireConfirmationModal open={!!hireModal} candidate={hireModal} jobReq={selectedJob} onClose={() => setHireModal(null)} />
    </div>
  );
}
