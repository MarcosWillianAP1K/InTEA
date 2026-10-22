/**
 * ============================================================================
 * SERVIÇO REST DO DOMÍNIO ANOTAÇÕES CLÍNICAS (anotacao.service.ts)
 * Consome os endpoints centralizados ENDPOINTS.ANOTACAO via http-client
 * com fallback resiliente para bdmock.ts em caso de indisponibilidade.
 * Conformidade: RF16 (Prontuário e Anotações), RF21 (Autoria do Terapeuta),
 *              RN04 (Vínculo e Clínica), RN05 (Inalterabilidade / Soft Delete)
 * TypeScript Estrito: Sem uso de `any`
 * ============================================================================
 */

import { http, withFallback, ENDPOINTS } from "@/core/api";
import type {
  AnotacaoClinica,
  CriarAnotacaoDTO,
  AtualizarAnotacaoDTO,
  FiltroAnotacaoDTO,
  AnotacaoRespostaApi,
  AnotacoesListaRespostaApi,
} from "../types/anotacao.types";
import {
  listarAnotacoesMock,
  buscarAnotacaoMockPorId,
  criarAnotacaoMock,
  atualizarAnotacaoMock,
  softDeleteAnotacaoMock,
  reativarAnotacaoMock,
  deletarHardAnotacaoMock,
} from "../types/bdmock";

/**
 * Serializes clinical annotation search filters into HTTP query parameters.
 *
 * @param filtros - Optional filter criteria for querying clinical notes.
 * @returns Serialized key-value query parameter record, or undefined if no filters are present.
 */
function serializarFiltros(
  filtros?: FiltroAnotacaoDTO,
): Record<string, string> | undefined {
  if (!filtros) return undefined;

  const params: Record<string, string> = {};
  if (filtros.sessao_id) params.sessao_id = filtros.sessao_id;
  if (filtros.incluirInativos !== undefined) {
    params.incluirInativos = String(filtros.incluirInativos);
  }
  if (filtros.somenteSemSessao !== undefined) {
    params.somenteSemSessao = String(filtros.somenteSemSessao);
  }
  if (filtros.page !== undefined) params.page = String(filtros.page);
  if (filtros.limit !== undefined) params.limit = String(filtros.limit);

  return Object.keys(params).length > 0 ? params : undefined;
}

/**
 * Extracts and normalizes a single clinical annotation entity from various API response shapes.
 *
 * @param resposta - Raw HTTP API response or direct annotation entity.
 * @returns Normalized clinical annotation entity, or null if invalid or absent.
 */
function extrairAnotacao(
  resposta: AnotacaoRespostaApi | AnotacaoClinica | { data?: unknown } | null | undefined,
): AnotacaoClinica | null {
  if (!resposta) return null;
  if ("data" in resposta && resposta.data) {
    const d = resposta.data as Record<string, unknown>;
    if ("anotacao" in d && d.anotacao) {
      return d.anotacao as AnotacaoClinica;
    }
    return resposta.data as AnotacaoClinica;
  }
  return resposta as AnotacaoClinica;
}

/**
 * Extracts an array of clinical annotations from varied API response envelopes.
 *
 * @param resposta - Raw response payload or direct array of clinical annotations.
 * @returns Clean array of clinical annotation entities.
 */
function extrairListaAnotacoes(
  resposta: AnotacoesListaRespostaApi | AnotacaoClinica[] | { data?: unknown } | null | undefined,
): AnotacaoClinica[] {
  if (!resposta) return [];
  if (Array.isArray(resposta)) return resposta;
  if ("data" in resposta && resposta.data) {
    if (Array.isArray(resposta.data)) return resposta.data;
    const d = resposta.data as Record<string, unknown>;
    if (Array.isArray(d.anotacoes)) return d.anotacoes as AnotacaoClinica[];
  }
  return [];
}

export const anotacaoService = {
  /**
   * Lists clinical annotations for a patient (RF16, RN04, RN05).
   */
  listarPorPaciente: async (
    pacienteId: string,
    filtro?: FiltroAnotacaoDTO,
  ): Promise<AnotacaoClinica[]> => {
    if (!pacienteId || !pacienteId.trim()) return [];

    return await withFallback(
      async () => {
        const params = serializarFiltros(filtro);
        const resposta = await http.get<
          AnotacoesListaRespostaApi | AnotacaoClinica[]
        >(ENDPOINTS.ANOTACAO.POR_PACIENTE(pacienteId), { params });

        return extrairListaAnotacoes(resposta);
      },
      () => listarAnotacoesMock({ paciente_id: pacienteId, ...filtro }),
    );
  },

  /**
   * Retrieves a clinical annotation by UUID (RF16, RN04).
   */
  buscarPorId: async (id: string): Promise<AnotacaoClinica | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.get<
          AnotacaoRespostaApi | AnotacaoClinica
        >(ENDPOINTS.ANOTACAO.BY_ID(id));

        return extrairAnotacao(resposta);
      },
      () => buscarAnotacaoMockPorId(id),
    );
  },

  /**
   * Creates new clinical note in medical record or linked to session (RF16, RF21).
   */
  criar: async (dto: CriarAnotacaoDTO): Promise<AnotacaoClinica> => {
    return await withFallback(
      async () => {
        const resposta = await http.post<
          AnotacaoRespostaApi | AnotacaoClinica
        >(ENDPOINTS.ANOTACAO.BASE, dto);

        return extrairAnotacao(resposta) as AnotacaoClinica;
      },
      () => criarAnotacaoMock(dto),
    );
  },

  /**
   * Updates textual content of clinical note (RF16, RF21).
   */
  atualizar: async (
    id: string,
    dto: AtualizarAnotacaoDTO,
  ): Promise<AnotacaoClinica | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.patch<
          AnotacaoRespostaApi | AnotacaoClinica
        >(ENDPOINTS.ANOTACAO.BY_ID(id), dto);

        return extrairAnotacao(resposta);
      },
      () => atualizarAnotacaoMock(id, dto),
    );
  },

  /**
   * Inactivates clinical note applying soft delete (RN05).
   */
  inativar: async (id: string): Promise<AnotacaoClinica | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.delete<
          AnotacaoRespostaApi | AnotacaoClinica
        >(ENDPOINTS.ANOTACAO.BY_ID(id));

        return extrairAnotacao(resposta);
      },
      () => softDeleteAnotacaoMock(id),
    );
  },

  /**
   * Reactivates previously inactivated clinical note (RN05).
   */
  reativar: async (id: string): Promise<AnotacaoClinica | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.patch<
          AnotacaoRespostaApi | AnotacaoClinica
        >(ENDPOINTS.ANOTACAO.REATIVAR(id));

        return extrairAnotacao(resposta);
      },
      () => reativarAnotacaoMock(id),
    );
  },

  /**
   * Permanent physical deletion (exclusive for SuperAdmin and testing).
   */
  deletarHard: async (id: string): Promise<boolean> => {
    if (!id || !id.trim()) return false;

    return await withFallback(
      async () => {
        await http.delete(ENDPOINTS.ANOTACAO.HARD_DELETE(id));
        return true;
      },
      () => deletarHardAnotacaoMock(id),
    );
  },
};

export default anotacaoService;
