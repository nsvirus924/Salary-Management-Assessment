import {
  Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment,
  MenuItem, TextField,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useCreateEmployee, useMeta, useUpdateEmployee } from "../api/hooks";
import type { Employee } from "../api/types";
import { EMPLOYMENT_TYPE_LABELS } from "../lib/format";
import {
  changedFields, emptyForm, formFromEmployee, parseSalary, toEmployeeInput, validateEmployeeForm,
  type EmployeeFormValues, type FormErrors,
} from "../lib/validation";

interface Props {
  open: boolean;
  employee: Employee | null; // null = create
  onClose: () => void;
  onSaved: (employee: Employee, message: string) => void;
}

export default function EmployeeFormDialog({ open, employee, onClose, onSaved }: Props) {
  const { data: meta } = useMeta();
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const [values, setValues] = useState<EmployeeFormValues>(emptyForm());
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValues(employee ? formFromEmployee(employee) : emptyForm());
    setErrors({});
    setServerError(null);
  }, [open, employee]);

  const country = meta?.countries.find((c) => c.code === values.country_code);
  const salaryChanged = employee !== null && parseSalary(values.salary) !== employee.salary;
  const currencyChanged = employee !== null && country !== undefined && country.currency !== employee.currency;
  const busy = create.isPending || update.isPending;

  const set = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const extraErrors = useMemo<FormErrors>(() => {
    if (currencyChanged && !salaryChanged) {
      return { salary: `Restate the salary in ${country?.currency} for the new country` };
    }
    return {};
  }, [currencyChanged, salaryChanged, country]);

  async function handleSubmit() {
    const found = { ...validateEmployeeForm(values), ...extraErrors };
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    setServerError(null);
    try {
      if (employee) {
        const diff = changedFields(employee, values);
        if (Object.keys(diff).length === 0) return onClose();
        const saved = await update.mutateAsync({ id: employee.id, input: diff });
        onSaved(saved, "Changes saved");
      } else {
        const saved = await create.mutateAsync(toEmployeeInput(values));
        onSaved(saved, `${saved.first_name} ${saved.last_name} added`);
      }
    } catch (e) {
      setServerError((e as Error).message);
    }
  }

  const field = (key: keyof EmployeeFormValues, label: string, extra: object = {}) => ({
    label, value: values[key], fullWidth: true, size: "small" as const,
    error: Boolean(errors[key]), helperText: errors[key] ?? " ",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value as never), ...extra,
  });

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{employee ? `Edit ${employee.first_name} ${employee.last_name}` : "Add employee"}</DialogTitle>
      <DialogContent>
        {serverError && <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert>}
        <Box component="form" noValidate onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
             sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 2, pt: 1 }}>
          <TextField {...field("first_name", "First name", { required: true, autoFocus: true })} />
          <TextField {...field("last_name", "Last name", { required: true })} />
          <TextField {...field("email", "Work email", { required: true, type: "email" })} />
          <TextField {...field("employee_code", "Employee code",
            employee ? { disabled: true } : { placeholder: "Generated if left blank" })} />
          <Autocomplete freeSolo options={meta?.job_titles ?? []} value={values.job_title}
            onInputChange={(_, v) => set("job_title", v)}
            renderInput={(p) => <TextField {...p} label="Job title" required size="small"
              error={Boolean(errors.job_title)} helperText={errors.job_title ?? " "} />} />
          <Autocomplete freeSolo options={meta?.departments ?? []} value={values.department}
            onInputChange={(_, v) => set("department", v)}
            renderInput={(p) => <TextField {...p} label="Department" required size="small"
              error={Boolean(errors.department)} helperText={errors.department ?? " "} />} />
          <TextField {...field("country_code", "Country", { select: true, required: true })}>
            {(meta?.countries ?? []).map((c) => (
              <MenuItem key={c.code} value={c.code}>{c.name} ({c.currency})</MenuItem>
            ))}
          </TextField>
          <TextField {...field("employment_type", "Employment type", { select: true })}>
            {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>{label}</MenuItem>
            ))}
          </TextField>
          <TextField {...field("salary", "Annual salary", {
            required: true, inputMode: "numeric",
            error: Boolean(errors.salary || extraErrors.salary),
            helperText: errors.salary ?? extraErrors.salary ?? "Gross, in local currency",
            InputProps: { startAdornment: <InputAdornment position="start">{country?.currency ?? "—"}</InputAdornment> },
          })} />
          <TextField {...field("hire_date", "Hire date", { required: true, type: "date",
            InputLabelProps: { shrink: true } })} />
          {salaryChanged && (
            <Box sx={{ gridColumn: "1 / -1" }}>
              <TextField {...field("salary_change_reason", "Reason for salary change", {
                placeholder: "e.g. Annual review, promotion, market adjustment",
                helperText: "Saved in the salary history",
              })} />
            </Box>
          )}
          <button type="submit" hidden />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={busy}>
          {employee ? "Save changes" : "Add employee"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
