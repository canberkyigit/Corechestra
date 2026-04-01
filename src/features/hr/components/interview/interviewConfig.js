export const PIPELINE_STAGES = [
  { id: "pool", label: "Candidate Pool", tailwind: "bg-slate-400", hex: "#94a3b8" },
  { id: "screening", label: "Screening", tailwind: "bg-blue-400", hex: "#60a5fa" },
  { id: "interview1", label: "Interview I", tailwind: "bg-indigo-500", hex: "#6366f1" },
  { id: "interview2", label: "Interview II", tailwind: "bg-purple-500", hex: "#a855f7" },
  { id: "technical", label: "Technical", tailwind: "bg-amber-500", hex: "#f59e0b" },
  { id: "offer", label: "Offer", tailwind: "bg-orange-500", hex: "#f97316" },
  { id: "hired", label: "Hired", tailwind: "bg-green-500", hex: "#22c55e" },
];

export const DEFAULT_CRITERIA = ["Technical skills", "Communication", "Culture fit", "Problem solving", "Leadership potential"];
export const JOB_TYPES = [{ value: "fulltime", label: "Full-time" }, { value: "parttime", label: "Part-time" }, { value: "contract", label: "Contract" }, { value: "intern", label: "Internship" }];
export const JOB_PRIORITIES = [{ value: "urgent", label: "Urgent" }, { value: "high", label: "High" }, { value: "normal", label: "Normal" }];
export const CANDIDATE_SOURCES = [{ value: "linkedin", label: "LinkedIn" }, { value: "referral", label: "Referral" }, { value: "jobboard", label: "Job Board" }, { value: "direct", label: "Direct" }, { value: "other", label: "Other" }];
export const JOB_STATUS_COLORS = { open: "green", paused: "amber", closed: "red", filled: "blue" };
export const PRIORITY_DOT = { urgent: "bg-red-500", high: "bg-amber-500", normal: "bg-slate-400" };
export const EMPLOYEE_COLORS = ["#6366f1","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#22c55e","#3b82f6","#ef4444"];
export const CANDIDATE_COLORS = ["#6366f1","#8b5cf6","#ec4899","#14b8a6","#f59e0b","#22c55e","#3b82f6"];
