export {
  Button as AppButton,
  Badge as AppBadge,
  EmptyState as AppEmptyState,
  Input as AppInput,
  Select as AppSelect,
  Textarea as AppTextarea,
  ModalShell as AppModalShell,
  SidePanelShell as AppSidePanelShell,
  DataCard as AppDataCard,
  StatCard as AppStatCard,
  SectionHeader as AppSectionHeader,
  Tabs as AppTabs,
} from "../ui";

export function getReleaseStatusTone(status) {
  if (status === "released") return "green";
  if (status === "in-progress") return "blue";
  return "neutral";
}

export function getTaskStatusTone(status) {
  if (status === "done") return "green";
  if (status === "inprogress") return "blue";
  if (status === "review") return "amber";
  if (status === "awaiting") return "purple";
  if (status === "blocked") return "red";
  return "neutral";
}

export function getEntityTone(type) {
  if (type === "task") return "blue";
  if (type === "doc") return "green";
  if (type === "release") return "purple";
  if (type === "test-suite") return "amber";
  if (type === "test-case") return "orange";
  if (type === "test-run") return "cyan";
  return "neutral";
}
