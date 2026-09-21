import DashboardPage from "@/features/dashboard/pages/dashboadPage";
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
    </RouterRoutes>
  );
}
