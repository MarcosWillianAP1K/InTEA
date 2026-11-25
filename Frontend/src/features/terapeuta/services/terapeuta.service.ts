/**
 * ============================================================================
 * REST SERVICE FOR THERAPIST DOMAIN
 * Consumes therapist endpoints with resilient fallback.
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
   * Lists therapists registered in the clinic.
   *
   * @param incluirInativos - If true, includes deactivated accounts.
   */
  listar: async (incluirInativos = false): Promise<Terapeuta[]> => {
    return await withFallback(
      async () => {
        const params = incluirInativos
          ? { incluirInativos: "true" }
          : undefined;
        const resposta = await http.get<
          TerapeutasListaRespostaApi
        >(ENDPOINTS.TERAPEUTA.BASE, { params });
        return resposta.data?.terapeutas ?? [];
      },
      () => listarTerapeutasMock(incluirInativos),
    );
  },

  /**
   * Retrieves therapist details by UUID.
   */
  buscarPorId: async (id: string): Promise<Terapeuta | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.get<TerapeutaRespostaApi>(
          ENDPOINTS.TERAPEUTA.BY_ID(id),
        );
        return resposta.data?.terapeuta ?? null;
      },
      () => buscarTerapeutaMockPorId(id),
    );
  },

  /**
   * Registers new therapist and provisions credentials in Supabase Auth.
   */
  criar: async (dto: CriarTerapeutaDTO): Promise<Terapeuta> => {
    return await withFallback(
      async () => {
        const resposta = await http.post<TerapeutaRespostaApi>(
          ENDPOINTS.TERAPEUTA.BASE,
          dto,
        );
        return resposta.data.terapeuta;
      },
      () => criarTerapeutaMock(dto),
    );
  },

  /**
   * Updates professional and profile data of a therapist.
   */
  atualizar: async (
    id: string,
    dto: AtualizarTerapeutaDTO,
  ): Promise<Terapeuta | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.put<TerapeutaRespostaApi>(
          ENDPOINTS.TERAPEUTA.BY_ID(id),
          dto,
          { timeoutMs: 45_000 },
        );
        return resposta.data?.terapeuta ?? null;
      },
      () => atualizarTerapeutaMock(id, dto),
    );
  },

  /**
   * Deactivates therapist in the system (Soft Delete).
   */
  inativar: async (id: string): Promise<Terapeuta | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.delete<TerapeutaRespostaApi>(
          ENDPOINTS.TERAPEUTA.BY_ID(id),
        );
        return resposta.data?.terapeuta ?? null;
      },
      () => inativarTerapeutaMock(id),
    );
  },

  /**
   * Reactivates account of previously deactivated therapist.
   */
  reativar: async (id: string): Promise<Terapeuta | null> => {
    if (!id || !id.trim()) return null;

    return await withFallback(
      async () => {
        const resposta = await http.patch<TerapeutaRespostaApi>(
          ENDPOINTS.TERAPEUTA.REATIVAR(id),
        );
        return resposta.data?.terapeuta ?? null;
      },
      () => reativarTerapeutaMock(id),
    );
  },
};

export default terapeutaService;
