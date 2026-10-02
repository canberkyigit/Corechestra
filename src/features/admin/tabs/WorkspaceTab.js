import React, { useEffect, useMemo, useState } from "react";
import { FaCheckCircle, FaExclamationTriangle, FaLock, FaWrench } from "react-icons/fa";
import { useApp } from "../../../shared/context/AppContext";
import { useToast } from "../../../shared/context/ToastContext";
import { usePermissions } from "../../../shared/context/hooks/usePermissions";
import {
  ACTION_PERMISSION_META,
  MODULE_PERMISSION_META,
  getSensitiveAuditMeta,
  isLockedPermission,
  normalizePermissionMatrix,
  normalizeSensitiveActionPolicy,
  runSensitiveActionGate,
} from "../../../shared/constants/permissions";
import { buildWorkspaceSetupState } from "../../../shared/utils/workspaceSetup";
import { WorkspaceSetupChecklist } from "../../../shared/components/WorkspaceSetupChecklist";
import { AppBadge, AppButton, AppDataCard, AppInput, AppSelect } from "../../../shared/components/AppPrimitives";

const TEMPLATE_KINDS = ["doc", "sprint", "release", "onboarding", "approval", "incident"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function buildWorkspaceDraft(workspaceSettings, templateRegistry) {
  const settings = workspaceSettings || {};
  return {
    ...settings,
    displayName: settings.displayName || "Corechestra Workspace",
    supportEmail: settings.supportEmail || "",
    onboardingMode: settings.onboardingMode || "guided",
    emptyStateHints: settings.emptyStateHints !== false,
    defaultTemplates: Object.fromEntries(TEMPLATE_KINDS.map((kind) => [
      kind,
      settings.defaultTemplates?.[kind] || templateRegistry?.[kind]?.[0]?.id || "",
    ])),
    defaultProjectWorkflow: {
      requireReviewBeforeDone: settings.defaultProjectWorkflow?.requireReviewBeforeDone || false,
      captureBlockReason: settings.defaultProjectWorkflow?.captureBlockReason !== false,
      notifyOnBlocked: settings.defaultProjectWorkflow?.notifyOnBlocked !== false,
      allowBackwardMoves: settings.defaultProjectWorkflow?.allowBackwardMoves !== false,
    },
  };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function PermissionMatrixTable({ title, rows, matrix, scope, onToggle }) {
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
                {["admin", "member", "viewer"].map((role) => {
                  const locked = isLockedPermission(role, scope, row.key);
                  return (
                    <td key={role} className="px-3 py-3">
                      <label
                        className={`inline-flex items-center gap-2 ${locked ? "cursor-not-allowed" : "cursor-pointer"}`}
                        title={locked ? "Always on for admins — prevents locking every admin out" : undefined}
                      >
                        <input
                          type="checkbox"
                          checked={locked || !!matrix?.[role]?.[scope]?.[row.key]}
                          disabled={locked}
                          onChange={() => onToggle(role, scope, row.key)}
                          data-testid={`perm-${scope}-${role}-${row.key}`}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                        />
                        <span className="text-xs text-slate-500 dark:text-slate-400">{role}</span>
                        {locked && <FaLock className="h-2.5 w-2.5 text-slate-400" />}
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppDataCard>
  );
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
  const { canPerform } = usePermissions();
  const canManageTemplates = canPerform("templates:manage");

  const normalizedMatrix = useMemo(
    () => normalizePermissionMatrix(permissionMatrix),
    [permissionMatrix]
  );
  const storedWorkspaceDraft = useMemo(
    () => buildWorkspaceDraft(workspaceSettings, templateRegistry),
    [templateRegistry, workspaceSettings]
  );
  const storedPolicy = useMemo(
    () => normalizeSensitiveActionPolicy(sensitiveActionPolicy),
    [sensitiveActionPolicy]
  );
  // Fingerprint of the persisted values the drafts were built from.
  const sourceSignature = useMemo(
    () => JSON.stringify([storedWorkspaceDraft, normalizedMatrix, storedPolicy]),
    [normalizedMatrix, storedPolicy, storedWorkspaceDraft]
  );

  const [workspaceDraft, setWorkspaceDraft] = useState(storedWorkspaceDraft);
  const [matrixDraft, setMatrixDraft] = useState(normalizedMatrix);
  const [policyDraft, setPolicyDraft] = useState(storedPolicy);
  const [baseSignature, setBaseSignature] = useState(sourceSignature);
  const [dirty, setDirty] = useState(false);
  const [remoteChanged, setRemoteChanged] = useState(false);

  const loadLatest = () => {
    setWorkspaceDraft(storedWorkspaceDraft);
    setMatrixDraft(normalizedMatrix);
    setPolicyDraft(storedPolicy);
    setBaseSignature(sourceSignature);
    setDirty(false);
    setRemoteChanged(false);
  };

  // Drafts follow the store while untouched; with local edits we only flag the remote change.
  useEffect(() => {
    if (sourceSignature === baseSignature) return;
    if (!dirty) {
      setWorkspaceDraft(storedWorkspaceDraft);
      setMatrixDraft(normalizedMatrix);
      setPolicyDraft(storedPolicy);
      setBaseSignature(sourceSignature);
      setRemoteChanged(false);
    } else {
      setRemoteChanged(true);
    }
  }, [baseSignature, dirty, normalizedMatrix, sourceSignature, storedPolicy, storedWorkspaceDraft]);

  const editWorkspace = (updater) => { setDirty(true); setWorkspaceDraft(updater); };
  const editPolicy = (updater) => { setDirty(true); setPolicyDraft(updater); };

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
    if (!canManageTemplates) return;
    editWorkspace((prev) => ({
      ...prev,
      defaultTemplates: {
        ...prev.defaultTemplates,
        [field]: value,
      },
    }));
  };

  const toggleWorkflowRule = (key) => {
    editWorkspace((prev) => ({
      ...prev,
      defaultProjectWorkflow: {
        ...prev.defaultProjectWorkflow,
        [key]: !prev.defaultProjectWorkflow[key],
      },
    }));
  };

  const toggleMatrixValue = (role, scope, key) => {
    if (isLockedPermission(role, scope, key)) return;
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

  const supportEmailInvalid = !!workspaceDraft.supportEmail && !EMAIL_RE.test(workspaceDraft.supportEmail.trim());

  const saveWorkspaceSettings = () => {
    if (supportEmailInvalid) {
      addToast("Support email is not a valid email address.", "error");
      return;
    }
    const nextWorkspace = {
      ...workspaceDraft,
      supportEmail: workspaceDraft.supportEmail.trim(),
      displayName: workspaceDraft.displayName.trim() || "Corechestra Workspace",
      // Only admins with "Manage default templates" may change template defaults.
      defaultTemplates: canManageTemplates ? workspaceDraft.defaultTemplates : storedWorkspaceDraft.defaultTemplates,
    };
    const nextMatrix = normalizePermissionMatrix(matrixDraft);
    const changedSections = [
      !same({ ...nextWorkspace, defaultTemplates: null }, { ...storedWorkspaceDraft, defaultTemplates: null }) && "workspace",
      !same(nextWorkspace.defaultTemplates, storedWorkspaceDraft.defaultTemplates) && "templates",
      !same(nextMatrix, normalizedMatrix) && "permissions",
      !same(policyDraft, storedPolicy) && "policy",
    ].filter(Boolean);

    if (changedSections.length === 0) {
      addToast("No changes to save.", "info");
      setDirty(false);
      return;
    }

    const securitySensitive = changedSections.some((section) => section !== "workspace");
    let reason = "";
    if (securitySensitive) {
      // Uses the currently stored policy (not the draft) so a policy cannot waive its own gate.
      const gate = runSensitiveActionGate(
        storedPolicy,
        "workspace",
        `Save ${changedSections.join(", ")} changes? Permission and security changes apply to every user immediately.`
      );
      if (!gate.ok) {
        if (gate.missingReason) addToast("A reason is required for workspace security changes.", "warning");
        return;
      }
      reason = gate.reason;
    }

    setWorkspaceSettings(nextWorkspace);
    setPermissionMatrix(nextMatrix);
    setSensitiveActionPolicy(policyDraft);
    logAuditEvent?.("workspace_security_updated", {
      entityType: "workspace",
      ...(securitySensitive
        ? getSensitiveAuditMeta(storedPolicy, "workspace")
        : { scope: "workspace", severity: "info" }),
      changedSections,
      ...(reason ? { reason } : {}),
      settings: {
        displayName: nextWorkspace.displayName,
        onboardingMode: nextWorkspace.onboardingMode,
      },
    });
    setDirty(false);
    setRemoteChanged(false);
    addToast("Workspace settings saved", "success");
  };

  return (
    <div className="space-y-5">
      <WorkspaceSetupChecklist setup={setup} />

      {remoteChanged && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300"
        >
          <FaExclamationTriangle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 min-w-48">Workspace settings were changed elsewhere while you were editing. Saving now overwrites those changes.</span>
          <AppButton variant="secondary" onClick={loadLatest}>Load latest</AppButton>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <AppDataCard className="p-5">
          <div className="app-kicker mb-2">Workspace Identity</div>
          <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">Productize first-run settings</h4>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Workspace name</label>
              <AppInput value={workspaceDraft.displayName} onChange={(e) => editWorkspace((prev) => ({ ...prev, displayName: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Support email</label>
              <AppInput type="email" value={workspaceDraft.supportEmail} onChange={(e) => editWorkspace((prev) => ({ ...prev, supportEmail: e.target.value }))} placeholder="ops@company.com" aria-invalid={supportEmailInvalid} />
              {supportEmailInvalid
                ? <p className="mt-1 text-[11px] text-red-500">Enter a valid email address.</p>
                : <p className="mt-1 text-[11px] app-subtle-copy">Shown to members on their profile page as the help contact.</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Onboarding mode</label>
              <AppSelect value={workspaceDraft.onboardingMode} onChange={(e) => editWorkspace((prev) => ({ ...prev, onboardingMode: e.target.value }))}>
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
                  onChange={() => editWorkspace((prev) => ({ ...prev, emptyStateHints: !prev.emptyStateHints }))}
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
              ["requireConfirmation", "Require confirmation for destructive changes", "Ask for confirmation before deleting or deactivating people, projects and teams, and before role changes."],
              ["protectRoleChanges", "Protect role changes", "Role changes always need confirmation and are audited as security warnings."],
              ["protectWorkspaceSettings", "Protect workspace configuration", "Permission matrix, policy and template changes need confirmation and are audited as security events."],
              ["requireAdminReason", "Require admin reason", "Ask the acting admin for a written reason on role and workspace-security changes (stored in the audit log)."],
            ].map(([key, title, description]) => (
              <label key={key} className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-[#2a3044] bg-slate-50/70 dark:bg-[#151a27] px-4 py-3">
                <input
                  type="checkbox"
                  checked={!!policyDraft[key]}
                  onChange={() => editPolicy((prev) => ({ ...prev, [key]: !prev[key] }))}
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
          <AppBadge tone={canManageTemplates ? "blue" : "neutral"}>
            {canManageTemplates ? <FaWrench className="mr-1 inline-block h-3 w-3" /> : <FaLock className="mr-1 inline-block h-3 w-3" />}
            {canManageTemplates ? "Defaults apply to newly created projects" : "Requires “Manage default templates”"}
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
              <AppSelect value={workspaceDraft.defaultTemplates[key]} onChange={(e) => updateTemplateField(key, e.target.value)} disabled={!canManageTemplates}>
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
      />

      <PermissionMatrixTable
        title="Sensitive actions by role"
        rows={ACTION_PERMISSION_META}
        matrix={matrixDraft}
        scope="actions"
        onToggle={toggleMatrixValue}
      />

      <div className="flex flex-wrap items-center justify-end gap-3">
        {dirty && <span className="text-xs app-subtle-copy">Unsaved changes</span>}
        {dirty && (
          <AppButton variant="secondary" onClick={loadLatest}>Discard changes</AppButton>
        )}
        <AppButton onClick={saveWorkspaceSettings} disabled={supportEmailInvalid}>
          <FaCheckCircle className="w-3 h-3" /> Save workspace controls
        </AppButton>
      </div>
    </div>
  );
}
