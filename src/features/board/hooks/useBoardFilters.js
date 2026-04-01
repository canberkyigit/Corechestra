import { useEffect, useState } from "react";
import { BOARD_FILTER_TYPE_OPTIONS } from "../constants/taskOptions";

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

  useEffect(() => {
    setFilter(BOARD_FILTER_TYPE_OPTIONS.find((option) => option.value === savedFilters.filterValue) || BOARD_FILTER_TYPE_OPTIONS[0]);
    setMember(projectMembers.find((option) => option.value === savedFilters.memberValue) || projectMembers[0]);
    setSearch(savedFilters.search || "");
    setViewMode(savedFilters.viewMode || "kanban");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId, savedFilters.filterValue, savedFilters.memberValue, savedFilters.search, savedFilters.viewMode]);

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
      },
    }));
  }, [currentProjectId, filter, member, search, setPerProjectBoardFilters, viewMode]);

  const activeFilterCount = [
    Boolean(filter.value),
    Boolean(member.value),
    Boolean(search.trim()),
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilter(BOARD_FILTER_TYPE_OPTIONS[0]);
    setMember(projectMembers[0]);
    setSearch("");
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
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
    clearFilters,
  };
}
