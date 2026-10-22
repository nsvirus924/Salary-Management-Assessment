import type {
  Breakdown, Distribution, Employee, EmployeeInput, GroupBy, ListParams, Meta, Overview,
  Page, PeerComparison, SalaryChange,
} from "./types";

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

type QueryValue = string | number | boolean | null | undefined;

/** Build "?a=1&b=2", dropping empty values so cleared filters disappear from the URL. */
export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/** Turn FastAPI's error body (string or validation array) into one readable sentence. */
export function errorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((d: { loc?: unknown[]; msg?: string }) => {
        const field = d.loc?.[d.loc.length - 1];
        return field ? `${String(field).replace(/_/g, " ")}: ${d.msg}` : d.msg;
      })
      .join("; ");
  }
  return fallback;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      message = errorMessage((await response.json()).detail, message);
    } catch {
      /* non-JSON error body: keep generic message */
    }
    throw new ApiError(response.status, message);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export const api = {
  listEmployees: (p: ListParams) =>
    request<Page<Employee>>(`/api/employees${buildQuery({ ...p })}`),
  getEmployee: (id: number) => request<Employee>(`/api/employees/${id}`),
  createEmployee: (input: EmployeeInput) =>
    request<Employee>("/api/employees", { method: "POST", body: JSON.stringify(input) }),
  updateEmployee: (id: number, input: Partial<EmployeeInput>) =>
    request<Employee>(`/api/employees/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteEmployee: (id: number) => request<void>(`/api/employees/${id}`, { method: "DELETE" }),
  salaryHistory: (id: number) => request<SalaryChange[]>(`/api/employees/${id}/salary-history`),
  peerComparison: (id: number) => request<PeerComparison>(`/api/employees/${id}/peer-comparison`),
  meta: () => request<Meta>("/api/meta"),
  overview: () => request<Overview>("/api/insights/overview"),
  breakdown: (groupBy: GroupBy, country?: string) =>
    request<Breakdown>(`/api/insights/breakdown${buildQuery({ group_by: groupBy, country })}`),
  distribution: (country?: string, bins = 12) =>
    request<Distribution>(`/api/insights/distribution${buildQuery({ country, bins })}`),
};
