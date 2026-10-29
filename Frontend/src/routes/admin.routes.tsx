/**
 * ============================================================================
 * ROTAS ADMINISTRATIVAS E GUARDIÃO SUPERADMIN (admin.routes.tsx)
 * Proteção de rota restrita para recursos administrativos (RF07, RF08).
 * Impede o acesso indevido de terapeutas comuns sem privilégio de SuperAdmin.
 * ============================================================================
 */

import { type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuthStore } from "@/features/autenticacao/store/authStore";
import { AuditoriaAdminPage } from "@/features/admin/pages/AuditoriaAdminPage";

export interface SuperAdminGuardProps {
  children?: ReactNode;
  redirectTo?: string;
}

/**
 * Route guard component that restricts access exclusively to users with SuperAdmin privileges (RF07).
 * Role-Based Access Control (RF07): Unauthenticated users are redirected to /login, non-admins to /painel.
 *
 * @param props - Guard properties including optional children and fallback redirect path
 * @returns Protected child components, Outlet, or Navigate redirection
 */
export function SuperAdminGuard({
  children,
  redirectTo = "/painel",
}: SuperAdminGuardProps) {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isSuperAdmin = Boolean(
    user?.is_super_admin === true ||
    (user as { role?: string })?.role === "super_admin"
  );

  if (!isSuperAdmin) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

/**
 * Module sub-routes component for administrative features (/admin/*).
 * Administrative Layout: Wraps all admin pages inside SuperAdminGuard protection.
 *
 * @returns Administrative Routes component tree
 */
export function AdminRoutes() {
  return (
    <Routes>
      <Route element={<SuperAdminGuard />}>
        <Route path="auditoria" element={<AuditoriaAdminPage />} />
        <Route path="*" element={<Navigate to="auditoria" replace />} />
      </Route>
    </Routes>
  );
}

export default SuperAdminGuard;
