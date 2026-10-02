import React from "react";
import { Listbox } from "@headlessui/react";
import { FaChevronDown } from "react-icons/fa";

export default function PanelMiniSelect({ value, options, onChange, renderValue, renderOption, disabled }) {
  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className="relative">
        <Listbox.Button className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#232838] text-slate-700 dark:text-slate-300 transition-colors focus:outline-none ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-100 dark:hover:bg-[#2a3044]"}`}>
          {renderValue(value)}
          <FaChevronDown className="w-2.5 h-2.5 text-slate-400 ml-0.5" />
        </Listbox.Button>
        <Listbox.Options className="absolute z-50 mt-1 bg-white dark:bg-[#1c2030] border border-slate-200 dark:border-[#2a3044] rounded-lg shadow-lg py-1 min-w-28 max-h-40 overflow-auto">
          {options.map((option) => (
            <Listbox.Option
              key={option.value ?? option}
              value={option.value ?? option}
              className={({ active }) =>
                `flex items-center gap-1.5 px-2.5 py-1.5 text-xs cursor-pointer ${active ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "text-slate-700 dark:text-slate-300"}`
              }
            >
              {renderOption ? renderOption(option) : (option.label ?? option)}
            </Listbox.Option>
          ))}
        </Listbox.Options>
      </div>
    </Listbox>
  );
}
