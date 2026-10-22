/**
 * ============================================================================
 * REST SERVICE FOR SETTINGS DOMAIN
 * Consumes user preference endpoints with resilient fallback to bdmock.ts.
 * ============================================================================
 */

import { http, withFallback, ENDPOINTS } from "@/core/api";
import type {
  ConfiguracoesUsuario,
  AtualizarConfiguracoesDTO,
  ConfiguracoesRespostaApi,
} from "../types/settings.types";
import {
  obterConfiguracoesMock,
  atualizarConfiguracoesMock,
  resetarConfiguracoesMock,
} from "../types/bdmock";

export const configuracoesService = {
  /**
   * Retrieves settings and preferences for authenticated user.
   */
  obter: async (usuarioId?: string): Promise<ConfiguracoesUsuario> => {
    return await withFallback(
      async () => {
        const url = usuarioId
          ? ENDPOINTS.SETTINGS.USUARIO(usuarioId)
          : ENDPOINTS.SETTINGS.BASE;
        const resposta = await http.get<
          ConfiguracoesRespostaApi | ConfiguracoesUsuario
        >(url);

        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return resposta as ConfiguracoesUsuario;
      },
      () => obterConfiguracoesMock(usuarioId),
    );
  },

  /**
   * Updates theme, language, notification, and accessibility settings.
   */
  atualizar: async (
    usuarioId: string,
    dados: AtualizarConfiguracoesDTO,
  ): Promise<ConfiguracoesUsuario> => {
    return await withFallback(
      async () => {
        const resposta = await http.put<
          ConfiguracoesRespostaApi | ConfiguracoesUsuario
        >(ENDPOINTS.SETTINGS.USUARIO(usuarioId), dados);

        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return resposta as ConfiguracoesUsuario;
      },
      () => atualizarConfiguracoesMock(usuarioId, dados),
    );
  },

  /**
   * Restores all user preferences to default values.
   */
  resetar: async (usuarioId: string): Promise<ConfiguracoesUsuario> => {
    return await withFallback(
      async () => {
        const resposta = await http.post<
          ConfiguracoesRespostaApi | ConfiguracoesUsuario
        >(`${ENDPOINTS.SETTINGS.USUARIO(usuarioId)}/reset`);

        if ("data" in resposta && resposta.data) {
          return resposta.data;
        }
        return resposta as ConfiguracoesUsuario;
      },
      () => resetarConfiguracoesMock(usuarioId),
    );
  },
};

export const settingsService = configuracoesService;
export default configuracoesService;
