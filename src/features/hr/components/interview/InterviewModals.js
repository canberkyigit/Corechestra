import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaArrowRight, FaClipboardList, FaLink, FaStar, FaThumbsDown, FaTimes, FaUserCheck, FaUserTie } from "react-icons/fa";
import { useAuth } from "../../../../shared/context/AuthContext";
import { useApp } from "../../../../shared/context/AppContext";
import { useHR } from "../../../../shared/context/HRContext";
import {
  CANDIDATE_SOURCES,
  DEFAULT_CRITERIA,
  EMPLOYEE_COLORS,
  JOB_PRIORITIES,
  JOB_TYPES,
  PIPELINE_STAGES,
} from "./interviewConfig";
import { StarRating } from "./InterviewPipeline";

export function NewJobReqModal({ open, onClose, activeTasks }) {
  const { createJobReq } = useHR();
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [type, setType] = useState("fulltime");
  const [priority, setPriority] = useState("normal");
  const [headcount, setHeadcount] = useState(1);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [taskSearch, setTaskSearch] = useState("");
  const [linkedTaskId, setLinkedTaskId] = useState(null);
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDepartment("");
      setType("fulltime");
      setPriority("normal");
      setHeadcount(1);
      setLocation("");
      setDescription("");
      setTaskSearch("");
      setLinkedTaskId(null);
    }
  }, [open]);

  const filteredTasks = useMemo(() => (activeTasks || []).filter((task) => task.title?.toLowerCase().includes(taskSearch.toLowerCase()) || task.id?.toLowerCase().includes(taskSearch.toLowerCase())).slice(0, 8), [activeTasks, taskSearch]);
  const linkedTask = linkedTaskId ? (activeTasks || []).find((task) => task.id === linkedTaskId) : null;
  const inputClassName = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await createJobReq({
      title: title.trim(),
      department: department.trim(),
      type,
      priority,
      headcount: Number(headcount) || 1,
      location: location.trim(),
      description: description.trim(),
      linkedTaskId: linkedTaskId || null,
      hiringManager: "",
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }} className="bg-white dark:bg-[#1c2030] rounded-2xl border border-slate-200 dark:border-[#2a3044] w-full max-w-xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2a3044]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <FaUserTie className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">New Job Requisition</h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838] text-slate-400"><FaTimes className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Job title *</label>
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Senior Frontend Engineer" className={inputClassName} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Department</label>
                  <input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="e.g. Engineering" className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Type</label>
                  <select value={type} onChange={(event) => setType(event.target.value)} className={inputClassName}>
                    {JOB_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Priority</label>
                  <select value={priority} onChange={(event) => setPriority(event.target.value)} className={inputClassName}>
                    {JOB_PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Headcount</label>
                  <input type="number" min={1} value={headcount} onChange={(event) => setHeadcount(event.target.value)} className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Location</label>
                  <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Remote" className={inputClassName} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Description</label>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Role overview, requirements..." className={`${inputClassName} resize-none`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                  <FaLink className="w-3 h-3" /> Link to project task <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                {linkedTask ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                    <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{linkedTask.id}</span>
                    <span className="text-xs text-slate-600 dark:text-slate-300 flex-1 truncate">{linkedTask.title}</span>
                    <button onClick={() => { setLinkedTaskId(null); setTaskSearch(""); }} className="text-slate-400 hover:text-red-500"><FaTimes className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <div className="relative">
                    <input value={taskSearch} onChange={(event) => { setTaskSearch(event.target.value); setShowTaskDropdown(true); }} onFocus={() => setShowTaskDropdown(true)} placeholder="Search tasks by title or ID..." className={inputClassName} />
                    {showTaskDropdown && taskSearch && filteredTasks.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredTasks.map((task) => (
                          <button key={task.id} type="button" onClick={() => { setLinkedTaskId(task.id); setShowTaskDropdown(false); setTaskSearch(""); }} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                            <span className="text-xs font-mono text-indigo-500 flex-shrink-0">{task.id}</span>
                            <span className="text-xs text-slate-700 dark:text-slate-300 truncate">{task.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2a3044] flex items-center justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#232838] rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSubmit} disabled={!title.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Create Requisition</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CandidateDetailModal({ open, candidate, jobReq, onClose, onAddScorecard, onHire }) {
  const { createCandidate, updateCandidate, moveCandidate } = useHR();
  const isNew = candidate?._new === true;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("linkedin");
  const [resumeNote, setResumeNote] = useState("");
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState(null);

  useEffect(() => {
    if (!open || !candidate) return;
    if (isNew) {
      setName("");
      setEmail("");
      setPhone("");
      setSource("linkedin");
      setResumeNote("");
      setNotes("");
      setRating(null);
    } else {
      setName(candidate.name || "");
      setEmail(candidate.email || "");
      setPhone(candidate.phone || "");
      setSource(candidate.source || "linkedin");
      setResumeNote(candidate.resumeNote || "");
      setNotes(candidate.notes || "");
      setRating(candidate.rating || null);
    }
  }, [open, candidate, isNew]);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (isNew) {
      await createCandidate({ jobReqId: candidate.jobReqId || jobReq?.id || "", name: name.trim(), email: email.trim(), phone: phone.trim(), source, resumeNote: resumeNote.trim(), notes: notes.trim(), rating });
    } else {
      await updateCandidate({ ...candidate, name, email, phone, source, resumeNote, notes, rating });
    }
    onClose();
  };

  const stageIndex = candidate ? PIPELINE_STAGES.findIndex((stage) => stage.id === candidate.stage) : -1;
  const inputClassName = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <AnimatePresence>
      {open && candidate && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }} className="bg-white dark:bg-[#1c2030] rounded-2xl border border-slate-200 dark:border-[#2a3044] w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2a3044]">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">{isNew ? "Add Candidate" : "Candidate Details"}</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838] text-slate-400"><FaTimes className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {!isNew && stageIndex >= 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {PIPELINE_STAGES.map((stage, index) => (
                    <React.Fragment key={stage.id}>
                      <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${index === stageIndex ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : index < stageIndex ? "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400" : "bg-slate-100 dark:bg-[#232838] text-slate-400"}`}>{stage.label}</div>
                      {index < PIPELINE_STAGES.length - 1 && <FaArrowRight className="w-2 h-2 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Full name *</label>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Jane Smith" className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Email</label>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="jane@example.com" type="email" className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Phone</label>
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+90 555 000 00 00" className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Source</label>
                  <select value={source} onChange={(event) => setSource(event.target.value)} className={inputClassName}>
                    {CANDIDATE_SOURCES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Rating</label>
                  <StarRating rating={rating} size="md" onClick={setRating} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Resume / Link</label>
                <input value={resumeNote} onChange={(event) => setResumeNote(event.target.value)} placeholder="https://linkedin.com/in/..." className={inputClassName} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Notes</label>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Interview notes, impressions..." className={`${inputClassName} resize-none`} />
              </div>
            </div>
            <div className={`px-6 py-4 border-t border-slate-100 dark:border-[#2a3044] flex items-center ${isNew ? "justify-end gap-3" : "justify-between"}`}>
              {!isNew && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => onAddScorecard(candidate)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                    <FaClipboardList className="w-3 h-3" /> Scorecard
                  </button>
                  {candidate.stage !== "hired" && candidate.stage !== "rejected" && (
                    <>
                      <button onClick={() => { onHire(candidate); onClose(); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                        <FaUserCheck className="w-3 h-3" /> Hire
                      </button>
                      <button onClick={async () => { await moveCandidate(candidate.id, "rejected"); onClose(); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                        <FaThumbsDown className="w-3 h-3" /> Reject
                      </button>
                    </>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#232838] rounded-lg transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!name.trim()} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {isNew ? "Add Candidate" : "Save Changes"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ScorecardModal({ open, candidate, onClose }) {
  const { saveScorecard } = useHR();
  const { user } = useAuth();
  const [criteria, setCriteria] = useState([]);
  const [recommendation, setRecommendation] = useState("yes");
  const [generalNotes, setGeneralNotes] = useState("");

  useEffect(() => {
    if (open) {
      setCriteria(DEFAULT_CRITERIA.map((label) => ({ label, score: 0, notes: "" })));
      setRecommendation("yes");
      setGeneralNotes("");
    }
  }, [open]);

  const overallScore = useMemo(() => {
    const scored = criteria.filter((criterion) => criterion.score > 0);
    if (!scored.length) return 0;
    return Math.round(scored.reduce((sum, criterion) => sum + criterion.score, 0) / scored.length * 10) / 10;
  }, [criteria]);

  const updateCriterion = (index, field, value) => setCriteria((previous) => previous.map((criterion, currentIndex) => currentIndex === index ? { ...criterion, [field]: value } : criterion));

  const handleSubmit = async () => {
    await saveScorecard({
      candidateId: candidate.id,
      jobReqId: candidate.jobReqId,
      interviewedBy: user?.uid || "unknown",
      criteria,
      overallScore,
      recommendation,
      notes: generalNotes,
    });
    onClose();
  };

  const recommendationOptions = [
    { value: "strong_yes", label: "Strong Yes", cls: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700" },
    { value: "yes", label: "Yes", cls: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700" },
    { value: "no", label: "No", cls: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700" },
    { value: "strong_no", label: "Strong No", cls: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700" },
  ];

  return (
    <AnimatePresence>
      {open && candidate && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }} className="bg-white dark:bg-[#1c2030] rounded-2xl border border-slate-200 dark:border-[#2a3044] w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2a3044]">
              <div>
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Scorecard</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{candidate.name}</p>
              </div>
              <div className="flex items-center gap-3">
                {overallScore > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <FaStar className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{overallScore}</span>
                    <span className="text-xs text-amber-500">/5</span>
                  </div>
                )}
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#232838] text-slate-400"><FaTimes className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
              <div className="space-y-3">
                {criteria.map((criterion, index) => (
                  <div key={criterion.label} className="flex items-start gap-4 py-3 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
                    <div className="w-36 flex-shrink-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{criterion.label}</p>
                      <StarRating rating={criterion.score} size="md" onClick={(value) => updateCriterion(index, "score", value)} />
                    </div>
                    <input value={criterion.notes} onChange={(event) => updateCriterion(index, "notes", event.target.value)} placeholder="Notes..." className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Recommendation</label>
                <div className="grid grid-cols-4 gap-2">
                  {recommendationOptions.map((option) => (
                    <button key={option.value} type="button" onClick={() => setRecommendation(option.value)} className={`px-2 py-2 text-xs font-medium rounded-lg border-2 transition-all ${recommendation === option.value ? option.cls : "border-slate-200 dark:border-[#2a3044] text-slate-500 hover:border-slate-300"}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">General notes</label>
                <textarea value={generalNotes} onChange={(event) => setGeneralNotes(event.target.value)} rows={3} placeholder="Overall impression..." className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2a3044] flex items-center justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#232838] rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSubmit} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Save Scorecard</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function HireConfirmationModal({ open, candidate, jobReq, onClose }) {
  const { hireCandidate, createOnboardingWorkflow } = useHR();
  const { createUser, templateRegistry } = useApp();
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeeTitle, setEmployeeTitle] = useState("");
  const [employeeColor, setEmployeeColor] = useState(EMPLOYEE_COLORS[0]);
  const [startDate, setStartDate] = useState("");
  const [employeeRole, setEmployeeRole] = useState("editor");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && candidate) {
      setEmployeeName(candidate.name || "");
      setEmployeeEmail(candidate.email || "");
      setEmployeeTitle(jobReq?.title || "");
      setEmployeeColor(EMPLOYEE_COLORS[Math.floor(Math.random() * EMPLOYEE_COLORS.length)]);
      setStartDate(new Date().toISOString().split("T")[0]);
      setEmployeeRole("editor");
    }
  }, [open, candidate, jobReq]);

  const handleHire = async () => {
    if (!employeeName.trim() || !employeeEmail.trim()) return;
    setSaving(true);
    const newUserId = `user-${Date.now()}`;
    await hireCandidate(candidate.id);
    await createUser({
      id: newUserId,
      name: employeeName.trim(),
      email: employeeEmail.trim(),
      username: employeeEmail.trim().split("@")[0],
      color: employeeColor,
      role: employeeRole,
      status: "active",
      title: employeeTitle.trim(),
      joinedAt: startDate || new Date().toISOString(),
    });
    const onboardingTemplate = (templateRegistry?.onboarding || [])[0];
    await createOnboardingWorkflow({
      userId: newUserId,
      candidateId: candidate.id,
      type: "onboarding",
      title: `${employeeName.trim()} onboarding`,
      templateId: onboardingTemplate?.id || null,
      steps: onboardingTemplate?.steps || [
        "Create accounts and grant access",
        "Share handbook and mandatory docs",
        "Schedule intro meetings",
      ],
      dueDate: startDate || new Date().toISOString().slice(0, 10),
    });
    setSaving(false);
    onClose();
  };

  const inputClassName = "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <AnimatePresence>
      {open && candidate && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          <motion.div initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }} className="bg-white dark:bg-[#1c2030] rounded-2xl border border-slate-200 dark:border-[#2a3044] w-full max-w-md shadow-2xl">
            <div className="px-6 py-5 text-center border-b border-slate-100 dark:border-[#2a3044]">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                <FaUserCheck className="w-6 h-6 text-green-500" />
              </div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Hire {candidate.name}?</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">This will add them as a team member.</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Full name *</label>
                  <input value={employeeName} onChange={(event) => setEmployeeName(event.target.value)} className={inputClassName} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Email *</label>
                  <input value={employeeEmail} onChange={(event) => setEmployeeEmail(event.target.value)} type="email" className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Job title</label>
                  <input value={employeeTitle} onChange={(event) => setEmployeeTitle(event.target.value)} placeholder="Role / title" className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Start date</label>
                  <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClassName} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Permission role</label>
                <select value={employeeRole} onChange={(event) => setEmployeeRole(event.target.value)} className={inputClassName}>
                  <option value="editor">Editor</option>
                  <option value="owner">Owner</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Avatar color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {EMPLOYEE_COLORS.map((color) => (
                    <button key={color} type="button" onClick={() => setEmployeeColor(color)} className={`w-7 h-7 rounded-full transition-all ${employeeColor === color ? "ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-[#1c2030] scale-110" : ""}`} style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2a3044] flex items-center justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#232838] rounded-lg transition-colors">Cancel</button>
              <button onClick={handleHire} disabled={!employeeName.trim() || !employeeEmail.trim() || saving} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <FaUserCheck className="w-3.5 h-3.5" />
                {saving ? "Hiring..." : "Hire & Add to Team"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
