/**
 * ============================================================================
 * ENDPOINTS DA API REST DO InTEA
 * Especificação canônica dos caminhos da API para os módulos clínicos e de jogos.
 * Referência: docs/api-pacientes-jogos.md & docs/architecture.md
 * ============================================================================
 */

export const ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
    ALTERAR_SENHA: "/auth/alterar-senha",
    RECUPERAR_SENHA: "/auth/recuperar-senha",
    REDEFINIR_SENHA: "/auth/redefinir-senha",
  },
  TERAPEUTA: {
    BASE: "/terapeuta",
    BY_ID: (id: string) => `/terapeuta/${id}`,
    HARD_DELETE: (id: string) => `/terapeuta/${id}/hard`,
    REATIVAR: (id: string) => `/terapeuta/${id}/reativar`,
  },
  PACIENTE: {
    BASE: "/paciente",
    BY_ID: (id: string) => `/paciente/${id}`,
    HARD_DELETE: (id: string) => `/paciente/${id}/hard`,
    REATIVAR: (id: string) => `/paciente/${id}/reativar`,
    TERAPEUTAS: (id: string) => `/paciente/${id}/terapeutas`,
    TERAPEUTA_BY_ID: (id: string, terapeutaId: string) =>
      `/paciente/${id}/terapeutas/${terapeutaId}`,
    /** RF15, RF19 - General patient engagement history + game catalog */
    HISTORICO: (id: string) => `/paciente/${id}/historico`,
    /** RF15 - Detailed history with time series per specific game */
    HISTORICO_JOGO: (id: string, jogoId: string) =>
      `/paciente/${id}/historico/jogo/${jogoId}`,
  },
  JOGOS: {
    BASE: "/jogos",
    BY_ID: (id: string) => `/jogos/${id}`,
    MANIFESTO: (id: string) => `/jogos/${id}/manifesto`,
  },
  SESSAO: {
    BASE: "/sessao",
    INICIAR: "/sessao/iniciar",
    CODIGO_PAREAMENTO: "/sessao/codigo-pareamento",
    BY_ID: (id: string) => `/sessao/${id}`,
    FINALIZAR: (id: string) => `/sessao/${id}/finalizar`,
    CANCELAR: (id: string) => `/sessao/${id}/cancelar`,
    STATUS: (id: string) => `/sessao/${id}/status`,
    RESULTADO: (id: string) => `/sessao/${id}/resultado`,
    EXPORTAR: (id: string) => `/sessao/${id}/exportar`,
    STATUS_BY_TOKEN: (token: string) => `/sessao/${token}/status`,
    BY_TOKEN: (token: string) => `/sessao/token/${token}`,
    CONTEXTO_SUGERIDO: (pacienteId: string) => `/sessao/contexto-sugerido/${pacienteId}`,
  },
  ANOTACAO: {
    BASE: "/anotacao",
    BY_ID: (id: string) => `/anotacao/${id}`,
    HARD_DELETE: (id: string) => `/anotacao/${id}/hard`,
    REATIVAR: (id: string) => `/anotacao/${id}/reativar`,
    POR_PACIENTE: (pacienteId: string) => `/anotacao/paciente/${pacienteId}`,
    POR_SESSAO: (sessaoId: string) => `/anotacao/sessao/${sessaoId}`,
  },
  DASHBOARD: {
    METRICAS: "/dashboard/metricas",
    SESSOES_RECENTES: "/dashboard/sessoes-recentes",
    ATIVIDADES: "/dashboard/atividades",
    ALERTAS: "/dashboard/alertas",
    ALERTA_LIDO: (id: string) => `/dashboard/alertas/${id}/lido`,
  },
  SETTINGS: {
    BASE: "/settings",
    USUARIO: (id: string) => `/settings/${id}`,
  },
  TEMPLATES: {
    AUTH_LOGIN: "/auth/login",
    AUTH_REFRESH: "/auth/refresh",
    AUTH_LOGOUT: "/auth/logout",
    AUTH_ME: "/auth/me",
    TERAPEUTA_BASE: "/terapeuta",
    TERAPEUTA_BY_ID: "/terapeuta/:id",
    TERAPEUTA_HARD: "/terapeuta/:id/hard",
    TERAPEUTA_REATIVAR: "/terapeuta/:id/reativar",
    PACIENTE_BASE: "/paciente",
    PACIENTE_BY_ID: "/paciente/:id",
    PACIENTE_HARD: "/paciente/:id/hard",
    PACIENTE_REATIVAR: "/paciente/:id/reativar",
    PACIENTE_TERAPEUTAS: "/paciente/:id/terapeutas",
    PACIENTE_TERAPEUTA_ID: "/paciente/:id/terapeutas/:terapeutaId",
    PACIENTE_HISTORICO: "/paciente/:id/historico",
    PACIENTE_HISTORICO_JOGO: "/paciente/:id/historico/jogo/:jogoId",
    JOGOS_BASE: "/jogos",
    JOGOS_BY_ID: "/jogos/:id",
    JOGOS_MANIFESTO: "/jogos/:id/manifesto",
    SESSAO_INICIAR: "/sessao/iniciar",
    SESSAO_CODIGO_PAREAMENTO: "/sessao/codigo-pareamento",
    SESSAO_BY_ID: "/sessao/:id",
    SESSAO_FINALIZAR: "/sessao/:id/finalizar",
    SESSAO_CANCELAR: "/sessao/:id/cancelar",
    SESSAO_STATUS: "/sessao/:id/status",
    SESSAO_RESULTADO: "/sessao/:id/resultado",
    SESSAO_EXPORTAR: "/sessao/:id/exportar",
    SESSAO_TOKEN_STATUS: "/sessao/:token/status",
    SESSAO_BY_TOKEN: "/sessao/token/:token",
    SESSAO_CONTEXTO_SUGERIDO: "/sessao/contexto-sugerido/:pacienteId",
    ANOTACAO_BASE: "/anotacao",
    ANOTACAO_BY_ID: "/anotacao/:id",
    ANOTACAO_HARD: "/anotacao/:id/hard",
    ANOTACAO_REATIVAR: "/anotacao/:id/reativar",
    ANOTACAO_POR_PACIENTE: "/anotacao/paciente/:pacienteId",
    ANOTACAO_POR_SESSAO: "/anotacao/sessao/:sessaoId",
  },
} as const;

export type Endpoints = typeof ENDPOINTS;
