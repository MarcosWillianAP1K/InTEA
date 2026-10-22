/**
 * ============================================================================
 * REST SERVICE FOR DASHBOARD DOMAIN
 * Consumes metrics, recent sessions, and therapist alert endpoints.
 * Compliance: RF19 (Therapist Dashboard), RF20 (Clinical Reports)
 * ============================================================================
 */

import { http, withFallback, ENDPOINTS } from "@/core/api";
import { USE_MOCK_DATA } from "@/core/api/http-client";
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

/**
 * Extracts nested arrays from HTTP responses, supporting both 'data.key' envelopes and direct array payloads.
 *
 * @param res - Raw API response payload.
 * @param chave - Property key containing the target array inside the data object.
 * @returns Strongly-typed array extracted from the response payload.
 */
function extrairArray<T>(res: unknown, chave: string): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (typeof res === "object" && res !== null && "data" in res) {
    const data = (res as { data: unknown }).data;
    if (Array.isArray(data)) return data as T[];
    if (typeof data === "object" && data !== null && chave in data) {
      const sub = (data as Record<string, unknown>)[chave];
      if (Array.isArray(sub)) return sub as T[];
    }
  }
  return [];
}

export const dashboardService = {
  /**
   * Retrieves consolidated quantitative and qualitative dashboard metrics.
   */
  obterMetricas: async (): Promise<DashboardMetricas> => {
    return await withFallback(
      async () => {
        if (!USE_MOCK_DATA && import.meta.env.MODE !== "test") {
          const [resPacientes, resJogos] = await Promise.all([
            http.get<{ data?: Array<{ id: string }> } | Array<{ id: string }>>(
              ENDPOINTS.PACIENTE.BASE,
            ),
            http.get<
              | { data?: Array<{ id: string; nome?: string; titulo?: string }> }
              | Array<{ id: string; nome?: string; titulo?: string }>
            >(ENDPOINTS.JOGOS.BASE),
          ]);

          const listaPacientes = extrairArray<{ id: string }>(resPacientes, "pacientes");
          const listaJogos = extrairArray<{ id: string; nome?: string; titulo?: string }>(resJogos, "jogos");

          return {
            pacientesAtivos: listaPacientes.length,
            sessoesNoMes: 0,
            tempoMedioEngajamentoMinutos: 0,
            taxaRegulacaoDDA: 0,
            tempoTotalTerapiaMinutos: 0,
            variacaoSessoesPercentual: 0,
            variacaoPacientesPercentual: 0,
            jogosMaisUtilizados: listaJogos.map((j) => ({
              jogoId: j.id,
              nome: j.titulo || j.nome || "Jogo Terapêutico",
              totalSessoes: 0,
            })),
          };
        }

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
   * Lists most recent clinical sessions for the authenticated therapist.
   *
   * @param limite - Maximum number of sessions to return (default: 5).
   */
  listarSessoesRecentes: async (
    limite = 5,
  ): Promise<SessaoRecenteResumo[]> => {
    return await withFallback(
      async () => {
        if (!USE_MOCK_DATA && import.meta.env.MODE !== "test") {
          return [];
        }

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
   * Lists recent activity feed across the system.
   *
   * @param limite - Maximum number of activities to return (default: 10).
   */
  listarAtividadesRecentes: async (
    limite = 10,
  ): Promise<AtividadeRecente[]> => {
    return await withFallback(
      async () => {
        if (!USE_MOCK_DATA && import.meta.env.MODE !== "test") {
          return [];
        }

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
   * Lists clinical alerts issued by telemetry and DDA engine.
   *
   * @param apenasNaoLidos - If true, filters only unread alerts.
   */
  listarAlertas: async (
    apenasNaoLidos = false,
  ): Promise<AlertaClinico[]> => {
    return await withFallback(
      async () => {
        if (!USE_MOCK_DATA && import.meta.env.MODE !== "test") {
          return [];
        }

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
   * Marks a specific clinical alert as read.
   *
   * @param alertaId - Unique identifier of the alert.
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

export const painelService = dashboardService;
export default dashboardService;
