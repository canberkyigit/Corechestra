import React, { useMemo } from "react";
import { FaDownload, FaInfoCircle, FaReceipt } from "react-icons/fa";
import { useHR } from "../../../shared/context/HRContext";
import { Card } from "./HRSharedUI";
import { buildPayslipEstimates, formatMoney, payslipToText } from "../utils/payslips";
import { downloadTextFile } from "../utils/download";

/**
 * Estimated pay statements derived from the contract (no payroll integration exists).
 * Clearly labelled as estimates; each statement can be downloaded as a text record.
 */
export function PayslipList({ employeeName, onOpenContract, compact = false }) {
  const { employeeProfile, timeEntries } = useHR();
  const statements = useMemo(
    () => buildPayslipEstimates(employeeProfile, timeEntries, new Date(), compact ? 6 : 12),
    [compact, employeeProfile, timeEntries],
  );

  const handleDownload = (statement) => {
    downloadTextFile(
      `pay-statement-${statement.period}.txt`,
      payslipToText(statement, {
        employeeName,
        jobTitle: employeeProfile?.jobTitle,
        employeeNumber: employeeProfile?.employeeNumber,
      }),
    );
  };

  const notice = (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 mb-4">
      <FaInfoCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-amber-700 dark:text-amber-300">
        Estimated statements calculated from your contract details. No payroll system is connected, so these are not official payslips and exclude taxes and deductions.
      </p>
    </div>
  );

  if (statements.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center px-6">
        <FaReceipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">No pay statements yet</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          Estimated statements appear here once your contract has a salary and a start date, starting from the first completed month.
        </p>
        {onOpenContract && (
          <button type="button" onClick={onOpenContract} className="mt-4 text-xs text-blue-600 dark:text-blue-400 hover:underline">
            View contract details
          </button>
        )}
      </Card>
    );
  }

  return (
    <div>
      {notice}
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#2a3044]">
              {["Period", "Basis", "Estimated gross", ""].map((header) => (
                <th key={header} className="text-left px-4 py-3 text-xs font-medium text-slate-500 dark:text-slate-400">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {statements.map((statement) => (
              <tr key={statement.id} className="border-b border-slate-100 dark:border-[#2a3044]/50 last:border-0 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-200">{statement.label}</td>
                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{statement.basis}</td>
                <td className="px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200">{formatMoney(statement.gross, statement.currency)}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => handleDownload(statement)} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 border border-slate-200 dark:border-[#2a3044] rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#232838] transition-colors">
                    <FaDownload className="w-2.5 h-2.5" /> Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
