import { useCallback, useEffect, useState } from "react";
import type { ApiSuccess, Leave, Paginated } from "@elms/shared";
import type { LeaveFilterValues } from "../services/leave.service";
import { PAGE_SIZE } from "../constants/ui.constants";
import { notify } from "../UI/Toast";

export const EMPTY_FILTERS: LeaveFilterValues = {
  status: "",
  type: "",
  from: "",
  to: "",
  search: "",
  year: "",
  page: 1,
  limit: PAGE_SIZE,
};

// Shared state for every filterable leave list (my history, approvals, team history)
export function useLeaveList(
  fetcher: (filters: Partial<LeaveFilterValues>) => Promise<ApiSuccess<Paginated<Leave>>>,
  initial: Partial<LeaveFilterValues> = {},
) {
  const [filters, setFilters] = useState<LeaveFilterValues>({ ...EMPTY_FILTERS, ...initial });
  const [data, setData] = useState<Paginated<Leave> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData((await fetcher(filters)).data);
    } catch (error) {
      notify.apiError(error, "Could not load leave requests");
    } finally {
      setLoading(false);
    }
  }, [fetcher, filters]);

  useEffect(() => {
    load();
  }, [load]);

  // Any filter change resets to page 1; changing page keeps the filters
  const updateFilters = (patch: Partial<LeaveFilterValues>) =>
    setFilters((prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }));

  const resetFilters = () => setFilters({ ...EMPTY_FILTERS, ...initial });

  return { filters, updateFilters, resetFilters, data, loading, reload: load };
}
