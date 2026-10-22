import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { EmployeeInput, GroupBy, ListParams } from "./types";

export const keys = {
  employees: ["employees"] as const,
  employeeList: (p: ListParams) => ["employees", "list", p] as const,
  employee: (id: number) => ["employees", id] as const,
  insights: ["insights"] as const,
  meta: ["meta"] as const,
};

export const useMeta = () =>
  useQuery({ queryKey: keys.meta, queryFn: api.meta, staleTime: 5 * 60_000 });

export const useEmployees = (params: ListParams) =>
  useQuery({
    queryKey: keys.employeeList(params),
    queryFn: () => api.listEmployees(params),
    placeholderData: keepPreviousData, // no flicker while paging/sorting
  });

export const useSalaryHistory = (id: number | null) =>
  useQuery({
    queryKey: [...keys.employee(id ?? 0), "history"],
    queryFn: () => api.salaryHistory(id!),
    enabled: id !== null,
  });

export const usePeerComparison = (id: number | null) =>
  useQuery({
    queryKey: [...keys.employee(id ?? 0), "peers"],
    queryFn: () => api.peerComparison(id!),
    enabled: id !== null,
  });

export const useOverview = () =>
  useQuery({ queryKey: [...keys.insights, "overview"], queryFn: api.overview });

export const useBreakdown = (groupBy: GroupBy, country?: string) =>
  useQuery({
    queryKey: [...keys.insights, "breakdown", groupBy, country ?? "ALL"],
    queryFn: () => api.breakdown(groupBy, country),
    placeholderData: keepPreviousData,
  });

export const useDistribution = (country?: string) =>
  useQuery({
    queryKey: [...keys.insights, "distribution", country ?? "ALL"],
    queryFn: () => api.distribution(country),
    placeholderData: keepPreviousData,
  });

/** Any write can change lists, insights and filter options, so refresh all three. */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.employees }),
      qc.invalidateQueries({ queryKey: keys.insights }),
      qc.invalidateQueries({ queryKey: keys.meta }),
    ]);
}

export function useCreateEmployee() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (input: EmployeeInput) => api.createEmployee(input), onSuccess: invalidate });
}

export function useUpdateEmployee() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<EmployeeInput> }) => api.updateEmployee(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteEmployee() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: number) => api.deleteEmployee(id), onSuccess: invalidate });
}
