export const DEFAULT_TEMPLATE_REGISTRY = {
  doc: [
    {
      id: "doc-blank",
      type: "doc",
      name: "Blank Page",
      emoji: "📄",
      description: "Start from scratch",
      content: "",
    },
    {
      id: "doc-meeting",
      type: "doc",
      name: "Meeting Notes",
      emoji: "📝",
      description: "Agenda, notes, action items",
      content: `# Meeting Notes\n\n**Date:** ${new Date().toLocaleDateString()}\n**Attendees:**\n\n## Agenda\n\n1. \n2. \n\n## Notes\n\n## Action Items\n\n- [ ] \n- [ ] \n`,
    },
    {
      id: "doc-rfc",
      type: "doc",
      name: "RFC / Proposal",
      emoji: "💡",
      description: "Request for comments template",
      content: `# RFC: [Title]\n\n## Summary\n\nBrief one-paragraph summary of the proposal.\n\n## Motivation\n\nWhy is this change needed?\n\n## Detailed Design\n\nExplain the design in detail.\n\n## Drawbacks\n\nWhat are the drawbacks of this proposal?\n\n## Alternatives\n\nWhat other designs were considered?\n`,
    },
    {
      id: "doc-howto",
      type: "doc",
      name: "How-To Guide",
      emoji: "🛠️",
      description: "Step-by-step instructions",
      content: `# How To: [Task Name]\n\n## Overview\n\nWhat this guide covers.\n\n## Prerequisites\n\n- Requirement 1\n- Requirement 2\n\n## Steps\n\n### Step 1: \n\n### Step 2: \n\n### Step 3: \n\n## Troubleshooting\n\n| Problem | Solution |\n|---------|----------|\n| | |\n`,
    },
    {
      id: "doc-runbook",
      type: "doc",
      name: "Runbook",
      emoji: "🚨",
      description: "Incident response & ops procedures",
      content: `# Runbook: [Service / Incident Name]\n\n## Severity\n\n🟡 Medium\n\n## Symptoms\n\n- Symptom 1\n- Symptom 2\n\n## Investigation Steps\n\n1. Check logs\n2. Check metrics\n3. \n\n## Resolution\n\n### Option A — Quick fix\n\n### Option B — Full restart\n\n## Escalation\n\nIf unresolved after 30 minutes, escalate to @oncall.\n`,
    },
  ],
  release: [
    {
      id: "release-standard",
      type: "release",
      name: "Standard Release",
      description: "Default checklist for a normal product release",
      checklist: [
        { id: "test-signoff", title: "QA / regression sign-off", completed: false },
        { id: "docs-ready", title: "Release documentation updated", completed: false },
        { id: "approvals", title: "Required approvals collected", completed: false },
        { id: "rollback-plan", title: "Rollback plan documented", completed: false },
        { id: "monitoring", title: "Monitoring checklist reviewed", completed: false },
      ],
      rollbackPlan: "",
      monitoringChecks: "",
    },
  ],
  sprint: [
    {
      id: "sprint-default",
      type: "sprint",
      name: "Standard Sprint",
      description: "Default sprint kickoff template",
      content: {
        goalPrompt: "What outcome should this sprint deliver?",
        checklist: ["Sprint goal agreed", "Capacity confirmed", "Dependencies reviewed"],
      },
    },
  ],
  onboarding: [
    {
      id: "onboarding-default",
      type: "onboarding",
      name: "Employee Onboarding",
      description: "Core onboarding tasks for a new teammate",
      steps: [
        "Create accounts and grant access",
        "Share handbook and mandatory docs",
        "Schedule intro meetings",
        "Assign onboarding buddy",
        "Confirm first-week goals",
      ],
    },
  ],
  approval: [
    {
      id: "approval-default",
      type: "approval",
      name: "Standard Approval",
      description: "Default approval flow with request, review and decision",
      steps: ["Requested", "Under review", "Approved / Rejected"],
    },
  ],
  incident: [
    {
      id: "incident-default",
      type: "incident",
      name: "Incident Template",
      description: "Response, impact and follow-up checklist",
      content: {
        severity: "medium",
        checklist: ["Assess impact", "Notify owners", "Mitigate", "Postmortem scheduled"],
      },
    },
  ],
};
