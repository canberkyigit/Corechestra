import { useEffect, useState } from "react";
import { BOARD_FILTER_TYPE_OPTIONS } from "../../../shared/constants/taskMeta";

const NO_FIELD_FILTER = { fieldId: "", value: "" };

function readFieldFilter(saved) {
  return saved?.fieldFilterId
    ? { fieldId: saved.fieldFilterId, value: saved.fieldFilterValue || "" }
    : NO_FIELD_FILTER;
}

export function useBoardFilters({
  currentProjectId,
  projectMembers,
  perProjectBoardFilters,
  setPerProjectBoardFilters,
}) {
  const savedFilters = perProjectBoardFilters[currentProjectId] || {};

  const [filter, setFilter] = useState(() =>
    BOARD_FILTER_TYPE_OPTIONS.find((option) => option.value === savedFilters.filterValue) || BOARD_FILTER_TYPE_OPTIONS[0]
  );
  const [member, setMember] = useState(() =>
    projectMembers.find((option) => option.value === savedFilters.memberValue) || projectMembers[0]
  );
  const [search, setSearch] = useState(savedFilters.search || "");
  const [viewMode, setViewMode] = useState(savedFilters.viewMode || "kanban");
  // Custom field filter `{ fieldId, value }` (select / multiselect / checkbox / person).
  const [fieldFilter, setFieldFilter] = useState(() => readFieldFilter(savedFilters));

  useEffect(() => {
    setFilter(BOARD_FILTER_TYPE_OPTIONS.find((option) => option.value === savedFilters.filterValue) || BOARD_FILTER_TYPE_OPTIONS[0]);
    setMember(projectMembers.find((option) => option.value === savedFilters.memberValue) || projectMembers[0]);
    setSearch(savedFilters.search || "");
    setViewMode(savedFilters.viewMode || "kanban");
    setFieldFilter((prev) => {
      const next = readFieldFilter(savedFilters);
      return prev.fieldId === next.fieldId && prev.value === next.value ? prev : next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId, savedFilters.filterValue, savedFilters.memberValue, savedFilters.search, savedFilters.viewMode, savedFilters.fieldFilterId, savedFilters.fieldFilterValue]);

  useEffect(() => {
    setMember((prev) => projectMembers.find((option) => option.value === prev?.value) || projectMembers[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  useEffect(() => {
    setPerProjectBoardFilters((prev) => ({
      ...prev,
      [currentProjectId]: {
        filterValue: filter.value,
        memberValue: member.value,
        search,
        viewMode,
        ...(fieldFilter.fieldId ? { fieldFilterId: fieldFilter.fieldId, fieldFilterValue: fieldFilter.value } : {}),
      },
    }));
  }, [currentProjectId, fieldFilter, filter, member, search, setPerProjectBoardFilters, viewMode]);

  const activeFilterCount = [
    Boolean(filter.value),
    Boolean(member.value),
    Boolean(search.trim()),
    Boolean(fieldFilter.fieldId && fieldFilter.value),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilter(BOARD_FILTER_TYPE_OPTIONS[0]);
    setMember(projectMembers[0]);
    setSearch("");
    setFieldFilter(NO_FIELD_FILTER);
  };

  return {
    filter,
    setFilter,
    member,
    setMember,
    search,
    setSearch,
    viewMode,
    setViewMode,
    fieldFilter,
    setFieldFilter,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
    clearFilters,
  };
}
