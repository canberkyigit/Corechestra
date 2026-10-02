import React, { useEffect, useState } from "react";
import { FaDollarSign, FaPlus, FaReceipt, FaTimes, FaUniversity } from "react-icons/fa";
import { useHR } from "../../../shared/context/HRContext";
import { useToast } from "../../../shared/context/ToastContext";
import { useConfirm } from "../../../shared/context/ConfirmContext";
import { Badge, Card } from "../components/HRSharedUI";
import { HRModal, hrPrimaryButton, hrSecondaryButton } from "../components/HRModal";
import { PayslipList } from "../components/PayslipList";
import { toLocalIsoDate } from "../utils/dates";
import { formatMoney } from "../utils/payslips";

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
      setDate(toLocalIsoDate());
    }
  }, [open]);

  const amountValid = Number(amount) > 0;

  const handleSave = async () => {
    if (!description.trim() || !amountValid || !date || saving) return;
    setSaving(true);
    try {
      await onAdd({ description: description.trim(), amount: Math.round(Number(amount) * 100) / 100, currency, category, date });
      onClose();
    } catch {
      // error toast shown by the caller
    } finally {
      setSaving(false);
    }
  };

  const inputClassName = "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const dirty = Boolean(description.trim() || amount !== "" || currency !== "USD" || category !== "Travel" || (date && date !== toLocalIsoDate()));

  return (
    <HRModal
      open={open}
      onClose={onClose}
      title="Add expense"
      size="sm"
      dirty={dirty}
      footer={(
        <>
          <button type="button" onClick={onClose} className={hrSecondaryButton}>Cancel</button>
          <button type="submit" form="add-expense-form" disabled={!description.trim() || !amountValid || !date || saving} className={hrPrimaryButton}>
            {saving ? "Adding..." : "Add"}
          </button>
        </>
      )}
    >
      <form id="add-expense-form" onSubmit={(event) => { event.preventDefault(); handleSave(); }} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Description</label>
          <input aria-label="Description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="e.g. Flight to London" className={inputClassName} data-autofocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Amount</label>
            <input type="number" min={0} step="0.01" aria-label="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className={inputClassName} />
          </div>
          <div>
            <label htmlFor="expense-currency" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Currency</label>
            <select id="expense-currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className={inputClassName}>
              {["USD","EUR","GBP","TRY","CHF"].map((value) => <option key={value}>{value}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="expense-category" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Category</label>
          <select id="expense-category" value={category} onChange={(event) => setCategory(event.target.value)} className={inputClassName}>
            {["Travel","Meals","Equipment","Software","Other"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="expense-date" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Date</label>
          <input id="expense-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClassName + " [color-scheme:light] dark:[color-scheme:dark]"} />
        </div>
      </form>
    </HRModal>
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
    } catch {
      // error toast shown by the caller
    } finally {
      setSaving(false);
    }
  };

  const inputClassName = "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-[#2a3044] bg-white dark:bg-[#232838] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const dirty = Boolean(bankName.trim() || holder.trim() || accountNumber.trim() || routing.trim());

  return (
    <HRModal
      open={open}
      onClose={onClose}
      title="Add bank account"
      size="sm"
      dirty={dirty}
      footer={(
        <>
          <button type="button" onClick={onClose} className={hrSecondaryButton}>Cancel</button>
          <button type="submit" form="add-bank-account-form" disabled={!bankName.trim() || !accountNumber.trim() || saving} className={hrPrimaryButton}>
            {saving ? "Adding..." : "Add"}
          </button>
        </>
      )}
    >
      <form id="add-bank-account-form" onSubmit={(event) => { event.preventDefault(); handleSave(); }} className="space-y-3">
        <div>
          <label htmlFor="bank-name" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Bank name</label>
          <input id="bank-name" value={bankName} onChange={(event) => setBankName(event.target.value)} placeholder="e.g. Chase" className={inputClassName} data-autofocus />
        </div>
        <div>
          <label htmlFor="bank-holder" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Account holder name</label>
          <input id="bank-holder" value={holder} onChange={(event) => setHolder(event.target.value)} placeholder="Full name on account" className={inputClassName} />
        </div>
        <div>
          <label htmlFor="bank-account-number" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Account number / IBAN</label>
          <input id="bank-account-number" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder="Account number" className={inputClassName} />
        </div>
        <div>
          <label htmlFor="bank-routing" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Routing / BIC / SWIFT (optional)</label>
          <input id="bank-routing" value={routing} onChange={(event) => setRouting(event.target.value)} placeholder="Routing number" className={inputClassName} />
        </div>
      </form>
    </HRModal>
  );
}

export function FinanceTab({ userName, setActiveTab }) {
  const { expenses, bankAccounts, addExpense, deleteExpense, addBankAccount, deleteBankAccount, setPrimaryBankAccount } = useHR();
  const { addToast } = useToast();
  const confirm = useConfirm();
  const [subTab, setSubTab] = useState("payslips");

  const run = async (action, successMessage, rethrow = false) => {
    try {
      await action();
      if (successMessage) addToast(successMessage, "success");
    } catch (error) {
      addToast(error.message || "Something went wrong", "error");
      if (rethrow) throw error;
    }
  };

  const handleAddExpense = (expense) => run(() => addExpense(expense), "Expense submitted for approval", true);
  const handleAddBank = (account) => run(() => addBankAccount(account), "Bank account added", true);
  const handleDeleteExpense = async (expense) => {
    const ok = await confirm({
      title: `Delete expense “${expense.description}”?`,
      description: "The expense report will be withdrawn and removed permanently.",
      confirmLabel: "Delete expense",
      tone: "danger",
    });
    if (!ok) return;
    run(() => deleteExpense(expense.id), "Expense deleted");
  };
  const handleDeleteBank = async (account) => {
    const ok = await confirm({
      title: `Remove ${account.bankName} account?`,
      description: `The account ending ${account.accountNumber?.slice(-4) || "····"} will no longer receive payments.`,
      confirmLabel: "Remove account",
      tone: "danger",
    });
    if (!ok) return;
    run(() => deleteBankAccount(account.id), "Bank account removed");
  };
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
      <AddExpenseModal open={expenseModal} onClose={() => setExpenseModal(false)} onAdd={handleAddExpense} />
      <AddBankAccountModal open={bankModal} onClose={() => setBankModal(false)} onAdd={handleAddBank} />

      <div className="flex items-center border-b border-slate-200 dark:border-[#2a3044] mb-5 gap-1">
        {subTabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSubTab(id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${subTab === id ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {subTab === "payslips" && (
        <PayslipList employeeName={userName} onOpenContract={setActiveTab ? () => setActiveTab("contract") : undefined} />
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
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200">{formatMoney(expense.amount, expense.currency)}</td>
                      <td className="px-4 py-3">
                        <span title={[expense.resolvedByName && `by ${expense.resolvedByName}`, expense.decisionNote].filter(Boolean).join(" · ") || undefined}>
                          <Badge color={statusColor[expense.status] || "slate"}>{expense.status || "pending"}</Badge>
                        </span>
                        {expense.status === "rejected" && expense.decisionNote && (
                          <p className="text-[10px] text-red-500 dark:text-red-400 mt-1 max-w-[180px] truncate">{expense.decisionNote}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {expense.status !== "approved" && (
                          <button onClick={() => handleDeleteExpense(expense)} aria-label={`Delete ${expense.description}`} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded">
                            <FaTimes className="w-3 h-3" />
                          </button>
                        )}
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
                        {account.isPrimary ? (
                          <Badge color="blue">Primary</Badge>
                        ) : (
                          <button type="button" onClick={() => run(() => setPrimaryBankAccount(account.id), `${account.bankName} is now your primary account`)} className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline">
                            Set as primary
                          </button>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteBank(account)} aria-label={`Remove ${account.bankName}`} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded">
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
