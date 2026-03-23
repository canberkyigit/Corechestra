import React, { useState } from "react";
import { FaCog, FaEye, FaFlag, FaHashtag, FaBars, FaTags, FaTrash, FaUserPlus, FaCheck, FaColumns, FaWindowMaximize } from "react-icons/fa";
import { useApp } from "../../context/AppContext";

function ToggleRow({ label, description, checked, onChange, icon: Icon, iconColor }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-[#232838] last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">{label}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          checked ? "bg-blue-500" : "bg-gray-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

const STAT_STYLES = {
  blue:   { bg: "bg-blue-50   dark:bg-blue-900/20",   text: "text-blue-600   dark:text-blue-400",   sub: "text-blue-700   dark:text-blue-300"   },
  purple: { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400", sub: "text-purple-700 dark:text-purple-300" },
  orange: { bg: "bg-orange-50 dark:bg-orange-900/20", text: "text-orange-600 dark:text-orange-400", sub: "text-orange-700 dark:text-orange-300" },
  green:  { bg: "bg-green-50  dark:bg-green-900/20",  text: "text-green-600  dark:text-green-400",  sub: "text-green-700  dark:text-green-300"  },
};

export default function BoardSettingsTab() {
  const { boardSettings, updateBoardSettings, resetAllData, activeTasks, backlogSections, columns } = useApp();
  const [resetConfirm, setResetConfirm] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const backlogTasks = backlogSections.flatMap((s) => s.tasks);
  const totalTasks = activeTasks.length + backlogTasks.length;
  const doneTasks = activeTasks.filter((t) => t.status === "done").length;

  const handleNameSave = (e) => {
    if (e.key === "Enter" || e.type === "blur") {
      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 mt-4 mb-12">
      {/* Board Identity */}
      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <FaCog className="text-slate-400 dark:text-slate-500 w-5 h-5" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Board Identity</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Board Name</label>
            <div className="relative">
              <input
                type="text"
                value={boardSettings.boardName}
                onChange={(e) => updateBoardSettings({ boardName: e.target.value })}
                onKeyDown={handleNameSave}
                onBlur={handleNameSave}
                className="w-full px-3 py-2 border border-slate-300 dark:border-[#2a3044] bg-white dark:bg-[#141720] text-slate-800 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {savedFeedback && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500">
                  <FaCheck className="w-4 h-4" />
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Project Key</label>
            <input
              type="text"
              value={boardSettings.projectKey}
              onChange={(e) => updateBoardSettings({ projectKey: e.target.value.toUpperCase().slice(0, 6) })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-[#2a3044] bg-white dark:bg-[#141720] text-slate-800 dark:text-slate-200 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-300"
              maxLength={6}
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Used as task ID prefix (e.g. {boardSettings.projectKey}-123)</p>
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <FaEye className="text-slate-400 dark:text-slate-500 w-5 h-5" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Display Settings</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Control what's visible on the Kanban board cards</p>

        <ToggleRow
          label="Show Badges"
          description="Show date, type and assignee badges below task cards"
          checked={boardSettings.showBadges}
          onChange={(v) => updateBoardSettings({ showBadges: v })}
          icon={FaTags}
          iconColor="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
        />
        <ToggleRow
          label="Show Priority Colors"
          description="Show colored left border indicating task priority"
          checked={boardSettings.showPriorityColors}
          onChange={(v) => updateBoardSettings({ showPriorityColors: v })}
          icon={FaFlag}
          iconColor="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
        />
        <ToggleRow
          label="Show Task IDs"
          description="Show task ID (e.g. CY-1) on cards"
          checked={boardSettings.showTaskIds}
          onChange={(v) => updateBoardSettings({ showTaskIds: v })}
          icon={FaHashtag}
          iconColor="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
        />
        <ToggleRow
          label="Show Subtask Button"
          description="Show the subtask toggle button on kanban cards"
          checked={boardSettings.showSubtaskButtons}
          onChange={(v) => updateBoardSettings({ showSubtaskButtons: v })}
          icon={FaBars}
          iconColor="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
        />
      </div>

      {/* Task View Mode */}
      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <FaWindowMaximize className="text-slate-400 dark:text-slate-500 w-5 h-5" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Task View Mode</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Choose how task details open when you click a task card</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "modal", label: "Popup Modal", desc: "Opens task in a centered dialog overlay", icon: FaWindowMaximize },
            { value: "panel", label: "Side Panel", desc: "Opens task in a sliding right panel (Jira-style)", icon: FaColumns },
          ].map(({ value, label, desc, icon: Icon }) => (
            <button
              key={value}
              onClick={() => updateBoardSettings({ taskViewMode: value })}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                boardSettings.taskViewMode === value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-slate-200 dark:border-[#2a3044] hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-[#232838]"
              }`}
            >
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${boardSettings.taskViewMode === value ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`} />
              <div>
                <div className={`font-semibold text-sm ${boardSettings.taskViewMode === value ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-200"}`}>{label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{desc}</div>
              </div>
              {boardSettings.taskViewMode === value && (
                <FaCheck className="w-4 h-4 text-blue-500 ml-auto flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Board Columns */}
      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Board Columns</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {columns.map((col) => {
            const count = activeTasks.filter((t) => t.status === col.id).length;
            return (
              <div
                key={col.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#141720] rounded-lg border border-slate-200 dark:border-[#2a3044]"
              >
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{col.title}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-[#2a3044] text-slate-600 dark:text-slate-400 text-xs font-medium">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team */}
      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <FaUserPlus className="text-slate-400 dark:text-slate-500 w-5 h-5" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Team Members</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {["Alice", "Bob", "Carol", "Dave"].map((name) => (
            <div key={name} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#141720] rounded-lg border border-slate-200 dark:border-[#2a3044]">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {name[0]}
              </div>
              <div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{name}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{activeTasks.filter((t) => t.assignedTo === name.toLowerCase()).length} active tasks</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">Full team management will be available when backend is connected.</p>
      </div>

      {/* Board Stats */}
      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-slate-200 dark:border-[#2a3044] shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Board Statistics</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Tasks", value: totalTasks, color: "blue" },
            { label: "Active Sprint", value: activeTasks.length, color: "purple" },
            { label: "In Backlog", value: backlogTasks.length, color: "orange" },
            { label: "Done", value: doneTasks, color: "green" },
          ].map(({ label, value, color }) => {
            const s = STAT_STYLES[color];
            return (
              <div key={label} className={`text-center p-4 ${s.bg} rounded-lg border border-transparent`}>
                <div className={`text-3xl font-bold ${s.text}`}>{value}</div>
                <div className={`text-sm ${s.sub} mt-1`}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-[#1c2030] rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm p-6">
        <h2 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">Danger Zone</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Permanently reset all board data to initial seed data. This cannot be undone.</p>
        {!resetConfirm ? (
          <button
            onClick={() => setResetConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <FaTrash className="w-4 h-4" />
            Reset All Data
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-700 dark:text-slate-300">Are you sure? This will erase all tasks, retro items and notes.</span>
            <button
              onClick={() => {
                resetAllData();
                setResetConfirm(false);
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
            >
              Yes, Reset
            </button>
            <button
              onClick={() => setResetConfirm(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-[#232838] text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-200 dark:hover:bg-[#2a3044] transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
