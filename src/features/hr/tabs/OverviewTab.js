import React, { useState } from "react";
import { FaBolt, FaClock, FaCalendarAlt, FaReceipt, FaUserCircle, FaInfoCircle, FaTimes, FaBell, FaClipboardList, FaPen, FaBriefcase } from "react-icons/fa";
import { useHR } from "../../../shared/context/HRContext";
import { useApp } from "../../../shared/context/AppContext";
import { Avatar, Card } from "../components/HRSharedUI";
import { PUBLIC_HOLIDAYS } from "../constants/publicHolidays";

export function OverviewTab({ userName, setActiveTab }) {
  const {
    allAbsences,
    documents,
    employeeProfile,
    approvalInbox,
    onboardingWorkflows,
    updateApprovalRequest,
    toggleOnboardingStep,
  } = useHR();
  const { users } = useApp();
  const [timeOffTab, setTimeOffTab] = useState("upcoming");
  const [dismiss2fa, setDismiss2fa] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const awayToday = (allAbsences || []).filter((absence) => absence.fromDate <= today && absence.toDate >= today);
  const pendingDocCount = (documents || []).filter((document) => document.status === "not_submitted" || (!document.status && document.actions?.includes("sign"))).length;
  const pendingApprovals = (approvalInbox || []).filter((item) => item.status === "pending").slice(0, 3);
  const activeOnboarding = (onboardingWorkflows || []).filter((workflow) => workflow.status !== "completed").slice(0, 2);

  const salaryDisplay = employeeProfile?.salary
    ? `${employeeProfile.salaryCurrency || ""}${employeeProfile.salary}`
    : "—";
  const jobTitle = employeeProfile?.jobTitle || "Employee";

  const quickActions = [
    { label: "Submit hours", icon: FaClock, bg: "bg-green-100 dark:bg-green-900/30", ic: "text-green-600 dark:text-green-400", tab: "timetracking" },
    { label: "Request time off", icon: FaCalendarAlt, bg: "bg-blue-100 dark:bg-blue-900/30", ic: "text-blue-600 dark:text-blue-400", tab: "timeoff" },
    { label: "Add expense", icon: FaReceipt, bg: "bg-amber-100 dark:bg-amber-900/30", ic: "text-amber-600 dark:text-amber-400", tab: "finance" },
    { label: "Update profile", icon: FaUserCircle, bg: "bg-indigo-100 dark:bg-indigo-900/30", ic: "text-indigo-600 dark:text-indigo-400", tab: "profile" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              {PUBLIC_HOLIDAYS.slice(0, 3).map((holiday, index) => (
                <div key={index} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-base">🇹🇷</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{holiday.date}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{holiday.name}</p>
                  </div>
                </div>
              ))}
              <button onClick={() => setActiveTab("timeoff")} className="w-full mt-2 py-2 text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                Request time off
              </button>
            </div>
          ) : (
            <div className="py-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-[#232838]">
                <span className="text-sm text-slate-700 dark:text-slate-200">Annual leave</span>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">{employeeProfile?.vacationDays ?? 20} days available</span>
              </div>
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
            ) : awayToday.map((absence, index) => {
              const user = (users || []).find((item) => item.id === absence.userId);
              const name = absence.userName || user?.name || "Unknown";
              const role = absence.userTitle || user?.role || "Team Member";
              const color = absence.userColor || user?.color || "#6366f1";
              return (
                <div key={index} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
                  <Avatar name={name} color={color} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-blue-500 hover:text-blue-400 cursor-pointer truncate">{name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{role}</p>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                    OOO until {absence.toDate}
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
          </div>
          {!dismiss2fa && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 flex items-start justify-between mb-3">
              <div className="flex items-start gap-2">
                <FaInfoCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">Boost your account security by setting up 2FA</p>
              </div>
              <FaTimes className="w-3 h-3 text-amber-400 flex-shrink-0 ml-2 mt-0.5 cursor-pointer" onClick={() => setDismiss2fa(true)} />
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
              <span className="flex-1 text-sm text-slate-700 dark:text-slate-200">Documents</span>
              <button onClick={() => setActiveTab("documents")} className="text-xs text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#2a3044] px-2.5 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                View
              </button>
            </div>
          )}
          {pendingApprovals.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-[#2a3044] last:border-0">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-500 flex items-center justify-center">
                <FaClipboardList className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 dark:text-slate-200 truncate">{item.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.summary || item.type}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateApprovalRequest(item.id, { status: "approved" })}
                  className="text-[11px] text-green-600 dark:text-green-400 border border-green-200 dark:border-green-500/30 px-2 py-1 rounded-lg"
                >
                  Approve
                </button>
                <button
                  onClick={() => updateApprovalRequest(item.id, { status: "rejected" })}
                  className="text-[11px] text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 px-2 py-1 rounded-lg"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
          {pendingDocCount === 0 && dismiss2fa && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-3">Nothing to do today</p>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <FaClipboardList className="text-slate-400 w-3.5 h-3.5" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Onboarding workflows</span>
          </div>
          {activeOnboarding.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">No active onboarding workflows.</p>
          ) : (
            <div className="space-y-3">
              {activeOnboarding.map((workflow) => {
                const totalSteps = (workflow.steps || []).length;
                const completedSteps = (workflow.steps || []).filter((step) => step.completed).length;
                return (
                  <div key={workflow.id} className="rounded-xl border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{workflow.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{completedSteps}/{totalSteps} steps complete</p>
                      </div>
                      <span className="text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                        {workflow.type}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {(workflow.steps || []).slice(0, 3).map((step) => (
                        <button
                          key={step.id}
                          onClick={() => toggleOnboardingStep(workflow.id, step.id)}
                          className={`w-full flex items-center gap-2 text-left text-xs rounded-lg px-2.5 py-2 border ${
                            step.completed
                              ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-300"
                              : "bg-white border-slate-200 text-slate-600 dark:bg-[#1c2030] dark:border-[#2a3044] dark:text-slate-300"
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${step.completed ? "bg-green-500 border-green-500 text-white" : "border-slate-300 dark:border-slate-600"}`}>
                            {step.completed && <FaTimes className="w-2 h-2 rotate-45" />}
                          </span>
                          <span>{step.title}</span>
                        </button>
                      ))}
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
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#232838]">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <FaBriefcase className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-blue-500 truncate">{userName} - {jobTitle}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                <span className="text-[11px] text-green-600 dark:text-green-400">Active</span>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex-shrink-0">{salaryDisplay}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
