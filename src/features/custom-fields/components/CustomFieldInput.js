import React from "react";
import { FaCheck, FaExternalLinkAlt } from "react-icons/fa";
import { SelectField } from "../../board/components/task-modal/TaskDetailSections";
import PanelMiniSelect from "../../board/components/task-panel/PanelMiniSelect";
import {
  findOption,
  formatCustomFieldValue,
  getEffectiveCustomFieldValue,
  normalizeCustomFieldValue,
} from "../../../shared/utils/customFields";

const INPUT_CLS = {
  modal: "w-full border border-slate-200 dark:border-[#2a3044] rounded-lg px-2.5 py-1.5 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50 dark:bg-[#232838] disabled:opacity-60",
  panel: "w-full border border-slate-200 dark:border-[#2a3044] rounded-md px-2 py-1 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#232838] focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed",
};

const NONE = "__none__";

export function OptionDot({ color, className = "w-2 h-2" }) {
  return <span className={`${className} rounded-full flex-shrink-0`} style={{ backgroundColor: color || "#94a3b8" }} />;
}

/** Read-only rendering of a value (viewers, archived contexts). */
export function CustomFieldValueText({ def, value, users, variant = "modal" }) {
  const text = formatCustomFieldValue(def, value, { users });
  const size = variant === "panel" ? "text-xs" : "text-sm";
  if (!text) return <span className={`${size} text-slate-400 dark:text-slate-500`}>—</span>;
  if (def.type === "url") {
    return (
      <a href={text} target="_blank" rel="noopener noreferrer" className={`${size} inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline break-all`}>
        {text} <FaExternalLinkAlt className="w-2.5 h-2.5 flex-shrink-0" />
      </a>
    );
  }
  if (def.type === "select" || def.type === "multiselect") {
    const ids = def.type === "select" ? [getEffectiveCustomFieldValue(def, value)] : getEffectiveCustomFieldValue(def, value);
    return (
      <span className="flex flex-wrap gap-1">
        {ids.map((id) => {
          const option = findOption(def, id);
          return option ? <OptionChip key={id} option={option} /> : null;
        })}
      </span>
    );
  }
  return <span className={`${size} text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words`}>{text}</span>;
}

export function OptionChip({ option, selected = true, onClick, disabled }) {
  const style = {
    backgroundColor: selected ? `${option.color}22` : "transparent",
    color: option.color,
    borderColor: `${option.color}66`,
  };
  const className = `inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border transition-all ${
    selected ? "opacity-100" : "opacity-50 hover:opacity-80"
  } ${disabled ? "cursor-default" : ""}`;
  if (!onClick) return <span className={className} style={style}>{option.label}</span>;
  return (
    <button type="button" aria-pressed={selected} disabled={disabled} onClick={onClick} className={className} style={style}>
      {selected && <FaCheck className="w-2 h-2" />}
      {option.label}
    </button>
  );
}

/**
 * Editor for one custom field value.
 *
 * `onChange(value, { commit })`: text-like inputs report raw drafts while
 * typing (`commit: false`) and the normalised value on blur / Enter
 * (`commit: true`); discrete inputs (select, checkbox, date, …) always commit.
 */
export default function CustomFieldInput({
  def,
  value,
  onChange,
  readOnly = false,
  variant = "modal",
  members = [],
  users,
  invalid = false,
  id,
}) {
  if (readOnly) return <CustomFieldValueText def={def} value={value} users={users} variant={variant} />;

  const inputCls = `${INPUT_CLS[variant] || INPUT_CLS.modal} ${invalid ? "!border-red-400 dark:!border-red-500" : ""}`;
  const commit = (raw) => onChange(normalizeCustomFieldValue(def, raw), { commit: true });
  const draft = (raw) => onChange(raw, { commit: false });
  const label = def.name;

  switch (def.type) {
    case "textarea":
      return (
        <textarea
          id={id}
          aria-label={label}
          rows={variant === "panel" ? 2 : 3}
          className={`${inputCls} resize-y`}
          value={value ?? ""}
          onChange={(event) => draft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
        />
      );
    case "number":
      return (
        <input
          id={id}
          aria-label={label}
          type="number"
          className={inputCls}
          value={value ?? ""}
          onChange={(event) => draft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") commit(event.currentTarget.value); }}
        />
      );
    case "date":
      return (
        <input
          id={id}
          aria-label={label}
          type="date"
          className={inputCls}
          value={value ?? ""}
          onChange={(event) => commit(event.target.value)}
        />
      );
    case "checkbox":
      return (
        <label className={`inline-flex items-center gap-2 cursor-pointer select-none ${variant === "panel" ? "text-xs" : "text-sm"} text-slate-600 dark:text-slate-300`}>
          <input
            id={id}
            type="checkbox"
            aria-label={label}
            className="w-4 h-4 rounded border-slate-300 dark:border-[#2a3044] text-blue-600 focus:ring-blue-400"
            checked={value === true}
            onChange={(event) => commit(event.target.checked)}
          />
          {value === true ? "Yes" : "No"}
        </label>
      );
    case "select": {
      const options = [{ value: NONE, label: "None" }, ...(def.options || []).map((option) => ({ value: option.id, label: option.label, color: option.color }))];
      const current = getEffectiveCustomFieldValue(def, value) || NONE;
      const renderOption = (option) => (
        <span className="flex items-center gap-1.5">
          {option.value !== NONE && <OptionDot color={option.color} />}
          <span className={option.value === NONE ? "text-slate-400" : ""}>{option.label}</span>
        </span>
      );
      const renderValue = (selected) => renderOption(options.find((option) => option.value === selected) || options[0]);
      const handle = (next) => commit(next === NONE ? undefined : next);
      if (variant === "panel") {
        return <PanelMiniSelect value={current} options={options} onChange={handle} renderValue={renderValue} renderOption={renderOption} />;
      }
      return <SelectField label={null} value={current} options={options} onChange={handle} renderValue={renderValue} renderOption={renderOption} />;
    }
    case "multiselect": {
      const selected = getEffectiveCustomFieldValue(def, value) || [];
      return (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
          {(def.options || []).map((option) => {
            const isOn = selected.includes(option.id);
            return (
              <OptionChip
                key={option.id}
                option={option}
                selected={isOn}
                onClick={() => commit(isOn ? selected.filter((item) => item !== option.id) : [...selected, option.id])}
              />
            );
          })}
        </div>
      );
    }
    case "user": {
      const options = [
        { value: NONE, label: "Nobody" },
        ...(members || [])
          .filter((member) => member.value && member.value !== "unassigned")
          .map((member) => ({ value: member.value, label: member.label })),
      ];
      // Keep a stored person selectable even if they left the project.
      if (value && !options.some((option) => option.value === value)) {
        options.push({ value, label: formatCustomFieldValue(def, value, { users }) });
      }
      const current = value || NONE;
      const renderValue = (selected) => {
        const option = options.find((item) => item.value === selected) || options[0];
        return <span className={option.value === NONE ? "text-slate-400" : ""}>{option.label}</span>;
      };
      const handle = (next) => commit(next === NONE ? undefined : next);
      if (variant === "panel") {
        return <PanelMiniSelect value={current} options={options} onChange={handle} renderValue={renderValue} renderOption={(option) => option.label} />;
      }
      return <SelectField label={null} value={current} options={options} onChange={handle} renderValue={renderValue} renderOption={(option) => option.label} />;
    }
    default:
      // text / url
      return (
        <input
          id={id}
          aria-label={label}
          type={def.type === "url" ? "url" : "text"}
          placeholder={def.type === "url" ? "https://" : ""}
          className={inputCls}
          value={value ?? ""}
          onChange={(event) => draft(event.target.value)}
          onBlur={(event) => commit(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") commit(event.currentTarget.value); }}
        />
      );
  }
}
