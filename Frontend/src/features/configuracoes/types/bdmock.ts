/**
 * ============================================================================
 * SETTINGS FIXTURES AND MOCKS
 * User preferences and system personalization in memory.
 * ============================================================================
 */

import type {
  ConfiguracoesUsuario,
  AtualizarConfiguracoesDTO,
} from "./settings.types";
import { MOCK_TERAPEUTA_LOGADO } from "@/shared/types";

export const MOCK_CONFIGURACOES_PADRAO: ConfiguracoesUsuario = {
  id: "cfg-1111111-1111-4111-8111-111111111111",
  usuarioId: MOCK_TERAPEUTA_LOGADO.id,
  settings: {
    theme: "Sistema",
    language: "pt",
    autoDelete: "Nunca",
  },
  notificacoes: {
    notificacoesEmail: true,
    alertasEstresseSonoro: true,
    relatorioSemanal: true,
    avisosDesconexao: true,
  },
  acessibilidade: {
    altoContraste: false,
    tamanhoFonte: "normal",
    reducaoMovimento: false,
  },
  atualizadoEm: "2026-01-10T10:00:00.000Z",
};

// Estado volátil em memória
let configuracoesAtuais: ConfiguracoesUsuario = {
  ...MOCK_CONFIGURACOES_PADRAO,
  settings: { ...MOCK_CONFIGURACOES_PADRAO.settings },
  notificacoes: { ...MOCK_CONFIGURACOES_PADRAO.notificacoes },
  acessibilidade: { ...MOCK_CONFIGURACOES_PADRAO.acessibilidade },
};

/**
 * Returns settings for currently authenticated user.
 */
export async function obterConfiguracoesMock(
  usuarioId?: string,
): Promise<ConfiguracoesUsuario> {
  if (usuarioId && usuarioId !== configuracoesAtuais.usuarioId) {
    return {
      ...MOCK_CONFIGURACOES_PADRAO,
      id: `cfg-${usuarioId.slice(0, 8)}`,
      usuarioId,
    };
  }
  return {
    ...configuracoesAtuais,
    settings: { ...configuracoesAtuais.settings },
    notificacoes: { ...configuracoesAtuais.notificacoes },
    acessibilidade: { ...configuracoesAtuais.acessibilidade },
  };
}

/**
 * Partially updates preferences and user settings.
 */
export async function atualizarConfiguracoesMock(
  usuarioId: string,
  dados: AtualizarConfiguracoesDTO,
): Promise<ConfiguracoesUsuario> {
  configuracoesAtuais = {
    ...configuracoesAtuais,
    usuarioId,
    settings: {
      ...configuracoesAtuais.settings,
      ...(dados.settings || {}),
    },
    notificacoes: {
      ...configuracoesAtuais.notificacoes,
      ...(dados.notificacoes || {}),
    },
    acessibilidade: {
      ...configuracoesAtuais.acessibilidade,
      ...(dados.acessibilidade || {}),
    },
    atualizadoEm: new Date().toISOString(),
  };

  return {
    ...configuracoesAtuais,
    settings: { ...configuracoesAtuais.settings },
    notificacoes: { ...configuracoesAtuais.notificacoes },
    acessibilidade: { ...configuracoesAtuais.acessibilidade },
  };
}

/**
 * Restores user settings to system defaults.
 */
export async function resetarConfiguracoesMock(
  usuarioId: string,
): Promise<ConfiguracoesUsuario> {
  configuracoesAtuais = {
    ...MOCK_CONFIGURACOES_PADRAO,
    usuarioId,
    atualizadoEm: new Date().toISOString(),
  };

  return {
    ...configuracoesAtuais,
    settings: { ...configuracoesAtuais.settings },
    notificacoes: { ...configuracoesAtuais.notificacoes },
    acessibilidade: { ...configuracoesAtuais.acessibilidade },
  };
}
