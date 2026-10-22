import { describe, expect, it } from "vitest";
import type { Employee } from "../api/types";
import {
  changedFields, emptyForm, formFromEmployee, parseSalary, toEmployeeInput, validateEmployeeForm,
} from "./validation";

const employee: Employee = {
  id: 1, employee_code: "E000001", first_name: "Ada", last_name: "Lovelace",
  email: "ada@acme.example", job_title: "Software Engineer", department: "Engineering",
  country_code: "GB", currency: "GBP", employment_type: "full_time", salary: 70000,
  salary_usd: 88900, hire_date: "2022-03-01", created_at: "", updated_at: "",
};

describe("validateEmployeeForm", () => {
  it("flags every missing required field on an empty form", () => {
    const errors = validateEmployeeForm(emptyForm());
    expect(Object.keys(errors).sort()).toEqual(
      ["country_code", "department", "email", "first_name", "hire_date", "job_title",
       "last_name", "salary"].sort(),
    );
  });

  it("accepts a complete form", () => {
    expect(validateEmployeeForm(formFromEmployee(employee))).toEqual({});
  });

  it("rejects bad email and non-positive salary", () => {
    const errors = validateEmployeeForm({ ...formFromEmployee(employee), email: "ada", salary: "0" });
    expect(errors.email).toBeDefined();
    expect(errors.salary).toBeDefined();
  });
});

describe("parseSalary", () => {
  it("accepts thousands separators", () => expect(parseSalary("120,000")).toBe(120000));
  it("rejects decimals and text", () => {
    expect(parseSalary("12.5")).toBeNull();
    expect(parseSalary("abc")).toBeNull();
  });
});

describe("toEmployeeInput", () => {
  it("trims text and omits blank optional fields", () => {
    const input = toEmployeeInput({ ...formFromEmployee(employee), first_name: "  Ada ", employee_code: "" });
    expect(input.first_name).toBe("Ada");
    expect(input).not.toHaveProperty("employee_code");
    expect(input).not.toHaveProperty("salary_change_reason");
  });
});

describe("changedFields", () => {
  it("returns nothing when nothing changed", () => {
    expect(changedFields(employee, formFromEmployee(employee))).toEqual({});
  });

  it("includes the reason only alongside a salary change", () => {
    const form = { ...formFromEmployee(employee), salary_change_reason: "Annual review" };
    expect(changedFields(employee, form)).toEqual({});
    expect(changedFields(employee, { ...form, salary: "75,000" })).toEqual({
      salary: 75000, salary_change_reason: "Annual review",
    });
  });
});
