import { Navigate, Outlet, Route, Routes as RouterRoutes } from "react-router-dom";
import { SidebarLayout, FocusLayout } from "@/layout";
import { LoginPage } from "@/features/autenticacao";
import { PainelPage } from "@/features/painel";
import { PacientesPage } from "@/features/paciente";
import { BibliotecaJogosPage } from "@/features/jogos";
import { CockpitSessaoPage, ResultadoSessaoPage } from "@/features/sessao";
import { useAuthStore } from "@/features/autenticacao";

/**
 * Guardião de rotas autenticadas (RF21 / RN04).
 * Caso o terapeuta não esteja autenticado na sessão ativa, redireciona para /login.
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
      {/* Porta de Entrada Principal: Login e Redirecionamento da Raiz */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Rotas Protegidas (Requer Autenticação Ativa) */}
      <Route element={<ProtectedRoute />}>
        {/* Rotas Administrativas e de Gestão (com SidebarLayout) */}
        <Route element={<SidebarLayout />}>
          <Route path="/painel" element={<PainelPage />} />
          <Route path="/pacientes" element={<PacientesPage />} />
          <Route path="/patients" element={<PacientesPage />} />
          <Route path="/jogos" element={<BibliotecaJogosPage />} />
          <Route path="/games" element={<BibliotecaJogosPage />} />
          {/* Configurações operam exclusivamente via Overlay/Modal */}
          <Route path="/configuracoes" element={<Navigate to="/painel" replace />} />
          <Route path="/settings" element={<Navigate to="/painel" replace />} />
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
