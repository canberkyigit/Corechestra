import React, { useMemo } from "react";
import { FaSlidersH, FaTimes } from "react-icons/fa";
import { getFieldFilterOptions, isFilterableField } from "../../../shared/utils/customFields";

const SELECT_CLS = "bg-transparent border-none outline-none text-xs font-medium cursor-pointer pr-1 text-inherit dark:bg-transparent max-w-[9rem] truncate";
const OPTION_CLS = "text-slate-700 bg-white dark:bg-[#1c2030] dark:text-slate-200";

/**
 * Board filter by a discrete custom field (select / multi-select / checkbox /
 * person): pick a field, then a value. Renders nothing when the project has no
 * filterable fields.
 */
export default function CustomFieldFilter({ defs, value, onChange, members }) {
  const filterable = useMemo(() => (defs || []).filter(isFilterableField), [defs]);
  const activeDef = filterable.find((def) => def.id === value?.fieldId) || null;
  const options = useMemo(() => getFieldFilterOptions(activeDef, { members }), [activeDef, members]);

  if (filterable.length === 0) return null;
  const isActive = Boolean(activeDef && value?.value);

  return (
    <div
      className={`flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg border text-xs font-medium transition-all ${
        isActive
          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400"
          : "border-slate-200 dark:border-[#2a3044] text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
      }`}
    >
      <FaSlidersH className="w-3 h-3 flex-shrink-0" />
      <select
        aria-label="Filter by field"
        value={activeDef?.id || ""}
        onChange={(event) => onChange({ fieldId: event.target.value, value: "" })}
        className={SELECT_CLS}
      >
        <option value="" className={OPTION_CLS}>Field…</option>
        {filterable.map((def) => (
          <option key={def.id} value={def.id} className={OPTION_CLS}>{def.name}</option>
        ))}
      </select>
      {activeDef && (
        <select
          aria-label={`${activeDef.name} value`}
          value={value?.value || ""}
          onChange={(event) => onChange({ fieldId: activeDef.id, value: event.target.value })}
          className={SELECT_CLS}
        >
          <option value="" className={OPTION_CLS}>Any</option>
          {options.map((option) => (
            <option key={option.value} value={option.value} className={OPTION_CLS}>{option.label}</option>
          ))}
        </select>
      )}
      {activeDef && (
        <button
          type="button"
          aria-label="Clear field filter"
          onClick={() => onChange({ fieldId: "", value: "" })}
          className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-[#232838]"
        >
          <FaTimes className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}
