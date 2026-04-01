import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaBuilding, FaCheckCircle, FaClipboardList, FaDownload, FaEye, FaFileAlt, FaFolder, FaInfoCircle, FaPen, FaPlus, FaTimes, FaUserCircle, FaUserPlus } from "react-icons/fa";
import { useAuth } from "../../../shared/context/AuthContext";
import { useApp } from "../../../shared/context/AppContext";
import { useHR } from "../../../shared/context/HRContext";
import { Badge, Card } from "../components/HRSharedUI";

function AddDocumentModal({ open, onClose, onAdd }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("company");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setCategory("company");
    }
  }, [open]);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd({ name: name.trim(), category, status: null, actions: ["preview"] });
      onClose();
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
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Employment Contract" className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Category</label>
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClassName}>
                    <option value="company">Company</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-200 dark:border-[#2a3044] flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!name.trim() || saving} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTargetUserId("");
      setName("");
      setCategory("company");
      setRequiresSign(true);
    }
  }, [open]);

  const handleSave = async () => {
    if (!targetUserId || !name.trim() || saving) return;
    setSaving(true);
    try {
      await onAssign(targetUserId, {
        name: name.trim(),
        category,
        status: requiresSign ? "not_submitted" : null,
        actions: requiresSign ? ["sign", "preview"] : ["preview"],
      });
      onClose();
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
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">The document will appear in that user's Documents tab</p>
                </div>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Assign to</label>
                  <select value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} className={inputClassName}>
                    <option value="">Select employee…</option>
                    {[...new Map((users || []).map((user) => [user.id, user])).values()].map((user) => (
                      <option key={user.id} value={user.id}>{user.name || user.email || user.id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Document name</label>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. NDA Agreement" className={inputClassName} />
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
              </div>
              <div className="px-5 py-4 border-t border-slate-200 dark:border-[#2a3044] flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!targetUserId || !name.trim() || saving} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
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

export function DocumentsTab() {
  const { documents, updateDocumentStatus, addDocument, deleteDocument, assignDocumentToUser } = useHR();
  const { isAdmin } = useAuth();
  const { users } = useApp();
  const [addModal, setAddModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);

  const needsAttention = (documents || []).filter((document) => document.status === "not_submitted" || (!document.status && (document.actions || []).includes("sign")));
  const companyDocs = (documents || []).filter((document) => document.category === "company");
  const personalDocs = (documents || []).filter((document) => document.category === "personal");

  return (
    <div>
      <AddDocumentModal open={addModal} onClose={() => setAddModal(false)} onAdd={addDocument} />
      <AssignDocumentToUserModal open={assignModal} onClose={() => setAssignModal(false)} onAssign={assignDocumentToUser} users={users} />

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
                    <button onClick={() => updateDocumentStatus(document.id, { status: "signed" })} className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-200 border border-amber-400/40 px-2 py-1 rounded-lg hover:bg-amber-600/20 transition-colors">
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

      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Compliance documents", count: 0, icon: FaCheckCircle },
          { label: "From your company", count: companyDocs.length, icon: FaBuilding },
          { label: "Personal documents", count: personalDocs.length, icon: FaUserCircle },
        ].map(({ label, count, icon: Icon }) => (
          <Card key={label} className="p-4 flex items-center gap-3">
            <Icon className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{count}</p>
            </div>
          </Card>
        ))}
      </div>

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
                        <span className="text-[10px] text-slate-400 capitalize">{document.category}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {document.status === "signed" && <Badge color="green">Signed</Badge>}
                    {document.status === "not_submitted" && <Badge color="slate">Not Submitted</Badge>}
                    {!document.status && <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {(document.actions || []).includes("sign") && document.status !== "signed" && (
                        <button onClick={() => updateDocumentStatus(document.id, { status: "signed" })} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                          <FaPen className="w-2.5 h-2.5" /> Sign
                        </button>
                      )}
                      {(document.actions || []).includes("preview") && (
                        <button onClick={() => alert("No file attached to this document.")} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                          <FaEye className="w-2.5 h-2.5" /> Preview
                        </button>
                      )}
                      {(document.actions || []).includes("download") && (
                        <button onClick={() => alert("No file attached to this document.")} className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                          <FaDownload className="w-2.5 h-2.5" /> Download
                        </button>
                      )}
                      <button onClick={() => deleteDocument(document.id)} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded">
                        <FaTimes className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
