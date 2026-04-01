import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FaDollarSign, FaPlus, FaReceipt, FaTimes, FaUniversity } from "react-icons/fa";
import { useHR } from "../../../shared/context/HRContext";
import { Badge, Card } from "../components/HRSharedUI";

function AddExpenseModal({ open, onClose, onAdd }) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("Travel");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDescription("");
      setAmount("");
      setCurrency("USD");
      setCategory("Travel");
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [open]);

  const handleSave = async () => {
    if (!description.trim() || !amount || saving) return;
    setSaving(true);
    try {
      await onAdd({ description: description.trim(), amount: Number(amount), currency, category, date });
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
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Add expense</h2>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Description</label>
                  <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Flight to London" className={inputClassName} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Amount</label>
                    <input type="number" min={0} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className={inputClassName} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Currency</label>
                    <select value={currency} onChange={(event) => setCurrency(event.target.value)} className={inputClassName}>
                      {["USD","EUR","GBP","TRY","CHF"].map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Category</label>
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClassName}>
                    {["Travel","Meals","Equipment","Software","Other"].map((value) => <option key={value}>{value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Date</label>
                  <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClassName + " [color-scheme:light] dark:[color-scheme:dark]"} />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-200 dark:border-[#2a3044] flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!description.trim() || !amount || saving} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
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

function AddBankAccountModal({ open, onClose, onAdd }) {
  const [bankName, setBankName] = useState("");
  const [holder, setHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routing, setRouting] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setBankName("");
      setHolder("");
      setAccountNumber("");
      setRouting("");
    }
  }, [open]);

  const handleSave = async () => {
    if (!bankName.trim() || !accountNumber.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd({
        bankName: bankName.trim(),
        accountHolder: holder.trim(),
        accountNumber: accountNumber.trim(),
        routingNumber: routing.trim(),
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
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Add bank account</h2>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#232838] transition-colors">
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Bank name</label>
                  <input value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="e.g. Chase" className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Account holder name</label>
                  <input value={holder} onChange={(event) => setHolder(event.target.value)} placeholder="Full name on account" className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Account number / IBAN</label>
                  <input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="Account number" className={inputClassName} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Routing / BIC / SWIFT (optional)</label>
                  <input value={routing} onChange={(event) => setRouting(event.target.value)} placeholder="Routing number" className={inputClassName} />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-slate-200 dark:border-[#2a3044] flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-[#2a3044] rounded-lg hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!bankName.trim() || !accountNumber.trim() || saving} className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium">
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

export function FinanceTab() {
  const { expenses, bankAccounts, addExpense, deleteExpense, addBankAccount, deleteBankAccount } = useHR();
  const [subTab, setSubTab] = useState("payslips");
  const [expenseModal, setExpenseModal] = useState(false);
  const [bankModal, setBankModal] = useState(false);

  const subTabs = [
    { id: "payslips", label: "Payslips and payments", icon: FaReceipt },
    { id: "expenses", label: "Expenses", icon: FaDollarSign },
    { id: "bank", label: "Bank accounts", icon: FaUniversity },
  ];

  const statusColor = { pending: "amber", approved: "green", rejected: "red" };

  return (
    <div>
      <AddExpenseModal open={expenseModal} onClose={() => setExpenseModal(false)} onAdd={addExpense} />
      <AddBankAccountModal open={bankModal} onClose={() => setBankModal(false)} onAdd={addBankAccount} />

      <div className="flex items-center border-b border-slate-200 dark:border-[#2a3044] mb-5 gap-1">
        {subTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSubTab(id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${subTab === id ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {subTab === "payslips" && (
        <Card className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 mb-4 opacity-40">
            <svg viewBox="0 0 100 100" fill="none" className="w-full h-full">
              <circle cx="50" cy="45" r="30" stroke="#6366f1" strokeWidth="3" fill="none" />
              <path d="M35 55 Q50 30 65 55" stroke="#a78bfa" strokeWidth="2.5" fill="none" />
              <circle cx="50" cy="42" r="4" fill="#6366f1" />
              <path d="M40 75 Q50 68 60 75" stroke="#6366f1" strokeWidth="2" fill="none" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">No payslips or payments yet</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">Once you complete a cycle you'll find your payslip and payment information here</p>
        </Card>
      )}

      {subTab === "expenses" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{(expenses || []).length} expense{(expenses || []).length !== 1 ? "s" : ""}</span>
            <button onClick={() => setExpenseModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
              <FaPlus className="w-3 h-3" /> Add expense
            </button>
          </div>
          {(!expenses || expenses.length === 0) ? (
            <Card className="flex flex-col items-center justify-center py-20 text-center">
              <FaReceipt className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">No expenses yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">Submit expense reports for reimbursement</p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#2a3044]">
                    {["Date","Description","Category","Amount","Status",""].map((header) => (
                      <th key={header} className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(expenses || []).map((expense) => (
                    <tr key={expense.id} className="border-b border-slate-100 dark:border-[#2a3044]/50 last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{expense.date}</td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-200">{expense.description}</td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{expense.category}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200">{expense.currency} {expense.amount}</td>
                      <td className="px-4 py-3"><Badge color={statusColor[expense.status] || "slate"}>{expense.status}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => deleteExpense(expense.id)} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded">
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {subTab === "bank" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{(bankAccounts || []).length} account{(bankAccounts || []).length !== 1 ? "s" : ""}</span>
            <button onClick={() => setBankModal(true)} className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
              <FaPlus className="w-3 h-3" /> Add bank account
            </button>
          </div>
          {(!bankAccounts || bankAccounts.length === 0) ? (
            <Card className="flex flex-col items-center justify-center py-20 text-center">
              <FaUniversity className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">No bank accounts added</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">Add your bank account to receive payments</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(bankAccounts || []).map((account) => (
                <Card key={account.id} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                        <FaUniversity className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{account.bankName}</p>
                        {account.isPrimary && <Badge color="blue">Primary</Badge>}
                      </div>
                    </div>
                    <button onClick={() => deleteBankAccount(account.id)} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded">
                      <FaTimes className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{account.accountHolder}</p>
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-1">···· {account.accountNumber?.slice(-4) || "····"}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
