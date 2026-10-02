import React from "react";
import { FaExclamationTriangle, FaSlidersH } from "react-icons/fa";
import CustomFieldInput from "./CustomFieldInput";
import {
  getEffectiveCustomFieldValue,
  normalizeCustomFieldValue,
  validateCustomFieldValue,
} from "../../../shared/utils/customFields";

/**
 * "Fields" section of the task modal / side panel: one editor per applicable
 * custom field. Values are owned by the parent (`values` map); see
 * `CustomFieldInput` for the `onChange(fieldId, value, { commit })` contract.
 */
export default function TaskCustomFields({
  defs,
  values,
  onChange,
  readOnly = false,
  variant = "modal",
  members,
  users,
  showRequiredWarnings = true,
}) {
  if (!defs || defs.length === 0) return null;
  const isPanel = variant === "panel";
  const missingRequired = defs.filter((def) => (
    def.required && getEffectiveCustomFieldValue(def, normalizeCustomFieldValue(def, values?.[def.id])) === undefined
  ));

  return (
    <section aria-label="Custom fields" data-testid="task-custom-fields">
      <div className={`flex items-center gap-1.5 ${isPanel ? "text-xs text-slate-400 dark:text-slate-500 mb-1.5" : "app-kicker mb-2"}`}>
        <FaSlidersH className="w-3 h-3" />
        <span>Fields</span>
        {showRequiredWarnings && missingRequired.length > 0 && (
          <span
            className="ml-auto inline-flex items-center gap-1 normal-case tracking-normal text-[11px] font-medium text-amber-600 dark:text-amber-400"
            title={`Missing: ${missingRequired.map((def) => def.name).join(", ")}`}
          >
            <FaExclamationTriangle className="w-2.5 h-2.5" />
            {missingRequired.length} required field{missingRequired.length === 1 ? "" : "s"} empty
          </span>
        )}
      </div>
      <div className={`grid gap-3 ${isPanel ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
        {defs.map((def) => {
          const raw = values?.[def.id];
          const error = validateCustomFieldValue(def, normalizeCustomFieldValue(def, raw));
          // Drafts of unparseable numbers normalise to "empty"; flag them too.
          const badNumber = def.type === "number" && raw !== undefined && raw !== "" && normalizeCustomFieldValue(def, raw) === undefined;
          const isMissing = showRequiredWarnings && missingRequired.includes(def);
          const wide = def.type === "textarea" || def.type === "multiselect";
          const inputId = `cf-input-${def.id}`;
          return (
            <div key={def.id} className={wide ? (isPanel ? "col-span-2" : "sm:col-span-2") : ""} data-testid={`custom-field-${def.id}`}>
              <label
                htmlFor={inputId}
                className={`flex items-center gap-1 ${isPanel ? "text-xs text-slate-400 dark:text-slate-500 mb-1" : "app-kicker mb-1.5"}`}
                title={def.description || undefined}
              >
                <span className="truncate">{def.name}</span>
                {def.required && <span className="text-red-500" aria-label="required">*</span>}
                {isMissing && (
                  <FaExclamationTriangle className="w-2.5 h-2.5 text-amber-500 flex-shrink-0" title="Required field is empty" />
                )}
              </label>
              <CustomFieldInput
                id={inputId}
                def={def}
                value={raw}
                onChange={(value, meta) => onChange(def.id, value, meta)}
                readOnly={readOnly}
                variant={variant}
                members={members}
                users={users}
                invalid={Boolean(error) || badNumber}
              />
              {(error || badNumber) && (
                <p className="mt-1 text-[11px] text-red-500 dark:text-red-400">{error || `${def.name} must be a number`}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
