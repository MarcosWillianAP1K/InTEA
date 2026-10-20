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

export const anotacaoService = {
  /**
   * Lista anotações clínicas de um paciente (RF16, RN04, RN05).
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

        if (Array.isArray(resposta)) {
          return resposta;
        }
        return resposta.data ?? [];
      },
      () => listarAnotacoesMock({ paciente_id: pacienteId, ...filtro }),
    );
  },

  /**
   * Consulta uma anotação clínica por seu UUID (RF16, RN04).
   */
  buscarPorId: async (id: string): Promise<AnotacaoClinica | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.get<
          AnotacaoRespostaApi | AnotacaoClinica
        >(ENDPOINTS.ANOTACAO.BY_ID(id));

        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as AnotacaoClinica) ?? null;
      },
      () => buscarAnotacaoMockPorId(id),
    );
  },

  /**
   * Cria nova anotação clínica no prontuário ou vinculada a uma sessão (RF16, RF21).
   */
  criar: async (dto: CriarAnotacaoDTO): Promise<AnotacaoClinica> => {
    return await withFallback(
      async () => {
        const resposta = await http.post<
          AnotacaoRespostaApi | AnotacaoClinica
        >(ENDPOINTS.ANOTACAO.BASE, dto);

        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return resposta as AnotacaoClinica;
      },
      () => criarAnotacaoMock(dto),
    );
  },

  /**
   * Atualiza o conteúdo textual de uma anotação clínica (RF16, RF21).
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

        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as AnotacaoClinica) ?? null;
      },
      () => atualizarAnotacaoMock(id, dto),
    );
  },

  /**
   * Inativa anotação clínica aplicando soft delete (RN05).
   */
  inativar: async (id: string): Promise<AnotacaoClinica | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.delete<
          AnotacaoRespostaApi | AnotacaoClinica
        >(ENDPOINTS.ANOTACAO.BY_ID(id));

        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as AnotacaoClinica) ?? null;
      },
      () => softDeleteAnotacaoMock(id),
    );
  },

  /**
   * Reativa anotação clínica previamente inativada (RN05).
   */
  reativar: async (id: string): Promise<AnotacaoClinica | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.patch<
          AnotacaoRespostaApi | AnotacaoClinica
        >(ENDPOINTS.ANOTACAO.REATIVAR(id));

        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as AnotacaoClinica) ?? null;
      },
      () => reativarAnotacaoMock(id),
    );
  },

  /**
   * Exclusão física permanente (exclusivo para SuperAdmin e testes).
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
