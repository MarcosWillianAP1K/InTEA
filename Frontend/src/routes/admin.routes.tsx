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
 * Guardião de Rota: Restringe o acesso exclusivamente a usuários com privilégios SuperAdmin (RF07).
 * - Não autenticado: Redireciona para /login.
 * - Usuário comum (sem flag is_super_admin): Redireciona para /painel.
 * - SuperAdmin: Renderiza os nós filhos ou <Outlet />.
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
 * Módulo de Sub-rotas Administrativas (/admin/*).
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
