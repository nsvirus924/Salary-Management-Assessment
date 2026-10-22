import { Box, Typography, useTheme } from "@mui/material";
import type { SalaryStats } from "../api/types";
import { formatMoney } from "../lib/format";
import { bandPosition, bandRange } from "../lib/payband";

interface Props {
  stats: SalaryStats;
  currency: string;
  /** The employee being compared, drawn as an ochre marker. */
  value?: number;
  compact?: boolean;
}

/**
 * A pay band strip: thin line for min-max, filled block for P25-P75, tick for median,
 * and (optionally) a marker for one person. Readable at a glance in a table row.
 */
export default function PayBand({ stats, currency, value, compact = false }: Props) {
  const theme = useTheme();
  const range = bandRange(stats, value);
  const at = (v: number) => `${bandPosition(v, range)}%`;
  const label = `Pay band ${formatMoney(stats.p25, currency)} to ${formatMoney(stats.p75, currency)}, ` +
    `median ${formatMoney(stats.median, currency)}` +
    (value !== undefined ? `; this employee ${formatMoney(value, currency)}` : "");

  return (
    <Box role="img" aria-label={label} sx={{ minWidth: compact ? 120 : 240 }}>
      <Box sx={{ position: "relative", height: compact ? 14 : 22 }}>
        <Box sx={{ position: "absolute", top: "50%", left: at(stats.min), right: `calc(100% - ${at(stats.max)})`,
                   height: 2, bgcolor: "divider", transform: "translateY(-50%)" }} />
        <Box sx={{ position: "absolute", top: "50%", left: at(stats.p25),
                   width: `calc(${at(stats.p75)} - ${at(stats.p25)})`, minWidth: 2,
                   height: compact ? 8 : 12, bgcolor: "primary.main", opacity: 0.28,
                   borderRadius: 1, transform: "translateY(-50%)" }} />
        <Box sx={{ position: "absolute", top: 0, bottom: 0, left: at(stats.median), width: 2,
                   bgcolor: "primary.main", transform: "translateX(-1px)" }} />
        {value !== undefined && (
          <Box sx={{ position: "absolute", top: "50%", left: at(value), width: 12, height: 12,
                     borderRadius: "50%", bgcolor: "secondary.main",
                     border: `2px solid ${theme.palette.background.paper}`,
                     transform: "translate(-50%, -50%)" }} />
        )}
      </Box>
      {!compact && (
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">{formatMoney(range.min, currency)}</Typography>
          <Typography variant="caption" color="text.secondary">
            P25–P75 {formatMoney(stats.p25, currency)} – {formatMoney(stats.p75, currency)}
          </Typography>
          <Typography variant="caption" color="text.secondary">{formatMoney(range.max, currency)}</Typography>
        </Box>
      )}
    </Box>
  );
}
