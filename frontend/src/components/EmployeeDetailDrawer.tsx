import {
  Alert, Box, Button, Chip, Divider, Drawer, IconButton, List, ListItem, ListItemText, Skeleton, Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { usePeerComparison, useSalaryHistory } from "../api/hooks";
import type { Employee, PeerComparison } from "../api/types";
import { EMPLOYMENT_TYPE_LABELS, formatDate, formatMoney, percentChange } from "../lib/format";
import PayBand from "./PayBand";

interface Props {
  employee: Employee | null;
  countryName?: string;
  onClose: () => void;
  onEdit: (e: Employee) => void;
  onDelete: (e: Employee) => void;
}

const POSITION_LABEL: Record<PeerComparison["position"], string> = {
  below_p25: "Below peer range",
  p25_to_p75: "Within peer range",
  above_p75: "Above peer range",
  no_peers: "No peers",
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

export default function EmployeeDetailDrawer({ employee, countryName, onClose, onEdit, onDelete }: Props) {
  const id = employee?.id ?? null;
  const peers = usePeerComparison(id);
  const history = useSalaryHistory(id);

  return (
    <Drawer anchor="right" open={employee !== null} onClose={onClose}
            PaperProps={{ sx: { width: { xs: "100%", sm: 440 } } }}>
      {employee && (
        <Box sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h2">{employee.first_name} {employee.last_name}</Typography>
              <Typography color="text.secondary">{employee.job_title}, {employee.department}</Typography>
            </Box>
            <IconButton aria-label="Close" onClick={onClose}><CloseIcon /></IconButton>
          </Stack>

          <Typography sx={{ fontSize: "2rem", fontWeight: 600, mt: 3, fontVariantNumeric: "tabular-nums" }}>
            {formatMoney(employee.salary, employee.currency)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            per year{employee.currency !== "USD" && ` · about ${formatMoney(employee.salary_usd, "USD")}`}
          </Typography>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 3 }}>
            <Detail label="Employee code" value={employee.employee_code} />
            <Detail label="Country" value={countryName ?? employee.country_code} />
            <Detail label="Employment type" value={EMPLOYMENT_TYPE_LABELS[employee.employment_type]} />
            <Detail label="Hire date" value={formatDate(employee.hire_date)} />
            <Box sx={{ gridColumn: "1 / -1" }}><Detail label="Email" value={employee.email} /></Box>
          </Box>

          <Divider sx={{ my: 3 }} />
          <Typography variant="h3" gutterBottom>Compared with peers</Typography>
          {peers.isLoading && <Skeleton height={60} />}
          {peers.isError && <Alert severity="error">Peer comparison could not be loaded.</Alert>}
          {peers.data && peers.data.stats ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Paid more than {peers.data.percentile_rank}% of {peers.data.peer_count} other{" "}
                {employee.job_title}s in {countryName ?? employee.country_code}.
              </Typography>
              <PayBand stats={peers.data.stats} currency={employee.currency} value={employee.salary} />
              <Chip size="small" sx={{ mt: 1.5 }} label={POSITION_LABEL[peers.data.position]}
                    color={peers.data.position === "p25_to_p75" ? "default" : "secondary"} variant="outlined" />
            </>
          ) : peers.data && (
            <Typography variant="body2" color="text.secondary">
              No one else has this job title in this country yet.
            </Typography>
          )}

          <Divider sx={{ my: 3 }} />
          <Typography variant="h3">Salary history</Typography>
          {history.isLoading && <Skeleton height={80} />}
          <List dense disablePadding>
            {history.data?.map((h) => {
              const change = percentChange(h.previous_salary, h.new_salary);
              return (
                <ListItem key={h.id} disableGutters divider>
                  <ListItemText
                    primary={`${formatMoney(h.new_salary, employee.currency)}${change ? `  (${change})` : ""}`}
                    secondary={`${formatDate(h.effective_date)}${h.reason ? ` · ${h.reason}` : ""}`}
                    primaryTypographyProps={{ sx: { fontVariantNumeric: "tabular-nums" } }}
                  />
                </ListItem>
              );
            })}
          </List>

          <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
            <Button variant="contained" onClick={() => onEdit(employee)}>Edit</Button>
            <Button color="error" onClick={() => onDelete(employee)}>Delete</Button>
          </Stack>
        </Box>
      )}
    </Drawer>
  );
}
