import { Route, Routes as RouterRoutes } from "react-router-dom";
import { SidebarLayout, FocusLayout } from "@/layout";
import {
  PainelPage,
  PacientesPage,
  BibliotecaJogosPage,
  ConfiguracoesPage,
  CockpitSessaoPage,
  ResultadoSessaoPage,
} from "@/pages";

export function Routes() {
  return (
    <RouterRoutes>
      {/* Rotas Administrativas e de Gestão (com SidebarLayout) */}
      <Route element={<SidebarLayout />}>
        <Route path="/" element={<PainelPage />} />
        <Route path="/painel" element={<PainelPage />} />
        <Route path="/pacientes" element={<PacientesPage />} />
        <Route path="/patients" element={<PacientesPage />} />
        <Route path="/jogos" element={<BibliotecaJogosPage />} />
        <Route path="/games" element={<BibliotecaJogosPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        <Route path="/settings" element={<ConfiguracoesPage />} />
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
    </RouterRoutes>
  );
}

export default Routes;
