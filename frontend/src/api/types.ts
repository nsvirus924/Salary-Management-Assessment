export type EmploymentType = "full_time" | "part_time" | "contractor";

export interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  department: string;
  country_code: string;
  currency: string;
  employment_type: EmploymentType;
  salary: number;
  salary_usd: number;
  hire_date: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeInput {
  employee_code?: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  department: string;
  country_code: string;
  employment_type: EmploymentType;
  salary: number;
  hire_date: string;
  salary_change_reason?: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface SalaryChange {
  id: number;
  previous_salary: number | null;
  new_salary: number;
  effective_date: string;
  reason: string | null;
  created_at: string;
}

export interface SalaryStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p25: number;
  p75: number;
}

export interface CountryStats {
  country_code: string;
  country_name: string;
  currency: string;
  headcount: number;
  local: SalaryStats;
  median_usd: number;
  payroll_usd: number;
}

export interface Overview {
  headcount: number;
  country_count: number;
  department_count: number;
  total_payroll_usd: number;
  salary_usd: SalaryStats | null;
  by_country: CountryStats[];
}

export type GroupBy = "job_title" | "department";

export interface GroupStats {
  name: string;
  headcount: number;
  stats: SalaryStats;
}

export interface Breakdown {
  group_by: GroupBy;
  country_code: string | null;
  currency: string;
  groups: GroupStats[];
}

export interface Distribution {
  country_code: string | null;
  currency: string;
  buckets: { lower: number; upper: number; count: number }[];
}

export type PeerPosition = "below_p25" | "p25_to_p75" | "above_p75" | "no_peers";

export interface PeerComparison {
  peer_count: number;
  currency: string;
  stats: SalaryStats | null;
  percentile_rank: number | null;
  position: PeerPosition;
}

export interface Country {
  code: string;
  name: string;
  currency: string;
  usd_rate: number;
}

export interface Meta {
  countries: Country[];
  departments: string[];
  job_titles: string[];
  employment_types: EmploymentType[];
}

export type SortField =
  | "name" | "employee_code" | "job_title" | "department" | "country" | "salary" | "hire_date";

export interface ListParams {
  q?: string;
  country?: string;
  department?: string;
  employment_type?: EmploymentType | "";
  sort: SortField;
  order: "asc" | "desc";
  page: number;
  page_size: number;
}
