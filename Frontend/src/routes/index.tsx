import DashboardPage from "@/features/dashboard/pages/dashboadPage";
import PatientsPage from "@/features/patients/pages/patientsPage";
import { Route, Routes as RouterRoutes } from "react-router-dom";

export function Routes() {
  return (
    <RouterRoutes>
      <Route
        path="/"
        element={
          //   <AuthGuard mode="public" redirectTo="/chat">
          <DashboardPage />
          //   </AuthGuard>
        }
      />
      <Route
        path="/patients"
        element={
          //   <AuthGuard mode="public" redirectTo="/chat">
          <PatientsPage />
          //   </AuthGuard>
        }
      />
    </RouterRoutes>
  );
}
