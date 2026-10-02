import React, { useMemo, useState } from "react";
import { FaBriefcase, FaHistory, FaIdCard, FaInfoCircle, FaUserCircle, FaUserFriends } from "react-icons/fa";
import { useHR } from "../../../shared/context/HRContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { Avatar, Card, InfoRow } from "../components/HRSharedUI";
import { PayslipList } from "../components/PayslipList";
import { PersonProfileModal } from "../components/PersonProfileModal";
import { dedupeById, findPersonForAuth, personTitle } from "../utils/people";
import { getDirectReports } from "../utils/orgChart";
import { buildEmployeeHistory } from "../utils/hrHistory";
import { formatMoney } from "../utils/payslips";
import { formatShortDate } from "../utils/dates";

const SUB_TABS = [
  { id: "overview", label: "Overview" },
  { id: "personal-information", label: "Personal information" },
  { id: "payslips", label: "Payslips" },
  { id: "history", label: "History" },
];

const HISTORY_DOT = {
  milestone: "bg-blue-500",
  timeoff: "bg-amber-500",
  expense: "bg-purple-500",
  document: "bg-slate-400",
  note: "bg-indigo-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
};

export function MyProfileTab({ userName, userEmail, setActiveTab }) {
  const {
    employeeProfile,
    updateEmployeeProfile,
    performanceNotes,
    addPerformanceNote,
    timeOffRequests,
    expenses,
    documents,
    timeEntries,
    projectAllocations,
    allAbsences,
  } = useHR();
  const { user, updateProfile, isAdmin } = useAuth();
  const { users: rawUsers, projects } = useApp();
  const { addToast } = useToast();
  const [subTab, setSubTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [growthNote, setGrowthNote] = useState("");
  const [profilePerson, setProfilePerson] = useState(null);

  const users = useMemo(() => dedupeById(rawUsers), [rawUsers]);
  const nameParts = (userName || "User").split(" ");
  const firstName = nameParts[0] || "User";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Single source of truth for the hierarchy: appData/entities.users[].managerId (set in HR People).
  const currentPerson = findPersonForAuth(users, { uid: user?.uid, email: userEmail || user?.email });
  const managerUser = currentPerson?.managerId ? users.find((item) => item.id === currentPerson.managerId) : null;
  const directReports = currentPerson ? getDirectReports(users, currentPerson.id) : [];

  const jobTitle = employeeProfile?.jobTitle || currentPerson?.title || "—";
  const empType = employeeProfile?.employmentType || "—";
  const salary = employeeProfile?.salary ? formatMoney(employeeProfile.salary, employeeProfile.salaryCurrency) : "—";
  const startDate = employeeProfile?.startDate || "—";
  const seniority = employeeProfile?.seniorityLevel || "—";
  const workLocation = employeeProfile?.workLocation || "Not specified";
  const country = employeeProfile?.country || currentPerson?.country || "—";
  const myPerformanceNotes = (performanceNotes || [])
    .filter((note) => (
      note.userId === currentPerson?.id
      || note.userId === user?.uid
      || note.userEmail === (userEmail || user?.email)
    ))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const history = useMemo(() => buildEmployeeHistory({
    employeeProfile,
    timeOffRequests,
    expenses,
    documents,
    performanceNotes: myPerformanceNotes,
    timeEntries,
    person: currentPerson,
  }), [currentPerson, documents, employeeProfile, expenses, myPerformanceNotes, timeEntries, timeOffRequests]);

  const startEditPersonal = () => {
    setEditFirst(firstName);
    setEditLast(lastName);
    setEditCountry(country === "—" ? "" : country);
    setEditing(true);
  };

  const handleSavePersonal = async () => {
    setSaving(true);
    try {
      const fullName = [editFirst.trim(), editLast.trim()].filter(Boolean).join(" ");
      if (fullName) await updateProfile({ fullName });
      if (editCountry.trim() !== (employeeProfile?.country || "")) await updateEmployeeProfile({ country: editCountry.trim() });
      setEditing(false);
      addToast("Personal information saved", "success");
    } catch (error) {
      addToast(error.message || "Could not save personal information", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAddGrowthNote = async () => {
    if (!growthNote.trim()) return;
    try {
      await addPerformanceNote({
        userId: currentPerson?.id || user?.uid || "",
        userEmail: userEmail || user?.email || "",
        title: "Growth note",
        text: growthNote.trim(),
      });
      setGrowthNote("");
    } catch (error) {
      addToast(error.message || "Could not save the note", "error");
    }
  };

  const PersonRow = ({ person }) => (
    <button type="button" onClick={() => setProfilePerson(person)} className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#232838] hover:bg-slate-100 dark:hover:bg-[#2a3044] transition-colors text-left">
      <Avatar name={person.name || person.email} color={person.color || "#6366f1"} size="sm" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-blue-500 truncate">{person.name || person.email}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{personTitle(person)}</p>
      </div>
    </button>
  );

  const contractCard = (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <FaBriefcase className="w-3.5 h-3.5 text-blue-500" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Contract details</h3>
      </div>
      <div className="mt-3">
        <InfoRow label="Job title" value={jobTitle} />
        <InfoRow label="Employment type" value={empType} />
        <InfoRow label="Base compensation" value={salary} valueClass="font-semibold" />
        <InfoRow
          label="Contract"
          value={setActiveTab
            ? <button type="button" onClick={() => setActiveTab("contract")} className="text-blue-500 hover:underline">{userName} - {jobTitle}</button>
            : `${userName} - ${jobTitle}`}
        />
      </div>
    </Card>
  );

  const relationshipCard = (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <FaUserFriends className="w-3.5 h-3.5 text-purple-500" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Worker relationship</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Manager</p>
          {managerUser ? (
            <PersonRow person={managerUser} />
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-[#232838]">
              <FaInfoCircle className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Not assigned</span>
              {isAdmin && setActiveTab && (
                <button type="button" onClick={() => setActiveTab("people")} className="ml-auto text-[11px] text-blue-600 dark:text-blue-400 hover:underline">Set in People tab</button>
              )}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Direct reports ({directReports.length})</p>
          {directReports.length === 0 ? (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#232838] text-xs text-slate-500 dark:text-slate-400">None</div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {directReports.map((report) => <PersonRow key={report.id} person={report} />)}
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  const personalCard = (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <FaUserCircle className="w-3.5 h-3.5 text-green-500" />
          </div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Personal</h3>
        </div>
        {!editing && (
          <button onClick={startEditPersonal} className="text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] px-3 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="profile-first-name" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">First name</label>
              <input id="profile-first-name" value={editFirst} onChange={(event) => setEditFirst(event.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor="profile-last-name" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Last name</label>
              <input id="profile-last-name" value={editLast} onChange={(event) => setEditLast(event.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label htmlFor="profile-country" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Country</label>
            <input id="profile-country" value={editCountry} onChange={(event) => setEditCountry(event.target.value)} placeholder="e.g. Turkey" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="px-4 py-1.5 text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">Cancel</button>
            <button onClick={handleSavePersonal} disabled={saving} className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <InfoRow label="First name" value={firstName} />
          <InfoRow label="Last name" value={lastName || "—"} />
          <InfoRow label="Personal email" value={userEmail || user?.email || "—"} />
          <InfoRow label="Country" value={country} />
        </>
      )}
    </Card>
  );

  const generalCard = (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
          <FaIdCard className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">General</h3>
      </div>
      <InfoRow label="Start date" value={startDate} />
      <InfoRow label="Work email" value={userEmail || user?.email || "—"} />
      <InfoRow label="Seniority level" value={seniority} />
      <InfoRow label="Work location" value={workLocation} valueClass={workLocation === "Not specified" ? "text-slate-400 dark:text-slate-500" : ""} />
      <InfoRow label="Department" value={currentPerson?.department || "—"} />
    </Card>
  );

  const notesCard = (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <FaInfoCircle className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Performance & growth notes</h3>
      </div>
      <div className="space-y-3">
        {myPerformanceNotes.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">No notes yet.</p>
        ) : (
          myPerformanceNotes.map((note) => (
            <div key={note.id} className="rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{note.title || "Note"}</p>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{formatShortDate(note.createdAt)}</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-wrap">{note.text}</p>
            </div>
          ))
        )}
        <div className="rounded-lg border border-slate-200 dark:border-[#2a3044] p-3">
          <label htmlFor="growth-note" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Add a growth note</label>
          <textarea
            id="growth-note"
            value={growthNote}
            onChange={(event) => setGrowthNote(event.target.value)}
            rows={3}
            placeholder="Capture feedback, growth goals or 1:1 follow-up notes..."
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Notes are visible to everyone with HR access.</p>
          <div className="flex justify-end mt-2">
            <button onClick={handleAddGrowthNote} disabled={!growthNote.trim()} className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
              Save note
            </button>
          </div>
        </div>
      </div>
    </Card>
  );

  const historyCard = (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <FaHistory className="w-3.5 h-3.5 text-blue-500" />
        </div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">History</h3>
      </div>
      {history.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">No HR activity recorded yet.</p>
      ) : (
        <ol className="relative border-l border-slate-200 dark:border-[#2a3044] ml-1.5 space-y-4">
          {history.map((event) => (
            <li key={event.id} className="ml-4">
              <span className={`absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full ${HISTORY_DOT[event.kind] || "bg-slate-400"}`} />
              <p className="text-[11px] text-slate-400 dark:text-slate-500">{formatShortDate(event.date)}</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{event.title}</p>
              {event.detail && <p className="text-xs text-slate-500 dark:text-slate-400">{event.detail}</p>}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
      <PersonProfileModal
        person={profilePerson}
        users={users}
        projects={projects}
        projectAllocations={projectAllocations}
        absences={allAbsences}
        onClose={() => setProfilePerson(null)}
        onSelectPerson={setProfilePerson}
      />
      <div className="lg:col-span-1">
        <Card className="p-3" role="tablist" aria-label="Profile sections">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={subTab === tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-colors ${
                subTab === tab.id
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </Card>
      </div>

      <div className="lg:col-span-3 space-y-4" role="tabpanel">
        {subTab === "overview" && (
          <>
            {contractCard}
            {relationshipCard}
            {notesCard}
          </>
        )}
        {subTab === "personal-information" && (
          <>
            {personalCard}
            {generalCard}
          </>
        )}
        {subTab === "payslips" && (
          <PayslipList employeeName={userName} onOpenContract={setActiveTab ? () => setActiveTab("contract") : undefined} />
        )}
        {subTab === "history" && historyCard}
      </div>
    </div>
  );
}
