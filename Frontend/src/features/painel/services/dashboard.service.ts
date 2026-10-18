/**
 * ============================================================================
 * SERVIÇO REST DO DOMÍNIO DASHBOARD (dashboard.service.ts)
 * Consome os endpoints de métricas, sessões recentes e alertas do terapeuta
 * com fallback resiliente para bdmock.ts em caso de indisponibilidade da API.
 * Conformidade: RF19 (Painel do Terapeuta), RF20 (Relatórios Clínicos)
 * ============================================================================
 */

import { http, withFallback, ENDPOINTS } from "@/core/api";
import type {
  DashboardMetricas,
  SessaoRecenteResumo,
  AlertaClinico,
  AtividadeRecente,
  DashboardMetricasRespostaApi,
  SessoesRecentesRespostaApi,
  AtividadesRecentesRespostaApi,
  AlertasClinicosRespostaApi,
} from "../types/dashboard.types";
import {
  obterMetricasDashboardMock,
  listarSessoesRecentesMock,
  listarAtividadesRecentesMock,
  listarAlertasClinicosMock,
  marcarAlertaLidoMock,
} from "../types/bdmock";

export const dashboardService = {
  /**
   * Obtém as métricas quantitativas e qualitativas consolidadas do painel.
   */
  obterMetricas: async (): Promise<DashboardMetricas> => {
    return await withFallback(
      async () => {
        const resposta = await http.get<
          DashboardMetricasRespostaApi | DashboardMetricas
        >(ENDPOINTS.DASHBOARD.METRICAS);

        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return resposta as DashboardMetricas;
      },
      () => obterMetricasDashboardMock(),
    );
  },

  /**
   * Lista as sessões clínicas mais recentes do terapeuta logado.
   *
   * @param limite Quantidade máxima de sessões a retornar (padrão: 5).
   */
  listarSessoesRecentes: async (
    limite = 5,
  ): Promise<SessaoRecenteResumo[]> => {
    return await withFallback(
      async () => {
        const resposta = await http.get<
          SessoesRecentesRespostaApi | SessaoRecenteResumo[]
        >(ENDPOINTS.DASHBOARD.SESSOES_RECENTES, {
          params: { limite: limite.toString() },
        });

        if (Array.isArray(resposta)) {
          return resposta;
        }
        return resposta.data ?? [];
      },
      () => listarSessoesRecentesMock(limite),
    );
  },

  /**
   * Lista o feed de atividades recentes no sistema.
   *
   * @param limite Quantidade máxima de atividades a retornar (padrão: 10).
   */
  listarAtividadesRecentes: async (
    limite = 10,
  ): Promise<AtividadeRecente[]> => {
    return await withFallback(
      async () => {
        const resposta = await http.get<
          AtividadesRecentesRespostaApi | AtividadeRecente[]
        >(ENDPOINTS.DASHBOARD.ATIVIDADES, {
          params: { limite: limite.toString() },
        });

        if (Array.isArray(resposta)) {
          return resposta;
        }
        return resposta.data ?? [];
      },
      () => listarAtividadesRecentesMock(limite),
    );
  },

  /**
   * Lista os alertas clínicos emitidos pela telemetria e pelo motor DDA.
   *
   * @param apenasNaoLidos Se verdadeiro, filtra apenas alertas pendentes.
   */
  listarAlertas: async (
    apenasNaoLidos = false,
  ): Promise<AlertaClinico[]> => {
    return await withFallback(
      async () => {
        const resposta = await http.get<
          AlertasClinicosRespostaApi | AlertaClinico[]
        >(ENDPOINTS.DASHBOARD.ALERTAS, {
          params: apenasNaoLidos ? { naoLidos: "true" } : undefined,
        });

        if (Array.isArray(resposta)) {
          return resposta;
        }
        return resposta.data ?? [];
      },
      () => listarAlertasClinicosMock(apenasNaoLidos),
    );
  },

  /**
   * Marca um alerta clínico específico como lido.
   *
   * @param alertaId Identificador do alerta.
   */
  marcarAlertaLido: async (alertaId: string): Promise<boolean> => {
    if (!alertaId || !alertaId.trim()) return false;

    return await withFallback(
      async () => {
        const resposta = await http.patch<{ success: boolean }>(
          ENDPOINTS.DASHBOARD.ALERTA_LIDO(alertaId),
        );
        return resposta.success ?? true;
      },
      () => marcarAlertaLidoMock(alertaId),
    );
  },
};

export default dashboardService;
