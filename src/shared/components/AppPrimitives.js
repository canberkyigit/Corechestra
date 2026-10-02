export {
  Button as AppButton,
  Badge as AppBadge,
  EmptyState as AppEmptyState,
  Input as AppInput,
  Select as AppSelect,
  DataCard as AppDataCard,
  SectionHeader as AppSectionHeader,
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
