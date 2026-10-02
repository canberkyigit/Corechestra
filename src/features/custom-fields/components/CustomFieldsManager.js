import React, { useMemo, useState } from "react";
import {
  FaArchive, FaArrowDown, FaArrowUp, FaChevronDown, FaChevronRight, FaColumns,
  FaPen, FaPlus, FaSlidersH, FaTrash, FaUndo,
} from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { useAppStore } from "../../../shared/store/useAppStore";
import { useBoardPermissions } from "../../board/hooks/useBoardPermissions";
import { useProjectAssignees } from "../../board/components/task-shared/taskDetailHooks";
import { TASK_TYPE_LABELS } from "../../../shared/constants/taskMeta";
import CustomFieldDefModal from "./CustomFieldDefModal";
import { OptionDot } from "./CustomFieldInput";
import {
  MAX_CARD_FIELDS,
  countTasksWithFieldValue,
  formatCustomFieldValue,
  getCustomFieldTypeLabel,
  getProjectCustomFieldDefs,
  isOptionFieldType,
} from "../../../shared/utils/customFields";

const ICON_BTN = "p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-[#232838] dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent";

function Pill({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 dark:bg-[#232838] text-slate-500 dark:text-slate-400",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>;
}

function appliesToText(def) {
  const types = def.appliesToTypes || [];
  if (types.length === 0) return "All task types";
  return types.map((type) => TASK_TYPE_LABELS[type] || type).join(", ");
}

function FieldRow({ def, index, total, canManage, users, onEdit, onMove, onArchive }) {
  const defaultText = formatCustomFieldValue(def, def.defaultValue, { users });
  return (
    <li
      className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-slate-100 dark:border-[#2a3044] bg-white dark:bg-[#141720]"
      data-testid={`custom-field-row-${def.id}`}
    >
      {canManage && (
        <div className="flex flex-col -my-1">
          <button type="button" aria-label={`Move ${def.name} up`} disabled={index === 0} onClick={() => onMove(def.id, -1)} className={ICON_BTN}>
            <FaArrowUp className="w-2.5 h-2.5" />
          </button>
          <button type="button" aria-label={`Move ${def.name} down`} disabled={index === total - 1} onClick={() => onMove(def.id, 1)} className={ICON_BTN}>
            <FaArrowDown className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{def.name}</span>
          <Pill>{getCustomFieldTypeLabel(def.type)}</Pill>
          {def.required && <Pill tone="red">Required</Pill>}
          {def.showOnCard && <Pill tone="blue"><FaColumns className="w-2.5 h-2.5" /> On card</Pill>}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
          <span>{appliesToText(def)}</span>
          {isOptionFieldType(def.type) && (
            <span className="inline-flex items-center gap-1">
              {(def.options || []).slice(0, 6).map((option) => <OptionDot key={option.id} color={option.color} />)}
              {(def.options || []).length} option{(def.options || []).length === 1 ? "" : "s"}
            </span>
          )}
          {defaultText && <span>Default: {defaultText}</span>}
        </div>
      </div>
      {canManage && (
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button type="button" aria-label={`Edit ${def.name}`} onClick={() => onEdit(def)} className={ICON_BTN}>
            <FaPen className="w-3 h-3" />
          </button>
          <button type="button" aria-label={`Archive ${def.name}`} title="Archive (values are kept)" onClick={() => onArchive(def)} className={ICON_BTN}>
            <FaArchive className="w-3 h-3" />
          </button>
        </div>
      )}
    </li>
  );
}

function ArchivedRow({ def, valueCount, canManage, onRestore, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <li className="px-3 py-2.5 rounded-lg border border-dashed border-slate-200 dark:border-[#2a3044] bg-slate-50 dark:bg-[#141720]/60" data-testid={`custom-field-archived-${def.id}`}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-sm text-slate-500 dark:text-slate-400 truncate">{def.name}</span>
          <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
            {getCustomFieldTypeLabel(def.type)} · {valueCount} task{valueCount === 1 ? "" : "s"} with a value
          </span>
        </div>
        {canManage && !confirming && (
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button type="button" aria-label={`Restore ${def.name}`} onClick={() => onRestore(def)} className={ICON_BTN}>
              <FaUndo className="w-3 h-3" />
            </button>
            <button type="button" aria-label={`Delete ${def.name} permanently`} onClick={() => setConfirming(true)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
              <FaTrash className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
      {confirming && (
        <div role="alert" className="mt-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2">
          <p className="text-xs text-red-700 dark:text-red-300">
            Permanently delete <strong>{def.name}</strong>? Its values are removed from {valueCount} task{valueCount === 1 ? "" : "s"}. This cannot be undone.
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => { setConfirming(false); onDelete(def); }} className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700">
              Delete permanently
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="rounded-md px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#232838]">
              Cancel
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * "Custom fields" management for one project: list + reorder, create / edit
 * dialog, archive / restore and (archived only) permanent delete. Gated by
 * the `fields:manage` permission; everyone else sees the list read-only.
 */
export default function CustomFieldsManager({ projectId: projectIdProp, compact = false }) {
  const {
    customFieldDefs,
    createCustomFieldDef,
    updateCustomFieldDef,
    archiveCustomFieldDef,
    restoreCustomFieldDef,
    deleteCustomFieldDef,
    moveCustomFieldDef,
    currentProjectId,
    activeTasks,
    backlogSections,
    archivedTasks,
    users,
  } = useApp();
  // Not exposed by useApp(): needed to count values of other projects' backlogs.
  const perProjectBacklog = useAppStore((state) => state.perProjectBacklog);
  const { canManageFields } = useBoardPermissions();
  const { addToast } = useToast();
  const projectId = projectIdProp || currentProjectId || "";
  const members = useProjectAssignees(projectId);
  const [editor, setEditor] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const allDefs = useMemo(() => customFieldDefs || [], [customFieldDefs]);
  const activeDefs = useMemo(() => getProjectCustomFieldDefs(allDefs, projectId), [allDefs, projectId]);
  const archivedDefs = useMemo(
    () => getProjectCustomFieldDefs(allDefs, projectId, { includeArchived: true }).filter((def) => def.archived),
    [allDefs, projectId]
  );
  const cardFieldCount = activeDefs.filter((def) => def.showOnCard).length;

  const projectTasks = useMemo(() => {
    const backlog = perProjectBacklog?.[projectId] || (projectId === currentProjectId ? backlogSections : []) || [];
    return [
      ...(activeTasks || []).filter((task) => (task.projectId || currentProjectId) === projectId),
      ...backlog.flatMap((section) => section.tasks || []),
      ...(archivedTasks || []).filter((task) => (task.projectId || currentProjectId) === projectId),
    ];
  }, [activeTasks, archivedTasks, backlogSections, currentProjectId, perProjectBacklog, projectId]);

  const handleSave = (draft) => {
    if (!canManageFields) return;
    if (editor?.field?.id) {
      updateCustomFieldDef(editor.field.id, draft);
      addToast(`Field "${draft.name.trim()}" updated`, "success");
    } else {
      createCustomFieldDef({ ...draft, projectId });
      addToast(`Field "${draft.name.trim()}" created`, "success");
    }
    setEditor(null);
  };

  const handleArchive = (def) => {
    archiveCustomFieldDef(def.id);
    addToast(`Field "${def.name}" archived. Values are kept and come back on restore.`, "info");
  };

  const handleRestore = (def) => {
    restoreCustomFieldDef(def.id);
    addToast(`Field "${def.name}" restored`, "success");
  };

  const handleDelete = (def) => {
    const affected = deleteCustomFieldDef(def.id);
    addToast(`Field "${def.name}" deleted${affected > 0 ? ` and removed from ${affected} task${affected === 1 ? "" : "s"}` : ""}`, "error");
  };

  return (
    <div className="space-y-4" data-testid="custom-fields-manager">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className={`${compact ? "text-sm" : "text-lg"} font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2`}>
            {!compact && <FaSlidersH className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
            Custom fields
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Extra fields for this project&apos;s tasks. Up to {MAX_CARD_FIELDS} can be shown on Kanban cards ({cardFieldCount}/{MAX_CARD_FIELDS} used).
          </p>
        </div>
        {canManageFields && (
          <button
            type="button"
            onClick={() => setEditor({ field: null })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            <FaPlus className="w-3 h-3" /> New field
          </button>
        )}
      </div>

      {!canManageFields && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Only people with the “Manage project custom fields” permission can change these fields.
        </div>
      )}

      {activeDefs.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center border border-dashed border-slate-200 dark:border-[#2a3044] rounded-lg">
          No custom fields yet.{canManageFields ? " Create one to capture things like severity, customer or environment." : ""}
        </p>
      ) : (
        <ul className="space-y-2" aria-label="Custom fields">
          {activeDefs.map((def, index) => (
            <FieldRow
              key={def.id}
              def={def}
              index={index}
              total={activeDefs.length}
              canManage={canManageFields}
              users={users}
              onEdit={(field) => setEditor({ field })}
              onMove={moveCustomFieldDef}
              onArchive={handleArchive}
            />
          ))}
        </ul>
      )}

      {archivedDefs.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowArchived((value) => !value)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            aria-expanded={showArchived}
          >
            {showArchived ? <FaChevronDown className="w-2.5 h-2.5" /> : <FaChevronRight className="w-2.5 h-2.5" />}
            Archived fields ({archivedDefs.length})
          </button>
          {showArchived && (
            <ul className="mt-2 space-y-2" aria-label="Archived custom fields">
              {archivedDefs.map((def) => (
                <ArchivedRow
                  key={def.id}
                  def={def}
                  valueCount={countTasksWithFieldValue(projectTasks, def.id)}
                  canManage={canManageFields}
                  onRestore={handleRestore}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {editor && (
        <CustomFieldDefModal
          open
          field={editor.field}
          projectId={projectId}
          existingDefs={allDefs}
          cardFieldCount={cardFieldCount}
          members={members}
          users={users}
          onSave={handleSave}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
