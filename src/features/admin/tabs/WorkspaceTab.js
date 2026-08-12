import React, { useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaWrench } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import {
  ACTION_PERMISSION_META,
  MODULE_PERMISSION_META,
  normalizePermissionMatrix,
} from "../../../shared/constants/permissions";
import { buildWorkspaceSetupState } from "../../../shared/utils/workspaceSetup";
import { WorkspaceSetupChecklist } from "../../../shared/components/WorkspaceSetupChecklist";
import { AppBadge, AppButton, AppDataCard, AppInput, AppSelect } from "../../../shared/components/AppPrimitives";
import { useAuth } from "../../../shared/context/AuthContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import { getAdminActionMessage, saveWorkspaceControls } from "../../../shared/services/adminFunctions";
import { isE2EMode } from "../../../shared/e2e/testMode";

function PermissionMatrixTable({ title, rows, matrix, scope, onToggle, canEditMatrix }) {
  return (
    <AppDataCard className="p-5">
      <div className="app-kicker mb-2">{scope === "modules" ? "Module Visibility" : "Action Control"}</div>
      <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h4>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-3 py-2">Permission</th>
              <th className="px-3 py-2">Admin</th>
              <th className="px-3 py-2">Member</th>
              <th className="px-3 py-2">Viewer</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-slate-200/80 dark:border-[#2a3044]">
                <td className="px-3 py-3">
                  <div className="font-medium text-slate-700 dark:text-slate-200">{row.label}</div>
                  {row.description && <div className="mt-1 text-xs app-subtle-copy">{row.description}</div>}
                </td>
                {["admin", "member", "viewer"].map((role) => (
                  <td key={role} className="px-3 py-3">
                    {(() => {
                      const lockedByRole = role === "admin" || (role === "viewer" && scope === "actions");
                      const disabled = !canEditMatrix || lockedByRole;
                      return <label className={`inline-flex items-center gap-2 ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={!!matrix?.[role]?.[scope]?.[row.key]}
                        onChange={() => onToggle(role, scope, row.key)}
                        disabled={disabled}
                        data-testid={`permission-${role}-${scope}-${row.key}`}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{role}</span>
                    </label>;
                    })()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppDataCard>
  );
}

function buildWorkspaceDraft(workspaceSettings, templateRegistry) {
  return {
    displayName: workspaceSettings?.displayName || "Corechestra Workspace",
    supportEmail: workspaceSettings?.supportEmail || "",
    onboardingMode: workspaceSettings?.onboardingMode || "guided",
    emptyStateHints: workspaceSettings?.emptyStateHints !== false,
    defaultTemplates: {
      doc: workspaceSettings?.defaultTemplates?.doc || templateRegistry?.doc?.[0]?.id || "",
      sprint: workspaceSettings?.defaultTemplates?.sprint || templateRegistry?.sprint?.[0]?.id || "",
      release: workspaceSettings?.defaultTemplates?.release || templateRegistry?.release?.[0]?.id || "",
      onboarding: workspaceSettings?.defaultTemplates?.onboarding || templateRegistry?.onboarding?.[0]?.id || "",
      approval: workspaceSettings?.defaultTemplates?.approval || templateRegistry?.approval?.[0]?.id || "",
      incident: workspaceSettings?.defaultTemplates?.incident || templateRegistry?.incident?.[0]?.id || "",
    },
    defaultProjectWorkflow: {
      requireReviewBeforeDone: workspaceSettings?.defaultProjectWorkflow?.requireReviewBeforeDone || false,
      captureBlockReason: workspaceSettings?.defaultProjectWorkflow?.captureBlockReason !== false,
      notifyOnBlocked: workspaceSettings?.defaultProjectWorkflow?.notifyOnBlocked !== false,
      allowBackwardMoves: workspaceSettings?.defaultProjectWorkflow?.allowBackwardMoves !== false,
    },
  };
}

function buildPolicyDraft(sensitiveActionPolicy) {
  return {
    requireConfirmation: sensitiveActionPolicy?.requireConfirmation !== false,
    requireAdminReason: !!sensitiveActionPolicy?.requireAdminReason,
    protectRoleChanges: sensitiveActionPolicy?.protectRoleChanges !== false,
    protectWorkspaceSettings: sensitiveActionPolicy?.protectWorkspaceSettings !== false,
  };
}

export function WorkspaceTab() {
  const {
    projects,
    users,
    teams,
    spaces,
    templateRegistry,
    permissionMatrix,
    setPermissionMatrix,
    workspaceSettings,
    setWorkspaceSettings,
    sensitiveActionPolicy,
    setSensitiveActionPolicy,
    logAuditEvent,
  } = useApp();
  const { addToast } = useToast();
  const { isAdmin } = useAuth();
  const { canPerform } = usePermissions();
  const canManageWorkspace = canPerform("workspace:manage");
  const canManageTemplates = canPerform("templates:manage");
  const e2eMode = isE2EMode();

  const normalizedMatrix = useMemo(
    () => normalizePermissionMatrix(permissionMatrix),
    [permissionMatrix]
  );

  const externalWorkspaceDraft = useMemo(
    () => buildWorkspaceDraft(workspaceSettings, templateRegistry),
    [templateRegistry, workspaceSettings]
  );
  const externalPolicyDraft = useMemo(
    () => buildPolicyDraft(sensitiveActionPolicy),
    [sensitiveActionPolicy]
  );
  const [workspaceDraft, setWorkspaceDraft] = useState(externalWorkspaceDraft);
  const [matrixDraft, setMatrixDraft] = useState(normalizedMatrix);
  const [policyDraft, setPolicyDraft] = useState(externalPolicyDraft);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (dirty) return;
    setWorkspaceDraft(externalWorkspaceDraft);
    setMatrixDraft(normalizedMatrix);
    setPolicyDraft(externalPolicyDraft);
  }, [dirty, externalPolicyDraft, externalWorkspaceDraft, normalizedMatrix]);

  const setup = useMemo(() => buildWorkspaceSetupState({
    projects,
    users,
    teams,
    spaces,
    templateRegistry,
    permissionMatrix: matrixDraft,
    workspaceSettings: workspaceDraft,
  }), [matrixDraft, projects, spaces, teams, templateRegistry, users, workspaceDraft]);

  const updateTemplateField = (field, value) => {
    setDirty(true);
    setWorkspaceDraft((prev) => ({
      ...prev,
      defaultTemplates: {
        ...prev.defaultTemplates,
        [field]: value,
      },
    }));
  };

  const toggleWorkflowRule = (key) => {
    setDirty(true);
    setWorkspaceDraft((prev) => ({
      ...prev,
      defaultProjectWorkflow: {
        ...prev.defaultProjectWorkflow,
        [key]: !prev.defaultProjectWorkflow[key],
      },
    }));
  };

  const toggleMatrixValue = (role, scope, key) => {
    if (!isAdmin || role === "admin" || (role === "viewer" && scope === "actions")) return;
    setDirty(true);
    setMatrixDraft((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [scope]: {
          ...prev[role][scope],
          [key]: !prev[role][scope][key],
        },
      },
    }));
  };

  const saveWorkspaceSettings = async () => {
    if (saving || (!canManageWorkspace && !canManageTemplates && !isAdmin)) return;
    if (policyDraft.requireConfirmation && policyDraft.protectWorkspaceSettings) {
      const confirmed = window.confirm("Save these workspace security and access changes?");
      if (!confirmed) return;
    }
    let reason = "";
    if (policyDraft.requireAdminReason && policyDraft.protectWorkspaceSettings) {
      reason = window.prompt("Reason for this workspace change:", "")?.trim() || "";
      if (!reason) {
        addToast("A change reason is required by workspace policy.", "error");
        return;
      }
    }

    setSaving(true);
    try {
      let saved = {
        workspaceSettings: workspaceDraft,
        permissionMatrix: normalizePermissionMatrix(matrixDraft),
        sensitiveActionPolicy: policyDraft,
      };
      if (!e2eMode) {
        saved = await saveWorkspaceControls({
          workspaceSettings: workspaceDraft,
          permissionMatrix: isAdmin ? matrixDraft : undefined,
          sensitiveActionPolicy: isAdmin ? policyDraft : undefined,
          reason,
        });
      } else {
        logAuditEvent?.("workspace.controls_updated", {
          entityType: "workspace",
          scope: "security",
          reason,
        });
      }

      setWorkspaceSettings(saved.workspaceSettings);
      setPermissionMatrix(saved.permissionMatrix);
      setSensitiveActionPolicy(saved.sensitiveActionPolicy);
      setWorkspaceDraft(saved.workspaceSettings);
      setMatrixDraft(normalizePermissionMatrix(saved.permissionMatrix));
      setPolicyDraft(buildPolicyDraft(saved.sensitiveActionPolicy));
      setDirty(false);
      addToast("Workspace controls saved and synced", "success");
    } catch (error) {
      addToast(getAdminActionMessage(error, "Workspace controls could not be saved."), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <WorkspaceSetupChecklist setup={setup} />

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <AppDataCard className="p-5">
          <div className="app-kicker mb-2">Workspace Identity</div>
          <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">Productize first-run settings</h4>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Workspace name</label>
              <AppInput value={workspaceDraft.displayName} disabled={!canManageWorkspace} onChange={(e) => { setDirty(true); setWorkspaceDraft((prev) => ({ ...prev, displayName: e.target.value })); }} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Support email</label>
              <AppInput type="email" value={workspaceDraft.supportEmail} disabled={!canManageWorkspace} onChange={(e) => { setDirty(true); setWorkspaceDraft((prev) => ({ ...prev, supportEmail: e.target.value })); }} placeholder="ops@company.com" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Onboarding mode</label>
              <AppSelect value={workspaceDraft.onboardingMode} disabled={!canManageWorkspace} onChange={(e) => { setDirty(true); setWorkspaceDraft((prev) => ({ ...prev, onboardingMode: e.target.value })); }}>
                <option value="guided">Guided setup</option>
                <option value="accelerated">Accelerated setup</option>
              </AppSelect>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-[#2a3044] bg-slate-50/70 dark:bg-[#151a27] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Show setup hints in empty states</div>
                  <div className="mt-1 text-xs app-subtle-copy">Helpful for first-time workspaces and pilot customers.</div>
                </div>
                <input
                  type="checkbox"
                  checked={workspaceDraft.emptyStateHints}
                  disabled={!canManageWorkspace}
                  onChange={() => { setDirty(true); setWorkspaceDraft((prev) => ({ ...prev, emptyStateHints: !prev.emptyStateHints })); }}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </AppDataCard>

        <AppDataCard className="p-5">
          <div className="app-kicker mb-2">Security Defaults</div>
          <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">Sensitive action protections</h4>
          <div className="mt-4 space-y-3">
            {[
              ["requireConfirmation", "Require confirmation for destructive changes", "Keep project deletes, role changes and critical updates gated behind an extra confirmation step."],
              ["protectRoleChanges", "Protect role changes", "Changing admin/member/viewer roles should always be treated as a security-sensitive action."],
              ["protectWorkspaceSettings", "Protect workspace configuration", "Template defaults and permission matrix changes are recorded as audited security events."],
              ["requireAdminReason", "Require admin reason", "Ask the acting admin to capture a change reason for role and workspace-security changes."],
            ].map(([key, title, description]) => (
              <label key={key} className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-[#2a3044] bg-slate-50/70 dark:bg-[#151a27] px-4 py-3">
                <input
                  type="checkbox"
                  checked={!!policyDraft[key]}
                  disabled={!isAdmin}
                  onChange={() => { setDirty(true); setPolicyDraft((prev) => ({ ...prev, [key]: !prev[key] })); }}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</div>
                  <div className="mt-1 text-xs app-subtle-copy">{description}</div>
                </div>
              </label>
            ))}
          </div>
        </AppDataCard>
      </div>

      <AppDataCard className="p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="app-kicker mb-2">Template Defaults</div>
            <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">Choose how new work starts</h4>
            <p className="mt-2 text-sm app-subtle-copy max-w-3xl">
              New projects, onboarding flows and release checklists inherit these defaults so the workspace feels intentional from day one.
            </p>
          </div>
          <AppBadge tone="blue">
            <FaWrench className="mr-1 inline-block h-3 w-3" />
            Defaults apply to newly created projects
          </AppBadge>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ["doc", "Documentation template", templateRegistry?.doc || []],
            ["sprint", "Sprint template", templateRegistry?.sprint || []],
            ["release", "Release template", templateRegistry?.release || []],
            ["onboarding", "Onboarding template", templateRegistry?.onboarding || []],
            ["approval", "Approval template", templateRegistry?.approval || []],
            ["incident", "Incident template", templateRegistry?.incident || []],
          ].map(([key, label, options]) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
              <AppSelect value={workspaceDraft.defaultTemplates[key]} disabled={!canManageTemplates} onChange={(e) => updateTemplateField(key, e.target.value)}>
                {options.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </AppSelect>
            </div>
          ))}
        </div>
      </AppDataCard>

      <AppDataCard className="p-5">
        <div className="app-kicker mb-2">Default Project Workflow</div>
        <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">New project behavior</h4>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[
            ["requireReviewBeforeDone", "Require review before done"],
            ["captureBlockReason", "Capture block reason"],
            ["notifyOnBlocked", "Notify when blocked"],
            ["allowBackwardMoves", "Allow backward moves"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-[#2a3044] bg-slate-50/70 dark:bg-[#151a27] px-4 py-3">
              <input
                type="checkbox"
                checked={!!workspaceDraft.defaultProjectWorkflow[key]}
                disabled={!canManageWorkspace}
                onChange={() => toggleWorkflowRule(key)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
            </label>
          ))}
        </div>
      </AppDataCard>

      <PermissionMatrixTable
        title="Module access by role"
        rows={MODULE_PERMISSION_META}
        matrix={matrixDraft}
        scope="modules"
        onToggle={toggleMatrixValue}
        canEditMatrix={isAdmin}
      />

      <PermissionMatrixTable
        title="Sensitive actions by role"
        rows={ACTION_PERMISSION_META}
        matrix={matrixDraft}
        scope="actions"
        onToggle={toggleMatrixValue}
        canEditMatrix={isAdmin}
      />

      <div className="flex justify-end">
        <AppButton
          onClick={saveWorkspaceSettings}
          disabled={saving || !dirty || (!canManageWorkspace && !canManageTemplates && !isAdmin)}
          data-testid="save-workspace-controls"
        >
          <FaCheckCircle className="w-3 h-3" /> {saving ? "Saving..." : "Save workspace controls"}
        </AppButton>
      </div>
    </div>
  );
}
