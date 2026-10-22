import type { Employee, EmployeeInput, EmploymentType } from "../api/types";

/** Form state keeps strings so inputs can be partially typed; convert on submit. */
export interface EmployeeFormValues {
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string;
  department: string;
  country_code: string;
  employment_type: EmploymentType;
  salary: string;
  hire_date: string;
  salary_change_reason: string;
}

export type FormErrors = Partial<Record<keyof EmployeeFormValues, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUIRED: [keyof EmployeeFormValues, string][] = [
  ["first_name", "First name"], ["last_name", "Last name"], ["email", "Email"],
  ["job_title", "Job title"], ["department", "Department"], ["country_code", "Country"],
  ["salary", "Salary"], ["hire_date", "Hire date"],
];

export function emptyForm(): EmployeeFormValues {
  return {
    employee_code: "", first_name: "", last_name: "", email: "", job_title: "",
    department: "", country_code: "", employment_type: "full_time", salary: "",
    hire_date: "", salary_change_reason: "",
  };
}

export function formFromEmployee(e: Employee): EmployeeFormValues {
  return {
    employee_code: e.employee_code, first_name: e.first_name, last_name: e.last_name,
    email: e.email, job_title: e.job_title, department: e.department,
    country_code: e.country_code, employment_type: e.employment_type,
    salary: String(e.salary), hire_date: e.hire_date, salary_change_reason: "",
  };
}

/** Strip thousands separators so "120,000" is accepted. */
export function parseSalary(raw: string): number | null {
  const cleaned = raw.replace(/[,\s_]/g, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n > 0 ? n : null;
}

export function validateEmployeeForm(v: EmployeeFormValues): FormErrors {
  const errors: FormErrors = {};
  for (const [field, label] of REQUIRED) {
    if (!String(v[field]).trim()) errors[field] = `${label} is required`;
  }
  if (v.email.trim() && !EMAIL.test(v.email.trim())) errors.email = "Enter a valid email address";
  if (v.salary.trim() && parseSalary(v.salary) === null) {
    errors.salary = "Enter a whole number greater than 0";
  }
  if (v.hire_date && Number.isNaN(Date.parse(v.hire_date))) errors.hire_date = "Enter a valid date";
  return errors;
}

export function toEmployeeInput(v: EmployeeFormValues): EmployeeInput {
  const input: EmployeeInput = {
    first_name: v.first_name.trim(), last_name: v.last_name.trim(), email: v.email.trim(),
    job_title: v.job_title.trim(), department: v.department.trim(), country_code: v.country_code,
    employment_type: v.employment_type, salary: parseSalary(v.salary) ?? 0, hire_date: v.hire_date,
  };
  if (v.employee_code.trim()) input.employee_code = v.employee_code.trim();
  if (v.salary_change_reason.trim()) input.salary_change_reason = v.salary_change_reason.trim();
  return input;
}

/** Only send fields that changed, so the audit trail only records real salary changes. */
export function changedFields(original: Employee, v: EmployeeFormValues): Partial<EmployeeInput> {
  const next = toEmployeeInput(v);
  const diff: Record<string, unknown> = {};
  for (const key of Object.keys(next) as (keyof EmployeeInput)[]) {
    if (key === "employee_code" || key === "salary_change_reason") continue;
    if (next[key] !== (original as unknown as EmployeeInput)[key]) diff[key] = next[key];
  }
  if (diff.salary !== undefined && next.salary_change_reason) {
    diff.salary_change_reason = next.salary_change_reason;
  }
  return diff as Partial<EmployeeInput>;
}
