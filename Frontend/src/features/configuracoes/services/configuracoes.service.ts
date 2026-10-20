/**
 * ============================================================================
 * SERVIÇO REST DO DOMÍNIO SETTINGS (settings.service.ts)
 * Consome os endpoints de preferências do usuário com fallback resiliente para bdmock.ts.
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
   * Obtém as configurações e preferências do usuário autenticado.
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
   * Atualiza as configurações de tema, idioma, notificações e acessibilidade.
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
   * Restaura todas as preferências para os valores padrão.
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
