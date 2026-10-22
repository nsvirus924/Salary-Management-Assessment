import {
  Alert, Box, Button, IconButton, InputAdornment, LinearProgress, MenuItem, Paper, Snackbar, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, TextField,
  Tooltip, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import { useMemo, useState } from "react";
import { useDeleteEmployee, useEmployees, useMeta } from "../api/hooks";
import type { Employee, EmploymentType, ListParams, SortField } from "../api/types";
import ConfirmDialog from "../components/ConfirmDialog";
import EmployeeDetailDrawer from "../components/EmployeeDetailDrawer";
import EmployeeFormDialog from "../components/EmployeeFormDialog";
import { useDebounce } from "../hooks/useDebounce";
import { EMPLOYMENT_TYPE_LABELS, formatDate, formatMoney, formatNumber } from "../lib/format";

const COLUMNS: { field: SortField | null; label: string; align?: "right" }[] = [
  { field: "name", label: "Name" },
  { field: "job_title", label: "Job title" },
  { field: "department", label: "Department" },
  { field: "country", label: "Country" },
  { field: null, label: "Type" },
  { field: "salary", label: "Annual salary", align: "right" },
  { field: "hire_date", label: "Hired" },
];

export default function EmployeesPage() {
  const { data: meta } = useMeta();
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [department, setDepartment] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType | "">("");
  const [sort, setSort] = useState<SortField>("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const [selected, setSelected] = useState<Employee | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const q = useDebounce(search.trim());
  const params: ListParams = {
    q, country, department, employment_type: employmentType, sort, order, page: page + 1, page_size: pageSize,
  };
  const { data, isFetching, isError, error } = useEmployees(params);
  const remove = useDeleteEmployee();

  const countryNames = useMemo(
    () => Object.fromEntries((meta?.countries ?? []).map((c) => [c.code, c.name])), [meta],
  );
  const filtersActive = Boolean(q || country || department || employmentType);

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(0); };
  const toggleSort = (field: SortField) => {
    if (sort === field) setOrder(order === "asc" ? "desc" : "asc");
    else { setSort(field); setOrder(field === "salary" ? "desc" : "asc"); }
    setPage(0);
  };
  const clearFilters = () => { setSearch(""); setCountry(""); setDepartment(""); setEmploymentType(""); setPage(0); };

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (e: Employee) => { setEditing(e); setFormOpen(true); };

  async function confirmDelete() {
    if (!deleting) return;
    await remove.mutateAsync(deleting.id);
    setToast(`${deleting.first_name} ${deleting.last_name} deleted`);
    setDeleting(null);
    setSelected(null);
  }

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-end" }} gap={1}>
        <Box>
          <Typography variant="h1">Employees</Typography>
          <Typography color="text.secondary">
            {data ? `${formatNumber(data.total)} ${filtersActive ? "matching" : "people"}` : "Loading…"}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add employee</Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField size="small" placeholder="Search name, email, code or job title" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }} sx={{ flex: 2 }}
            inputProps={{ "aria-label": "Search employees" }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          <TextField select size="small" label="Country" value={country} onChange={(e) => resetPage(setCountry)(e.target.value)} sx={{ flex: 1 }}>
            <MenuItem value="">All countries</MenuItem>
            {meta?.countries.map((c) => <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Department" value={department} onChange={(e) => resetPage(setDepartment)(e.target.value)} sx={{ flex: 1 }}>
            <MenuItem value="">All departments</MenuItem>
            {meta?.departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Type" value={employmentType}
            onChange={(e) => resetPage(setEmploymentType)(e.target.value as EmploymentType | "")} sx={{ flex: 1 }}>
            <MenuItem value="">All types</MenuItem>
            {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
          </TextField>
          {filtersActive && <Button onClick={clearFilters}>Clear filters</Button>}
        </Stack>
      </Paper>

      {isError && <Alert severity="error">Employees could not be loaded: {(error as Error).message}</Alert>}

      <Paper variant="outlined">
        <Box sx={{ height: 4 }}>{isFetching && <LinearProgress />}</Box>
        <TableContainer>
          <Table size="small" aria-label="Employees">
            <TableHead>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableCell key={col.label} align={col.align}
                             sortDirection={col.field && sort === col.field ? order : false}>
                    {col.field ? (
                      <TableSortLabel active={sort === col.field} direction={sort === col.field ? order : "asc"}
                                      onClick={() => toggleSort(col.field!)}>
                        {col.label}
                      </TableSortLabel>
                    ) : col.label}
                  </TableCell>
                ))}
                <TableCell padding="checkbox" />
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.map((e) => (
                <TableRow key={e.id} hover onClick={() => setSelected(e)} sx={{ cursor: "pointer" }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{e.first_name} {e.last_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{e.employee_code}</Typography>
                  </TableCell>
                  <TableCell>{e.job_title}</TableCell>
                  <TableCell>{e.department}</TableCell>
                  <TableCell>{countryNames[e.country_code] ?? e.country_code}</TableCell>
                  <TableCell>{EMPLOYMENT_TYPE_LABELS[e.employment_type]}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{formatMoney(e.salary, e.currency)}</Typography>
                    {e.currency !== "USD" && (
                      <Typography variant="caption" color="text.secondary">≈ {formatMoney(e.salary_usd, "USD")}</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(e.hire_date)}</TableCell>
                  <TableCell padding="checkbox">
                    <Tooltip title="Edit">
                      <IconButton size="small" aria-label={`Edit ${e.first_name} ${e.last_name}`}
                                  onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {data && data.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length + 1} sx={{ py: 6, textAlign: "center" }}>
                    <Typography>No employees match these filters.</Typography>
                    <Button sx={{ mt: 1 }} onClick={clearFilters}>Clear filters</Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={data?.total ?? 0} page={page} rowsPerPage={pageSize}
          rowsPerPageOptions={[25, 50, 100]} onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} />
      </Paper>
      <Typography variant="caption" color="text.secondary">
        Salaries are shown in local currency. USD equivalents and salary sorting use fixed reference rates.
      </Typography>

      <EmployeeDetailDrawer employee={selected} countryName={selected ? countryNames[selected.country_code] : undefined}
        onClose={() => setSelected(null)} onEdit={openEdit} onDelete={setDeleting} />
      <EmployeeFormDialog open={formOpen} employee={editing} onClose={() => setFormOpen(false)}
        onSaved={(saved, message) => {
          setFormOpen(false);
          setToast(message);
          if (selected?.id === saved.id) setSelected(saved);
        }} />
      <ConfirmDialog open={deleting !== null} title="Delete employee?"
        body={deleting ? `${deleting.first_name} ${deleting.last_name} and their salary history will be permanently removed.` : ""}
        confirmLabel="Delete" busy={remove.isPending} onConfirm={confirmDelete} onClose={() => setDeleting(null)} />
      <Snackbar open={toast !== null} autoHideDuration={3000} onClose={() => setToast(null)} message={toast} />
    </Stack>
  );
}
