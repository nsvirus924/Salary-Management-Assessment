import {
  Alert, Box, MenuItem, Paper, Skeleton, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography, useTheme,
} from "@mui/material";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useBreakdown, useDistribution, useMeta, useOverview } from "../api/hooks";
import type { GroupBy } from "../api/types";
import PayBand from "../components/PayBand";
import { formatMoney, formatNumber } from "../lib/format";

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ px: 2.5, py: 2, flex: 1, minWidth: 160 }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontSize: "1.6rem", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
    </Box>
  );
}

export default function InsightsPage() {
  const theme = useTheme();
  const { data: meta } = useMeta();
  const overview = useOverview();
  const [country, setCountry] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("job_title");
  const breakdown = useBreakdown(groupBy, country || undefined);
  const distribution = useDistribution(country || undefined);

  const countryName = meta?.countries.find((c) => c.code === country)?.name;
  const scope = country ? `${countryName}, in ${breakdown.data?.currency ?? "local currency"}` : "All countries, in USD";

  if (overview.isError) return <Alert severity="error">Insights could not be loaded. Check that the API is running.</Alert>;
  const o = overview.data;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h1">Pay insights</Typography>
        <Typography color="text.secondary">
          Within a country, figures are in local currency. Across countries they are converted to USD at fixed rates.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ display: "flex", flexWrap: "wrap", "& > *:not(:last-child)": { borderRight: 1, borderColor: "divider" } }}>
        {o ? (
          <>
            <Figure label="People" value={formatNumber(o.headcount)} />
            <Figure label="Countries" value={String(o.country_count)} />
            <Figure label="Annual payroll (USD)" value={formatMoney(o.total_payroll_usd, "USD", true)} />
            <Figure label="Median salary (USD)" value={o.salary_usd ? formatMoney(o.salary_usd.median, "USD") : "—"} />
          </>
        ) : <Skeleton variant="rectangular" height={88} sx={{ flex: 1 }} />}
      </Paper>

      <Paper variant="outlined">
        <Box sx={{ p: 2 }}>
          <Typography variant="h2">By country</Typography>
          <Typography variant="body2" color="text.secondary">Select a country to break it down below.</Typography>
        </Box>
        <TableContainer>
          <Table size="small" aria-label="Pay by country">
            <TableHead>
              <TableRow>
                <TableCell>Country</TableCell>
                <TableCell align="right">People</TableCell>
                <TableCell align="right">Median (local)</TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Spread (P25–P75 and median)</TableCell>
                <TableCell align="right">Median (USD)</TableCell>
                <TableCell align="right">Payroll (USD)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {o?.by_country.map((c) => (
                <TableRow key={c.country_code} hover selected={country === c.country_code}
                          onClick={() => setCountry(country === c.country_code ? "" : c.country_code)}
                          sx={{ cursor: "pointer" }}>
                  <TableCell>{c.country_name}</TableCell>
                  <TableCell align="right">{formatNumber(c.headcount)}</TableCell>
                  <TableCell align="right">{formatMoney(c.local.median, c.currency)}</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" }, width: 220 }}>
                    <PayBand stats={c.local} currency={c.currency} compact />
                  </TableCell>
                  <TableCell align="right">{formatMoney(c.median_usd, "USD")}</TableCell>
                  <TableCell align="right">{formatMoney(c.payroll_usd, "USD", true)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper variant="outlined">
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} sx={{ p: 2 }}>
          <Box>
            <Typography variant="h2">What we pay by {groupBy === "job_title" ? "job title" : "department"}</Typography>
            <Typography variant="body2" color="text.secondary">{scope}. Sorted by median, highest first.</Typography>
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <TextField select size="small" label="Country" value={country} onChange={(e) => setCountry(e.target.value)} sx={{ minWidth: 180 }}>
              <MenuItem value="">All countries (USD)</MenuItem>
              {meta?.countries.map((c) => <MenuItem key={c.code} value={c.code}>{c.name}</MenuItem>)}
            </TextField>
            <ToggleButtonGroup size="small" exclusive value={groupBy} onChange={(_, v) => v && setGroupBy(v)} aria-label="Group by">
              <ToggleButton value="job_title">Job title</ToggleButton>
              <ToggleButton value="department">Department</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table size="small" stickyHeader aria-label="Pay breakdown">
            <TableHead>
              <TableRow>
                <TableCell>{groupBy === "job_title" ? "Job title" : "Department"}</TableCell>
                <TableCell align="right">People</TableCell>
                <TableCell align="right">Min</TableCell>
                <TableCell align="right">Median</TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Spread</TableCell>
                <TableCell align="right">Max</TableCell>
                <TableCell align="right">Mean</TableCell>
              </TableRow>
            </TableHead>
            <TableBody sx={{ opacity: breakdown.isPlaceholderData ? 0.5 : 1 }}>
              {breakdown.data?.groups.map((g) => {
                const cur = breakdown.data!.currency;
                return (
                  <TableRow key={g.name}>
                    <TableCell>{g.name}</TableCell>
                    <TableCell align="right">{formatNumber(g.headcount)}</TableCell>
                    <TableCell align="right">{formatMoney(g.stats.min, cur)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{formatMoney(g.stats.median, cur)}</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" }, width: 220 }}>
                      <PayBand stats={g.stats} currency={cur} compact />
                    </TableCell>
                    <TableCell align="right">{formatMoney(g.stats.max, cur)}</TableCell>
                    <TableCell align="right">{formatMoney(g.stats.mean, cur)}</TableCell>
                  </TableRow>
                );
              })}
              {breakdown.data?.groups.length === 0 && (
                <TableRow><TableCell colSpan={7} sx={{ py: 4, textAlign: "center" }}>No employees in this country yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h2">Salary distribution</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{scope}. People per salary range.</Typography>
        <Box sx={{ height: 280 }}>
          {distribution.data && (
            <ResponsiveContainer>
              <BarChart data={distribution.data.buckets.map((b) => ({
                ...b, label: formatMoney(b.lower, distribution.data!.currency, true),
              }))}>
                <CartesianGrid vertical={false} stroke={theme.palette.divider} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: theme.palette.text.secondary }} width={48} />
                <Tooltip
                  cursor={{ fill: theme.palette.action.hover }}
                  contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}` }}
                  formatter={(v: number) => [formatNumber(v), "People"]}
                  labelFormatter={(_, p) => {
                    const b = p?.[0]?.payload;
                    const cur = distribution.data!.currency;
                    return b ? `${formatMoney(b.lower, cur)} – ${formatMoney(b.upper, cur)}` : "";
                  }} />
                <Bar dataKey="count" fill={theme.palette.primary.main} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Box>
      </Paper>
    </Stack>
  );
}
