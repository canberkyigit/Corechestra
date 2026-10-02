import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaBuilding, FaCheckCircle, FaClipboardList, FaDownload, FaEye, FaFileAlt, FaFolder, FaInfoCircle, FaPen, FaPlus, FaTimes, FaUserCircle, FaUserPlus } from "react-icons/fa";
import { useAuth } from "../../../shared/context/AuthContext";
import { useApp } from "../../../shared/context/AppContext";
import { useHR } from "../../../shared/context/HRContext";
import { useToast } from "../../../shared/context/ToastContext";
import { Badge, Card, InfoRow } from "../components/HRSharedUI";
import { HRModal, hrInputClassName, hrPrimaryButton, hrSecondaryButton } from "../components/HRModal";
import { downloadTextFile, escapeHtml, isSafeHttpUrl, slugify } from "../utils/download";
import { formatShortDate } from "../utils/dates";
import { dedupeById } from "../utils/people";

function LinkField({ value, onChange, id }) {
  const invalid = value.trim() && !isSafeHttpUrl(value.trim());
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">File link (optional)</label>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://drive.example.com/…" className={hrInputClassName} />
      <p className={`text-[11px] mt-1 ${invalid ? "text-red-500" : "text-slate-400 dark:text-slate-500"}`}>
        {invalid ? "Enter a full http(s) link." : "File uploads are not available (no storage connected). Link to the file in your document system instead."}
      </p>
    </div>
  );
}

function AddDocumentModal({ open, onClose, onAdd }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("company");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setCategory("company");
      setUrl("");
    }
  }, [open]);

  const urlInvalid = !!url.trim() && !isSafeHttpUrl(url.trim());

  const handleSave = async () => {
    if (!name.trim() || saving || urlInvalid) return;
    setSaving(true);
    try {
      await onAdd({ name: name.trim(), category, status: null, actions: ["preview", "download"], url: url.trim() || null });
      onClose();
    } catch {
      // error toast shown by the caller
    } finally {
      setSaving(false);
    }
  };

  const inputClassName = "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div key="md" initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-sm bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a3044]" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#2a3044]">
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Add document</h2>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Document name</label>
                  <input aria-label="Document name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Employment Contract" className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Category</label>
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClassName}>
                    <option value="company">Company</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
                <LinkField id="add-document-link" value={url} onChange={setUrl} />
              </div>
              <div className="px-5 py-4 border-t border-slate-200 dark:border-[#2a3044] flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!name.trim() || saving || urlInvalid} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
                  {saving ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function AssignDocumentToUserModal({ open, onClose, onAssign, users }) {
  const [targetUserId, setTargetUserId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("company");
  const [requiresSign, setRequiresSign] = useState(true);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTargetUserId("");
      setName("");
      setCategory("company");
      setRequiresSign(true);
      setUrl("");
    }
  }, [open]);

  const urlInvalid = !!url.trim() && !isSafeHttpUrl(url.trim());

  const handleSave = async () => {
    if (!targetUserId || !name.trim() || saving || urlInvalid) return;
    const target = (users || []).find((user) => user.id === targetUserId) || { id: targetUserId };
    setSaving(true);
    try {
      await onAssign(target, {
        name: name.trim(),
        category,
        status: requiresSign ? "not_submitted" : null,
        actions: requiresSign ? ["sign", "preview", "download"] : ["preview", "download"],
        url: url.trim() || null,
      });
      onClose();
    } catch {
      // error toast shown by the caller
    } finally {
      setSaving(false);
    }
  };

  const inputClassName = "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div key="md" initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 16 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto w-full max-w-sm bg-white dark:bg-[#1a1f2e] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#2a3044]" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#2a3044]">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Assign document to user</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Delivered to the employee's Documents tab the next time they open the app</p>
                </div>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Assign to</label>
                  <select aria-label="Assign to" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} className={inputClassName}>
                    <option value="">Select employee…</option>
                    {dedupeById(users).map((user) => (
                      <option key={user.id} value={user.id}>{user.name || user.email || user.id}{user.email && user.name ? ` (${user.email})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Document name</label>
                  <input aria-label="Assigned document name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. NDA Agreement" className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Category</label>
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClassName}>
                    <option value="company">Company</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" checked={requiresSign} onChange={(event) => setRequiresSign(event.target.checked)} className="w-4 h-4 accent-blue-600" />
                  <span className="text-xs text-slate-700 dark:text-slate-300">Requires employee signature</span>
                </label>
                <LinkField id="assign-document-link" value={url} onChange={setUrl} />
              </div>
              <div className="px-5 py-4 border-t border-slate-200 dark:border-[#2a3044] flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!targetUserId || !name.trim() || saving || urlInvalid} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
                  {saving ? "Assigning…" : "Assign"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SignDocumentModal({ document, defaultName, onClose, onSign }) {
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (document) {
      setSignature(defaultName || "");
      setAgreed(false);
    }
  }, [defaultName, document]);

  const handleSign = async () => {
    if (!signature.trim() || !agreed || saving) return;
    setSaving(true);
    try {
      await onSign(document, signature.trim());
      onClose();
    } catch {
      // error toast shown by the caller
    } finally {
      setSaving(false);
    }
  };

  return (
    <HRModal
      open={!!document}
      onClose={onClose}
      title={document ? `Sign “${document.name}”` : ""}
      subtitle="Simple electronic acknowledgement — your typed name and the time are recorded."
      size="sm"
      footer={(
        <>
          <button type="button" onClick={onClose} className={hrSecondaryButton}>Cancel</button>
          <button type="button" onClick={handleSign} disabled={!signature.trim() || !agreed || saving} className={hrPrimaryButton}>
            {saving ? "Signing…" : "Sign document"}
          </button>
        </>
      )}
    >
      <div className="space-y-3">
        {document?.url && isSafeHttpUrl(document.url) && (
          <a href={document.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Open the document before signing</a>
        )}
        <div>
          <label htmlFor="signature-name" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Full name</label>
          <input id="signature-name" value={signature} onChange={(event) => setSignature(event.target.value)} className={hrInputClassName} />
        </div>
        <label className="flex items-start gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="mt-0.5 w-4 h-4 accent-blue-600" />
          <span className="text-xs text-slate-700 dark:text-slate-300">I have read this document and agree to sign it electronically.</span>
        </label>
      </div>
    </HRModal>
  );
}

export function buildDocumentRecordHtml(document) {
  const rows = [
    ["Document", document.name],
    ["Category", document.category],
    ["Status", document.status || "No action required"],
    ["Added", document.createdAt ? formatShortDate(document.createdAt) : "—"],
    ["Assigned by", document.assignedByName || (document.assignedBy ? "Admin" : "—")],
    ["Signed by", document.signedBy || "—"],
    ["Signed at", document.signedAt || "—"],
    ["File link", document.url || "No file attached"],
  ];
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(document.name)} — document record</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;color:#1e293b}td{padding:6px 12px;border-bottom:1px solid #e2e8f0}td:first-child{color:#64748b}</style></head>
<body><h1>${escapeHtml(document.name)}</h1><p>Document record exported from Corechestra HR. This file contains the record only; no uploaded file is stored in Corechestra.</p>
<table>${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join("")}</table>
<p style="color:#94a3b8;font-size:12px">Exported ${escapeHtml(new Date().toISOString())}</p></body></html>`;
}

function downloadRecord(document) {
  downloadTextFile(`${slugify(document.name)}-record.html`, buildDocumentRecordHtml(document), "text/html;charset=utf-8");
}

function DocumentPreviewModal({ document, onClose }) {
  return (
    <HRModal
      open={!!document}
      onClose={onClose}
      title={document?.name || ""}
      subtitle="Document record"
      size="md"
      footer={(
        <>
          <button type="button" onClick={onClose} className={hrSecondaryButton}>Close</button>
          {document && (
            <button type="button" onClick={() => downloadRecord(document)} className={hrPrimaryButton}>Download record</button>
          )}
        </>
      )}
    >
      {document && (
        <div>
          <div className="flex items-start gap-2 p-3 mb-3 rounded-lg bg-slate-50 dark:bg-[#232838]">
            <FaInfoCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500 dark:text-slate-400">No file is attached to this document. Corechestra has no file storage connected; add a file link when creating documents to open them from here.</p>
          </div>
          <InfoRow label="Category" value={<span className="capitalize">{document.category}</span>} />
          <InfoRow label="Status" value={document.status === "signed" ? "Signed" : document.status === "not_submitted" ? "Awaiting signature" : "No action required"} />
          <InfoRow label="Added" value={document.createdAt ? formatShortDate(document.createdAt) : "—"} />
          {document.assignedBy && <InfoRow label="Assigned by" value={document.assignedByName || "Admin"} />}
          {document.signedAt && <InfoRow label="Signed" value={`${document.signedBy || "—"} · ${formatShortDate(document.signedAt)}`} />}
        </div>
      )}
    </HRModal>
  );
}

export function DocumentsTab() {
  const {
    documents,
    updateDocumentStatus,
    addDocument,
    deleteDocument,
    assignDocumentToUser,
    pendingDocumentAssignments,
    cancelDocumentAssignment,
  } = useHR();
  const { isAdmin, profile, user } = useAuth();
  const { users } = useApp();
  const { addToast } = useToast();
  const [addModal, setAddModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [signTarget, setSignTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);

  const needsAttention = (documents || []).filter((document) => document.status === "not_submitted" || (!document.status && (document.actions || []).includes("sign")));
  const companyDocs = (documents || []).filter((document) => document.category === "company");
  const personalDocs = (documents || []).filter((document) => document.category === "personal");
  const complianceDocs = (documents || []).filter((document) => (document.actions || []).includes("sign"));
  const signedCompliance = complianceDocs.filter((document) => document.status === "signed").length;
  const defaultSignature = profile?.fullName || profile?.name || user?.email?.split("@")[0] || "";

  const run = async (action, successMessage) => {
    try {
      await action();
      if (successMessage) addToast(successMessage, "success");
    } catch (error) {
      addToast(error.message || "Something went wrong", "error");
      throw error;
    }
  };

  const handleAdd = (data) => run(() => addDocument(data), "Document added");
  const handleAssign = (target, data) => run(() => assignDocumentToUser(target, data), `Document assigned to ${target.name || target.email || "employee"}`);
  const handleSign = (document, signature) => run(
    () => updateDocumentStatus(document.id, { status: "signed", signedAt: new Date().toISOString(), signedBy: signature }),
    `${document.name} signed`,
  );
  const handleDelete = async (document) => {
    if (!window.confirm(`Delete “${document.name}”?`)) return;
    try {
      await run(() => deleteDocument(document.id), "Document deleted");
    } catch {
      // toast already shown
    }
  };
  const handleCancelAssignment = async (assignment) => {
    try {
      await run(() => cancelDocumentAssignment(assignment.id), "Assignment cancelled");
    } catch {
      // toast already shown
    }
  };

  const openDocument = (document) => {
    if (document.url && isSafeHttpUrl(document.url)) {
      window.open(document.url, "_blank", "noopener,noreferrer");
      return true;
    }
    return false;
  };
  const handlePreview = (document) => {
    if (!openDocument(document)) setPreviewTarget(document);
  };
  const handleDownload = (document) => {
    if (!openDocument(document)) downloadRecord(document);
  };

  const canDelete = (document) => !document.assignedBy || isAdmin;
  const actionButtonClass = "flex items-center gap-1.5 text-xs px-3 py-1.5 border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors";

  return (
    <div>
      <AddDocumentModal open={addModal} onClose={() => setAddModal(false)} onAdd={handleAdd} />
      <AssignDocumentToUserModal open={assignModal} onClose={() => setAssignModal(false)} onAssign={handleAssign} users={users} />
      <SignDocumentModal document={signTarget} defaultName={defaultSignature} onClose={() => setSignTarget(null)} onSign={handleSign} />
      <DocumentPreviewModal document={previewTarget} onClose={() => setPreviewTarget(null)} />

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Documents</h2>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button onClick={() => setAssignModal(true)} className="flex items-center gap-2 px-4 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium">
              <FaUserPlus className="w-3 h-3" /> Assign to user
            </button>
          )}
          <button onClick={() => setAddModal(true)} className="flex items-center gap-2 px-4 py-2 text-xs border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
            Add <FaPlus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {needsAttention.length > 0 && (
        <Card className="p-5 mb-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #78350f 0%, #92400e 100%)" }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <FaInfoCircle className="w-4 h-4 text-amber-300" />
              <h3 className="text-sm font-semibold text-amber-100">Documents requiring attention</h3>
            </div>
            <div className="flex items-start gap-3 flex-wrap">
              {needsAttention.map((document) => (
                <div key={document.id} className="p-3 bg-amber-700/40 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/30 flex items-center justify-center mb-2">
                    <FaClipboardList className="w-5 h-5 text-amber-200" />
                  </div>
                  <p className="text-xs font-medium text-amber-100">{document.name}</p>
                  {(document.actions || []).includes("sign") && document.status !== "signed" && (
                    <button onClick={() => setSignTarget(document)} className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-200 border border-amber-400/40 px-2 py-1 rounded-lg hover:bg-amber-600/20 transition-colors">
                      <FaPen className="w-2.5 h-2.5" /> Sign
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20">
            <FaFolder className="w-24 h-24 text-amber-300" />
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          { label: "Compliance documents signed", value: `${signedCompliance}/${complianceDocs.length}`, icon: FaCheckCircle },
          { label: "From your company", value: companyDocs.length, icon: FaBuilding },
          { label: "Personal documents", value: personalDocs.length, icon: FaUserCircle },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4 flex items-center gap-3">
            <Icon className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      {isAdmin && (pendingDocumentAssignments || []).length > 0 && (
        <Card className="p-4 mb-5" data-testid="pending-assignments">
          <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Awaiting delivery</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">These documents are delivered when the employee next signs in.</p>
          <div className="space-y-2">
            {pendingDocumentAssignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center gap-3 text-xs">
                <FaFileAlt className="w-3 h-3 text-slate-400" />
                <span className="flex-1 text-slate-700 dark:text-slate-200 truncate">
                  {assignment.document?.name} → {assignment.targetName || assignment.targetEmail || assignment.targetUserId}
                </span>
                <button type="button" onClick={() => handleCancelAssignment(assignment)} className="text-slate-400 hover:text-red-500">Cancel</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-[#2a3044]">
          <span className="text-xs text-slate-500 dark:text-slate-400">Total {(documents || []).length} items</span>
        </div>
        {(!documents || documents.length === 0) ? (
          <div className="py-12 text-center">
            <FaFolder className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No documents yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#2a3044]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">Document</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(documents || []).map((document) => (
                  <tr key={document.id} className="border-b border-slate-100 dark:border-[#2a3044]/50 last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <FaFileAlt className="w-3.5 h-3.5 text-blue-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-200">{document.name}</p>
                            {document.assignedBy && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 whitespace-nowrap">From admin</span>
                            )}
                          </div>
                          {document.subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400">{document.subtitle}</p>}
                          <span className="text-[10px] text-slate-400 capitalize">{document.category}{document.url ? " · linked file" : ""}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {document.status === "signed" && (
                        <span title={document.signedAt ? `Signed by ${document.signedBy || "—"} on ${formatShortDate(document.signedAt)}` : undefined}>
                          <Badge color="green">Signed</Badge>
                        </span>
                      )}
                      {document.status === "not_submitted" && <Badge color="slate">Not Submitted</Badge>}
                      {!document.status && <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {(document.actions || []).includes("sign") && document.status !== "signed" && (
                          <button onClick={() => setSignTarget(document)} className={actionButtonClass}>
                            <FaPen className="w-2.5 h-2.5" /> Sign
                          </button>
                        )}
                        {(document.actions || []).includes("preview") && (
                          <button onClick={() => handlePreview(document)} className={actionButtonClass}>
                            <FaEye className="w-2.5 h-2.5" /> Preview
                          </button>
                        )}
                        {(document.actions || []).includes("download") && (
                          <button onClick={() => handleDownload(document)} title={document.url ? "Open linked file" : "Download the document record"} className={actionButtonClass}>
                            <FaDownload className="w-2.5 h-2.5" /> Download
                          </button>
                        )}
                        {canDelete(document) && (
                          <button onClick={() => handleDelete(document)} aria-label={`Delete ${document.name}`} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded">
                            <FaTimes className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
