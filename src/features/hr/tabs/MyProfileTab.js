import React, { useState } from "react";
import { FaBriefcase, FaIdCard, FaInfoCircle, FaUserCircle, FaUserFriends } from "react-icons/fa";
import { useHR } from "../../../shared/context/HRContext";
import { useAuth } from "../../../shared/context/AuthContext";
import { useApp } from "../../../shared/context/AppContext";
import { Avatar, Card, InfoRow } from "../components/HRSharedUI";

export function MyProfileTab({ userName, userEmail }) {
  const { employeeProfile, updateEmployeeProfile, performanceNotes, addPerformanceNote } = useHR();
  const { user, updateProfile, isAdmin } = useAuth();
  const { users } = useApp();
  const [subTab, setSubTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [saving, setSaving] = useState(false);
  const [growthNote, setGrowthNote] = useState("");

  const subTabs = ["Overview", "Personal information", "Payslips", "History"];
  const nameParts = userName?.split(" ") || ["User", ""];
  const firstName = nameParts[0] || "User";
  const lastName = nameParts.slice(1).join(" ") || "";

  const managerId = employeeProfile?.managerId;
  const managerUser = managerId ? (users || []).find((item) => item.id === managerId) : null;

  const jobTitle = employeeProfile?.jobTitle || "—";
  const empType = employeeProfile?.employmentType || "—";
  const salary = employeeProfile?.salary ? `${employeeProfile.salaryCurrency || ""}${employeeProfile.salary}` : "—";
  const startDate = employeeProfile?.startDate || "—";
  const seniority = employeeProfile?.seniorityLevel || "—";
  const workLocation = employeeProfile?.workLocation || "Not specified";
  const country = employeeProfile?.country || "—";
  const currentPerson = (users || []).find((item) => item.email === (userEmail || user?.email));
  const myPerformanceNotes = (performanceNotes || [])
    .filter((note) => (
      note.userId === currentPerson?.id
      || note.userId === user?.uid
      || note.userEmail === (userEmail || user?.email)
    ))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

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
      if (editCountry.trim()) await updateEmployeeProfile({ country: editCountry.trim() });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddGrowthNote = async () => {
    if (!growthNote.trim()) return;
    await addPerformanceNote({
      userId: currentPerson?.id || user?.uid || "",
      userEmail: userEmail || user?.email || "",
      title: "Growth note",
      text: growthNote.trim(),
    });
    setGrowthNote("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
      <div className="lg:col-span-1">
        <Card className="p-3">
          {subTabs.map((tab) => {
            const tabId = tab.toLowerCase().replace(/ /g, "-");
            return (
              <button
                key={tab}
                onClick={() => setSubTab(tabId)}
                className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-colors ${
                  subTab === tabId
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838]"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </Card>
      </div>

      <div className="lg:col-span-3 space-y-4">
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
            <InfoRow label="Contract" value={<span className="text-blue-500 cursor-pointer hover:underline">{userName} - {jobTitle}</span>} />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <FaUserFriends className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Worker relationship</h3>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Manager</p>
            {managerUser ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#232838]">
                <Avatar name={managerUser.name || "?"} color={managerUser.color || "#6366f1"} size="sm" />
                <div>
                  <p className="text-xs font-medium text-blue-500">{managerUser.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{managerUser.role || "Team Member"}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-[#232838]">
                <FaInfoCircle className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Not assigned</span>
                {isAdmin && <span className="ml-auto text-[11px] text-slate-400">Set in People tab</span>}
              </div>
            )}
          </div>
        </Card>

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
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">First name</label>
                  <input value={editFirst} onChange={(event) => setEditFirst(event.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Last name</label>
                  <input value={editLast} onChange={(event) => setEditLast(event.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Country</label>
                <input value={editCountry} onChange={(event) => setEditCountry(event.target.value)} placeholder="e.g. Turkey" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <FaInfoCircle className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Performance & growth notes</h3>
            </div>
          </div>
          <div className="space-y-3">
            {myPerformanceNotes.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">No notes yet.</p>
            ) : (
              myPerformanceNotes.map((note) => (
                <div key={note.id} className="rounded-lg border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{note.title || "Note"}</p>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {new Date(note.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-wrap">{note.text}</p>
                </div>
              ))
            )}
            <div className="rounded-lg border border-slate-200 dark:border-[#2a3044] p-3">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Add a growth note</label>
              <textarea
                value={growthNote}
                onChange={(event) => setGrowthNote(event.target.value)}
                rows={3}
                placeholder="Capture feedback, growth goals or 1:1 follow-up notes..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex justify-end mt-2">
                <button onClick={handleAddGrowthNote} disabled={!growthNote.trim()} className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
                  Save note
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
