import { computeVacationBalance, countBusinessDays, getTimeOffKind } from "../utils/timeOff";
import { buildOrgCsvRows, buildOrgLayout, buildTreeFromUsers, filterUsersForView, findParentByKey } from "../utils/orgChart";
import { buildPayslipEstimates, formatMoney } from "../utils/payslips";
import { buildTimeEntry, summarizeMonth } from "../tabs/TimeTrackingTab";
import { toCsv, isSafeHttpUrl } from "../utils/download";
import { buildEmployeeHistory } from "../utils/hrHistory";

describe("time off utils", () => {
  it("normalises stored type labels case-insensitively", () => {
    expect(getTimeOffKind("Vacation")).toBe("vacation");
    expect(getTimeOffKind("Sick leave")).toBe("sick");
    expect(getTimeOffKind("sick")).toBe("sick");
    expect(getTimeOffKind("Parental leave")).toBe("parental");
    expect(getTimeOffKind("Bereavement leave")).toBe("other");
    expect(getTimeOffKind("")).toBeNull();
  });

  it("counts working days excluding weekends and holidays", () => {
    // Mon 2026-10-26 → Sun 2026-11-01 with Republic Day on Thu 29th
    expect(countBusinessDays("2026-10-26", "2026-11-01", ["2026-10-29"])).toBe(4);
    expect(countBusinessDays("2026-10-31", "2026-10-26")).toBe(0);
  });

  it("deducts only approved vacation from the allowance", () => {
    const balance = computeVacationBalance([
      { type: "Vacation", fromDate: "2026-10-05", toDate: "2026-10-09", status: "approved" },
      { type: "Vacation", fromDate: "2026-11-02", toDate: "2026-11-03", status: "pending" },
      { type: "Vacation", fromDate: "2026-12-01", toDate: "2026-12-01", status: "rejected" },
      { type: "Sick leave", fromDate: "2026-10-12", toDate: "2026-10-12", status: "approved" },
    ], 20, 2026);
    expect(balance).toEqual({ total: 20, used: 5, pending: 2, remaining: 15 });
    expect(computeVacationBalance([], undefined, 2026).total).toBe(20);
  });
});

describe("org chart utils", () => {
  const users = [
    { id: "a", name: "Same Name" },
    { id: "b", name: "Same Name", managerId: "a" },
    { id: "c", name: "Cy", managerId: "d" },
    { id: "d", name: "Dee", managerId: "c" },
  ];

  it("keys nodes by id and keeps managerId cycles visible", () => {
    const tree = buildTreeFromUsers(users, "b");
    const layout = buildOrgLayout(tree);
    expect(layout.nodes.map((node) => node.key).sort()).toEqual(["__organization__", "a", "b", "c", "d"]);
    expect(findParentByKey(tree, "b").key).toBe("a");
    expect(layout.nodes.find((node) => node.key === "b").isMe).toBe(true);
    expect(layout.nodes.find((node) => node.key === "c").inCycle).toBe(true);
    expect(layout.edges.some((edge) => edge.fromKey === "a" && edge.toKey === "b")).toBe(true);
  });

  it("returns null without any hierarchy", () => {
    expect(buildTreeFromUsers([{ id: "x" }, { id: "y" }])).toBeNull();
    expect(buildTreeFromUsers([{ id: "x" }], null, { allowFlat: true }).key).toBe("x");
  });

  it("filters to my chain and reports", () => {
    const org = [
      { id: "ceo" },
      { id: "vp", managerId: "ceo" },
      { id: "me", managerId: "vp" },
      { id: "report", managerId: "me" },
      { id: "peer", managerId: "vp" },
      { id: "grandchild", managerId: "report" },
    ];
    expect(filterUsersForView(org, "mine", { currentUserId: "me" }).map((user) => user.id).sort()).toEqual(["ceo", "me", "report", "vp"]);
    expect(filterUsersForView(org, "focus", { focusUserId: "me" }).map((user) => user.id).sort()).toEqual(["ceo", "grandchild", "me", "report", "vp"]);
  });

  it("builds CSV rows with manager names", () => {
    const rows = buildOrgCsvRows([{ id: "a", name: "Ann" }, { id: "b", name: "Ben, Jr", managerId: "a" }]);
    expect(rows[2]).toEqual(["Ben, Jr", "", "", "", "", "Ann", "", 0]);
    expect(toCsv(rows).split("\n")[2]).toBe('"Ben, Jr",,,,,Ann,,0');
  });
});

describe("payslip estimates", () => {
  it("derives monthly statements from annual salary", () => {
    const statements = buildPayslipEstimates({ salary: "60000", salaryCurrency: "USD", startDate: "2026-07-10" }, [], new Date(2026, 9, 2));
    expect(statements.map((item) => item.period)).toEqual(["2026-09", "2026-08", "2026-07"]);
    expect(statements[0].gross).toBe(5000);
  });

  it("uses approved work hours for hourly contracts", () => {
    const statements = buildPayslipEstimates(
      { salary: "50", salaryType: "Hourly", salaryCurrency: "EUR", contractStartDate: "2026-09-01" },
      [
        { date: "2026-09-01", type: "work", hours: 8, status: "approved" },
        { date: "2026-09-02", type: "work", hours: 8, status: "pending" },
        { date: "2026-09-03", type: "sick", hours: 8, status: "approved" },
      ],
      new Date(2026, 9, 2),
    );
    expect(statements[0].gross).toBe(400);
  });

  it("returns nothing without salary or start date", () => {
    expect(buildPayslipEstimates({ salary: "1000" }, [], new Date())).toEqual([]);
    expect(formatMoney(1234.5, "USD")).toBe("$1,234.50");
  });
});

describe("time entries", () => {
  it("stores leave hours explicitly without a time period", () => {
    expect(buildTimeEntry({ date: "2026-10-01", type: "vacation", startTime: "09:00", endTime: "18:00", breakMinutes: 60, leaveHours: 4 }))
      .toEqual({ date: "2026-10-01", type: "vacation", startTime: null, endTime: null, breakMinutes: 0, hours: 4 });
    expect(buildTimeEntry({ date: "2026-10-01", type: "work", startTime: "09:00", endTime: "17:30", breakMinutes: 30 }).hours).toBe(8);
  });

  it("summarises the viewed month and keeps leave separate from hours worked", () => {
    const summary = summarizeMonth([
      { date: "2026-10-01", type: "work", hours: 8, status: "approved" },
      { date: "2026-10-02", type: "work", hours: 6, status: "pending" },
      { date: "2026-10-05", type: "sick", hours: 8, status: "pending" },
      { date: "2026-09-30", type: "work", hours: 8, status: "approved" },
    ], 2026, 9);
    expect(summary).toEqual({ approved: 8, pending: 6, leave: 8 });
  });
});

describe("misc", () => {
  it("only accepts http(s) links", () => {
    expect(isSafeHttpUrl("https://example.com/file.pdf")).toBe(true);
    expect(isSafeHttpUrl(["javascript", "alert(1)"].join(":"))).toBe(false);
  });

  it("builds a newest-first employee history", () => {
    const history = buildEmployeeHistory({
      employeeProfile: { startDate: "2025-01-01" },
      timeOffRequests: [{ id: "r1", type: "Vacation", fromDate: "2026-10-05", toDate: "2026-10-06", createdAt: "2026-09-01T00:00:00Z", status: "approved", resolvedAt: "2026-09-02T00:00:00Z" }],
    });
    expect(history.map((event) => event.id)).toEqual(["timeoff-resolved-r1", "timeoff-r1", "start"]);
  });
});
