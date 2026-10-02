import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBolt, FaClock, FaCalendarAlt, FaReceipt, FaUserCircle, FaShieldAlt, FaTimes, FaBell, FaClipboardList, FaPen, FaBriefcase, FaUniversity, FaCheck } from "react-icons/fa";
import { useHR } from "../../../shared/context/HRContext";
import { useApp } from "../../../shared/context/AppContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useToast } from "../../../shared/context/ToastContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { Avatar, Card } from "../components/HRSharedUI";
import { ApprovalInboxCard, countActionableApprovals } from "../components/ApprovalInboxCard";
import { PersonProfileModal } from "../components/PersonProfileModal";
import { PUBLIC_HOLIDAY_COUNTRY, PUBLIC_HOLIDAYS, formatHolidayDate, getUpcomingHolidays } from "../constants/publicHolidays";
import { toLocalIsoDate } from "../utils/dates";
import { computeVacationBalance, isActiveTimeOff } from "../utils/timeOff";
import { dedupeById } from "../utils/people";
import { formatMoney } from "../utils/payslips";
import { getContractStatus } from "../utils/contract";

const SECURITY_TIP_KEY = "corechestra_hr_security_tip_dismissed";

function readDismissed(uid) {
  try {
    return window.localStorage.getItem(`${SECURITY_TIP_KEY}:${uid || "anon"}`) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(uid) {
  try {
    window.localStorage.setItem(`${SECURITY_TIP_KEY}:${uid || "anon"}`, "1");
  } catch {
    // storage unavailable — dismissal stays in memory only
  }
}

export function OverviewTab({ userName, setActiveTab }) {
  const {
    allAbsences,
    documents,
    employeeProfile,
    approvalInbox,
    onboardingWorkflows,
    timeOffRequests,
    bankAccounts,
    projectAllocations,
    toggleOnboardingStep,
    updateOnboardingWorkflow,
  } = useHR();
  const { users: rawUsers, projects } = useApp();
  const { user, isAdmin } = useAuth();
  const { canPerform } = usePermissions();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [timeOffTab, setTimeOffTab] = useState("upcoming");
  const [securityDismissed, setSecurityDismissed] = useState(() => readDismissed(user?.uid));
  const [expandedWorkflows, setExpandedWorkflows] = useState({});
  const [profilePerson, setProfilePerson] = useState(null);

  const users = useMemo(() => dedupeById(rawUsers), [rawUsers]);
  const today = toLocalIsoDate();
  const year = Number(today.slice(0, 4));
  const awayToday = (allAbsences || []).filter((absence) => isActiveTimeOff(absence) && absence.fromDate <= today && absence.toDate >= today);
  const pendingDocCount = (documents || []).filter((document) => document.status === "not_submitted" || (!document.status && document.actions?.includes("sign"))).length;
  const approvalCount = countActionableApprovals(approvalInbox, user?.uid, canPerform("approval:resolve"));
  const myPendingCount = (approvalInbox || []).filter((item) => item.status === "pending" && item.userId === user?.uid).length;
  const activeOnboarding = (onboardingWorkflows || []).filter((workflow) => workflow.status !== "completed" && workflow.status !== "cancelled").slice(0, 3);
  const upcomingHolidays = getUpcomingHolidays(today, 3);
  const balance = computeVacationBalance(timeOffRequests, employeeProfile?.vacationDays, year, PUBLIC_HOLIDAYS.map((holiday) => holiday.date));
  const contractStatus = getContractStatus(employeeProfile, today);
  const needsBankAccount = (bankAccounts || []).length === 0;

  const salaryDisplay = employeeProfile?.salary ? formatMoney(employeeProfile.salary, employeeProfile.salaryCurrency) : "—";
  const jobTitle = employeeProfile?.jobTitle || "Employee";

  const quickActions = [
    { label: "Submit hours", icon: FaClock, bg: "bg-green-100 dark:bg-green-900/30", ic: "text-green-600 dark:text-green-400", tab: "timetracking" },
    { label: "Request time off", icon: FaCalendarAlt, bg: "bg-blue-100 dark:bg-blue-900/30", ic: "text-blue-600 dark:text-blue-400", tab: "timeoff" },
    { label: "Add expense", icon: FaReceipt, bg: "bg-amber-100 dark:bg-amber-900/30", ic: "text-amber-600 dark:text-amber-400", tab: "finance" },
    { label: "Update profile", icon: FaUserCircle, bg: "bg-indigo-100 dark:bg-indigo-900/30", ic: "text-indigo-600 dark:text-indigo-400", tab: "profile" },
  ];

  const dismissSecurity = () => {
    writeDismissed(user?.uid);
    setSecurityDismissed(true);
  };

  const handleToggleStep = async (workflowId, stepId) => {
    try {
      await toggleOnboardingStep(workflowId, stepId);
    } catch (error) {
      addToast(error.message || "Could not update the workflow", "error");
    }
  };

  const handleCompleteWorkflow = async (workflow) => {
    try {
      await updateOnboardingWorkflow(workflow.id, { status: "completed", completedAt: new Date().toISOString() });
      addToast(`${workflow.title || "Workflow"} marked complete`, "success");
    } catch (error) {
      addToast(error.message || "Could not update the workflow", "error");
    }
  };

  const nothingToDo = pendingDocCount === 0 && approvalCount === 0 && myPendingCount === 0 && !needsBankAccount && securityDismissed;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <PersonProfileModal
        person={profilePerson}
        users={users}
        projects={projects}
        projectAllocations={projectAllocations}
        absences={allAbsences}
        onClose={() => setProfilePerson(null)}
        onSelectPerson={setProfilePerson}
      />

      <div className="lg:col-span-2 space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <FaBolt className="text-amber-500 w-3.5 h-3.5" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Quick actions</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map(({ label, icon: Icon, bg, ic, tab }) => (
              <button
                key={label}
                onClick={() => setActiveTab(tab)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-xl border border-slate-200 dark:border-[#2a3044] hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${ic}`} />
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 text-center leading-tight">{label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-slate-400 w-3.5 h-3.5" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Time off and public holidays</span>
            </div>
            <button className="text-xs text-blue-500 hover:text-blue-400 transition-colors" onClick={() => setActiveTab("timeoff")}>View all</button>
          </div>
          <div className="flex gap-4 mb-4 border-b border-slate-200 dark:border-[#2a3044]">
            {["upcoming", "balance"].map((tab) => (
              <button
                key={tab}
                onClick={() => setTimeOffTab(tab)}
                className={`pb-2.5 text-xs font-medium capitalize border-b-2 -mb-px transition-colors ${
                  timeOffTab === tab
                    ? "border-blue-500 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {tab === "upcoming" ? "Upcoming" : "Balance"}
              </button>
            ))}
          </div>
          {timeOffTab === "upcoming" ? (
            <div className="space-y-2">
              {upcomingHolidays.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-2">No more public holidays configured this year.</p>
              )}
              {upcomingHolidays.map((holiday) => (
                <div key={holiday.date} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-base" aria-label={PUBLIC_HOLIDAY_COUNTRY.name}>{PUBLIC_HOLIDAY_COUNTRY.flag}</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{formatHolidayDate(holiday.date)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{holiday.name}</p>
                  </div>
                </div>
              ))}
              <button onClick={() => setActiveTab("timeoff")} className="w-full mt-2 py-2 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                Request time off
              </button>
            </div>
          ) : (
            <div className="py-3 space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-[#232838]">
                <span className="text-sm text-slate-700 dark:text-slate-200">Annual leave {year}</span>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">{balance.remaining} of {balance.total} days available</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1">
                {balance.used} day{balance.used === 1 ? "" : "s"} approved · {balance.pending} day{balance.pending === 1 ? "" : "s"} pending approval
              </p>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-slate-400 w-3.5 h-3.5" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Who is away today</span>
            </div>
            <button className="text-xs text-blue-500 hover:text-blue-400 transition-colors" onClick={() => setActiveTab("timeoff")}>View all</button>
          </div>
          <div className="space-y-1">
            {awayToday.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center">No one is away today</p>
            ) : awayToday.map((absence) => {
              const person = users.find((item) => item.id === absence.userId || (absence.userEmail && item.email === absence.userEmail));
              const name = absence.userName || person?.name || "Unknown";
              const role = absence.userTitle || person?.title || person?.role || "Team Member";
              const color = absence.userColor || person?.color || "#6366f1";
              return (
                <div key={absence.requestId} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
                  <Avatar name={name} color={color} size="sm" />
                  <div className="flex-1 min-w-0">
                    {person ? (
                      <button type="button" onClick={() => setProfilePerson(person)} className="text-xs font-medium text-blue-500 hover:text-blue-400 truncate">{name}</button>
                    ) : (
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{name}</p>
                    )}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{role}</p>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                    OOO until {absence.toDate}{absence.status === "pending" ? " (pending)" : ""}
                  </span>
                </div>
              );
            })}
            <button className="w-full mt-2 py-2 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors flex items-center justify-center gap-2" onClick={() => setActiveTab("timeoff")}>
              <FaCalendarAlt className="w-3 h-3" /> View calendar
            </button>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <FaBell className="text-slate-400 w-3.5 h-3.5" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">For you today</span>
            {approvalCount > 0 && (
              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                {approvalCount} to approve
              </span>
            )}
          </div>
          {!securityDismissed && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 flex items-start justify-between mb-3" data-testid="security-tip">
              <div className="flex items-start gap-2">
                <FaShieldAlt className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Two-factor authentication is not available in this workspace yet. Protect your account with a strong password.
                  </p>
                  <button type="button" onClick={() => navigate("/profile")} className="mt-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-200 underline">
                    Review sign-in security
                  </button>
                </div>
              </div>
              <button type="button" aria-label="Dismiss security tip" onClick={dismissSecurity} className="text-amber-400 hover:text-amber-600 ml-2 mt-0.5 flex-shrink-0">
                <FaTimes className="w-3 h-3" />
              </button>
            </div>
          )}
          {pendingDocCount > 0 && (
            <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center">
                  <FaClipboardList className="w-4 h-4" />
                </div>
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {pendingDocCount}
                </span>
              </div>
              <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">Documents to sign</span>
              <button onClick={() => setActiveTab("documents")} className="text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] px-2.5 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                View
              </button>
            </div>
          )}
          {needsBankAccount && (
            <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
              <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                <FaUniversity className="w-4 h-4" />
              </div>
              <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">Add a bank account for payments</span>
              <button onClick={() => setActiveTab("finance")} className="text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] px-2.5 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                Add
              </button>
            </div>
          )}
          <ApprovalInboxCard limit={3} />
          {nothingToDo && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">Nothing to do today</p>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <FaClipboardList className="text-slate-400 w-3.5 h-3.5" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Onboarding & offboarding</span>
          </div>
          {activeOnboarding.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">No active workflows.</p>
          ) : (
            <div className="space-y-3">
              {activeOnboarding.map((workflow) => {
                const steps = workflow.steps || [];
                const completedSteps = steps.filter((step) => step.completed).length;
                const expanded = !!expandedWorkflows[workflow.id];
                const shownSteps = expanded ? steps : steps.slice(0, 3);
                const person = users.find((item) => item.id === workflow.userId);
                return (
                  <div key={workflow.id} className="rounded-xl border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{workflow.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {completedSteps}/{steps.length} steps complete{workflow.dueDate ? ` · due ${workflow.dueDate}` : ""}{person ? ` · ${person.name}` : ""}
                        </p>
                      </div>
                      <span className={`text-[11px] px-2 py-1 rounded-full flex-shrink-0 ${workflow.type === "offboarding" ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300" : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"}`}>
                        {workflow.type}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {shownSteps.map((step) => (
                        <button
                          key={step.id}
                          onClick={() => handleToggleStep(workflow.id, step.id)}
                          aria-pressed={!!step.completed}
                          className={`w-full flex items-center gap-2 text-left text-xs rounded-lg px-2.5 py-2 border ${
                            step.completed
                              ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-300"
                              : "bg-white border-slate-200 text-slate-600 dark:bg-[#1c2030] dark:border-[#2a3044] dark:text-slate-300"
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${step.completed ? "bg-green-500 border-green-500 text-white" : "border-slate-300 dark:border-slate-600"}`}>
                            {step.completed && <FaCheck className="w-2 h-2" />}
                          </span>
                          <span>{step.title}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {steps.length > 3 ? (
                        <button type="button" onClick={() => setExpandedWorkflows((prev) => ({ ...prev, [workflow.id]: !expanded }))} className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline">
                          {expanded ? "Show fewer steps" : `Show all ${steps.length} steps`}
                        </button>
                      ) : <span />}
                      {isAdmin && (
                        <button type="button" onClick={() => handleCompleteWorkflow(workflow)} className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400">
                          Mark complete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <FaPen className="text-slate-400 w-3.5 h-3.5" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Contracts</span>
          </div>
          <button type="button" onClick={() => setActiveTab("contract")} className="w-full text-left flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#232838] hover:bg-slate-100 dark:hover:bg-[#2a3044] transition-colors">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <FaBriefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-500 truncate">{userName} - {jobTitle}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${contractStatus.tone === "green" ? "bg-green-500" : contractStatus.tone === "amber" ? "bg-amber-500" : "bg-slate-400"}`} />
                <span className={`text-[11px] ${contractStatus.tone === "green" ? "text-green-600 dark:text-green-400" : contractStatus.tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`}>{contractStatus.label}</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-shrink-0">{salaryDisplay}</span>
          </button>
        </Card>
      </div>
    </div>
  );
}
