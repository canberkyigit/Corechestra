export const DEFAULT_DAILY_HOURS = 8;

export function getStandardDailyHours(employeeProfile) {
  const value = Number(employeeProfile?.standardDailyHours);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_DAILY_HOURS;
}

export function getContractStatus(employeeProfile, todayIso) {
  const start = employeeProfile?.contractStartDate || employeeProfile?.startDate;
  if (!employeeProfile?.jobTitle && !employeeProfile?.salary && !start) return { label: "No contract details", tone: "slate" };
  if (start && start > todayIso) return { label: `Starts ${start}`, tone: "amber" };
  return { label: "Active", tone: "green" };
}
