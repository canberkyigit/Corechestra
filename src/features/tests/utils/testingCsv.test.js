import {
  buildImportRecords, casesToCsv, formatStepsCell, parseCasesCsv, parseCsv, parseStepsCell, toCsv,
} from "./testingCsv";

describe("testingCsv", () => {
  it("parses RFC 4180 CSV (quotes, escaped quotes, newlines, CRLF, BOM)", () => {
    const rows = parseCsv('﻿a,b,c\r\n"x, y","he said ""hi""","multi\nline"\n\n1,2,3');
    expect(rows).toEqual([["a", "b", "c"], ["x, y", 'he said "hi"', "multi\nline"], ["1", "2", "3"]]);
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it("formats and parses step cells", () => {
    const cell = formatStepsCell([{ action: "Open", data: "/login", expected: "Form" }, { action: "Submit" }, { sharedStepsId: "g1" }], new Map([["g1", { name: "Login" }]]));
    expect(cell).toBe("1. Open | /login | Form\n2. Submit\n3. [Shared] Login");
    expect(parseStepsCell("1. Open | /login | Form\n2) Click | | Done\n\nType text")).toEqual([
      { action: "Open", data: "/login", expected: "Form" },
      { action: "Click", data: "", expected: "Done" },
      { action: "Type text", data: "", expected: "" },
    ]);
  });

  it("parses cases with header aliases, option aliases and warnings", () => {
    const csv = [
      "Summary,Section,Priority,Type,Automated,State,Labels,Steps,Expected",
      'Login,Web App / Auth,P1,End to end,yes,Active,"smoke, auth","1. Open | | Form",Signed in',
      ",Web,High,,,,,,",
      "Logout,,Bogus,Weird,,,,,",
    ].join("\n");
    const { rows, warnings, errors } = parseCasesCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual(expect.objectContaining({
      title: "Login", folderPath: ["Web App", "Auth"], priority: "critical", type: "e2e", automation: "automated", status: "ready", tags: ["smoke", "auth"], expectedResult: "Signed in",
    }));
    expect(rows[0].steps).toEqual([{ action: "Open", data: "", expected: "Form" }]);
    expect(rows[1]).toEqual(expect.objectContaining({ title: "Logout", priority: "medium", type: "functional", folderPath: [] }));
    expect(warnings.map((warning) => warning.line)).toEqual([3, 4, 4]);
  });

  it("reports structural errors", () => {
    expect(parseCasesCsv("only header").errors[0].message).toMatch(/header row/);
    expect(parseCasesCsv("Folder,Priority\nx,y").errors[0].message).toMatch(/Title/);
  });

  it("builds import records, matching existing folders and creating missing ones", () => {
    let n = 0;
    const makeId = (prefix) => { n += 1; return `${prefix}-${n}`; };
    const { rows } = parseCasesCsv("Title,Folder\nA,Web / Auth\nB,Web / New\nC,");
    const records = buildImportRecords(rows, {
      projectId: "p1",
      suites: [{ id: "web", name: "Web", parentId: null }, { id: "auth", name: "auth", parentId: "web" }],
      defaultSuiteId: "web",
      startSeq: 10,
      currentUser: "alice",
      makeId,
      now: "2026-01-01T00:00:00.000Z",
    });
    expect(records.suites).toEqual([expect.objectContaining({ name: "New", parentId: "web", projectId: "p1" })]);
    expect(records.cases.map((testCase) => [testCase.title, testCase.suiteId, testCase.seq])).toEqual([
      ["A", "auth", 10], ["B", records.suites[0].id, 11], ["C", "web", 12],
    ]);
  });

  it("exports cases with keys, folder paths and requirement keys", () => {
    const csv = casesToCsv([{
      key: "TC-1", title: "Login, fast", suiteId: "auth", priority: "high", type: "smoke", automation: "manual", status: "ready",
      owner: "alice", estimate: 5, tags: ["a"], preconditions: "", steps: [{ action: "Go" }], expectedResult: "ok", requirementIds: ["CY-1"],
    }], { pathById: new Map([["auth", ["Web", "Auth"]]]), taskKeyOf: (id) => `K:${id}` });
    const rows = parseCsv(csv);
    expect(rows[0][0]).toBe("ID");
    expect(rows[1]).toEqual(["TC-1", "Login, fast", "Web / Auth", "High", "Smoke", "Manual", "Ready", "alice", "5", "a", "", "1. Go", "ok", "K:CY-1"]);
  });
});
