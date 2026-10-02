/**
 * Employee history timeline built from existing HR data (newest first).
 * Each event: { id, date (ISO string), kind, title, detail }
 */
export function buildEmployeeHistory({ employeeProfile, timeOffRequests, expenses, documents, performanceNotes, timeEntries, person }) {
  const events = [];
  const push = (event) => {
    if (event.date) events.push(event);
  };
  const profile = employeeProfile || {};

  push({ id: "start", date: profile.startDate, kind: "milestone", title: "Started at the company", detail: profile.jobTitle || "" });
  if (profile.contractStartDate && profile.contractStartDate !== profile.startDate) {
    push({ id: "contract", date: profile.contractStartDate, kind: "milestone", title: "Current contract started", detail: profile.employmentType || "" });
  }
  if (person?.joinedAt && !profile.startDate) {
    push({ id: "joined", date: String(person.joinedAt).slice(0, 10), kind: "milestone", title: "Joined the workspace", detail: person.title || "" });
  }

  (timeOffRequests || []).forEach((request) => {
    push({
      id: `timeoff-${request.id}`,
      date: request.createdAt || request.fromDate,
      kind: "timeoff",
      title: `Time off requested: ${request.typeName || request.type}`,
      detail: `${request.fromDate} → ${request.toDate} · ${request.status || "pending"}`,
    });
    if (request.resolvedAt) {
      push({
        id: `timeoff-resolved-${request.id}`,
        date: request.resolvedAt,
        kind: request.status === "approved" ? "approved" : "rejected",
        title: `Time off ${request.status}`,
        detail: [request.resolvedByName && `by ${request.resolvedByName}`, request.decisionNote].filter(Boolean).join(" · "),
      });
    }
  });

  (expenses || []).forEach((expense) => {
    push({
      id: `expense-${expense.id}`,
      date: expense.createdAt || expense.date,
      kind: "expense",
      title: `Expense submitted: ${expense.description}`,
      detail: `${expense.currency || ""} ${expense.amount} · ${expense.status || "pending"}`.trim(),
    });
    if (expense.resolvedAt) {
      push({
        id: `expense-resolved-${expense.id}`,
        date: expense.resolvedAt,
        kind: expense.status === "approved" ? "approved" : "rejected",
        title: `Expense ${expense.status}: ${expense.description}`,
        detail: expense.decisionNote || "",
      });
    }
  });

  (documents || []).forEach((document) => {
    if (document.createdAt) {
      push({
        id: `doc-${document.id}`,
        date: document.createdAt,
        kind: "document",
        title: document.assignedBy ? `Document assigned: ${document.name}` : `Document added: ${document.name}`,
        detail: document.assignedByName ? `by ${document.assignedByName}` : "",
      });
    }
    if (document.signedAt) {
      push({ id: `doc-signed-${document.id}`, date: document.signedAt, kind: "approved", title: `Signed: ${document.name}`, detail: document.signedBy ? `as ${document.signedBy}` : "" });
    }
  });

  (performanceNotes || []).forEach((note) => {
    push({ id: `note-${note.id}`, date: note.createdAt, kind: "note", title: note.title || "Note", detail: note.authorName ? `by ${note.authorName}` : "" });
  });

  const approvedTime = (timeEntries || []).filter((entry) => entry.status === "approved" && entry.resolvedAt);
  approvedTime.forEach((entry) => {
    push({ id: `time-${entry.id || entry.date}`, date: entry.resolvedAt, kind: "approved", title: `Hours approved for ${entry.date}`, detail: `${entry.hours || 0}h` });
  });

  return events.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
