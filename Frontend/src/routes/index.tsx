import DashboardPage from "@/features/dashboard/pages/dashboardPage";
import { BibliotecaJogosPage } from "@/features/jogos/pages/BibliotecaJogosPage";
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

      <Route
        path="/games"
        element={
          //   <AuthGuard mode="public" redirectTo="/chat">
          <BibliotecaJogosPage />
          //   </AuthGuard>
        }
      />
    </RouterRoutes>
  );
}
