import React, { useState } from "react";
import { FaCalendarAlt, FaClock, FaDollarSign, FaFileAlt, FaFolder, FaHome, FaSitemap, FaUserCircle, FaUserFriends, FaUserTie } from "react-icons/fa";
import { useAuth } from "../../../shared/context/AuthContext";
import { useApp } from "../../../shared/context/AppContext";
import { useHR } from "../../../shared/context/HRContext";
import { PanelSkeleton } from "../../../shared/components/Skeleton";
import { HRTabNav } from "../components/HRTabNav";
import { useHrUsers } from "../hooks/useHrUsers";
import { ContractTab } from "../tabs/ContractTab";
import { DocumentsTab } from "../tabs/DocumentsTab";
import { FinanceTab } from "../tabs/FinanceTab";
import { InterviewTab } from "../tabs/InterviewTab";
import { MyProfileTab } from "../tabs/MyProfileTab";
import { OrgChartTab } from "../tabs/OrgChartTab";
import { OverviewTab } from "../tabs/OverviewTab";
import { PeopleTab } from "../tabs/PeopleTab";
import { TimeOffTab } from "../tabs/TimeOffTab";
import { TimeTrackingTab } from "../tabs/TimeTrackingTab";

const TABS = [
  { id: "overview", label: "Overview", icon: FaHome },
  { id: "people", label: "People", icon: FaUserFriends },
  { id: "orgchart", label: "Org chart", icon: FaSitemap },
  { id: "profile", label: "My profile", icon: FaUserCircle },
  { id: "contract", label: "Contract", icon: FaFileAlt },
  { id: "timetracking", label: "Time tracking", icon: FaClock },
  { id: "timeoff", label: "Time off", icon: FaCalendarAlt },
  { id: "documents", label: "Documents", icon: FaFolder },
  { id: "finance", label: "Finance", icon: FaDollarSign },
  { id: "interview", label: "Interview", icon: FaUserTie },
];

export default function HRPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user, profile } = useAuth();
  const { users: rawUsers } = useApp();
  const hrLoading = Boolean(useHR()?.loading);

  const { users, userName, userEmail } = useHrUsers({
    rawUsers,
    authUser: user,
    profile,
  });

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-[#080b14]">
      <HRTabNav tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 overflow-auto">
        <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
          {hrLoading && <PanelSkeleton testId="hr-skeleton" />}
          {!hrLoading && activeTab === "overview" && <OverviewTab userName={userName} setActiveTab={setActiveTab} />}
          {!hrLoading && activeTab === "people" && <PeopleTab employees={users || []} currentUserId={user?.uid} />}
          {!hrLoading && activeTab === "orgchart" && <OrgChartTab users={users || []} currentUserId={user?.uid} />}
          {!hrLoading && activeTab === "profile" && <MyProfileTab userName={userName} userEmail={userEmail} setActiveTab={setActiveTab} />}
          {!hrLoading && activeTab === "contract" && <ContractTab userName={userName} setActiveTab={setActiveTab} />}
          {!hrLoading && activeTab === "timetracking" && <TimeTrackingTab />}
          {!hrLoading && activeTab === "timeoff" && <TimeOffTab />}
          {!hrLoading && activeTab === "documents" && <DocumentsTab />}
          {!hrLoading && activeTab === "finance" && <FinanceTab userName={userName} setActiveTab={setActiveTab} />}
          {!hrLoading && activeTab === "interview" && <InterviewTab />}
        </div>
      </div>
    </div>
  );
}
