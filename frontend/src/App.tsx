import { AppBar, Box, Container, Tab, Tabs, Toolbar, Typography } from "@mui/material";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import EmployeesPage from "./pages/EmployeesPage";

export default function App() {
  const { pathname } = useLocation();
  const tab = pathname.startsWith("/insights") ? "/insights" : "/employees";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="sticky" color="inherit" sx={{ borderBottom: 1, borderColor: "divider" }} elevation={0}>
        <Toolbar sx={{ gap: 3 }}>
          <Typography component="span" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
            ACME Salary Manager
          </Typography>
          <Tabs value={tab} aria-label="Sections">
            <Tab label="Employees" value="/employees" component={Link} to="/employees" />
            <Tab label="Pay insights" value="/insights" component={Link} to="/insights" />
          </Tabs>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/employees" replace />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="*" element={<Navigate to="/employees" replace />} />
        </Routes>
      </Container>
    </Box>
  );
}
