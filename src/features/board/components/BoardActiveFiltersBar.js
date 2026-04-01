import React from "react";
import { Listbox } from "@headlessui/react";
import { FaBars, FaCheck, FaChevronDown, FaFlag, FaHashtag, FaLayerGroup, FaTags } from "react-icons/fa";
import { BOARD_FILTER_TYPE_OPTIONS } from "../constants/taskOptions";

export function BoardActiveFiltersBar({
  filter,
  setFilter,
  member,
  setMember,
  projectMembers,
  showBadges,
  showPriorityColors,
  showTaskIds,
  showSubtaskButtons,
  updateBoardSettings,
  viewMode,
  swimlaneMode,
  setSwimlaneMode,
  bulkMode,
  setBulkMode,
  setSelectedIds,
  search,
  setSearch,
  viewModes,
  setViewMode,
  activeFilterCount,
  hasActiveFilters,
  onClearFilters,
}) {
  return (
    <div className="flex items-center justify-between px-3 md:px-6 py-2.5 gap-2 md:gap-4 bg-white dark:bg-[#1c2030] border-b border-slate-100 dark:border-[#232838] transition-colors flex-wrap">
      <div className="flex gap-1.5 md:gap-2 items-center flex-wrap">
        <Listbox value={filter} onChange={setFilter}>
          <div className="relative w-28 md:w-36">
            <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] py-1.5 pl-3 pr-8 text-left text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-slate-300 dark:hover:border-slate-500">
              <span className="block truncate">{filter.label}</span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <FaChevronDown className="h-3 w-3 text-slate-400" />
              </span>
            </Listbox.Button>
            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-[#1c2030] py-1 text-sm shadow-lg ring-1 ring-black/5 z-50 border border-slate-100 dark:border-[#2a3044]">
              {BOARD_FILTER_TYPE_OPTIONS.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option}
                  className={({ active, selected }) => `cursor-pointer select-none py-1.5 pl-4 pr-4 ${active ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"} ${selected ? "font-semibold" : ""}`}
                >
                  {option.label}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </div>
        </Listbox>

        <Listbox value={member} onChange={setMember}>
          <div className="relative w-28 md:w-36">
            <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] py-1.5 pl-3 pr-8 text-left text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 hover:border-slate-300 dark:hover:border-slate-500">
              <span className="block truncate">{member.label}</span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <FaChevronDown className="h-3 w-3 text-slate-400" />
              </span>
            </Listbox.Button>
            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-[#1c2030] py-1 text-sm shadow-lg ring-1 ring-black/5 z-50 border border-slate-100 dark:border-[#2a3044]">
              {projectMembers.map((option) => (
                <Listbox.Option
                  key={option.value}
                  value={option}
                  className={({ active, selected }) => `cursor-pointer select-none py-1.5 pl-4 pr-4 ${active ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"} ${selected ? "font-semibold" : ""}`}
                >
                  {option.label}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </div>
        </Listbox>

        {[
          { key: "showBadges", icon: FaTags, title: "Toggle badges", val: showBadges },
          { key: "showPriorityColors", icon: FaFlag, title: "Toggle priority colors", val: showPriorityColors },
          { key: "showTaskIds", icon: FaHashtag, title: "Toggle task IDs", val: showTaskIds },
          { key: "showSubtaskButtons", icon: FaBars, title: "Toggle subtask buttons", val: showSubtaskButtons },
        ].map(({ key, icon: Icon, title, val }) => (
          <button
            key={key}
            className={`flex items-center justify-center p-1.5 rounded-lg border transition-all ${
              val ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400" : "border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-500"
            }`}
            onClick={() => updateBoardSettings({ [key]: !val })}
            title={title}
            style={{ minWidth: 32, minHeight: 32 }}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}

        {viewMode === "kanban" && (
          <button className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            swimlaneMode
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
              : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
          }`} onClick={() => setSwimlaneMode((value) => !value)} title="Swimlane view">
            <FaLayerGroup className="w-3.5 h-3.5" /> Swimlane
          </button>
        )}

        {viewMode !== "kanban" && (
          <button
            onClick={() => { setBulkMode((value) => !value); setSelectedIds(new Set()); }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              bulkMode ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400" : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
            }`}
            title="Bulk select"
          >
            <FaCheck className="w-3 h-3" /> Bulk
          </button>
        )}

        {hasActiveFilters && (
          <>
            <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-300">
              {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active
            </span>
            <button
              type="button"
              onClick={onClearFilters}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-xs font-medium text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 transition-colors"
            >
              Clear filters
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search..."
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#1c2030] text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-28 md:w-48"
        />
        <div className="flex items-center border border-slate-200 dark:border-[#2a3044] rounded-lg overflow-hidden">
          {viewModes.map(({ id, icon: Icon, title }) => (
            <button key={id} title={title} onClick={() => setViewMode(id)} className={`p-1.5 transition-colors ${viewMode === id ? "bg-blue-600 text-white" : "bg-white dark:bg-[#1c2030] text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-[#232838]"}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
