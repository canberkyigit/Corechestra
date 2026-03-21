import React, { useState } from "react";
import { FaCog, FaEye, FaFlag, FaHashtag, FaBars, FaTags, FaTrash, FaUserPlus, FaCheck, FaColumns, FaWindowMaximize } from "react-icons/fa";
import { useApp } from "../../context/AppContext";
import { COLUMNS_DATA } from "../../constants";

function ToggleRow({ label, description, checked, onChange, icon: Icon, iconColor }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="font-medium text-gray-800 text-sm">{label}</div>
          <div className="text-xs text-gray-500 mt-0.5">{description}</div>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          checked ? "bg-blue-500" : "bg-gray-300"
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

export default function BoardSettingsTab() {
  const { boardSettings, updateBoardSettings, resetAllData, activeTasks, backlogSections } = useApp();
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <FaCog className="text-gray-400 w-5 h-5" />
          <h2 className="text-lg font-bold text-gray-800">Board Identity</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Board Name</label>
            <div className="relative">
              <input
                type="text"
                value={boardSettings.boardName}
                onChange={(e) => updateBoardSettings({ boardName: e.target.value })}
                onKeyDown={handleNameSave}
                onBlur={handleNameSave}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              {savedFeedback && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500">
                  <FaCheck className="w-4 h-4" />
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Key</label>
            <input
              type="text"
              value={boardSettings.projectKey}
              onChange={(e) => updateBoardSettings({ projectKey: e.target.value.toUpperCase().slice(0, 6) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-300"
              maxLength={6}
            />
            <p className="text-xs text-gray-400 mt-1">Used as task ID prefix (e.g. {boardSettings.projectKey}-123)</p>
          </div>
        </div>
      </div>

      {/* Display Settings */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <FaEye className="text-gray-400 w-5 h-5" />
          <h2 className="text-lg font-bold text-gray-800">Display Settings</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">Control what's visible on the Kanban board cards</p>

        <ToggleRow
          label="Show Badges"
          description="Show date, type and assignee badges below task cards"
          checked={boardSettings.showBadges}
          onChange={(v) => updateBoardSettings({ showBadges: v })}
          icon={FaTags}
          iconColor="bg-gray-100 text-gray-600"
        />
        <ToggleRow
          label="Show Priority Colors"
          description="Show colored left border indicating task priority"
          checked={boardSettings.showPriorityColors}
          onChange={(v) => updateBoardSettings({ showPriorityColors: v })}
          icon={FaFlag}
          iconColor="bg-green-100 text-green-600"
        />
        <ToggleRow
          label="Show Task IDs"
          description="Show task ID (e.g. CY-1) on cards"
          checked={boardSettings.showTaskIds}
          onChange={(v) => updateBoardSettings({ showTaskIds: v })}
          icon={FaHashtag}
          iconColor="bg-purple-100 text-purple-600"
        />
        <ToggleRow
          label="Show Subtask Button"
          description="Show the subtask toggle button on kanban cards"
          checked={boardSettings.showSubtaskButtons}
          onChange={(v) => updateBoardSettings({ showSubtaskButtons: v })}
          icon={FaBars}
          iconColor="bg-orange-100 text-orange-600"
        />
      </div>

      {/* Task View Mode */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <FaWindowMaximize className="text-gray-400 w-5 h-5" />
          <h2 className="text-lg font-bold text-gray-800">Task View Mode</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">Choose how task details open when you click a task card</p>
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
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${boardSettings.taskViewMode === value ? "text-blue-600" : "text-gray-400"}`} />
              <div>
                <div className={`font-semibold text-sm ${boardSettings.taskViewMode === value ? "text-blue-700" : "text-gray-800"}`}>{label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
              </div>
              {boardSettings.taskViewMode === value && (
                <FaCheck className="w-4 h-4 text-blue-500 ml-auto flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Board Columns */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-lg font-bold text-gray-800">Board Columns</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {COLUMNS_DATA.map((col) => {
            const count = activeTasks.filter((t) => t.status === col.id).length;
            return (
              <div
                key={col.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <span className="text-sm font-medium text-gray-700">{col.title}</span>
                <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs font-medium">{count}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">Column customization will be available in a future update.</p>
      </div>

      {/* Team */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <FaUserPlus className="text-gray-400 w-5 h-5" />
            <h2 className="text-lg font-bold text-gray-800">Team Members</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {["Alice", "Bob", "Carol", "Dave"].map((name) => (
            <div key={name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <img
                src={`https://ui-avatars.com/api/?name=${name}&size=32&background=random`}
                alt={name}
                className="w-8 h-8 rounded-full"
              />
              <div>
                <div className="text-sm font-medium text-gray-800">{name}</div>
                <div className="text-xs text-gray-400">{activeTasks.filter((t) => t.assignedTo === name.toLowerCase()).length} active tasks</div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">Full team management will be available when backend is connected.</p>
      </div>

      {/* Board Stats */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Board Statistics</h2>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Tasks", value: totalTasks, color: "blue" },
            { label: "Active Sprint", value: activeTasks.length, color: "purple" },
            { label: "In Backlog", value: backlogTasks.length, color: "orange" },
            { label: "Done", value: doneTasks, color: "green" },
          ].map(({ label, value, color }) => (
            <div key={label} className={`text-center p-4 bg-${color}-50 rounded-lg border border-${color}-100`}>
              <div className={`text-3xl font-bold text-${color}-600`}>{value}</div>
              <div className={`text-sm text-${color}-700 mt-1`}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-red-700 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">Permanently reset all board data to initial seed data. This cannot be undone.</p>
        {!resetConfirm ? (
          <button
            onClick={() => setResetConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-300 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <FaTrash className="w-4 h-4" />
            Reset All Data
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">Are you sure? This will erase all tasks, retro items and notes.</span>
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
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
