import { Navigate, Outlet, Route, Routes as RouterRoutes } from "react-router-dom";
import { SidebarLayout, FocusLayout } from "@/layout";
import { LoginPage, RedefinirSenhaPage } from "@/features/autenticacao";
import { CadastroPage } from "@/features/autenticacao/pages/CadastroPage";
import { PainelPage } from "@/features/painel";
import { PacientesPage } from "@/features/paciente";
import { TodosPacientesPage } from "@/features/paciente/pages/TodosPacientesPage";
import { PerfilPacientePage } from "@/features/paciente/pages/PerfilPacientePage";
import { HistoricoPacientePage } from "@/features/paciente";
import { BibliotecaJogosPage } from "@/features/jogos";
import { CockpitSessaoPage, ResultadoSessaoPage } from "@/features/sessao";
import { HistoricoSessoesPage } from "@/features/sessao/pages/HistoricoSessoesPage";
import { SettingsPage } from "@/features/configuracoes/pages/settingsPage";
import { AuditoriaAdminPage } from "@/features/admin";
import { SuperAdminGuard } from "./admin.routes";
import { useAuthStore } from "@/features/autenticacao";

/**
 * Authenticated route guard (RF21 / RN04).
 * Redirects unauthenticated users to /login.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function Routes() {
  return (
    <RouterRoutes>
      {/* Porta de Entrada Principal: Login, Cadastro e Redirecionamento da Raiz */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<CadastroPage />} />
      <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
      <Route path="/reset-password" element={<RedefinirSenhaPage />} />

      {/* Rotas Protegidas (Requer Autenticação Ativa) */}
      <Route element={<ProtectedRoute />}>
        {/* Rotas Administrativas e de Gestão (com SidebarLayout) */}
        <Route element={<SidebarLayout />}>
          <Route path="/painel" element={<PainelPage />} />
          <Route path="/pacientes" element={<PacientesPage />} />
          <Route path="/patients" element={<PacientesPage />} />
          <Route path="/pacientes/todos" element={<TodosPacientesPage />} />
          <Route path="/pacientes/:id" element={<PerfilPacientePage />} />
          <Route path="/pacientes/:id/historico" element={<HistoricoPacientePage />} />
          <Route path="/jogos" element={<BibliotecaJogosPage />} />
          <Route path="/games" element={<BibliotecaJogosPage />} />
          <Route path="/historico" element={<HistoricoSessoesPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Rotas Administrativas Exclusivas de SuperAdmin (RF07, RF08) */}
        <Route element={<SuperAdminGuard />}>
          <Route element={<SidebarLayout />}>
            <Route path="/admin/auditoria" element={<AuditoriaAdminPage />} />
          </Route>
        </Route>

        {/* Rotas de Intervenção Clínica e Resultados (com FocusLayout - 100% Foco) */}
        <Route element={<FocusLayout />}>
          <Route
            path="/sessao/:id/monitoramento"
            element={<CockpitSessaoPage />}
          />
          <Route
            path="/sessao/:id/resultado"
            element={<ResultadoSessaoPage />}
          />
        </Route>
      </Route>

      {/* Fallback de rota não encontrada */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </RouterRoutes>
  );
}

export default Routes;
