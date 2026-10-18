/**
 * ============================================================================
 * SERVIÇO REST DO DOMÍNIO JOGOS (jogos.service.ts)
 * Consome os endpoints centralizados ENDPOINTS.JOGOS via http-client
 * com fallback resiliente para bdmock.ts em caso de indisponibilidade.
 * Conformidade: RF04, RF07, RN02 (Tipagem Estrita de Métricas)
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */

import { http, withFallback, ENDPOINTS } from "@/core/api";
import type {
  Jogo,
  ManifestoJogo,
  JogoFiltroDTO,
  FiltrosJogos,
  JogoRespostaApi,
  JogosListaRespostaApi,
  ManifestoRespostaApi,
} from "../types/jogos.types";
import {
  listarJogosMock,
  buscarJogoMockPorId,
  obterManifestoJogoMock,
} from "../types/bdmock";

function serializarFiltros(
  filtros?: JogoFiltroDTO | FiltrosJogos,
): Record<string, string> | undefined {
  if (!filtros) return undefined;

  const params: Record<string, string> = {};
  if (filtros.busca) params.busca = filtros.busca;
  if (filtros.objetivo) params.objetivo = filtros.objetivo;
  if (filtros.status) params.status = filtros.status;
  if (filtros.page !== undefined) params.page = String(filtros.page);
  if (filtros.limit !== undefined) params.limit = String(filtros.limit);

  return Object.keys(params).length > 0 ? params : undefined;
}

export const jogosService = {
  /**
   * Lista todos os jogos terapêuticos disponíveis aplicando filtros de busca e objetivo.
   */
  listar: async (filtros?: JogoFiltroDTO | FiltrosJogos): Promise<Jogo[]> => {
    return await withFallback(
      async () => {
        const params = serializarFiltros(filtros);
        const resposta = await http.get<
          JogosListaRespostaApi | Jogo[]
        >(ENDPOINTS.JOGOS.BASE, { params });

        if (Array.isArray(resposta)) {
          return resposta;
        }
        return resposta.data ?? [];
      },
      () => listarJogosMock(filtros),
    );
  },

  /**
   * Consulta os dados detalhados de um jogo pelo seu ID ou slug canônico.
   */
  buscarPorId: async (id: string): Promise<Jogo | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.get<JogoRespostaApi | Jogo>(
          ENDPOINTS.JOGOS.BY_ID(id),
        );
        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as Jogo) ?? null;
      },
      () => buscarJogoMockPorId(id),
    );
  },

  /**
   * Obtém o manifesto técnico e clínico do jogo com métricas tipadas (RN02).
   */
  obterManifesto: async (id: string): Promise<ManifestoJogo | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.get<
          ManifestoRespostaApi | ManifestoJogo
        >(ENDPOINTS.JOGOS.MANIFESTO(id));

        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as ManifestoJogo) ?? null;
      },
      () => obterManifestoJogoMock(id),
    );
  },
};

export default jogosService;
