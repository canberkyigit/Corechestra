import React, { useCallback, useMemo, useRef, useState } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import { FaBan, FaEdit, FaLink, FaPlus, FaSearch, FaUndo, FaUserPlus, FaUserTie } from "react-icons/fa";
import { useHR } from "../../../shared/context/HRContext";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { useHorizontalWheelScroll } from "../../../shared/hooks/useHorizontalWheelScroll";
import { taskKey } from "../../../shared/utils/helpers";
import { Badge } from "../components/HRSharedUI";
import { PipelineColumn } from "../components/interview/InterviewPipeline";
import { CANDIDATE_SOURCES, JOB_STATUS_COLORS, JOB_TYPES, PIPELINE_STAGES, PRIORITY_DOT } from "../components/interview/interviewConfig";
import { CandidateDetailModal, HireConfirmationModal, NewJobReqModal, ScorecardModal } from "../components/interview/InterviewModals";

const JOB_FILTERS = [
  { id: "active", label: "Active", match: (job) => job.status !== "closed" && job.status !== "filled" },
  { id: "closed", label: "Closed", match: (job) => job.status === "closed" || job.status === "filled" },
  { id: "all", label: "All", match: () => true },
];

export function InterviewTab() {
  const { pipeline, moveCandidate, updateJobReq, restoreCandidate } = useHR();
  const { activeTasks, allTasks, users } = useApp();
  const { addToast } = useToast();
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobModal, setJobModal] = useState(null);
  const [candidateModal, setCandidateModal] = useState(null);
  const [scorecardModal, setScorecardModal] = useState(null);
  const [hireModal, setHireModal] = useState(null);
  const [jobSearch, setJobSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("active");
  const [showRejected, setShowRejected] = useState(false);
  const boardRef = useRef(null);

  const { jobRequisitions, candidates, scorecards } = pipeline;
  const linkableTasks = allTasks?.length ? allTasks : activeTasks;
  useHorizontalWheelScroll(boardRef, [selectedJobId, candidates.length]);
  const selectedJob = jobRequisitions.find((job) => job.id === selectedJobId) || null;
  const jobCandidates = useMemo(() => candidates.filter((candidate) => candidate.jobReqId === selectedJobId), [candidates, selectedJobId]);
  const boardCandidates = useMemo(() => jobCandidates.filter((candidate) => candidate.stage !== "rejected"), [jobCandidates]);
  const rejectedCandidates = useMemo(() => jobCandidates.filter((candidate) => candidate.stage === "rejected"), [jobCandidates]);
  const filteredJobs = useMemo(() => {
    const filter = JOB_FILTERS.find((item) => item.id === jobFilter) || JOB_FILTERS[0];
    const query = jobSearch.toLowerCase();
    return jobRequisitions
      .filter(filter.match)
      .filter((job) => !query || job.title?.toLowerCase().includes(query) || job.department?.toLowerCase().includes(query));
  }, [jobFilter, jobRequisitions, jobSearch]);
  const boardCandidatesWithSource = useMemo(() => boardCandidates.map((candidate) => ({
    ...candidate,
    sourceLabel: CANDIDATE_SOURCES.find((item) => item.value === candidate.source)?.label || candidate.source,
  })), [boardCandidates]);

  const handleDragEnd = useCallback(async ({ draggableId, source, destination }) => {
    if (!destination || destination.droppableId === source.droppableId) return;
    const candidate = candidates.find((item) => item.id === draggableId);
    if (!candidate) return;
    if (source.droppableId === "hired") {
      addToast("Hired candidates can't be moved back into the pipeline", "info");
      return;
    }
    if (destination.droppableId === "hired") {
      // Hiring always goes through the confirmation flow (People record + onboarding).
      setHireModal(candidate);
      return;
    }
    try {
      await moveCandidate(draggableId, destination.droppableId);
    } catch (error) {
      addToast(error.message || "Could not move the candidate", "error");
    }
  }, [addToast, candidates, moveCandidate]);

  const setJobStatus = async (job, status) => {
    try {
      await updateJobReq({ id: job.id, status });
      addToast(`${job.title} ${status === "open" ? "reopened" : status}`, "success");
    } catch (error) {
      addToast(error.message || "Could not update the requisition", "error");
    }
  };

  const handleRestore = async (candidate) => {
    try {
      await restoreCandidate(candidate.id);
      addToast(`${candidate.name} restored to the pipeline`, "success");
    } catch (error) {
      addToast(error.message || "Could not restore the candidate", "error");
    }
  };

  const getLinkedTask = (taskId) => taskId ? (linkableTasks || []).find((task) => task.id === taskId) : null;
  const getCandidateCount = (jobId) => candidates.filter((candidate) => candidate.jobReqId === jobId && candidate.stage !== "rejected").length;
  const hiredCount = boardCandidates.filter((candidate) => candidate.stage === "hired").length;
  const isClosed = selectedJob && (selectedJob.status === "closed" || selectedJob.status === "filled");

  return (
    <div className="flex gap-6" style={{ minHeight: "70vh" }}>
      <div className="w-72 flex-shrink-0 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Job Requisitions</h3>
          <button onClick={() => setJobModal({ mode: "new" })} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <FaPlus className="w-2.5 h-2.5" /> New
          </button>
        </div>

        <div className="relative">
          <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input value={jobSearch} onChange={(event) => setJobSearch(event.target.value)} placeholder="Search roles..." className="w-full pl-7 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-[#1a1f2e]" role="group" aria-label="Requisition status filter">
          {JOB_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={jobFilter === filter.id}
              onClick={() => setJobFilter(filter.id)}
              className={`flex-1 px-2 py-1 text-[11px] font-medium rounded-md transition-colors ${jobFilter === filter.id ? "bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5 overflow-y-auto flex-1">
          {filteredJobs.length === 0 && (
            <div className="text-center py-8">
              <FaUserTie className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-400 dark:text-slate-500">{jobRequisitions.length ? "No requisitions match" : "No requisitions yet"}</p>
              <button onClick={() => setJobModal({ mode: "new" })} className="mt-2 text-xs text-blue-500 hover:underline">Create one</button>
            </div>
          )}
          {filteredJobs.map((job) => {
            const task = getLinkedTask(job.linkedTaskId);
            const count = getCandidateCount(job.id);
            const isSelected = job.id === selectedJobId;
            return (
              <button key={job.id} onClick={() => { setSelectedJobId(job.id === selectedJobId ? null : job.id); setShowRejected(false); }} className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all ${isSelected ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm" : "border-transparent bg-white dark:bg-[#1c2030] hover:bg-slate-50 dark:hover:bg-[#232838] hover:border-slate-200 dark:hover:border-[#2a3044]"}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[job.priority] || "bg-slate-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">{job.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{job.department || "No department"} · {count} candidate{count !== 1 ? "s" : ""}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge color={JOB_STATUS_COLORS[job.status] || "slate"}>{job.status}</Badge>
                      {job.linkedTaskId && (
                        <span title={task?.title || "Linked task"} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                          <FaLink className="w-2 h-2" />{taskKey(job.linkedTaskId)}
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
            <div className="flex items-center justify-between gap-3 flex-wrap flex-shrink-0 pb-2 border-b border-slate-200 dark:border-[#2a3044]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">{selectedJob.title}</h3>
                  <Badge color={JOB_STATUS_COLORS[selectedJob.status] || "slate"}>{selectedJob.status}</Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {[
                    selectedJob.department,
                    JOB_TYPES.find((item) => item.value === selectedJob.type)?.label,
                    selectedJob.location,
                    `${hiredCount}/${selectedJob.headcount || 1} hired`,
                  ].filter(Boolean).join("  ·  ")}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={() => setShowRejected((value) => !value)} aria-pressed={showRejected} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${showRejected ? "border-red-300 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20" : "border-slate-200 dark:border-[#2a3044] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838]"}`}>
                  <FaBan className="w-3 h-3" /> Rejected ({rejectedCandidates.length})
                </button>
                <button type="button" onClick={() => setJobModal({ mode: "edit", job: selectedJob })} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#2a3044] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                  <FaEdit className="w-3 h-3" /> Edit
                </button>
                {isClosed ? (
                  <button type="button" onClick={() => setJobStatus(selectedJob, "open")} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                    Reopen
                  </button>
                ) : (
                  <button type="button" onClick={() => { if (window.confirm(`Close the “${selectedJob.title}” requisition?`)) setJobStatus(selectedJob, "closed"); }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#2a3044] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                    Close requisition
                  </button>
                )}
                <button disabled={isClosed} title={isClosed ? "Reopen the requisition to add candidates" : undefined} onClick={() => setCandidateModal({ _new: true, jobReqId: selectedJobId })} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                  <FaUserPlus className="w-3.5 h-3.5" /> Add Candidate
                </button>
              </div>
            </div>

            {showRejected && (
              <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 p-4" data-testid="rejected-candidates">
                <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-2">Rejected candidates</p>
                {rejectedCandidates.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">No rejected candidates for this requisition.</p>
                ) : (
                  <div className="space-y-2">
                    {rejectedCandidates.map((candidate) => (
                      <div key={candidate.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044]">
                        <button type="button" onClick={() => setCandidateModal(candidate)} className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{candidate.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            From {PIPELINE_STAGES.find((stage) => stage.id === candidate.rejectedFromStage)?.label || "pipeline"}
                            {candidate.rejectedAt ? ` · ${String(candidate.rejectedAt).slice(0, 10)}` : ""}
                            {candidate.rejectionReason ? ` · ${candidate.rejectionReason}` : ""}
                          </p>
                        </button>
                        <button type="button" onClick={() => handleRestore(candidate)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30">
                          <FaUndo className="w-3 h-3" /> Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DragDropContext onDragEnd={handleDragEnd}>
              <div ref={boardRef} className="flex gap-4 overflow-x-auto pb-6" style={{ minWidth: 0 }}>
                {PIPELINE_STAGES.map((stage) => (
                  <PipelineColumn
                    key={stage.id}
                    stage={stage}
                    candidates={boardCandidatesWithSource.filter((candidate) => candidate.stage === stage.id)}
                    onCandidateClick={(candidate) => setCandidateModal(candidate)}
                    onAddCandidate={stage.id === "pool" && !isClosed ? () => setCandidateModal({ _new: true, jobReqId: selectedJobId }) : undefined}
                    scorecards={scorecards}
                  />
                ))}
              </div>
            </DragDropContext>
          </>
        )}
      </div>

      <NewJobReqModal open={!!jobModal} job={jobModal?.mode === "edit" ? jobModal.job : null} onClose={() => setJobModal(null)} activeTasks={linkableTasks} />
      <CandidateDetailModal
        open={!!candidateModal}
        candidate={candidateModal}
        jobReq={selectedJob}
        scorecards={scorecards}
        users={users}
        onClose={() => setCandidateModal(null)}
        onAddScorecard={(candidate) => { setCandidateModal(null); setScorecardModal(candidate); }}
        onHire={(candidate) => { setCandidateModal(null); setHireModal(candidate); }}
      />
      <ScorecardModal open={!!scorecardModal} candidate={scorecardModal} onClose={() => setScorecardModal(null)} />
      <HireConfirmationModal open={!!hireModal} candidate={hireModal} jobReq={selectedJob} onClose={() => setHireModal(null)} />
    </div>
  );
}
