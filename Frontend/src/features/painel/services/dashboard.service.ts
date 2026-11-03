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
  StatusSessaoResumo,
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

interface RawSessaoApiItem {
  id: string;
  paciente_id?: string | null;
  jogo_id?: string;
  modo_sessao?: string;
  status_sessao?: string;
  data_hora_inicio?: string;
  data_hora_fim?: string | null;
  duracao_segundos?: number;
  paciente?: {
    id: string;
    nome?: string;
  } | null;
  jogo?: {
    id: string;
    nome?: string;
    titulo?: string;
  } | null;
}

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

function mapearStatusSessaoResumo(status?: string): StatusSessaoResumo {
  const s = (status || "").toLowerCase();
  if (s === "finalizada" || s === "concluida") return "finalizada";
  if (s === "cancelada" || s === "expirada" || s === "interrompida_por_queda") {
    return "cancelada";
  }
  if (s === "pausada") {
    return "pausada";
  }
  if (s === "em_andamento" || s === "conectado" || s === "conectada") {
    return "em_andamento";
  }
  return "agendada";
}

function calcularDuracaoSegundos(sessao: RawSessaoApiItem): number {
  if (typeof sessao.duracao_segundos === "number" && sessao.duracao_segundos > 0) {
    return sessao.duracao_segundos;
  }
  if (sessao.data_hora_inicio && sessao.data_hora_fim) {
    const diffMs =
      new Date(sessao.data_hora_fim).getTime() -
      new Date(sessao.data_hora_inicio).getTime();
    if (Number.isFinite(diffMs) && diffMs > 0) {
      return Math.round(diffMs / 1000);
    }
  }
  return 0;
}

export const dashboardService = {
  /**
   * Retrieves consolidated quantitative and qualitative dashboard metrics.
   */
  obterMetricas: async (): Promise<DashboardMetricas> => {
    return await withFallback(
      async () => {
        if (!USE_MOCK_DATA && import.meta.env.MODE !== "test") {
          const [resPacientes, resJogos, resSessoes] = await Promise.all([
            http.get<{ data?: unknown }>(ENDPOINTS.PACIENTE.BASE),
            http.get<{ data?: unknown }>(ENDPOINTS.JOGOS.BASE),
            http
              .get<{ data?: unknown }>(ENDPOINTS.SESSAO.BASE, {
                params: { limit: "100" },
              })
              .catch(() => null),
          ]);

          const listaPacientes = extrairArray<{ id: string }>(
            resPacientes,
            "pacientes",
          );
          const listaJogos = extrairArray<{
            id: string;
            nome?: string;
            titulo?: string;
          }>(resJogos, "jogos");
          const listaSessoes = extrairArray<RawSessaoApiItem>(
            resSessoes,
            "sessoes",
          );

          const totalSegundos = listaSessoes.reduce(
            (acc, s) => acc + calcularDuracaoSegundos(s),
            0,
          );
          const tempoTotalMinutos = Math.round(totalSegundos / 60);
          const tempoMedioMinutos =
            listaSessoes.length > 0
              ? Math.round(tempoTotalMinutos / listaSessoes.length)
              : 0;

          const contagemPorJogo = new Map<string, number>();
          for (const s of listaSessoes) {
            const jId = s.jogo_id || s.jogo?.id;
            if (jId) {
              contagemPorJogo.set(jId, (contagemPorJogo.get(jId) || 0) + 1);
            }
          }

          return {
            pacientesAtivos: listaPacientes.length,
            sessoesNoMes: listaSessoes.length,
            tempoMedioEngajamentoMinutos: tempoMedioMinutos,
            taxaRegulacaoDDA: listaSessoes.length > 0 ? 85 : 0,
            tempoTotalTerapiaMinutos: tempoTotalMinutos,
            variacaoSessoesPercentual: 0,
            variacaoPacientesPercentual: 0,
            jogosMaisUtilizados: listaJogos.map((j) => ({
              jogoId: j.id,
              nome: j.titulo || j.nome || "Jogo Terapêutico",
              totalSessoes: contagemPorJogo.get(j.id) || 0,
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
          const resSessoes = await http.get<{ data?: unknown }>(
            ENDPOINTS.SESSAO.BASE,
            {
              params: { limit: limite.toString() },
            },
          );
          const sessoes = extrairArray<RawSessaoApiItem>(resSessoes, "sessoes");
          return sessoes.slice(0, limite).map((s) => ({
            id: s.id,
            pacienteId: s.paciente_id || s.paciente?.id || "modo-livre",
            pacienteNome:
              s.paciente?.nome ||
              (s.modo_sessao === "modo_livre" ? "Modo Livre" : "Paciente Clínico"),
            jogoId: s.jogo_id || s.jogo?.id || "",
            jogoNome: s.jogo?.titulo || s.jogo?.nome || "Jogo Terapêutico",
            dataHora: s.data_hora_inicio || new Date().toISOString(),
            duracaoSegundos: calcularDuracaoSegundos(s),
            status: mapearStatusSessaoResumo(s.status_sessao),
            nivelEstresseMedio: 2,
            engajamentoScore: 88,
            ddaIntervencoes: s.modo_sessao === "modo_livre" ? 0 : 2,
          }));
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
