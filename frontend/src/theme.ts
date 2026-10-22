import { createTheme } from "@mui/material/styles";

type PaletteMode = "light" | "dark";

/**
 * Palette: spruce for actions, ochre reserved for "this person" markers on pay bands,
 * cool paper background. One family (IBM Plex Sans) with tabular figures for money.
 */
const tokens = {
  light: { ink: "#18222B", paper: "#F5F7F6", surface: "#FFFFFF", spruce: "#1E5E57",
           mist: "#DCE6E3", ochre: "#B7791F", muted: "#5A6B68" },
  dark: { ink: "#E6ECEA", paper: "#121816", surface: "#1A2220", spruce: "#6FBFB3",
          mist: "#2C3A37", ochre: "#E0A84A", muted: "#9AABA7" },
};

export function buildTheme(mode: PaletteMode) {
  const t = tokens[mode];
  return createTheme({
    palette: {
      mode,
      primary: { main: t.spruce },
      secondary: { main: t.ochre },
      background: { default: t.paper, paper: t.surface },
      text: { primary: t.ink, secondary: t.muted },
      divider: t.mist,
    },
    shape: { borderRadius: 6 },
    typography: {
      fontFamily: '"IBM Plex Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
      h1: { fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.01em" },
      h2: { fontSize: "1.25rem", fontWeight: 600 },
      h3: { fontSize: "1rem", fontWeight: 600 },
      button: { textTransform: "none", fontWeight: 500 },
    },
    components: {
      MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: "none" } } },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: t.mist, fontVariantNumeric: "tabular-nums" },
          head: { fontWeight: 600, color: t.muted, whiteSpace: "nowrap" },
        },
      },
      MuiButton: { defaultProps: { disableElevation: true } },
    },
  });
}

export const bandColors = tokens;
