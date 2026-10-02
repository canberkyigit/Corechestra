import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { TESTS_TAB_IDS } from "../constants/testingConstants";

/**
 * URL-addressable navigation state for the Tests module:
 * `?tab=<tab>&case=<caseId>&run=<runId>&folder=<suiteId>&report=<kind:id>`.
 * Tab switches push history entries; drawers/overlays replace the entry.
 */
export function useTestsUrlState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get("tab");
  const tab = TESTS_TAB_IDS.includes(rawTab) ? rawTab : "overview";
  const caseId = searchParams.get("case");
  const runId = searchParams.get("run");
  const folderId = searchParams.get("folder");
  const cycleId = searchParams.get("cycle");
  const report = searchParams.get("report");
  const focusCaseId = searchParams.get("at");

  const update = useCallback((patch, { replace = true } = {}) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      });
      return next;
    }, { replace });
  }, [setSearchParams]);

  return useMemo(() => ({
    tab,
    caseId,
    runId,
    folderId,
    cycleId,
    report,
    focusCaseId,
    setTab: (nextTab) => update({ tab: nextTab === "overview" ? null : nextTab }, { replace: false }),
    openCase: (id) => update({ case: id }),
    closeCase: () => update({ case: null }),
    openRunner: (id, atCaseId = null) => update({ run: id, at: atCaseId, case: null }, { replace: false }),
    closeRunner: () => update({ run: null, at: null }),
    setFolder: (id) => update({ folder: id }),
    openCycle: (id) => update({ cycle: id }),
    closeCycle: () => update({ cycle: null }),
    setReport: (value) => update({ report: value }),
    update,
  }), [tab, caseId, runId, folderId, cycleId, report, focusCaseId, update]);
}
