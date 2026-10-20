/**
 * ============================================================================
 * SERVIÇO REST DO DOMÍNIO TERAPEUTA (terapeuta.service.ts)
 * Consome os endpoints centralizados ENDPOINTS.TERAPEUTA via http-client
 * com fallback resiliente para bdmock.ts em caso de indisponibilidade.
 * Conformidade: RF21 (Autoria), RN04 (Vínculo e Clínica), RN05 (Soft Delete)
 * ============================================================================
 */

import { http, withFallback, ENDPOINTS } from "@/core/api";
import type {
  Terapeuta,
  CriarTerapeutaDTO,
  AtualizarTerapeutaDTO,
  TerapeutaRespostaApi,
  TerapeutasListaRespostaApi,
} from "../types/terapeuta.types";
import {
  listarTerapeutasMock,
  buscarTerapeutaMockPorId,
  criarTerapeutaMock,
  atualizarTerapeutaMock,
  inativarTerapeutaMock,
  reativarTerapeutaMock,
} from "../types/bdmock";

export const terapeutaService = {
  /**
   * Lista terapeutas cadastrados na clínica (RF21, RN04, RN05).
   *
   * @param incluirInativos Se verdadeiro, traz também contas desativadas.
   */
  listar: async (incluirInativos = false): Promise<Terapeuta[]> => {
    return await withFallback(
      async () => {
        const params = incluirInativos
          ? { incluirInativos: "true" }
          : undefined;
        const resposta = await http.get<
          TerapeutasListaRespostaApi | Terapeuta[]
        >(ENDPOINTS.TERAPEUTA.BASE, { params });

        if (Array.isArray(resposta)) {
          return resposta;
        }
        return resposta.data ?? [];
      },
      () => listarTerapeutasMock(incluirInativos),
    );
  },

  /**
   * Consulta os detalhes de um terapeuta por UUID.
   */
  buscarPorId: async (id: string): Promise<Terapeuta | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.get<TerapeutaRespostaApi | Terapeuta>(
          ENDPOINTS.TERAPEUTA.BY_ID(id),
        );
        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as Terapeuta) ?? null;
      },
      () => buscarTerapeutaMockPorId(id),
    );
  },

  /**
   * Cadastra novo terapeuta e gera credenciais no Supabase Auth.
   */
  criar: async (dto: CriarTerapeutaDTO): Promise<Terapeuta> => {
    return await withFallback(
      async () => {
        const resposta = await http.post<TerapeutaRespostaApi | Terapeuta>(
          ENDPOINTS.TERAPEUTA.BASE,
          dto,
        );
        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return resposta as Terapeuta;
      },
      () => criarTerapeutaMock(dto),
    );
  },

  /**
   * Atualiza dados profissionais e cadastrais de um terapeuta.
   */
  atualizar: async (
    id: string,
    dto: AtualizarTerapeutaDTO,
  ): Promise<Terapeuta | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.put<TerapeutaRespostaApi | Terapeuta>(
          ENDPOINTS.TERAPEUTA.BY_ID(id),
          dto,
        );
        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as Terapeuta) ?? null;
      },
      () => atualizarTerapeutaMock(id, dto),
    );
  },

  /**
   * Desativa o terapeuta no sistema (Soft Delete - RN05).
   */
  inativar: async (id: string): Promise<Terapeuta | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.delete<TerapeutaRespostaApi | Terapeuta>(
          ENDPOINTS.TERAPEUTA.BY_ID(id),
        );
        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as Terapeuta) ?? null;
      },
      () => inativarTerapeutaMock(id),
    );
  },

  /**
   * Reativa a conta de um terapeuta previamente desativado (RN05).
   */
  reativar: async (id: string): Promise<Terapeuta | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.patch<TerapeutaRespostaApi | Terapeuta>(
          ENDPOINTS.TERAPEUTA.REATIVAR(id),
        );
        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return (resposta as Terapeuta) ?? null;
      },
      () => reativarTerapeutaMock(id),
    );
  },
};

export default terapeutaService;
