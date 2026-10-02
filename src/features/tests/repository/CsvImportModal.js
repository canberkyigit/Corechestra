import React, { useMemo, useState } from "react";
import { FaFileCsv, FaUpload } from "react-icons/fa";
import { BTN_PRIMARY, BTN_SECONDARY, CASE_TYPE_LABELS, FIELD, PRIORITY_META } from "../constants/testingConstants";
import FolderSelect from "../components/FolderSelect";
import { Field, Modal } from "../components/ui";
import { CASE_CSV_COLUMNS } from "../utils/testingCsv";
import { readFileAsText } from "../utils/testingExport";

const SAMPLE_CSV = `Title,Folder,Priority,Type,Automation,Status,Tags,Preconditions,Steps,Expected Result
"Login with SSO",Web App / Authentication,High,Integration,Manual,Ready,"sso, auth","SSO configured","1. Click Continue with Google | | Consent screen opens
2. Choose account | qa@acme.test | Signed in",User lands on the board`;

/** CSV import: upload or paste → preview with warnings → import into folders. */
export default function CsvImportModal({ ws, defaultSuiteId, onClose }) {
  const { data, actions } = ws;
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [target, setTarget] = useState(defaultSuiteId || data.tree.roots[0]?.id || null);
  const parsed = useMemo(() => (text.trim() ? actions.previewCsv(text) : null), [text, actions]);
  const rows = useMemo(() => parsed?.rows || [], [parsed]);
  const needsTarget = rows.some((row) => !row.folderPath.length);
  const newFolders = useMemo(() => {
    const names = new Set();
    rows.forEach((row) => { if (row.folderPath.length) names.add(row.folderPath.join(" / ")); });
    return [...names];
  }, [rows]);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      setText(await readFileAsText(file));
    } catch {
      setText("");
    }
  };

  const submit = () => {
    const result = actions.importCsv(rows, target);
    if (result) onClose();
  };

  return (
    <Modal
      title="Import test cases from CSV"
      subtitle="TestRail / Xray style columns. Folders in the “Folder” column are matched by name or created."
      size="lg"
      onClose={onClose}
      testId="tests-csv-import"
      footer={(
        <>
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>Cancel</button>
          <button type="button" onClick={submit} disabled={!rows.length || (needsTarget && !target) || parsed?.errors?.length > 0} className={BTN_PRIMARY} data-testid="tests-csv-submit">
            Import {rows.length ? `${rows.length} case${rows.length !== 1 ? "s" : ""}` : ""}
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className={`${BTN_SECONDARY} cursor-pointer`}>
            <FaUpload className="h-3 w-3" /> Choose file
            <input type="file" accept=".csv,text/csv" onChange={onFile} className="sr-only" data-testid="tests-csv-file" />
          </label>
          {fileName && <span className="inline-flex items-center gap-1.5 text-sm text-slate-700"><FaFileCsv className="h-3.5 w-3.5 text-emerald-600" />{fileName}</span>}
          <button type="button" onClick={() => setText(SAMPLE_CSV)} className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">Use an example</button>
        </div>
        <Field label="…or paste CSV" htmlFor="tests-csv-text" hint={`Supported columns: ${CASE_CSV_COLUMNS.filter((column) => column !== "ID").join(", ")}. Steps: one per line, “action | data | expected”.`}>
          <textarea id="tests-csv-text" rows={6} value={text} onChange={(event) => setText(event.target.value)} className={`${FIELD} font-mono text-xs`} placeholder="Title,Folder,Priority,Steps…" data-testid="tests-csv-text" />
        </Field>
        <Field label="Target folder for rows without a folder" htmlFor="tests-csv-target">
          <FolderSelect id="tests-csv-target" tree={data.tree} value={target} onChange={setTarget} allowEmpty placeholder="— choose —" className={`${FIELD} h-9 py-0`} />
        </Field>

        {parsed?.errors?.length > 0 && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {parsed.errors.map((error) => <p key={`${error.line}-${error.message}`}>Line {error.line}: {error.message}</p>)}
          </div>
        )}
        {parsed?.warnings?.length > 0 && (
          <details className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            <summary className="cursor-pointer font-medium">{parsed.warnings.length} warning{parsed.warnings.length !== 1 ? "s" : ""}</summary>
            <ul className="mt-1 space-y-0.5 text-xs">{parsed.warnings.slice(0, 30).map((warning) => <li key={`${warning.line}-${warning.message}`}>Line {warning.line}: {warning.message}</li>)}</ul>
          </details>
        )}
        {rows.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
              <span>Preview · {rows.length} case{rows.length !== 1 ? "s" : ""}</span>
              {newFolders.length > 0 && <span>{newFolders.length} folder path{newFolders.length !== 1 ? "s" : ""} referenced</span>}
            </div>
            <div className="max-h-64 overflow-auto rounded-lg border border-slate-200/80 dark:border-[#252b3b]">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50/95 text-[11px] uppercase tracking-[0.06em] text-slate-500 dark:bg-[#161a25]">
                  <tr><th className="px-2.5 py-2">Title</th><th className="px-2.5 py-2">Folder</th><th className="px-2.5 py-2">Priority</th><th className="px-2.5 py-2">Type</th><th className="px-2.5 py-2">Steps</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 dark:divide-[#252b3b]">
                  {rows.slice(0, 100).map((row) => (
                    <tr key={row.line}>
                      <td className="max-w-[240px] truncate px-2.5 py-1.5 text-slate-800">{row.title}</td>
                      <td className="max-w-[200px] truncate px-2.5 py-1.5 text-slate-600">{row.folderPath.join(" › ") || <i className="text-slate-500">target folder</i>}</td>
                      <td className="px-2.5 py-1.5 text-slate-600">{PRIORITY_META[row.priority]?.label}</td>
                      <td className="px-2.5 py-1.5 text-slate-600">{CASE_TYPE_LABELS[row.type]}</td>
                      <td className="px-2.5 py-1.5 tabular-nums text-slate-600">{row.steps.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
