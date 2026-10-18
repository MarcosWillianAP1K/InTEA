/**
 * ============================================================================
 * MODELOS CANÔNICOS DE CONFIGURAÇÕES E PREFERÊNCIAS (settings.types.ts)
 * Preferências visuais, notificações clínicas, acessibilidade e retenção de dados.
 * Conformidade com os requisitos de interface e personalização do terapeuta.
 * ============================================================================
 */

export type PreferenciasTema = "Sistema" | "light" | "dark";
export type IdiomaApp = "pt" | "en" | "es";
export type AutoDeleteOpcao = "7d" | "15d" | "30d" | "Nunca";

export interface Settings {
  theme: PreferenciasTema;
  language: IdiomaApp;
  autoDelete: AutoDeleteOpcao;
}

export interface PreferenciasNotificacao {
  notificacoesEmail: boolean;
  alertasEstresseSonoro: boolean;
  relatorioSemanal: boolean;
  avisosDesconexao: boolean;
}

export interface ConfiguracoesAcessibilidade {
  altoContraste: boolean;
  tamanhoFonte: "normal" | "grande" | "extra-grande";
  reducaoMovimento: boolean;
}

export interface ConfiguracoesUsuario {
  id: string;
  usuarioId: string;
  settings: Settings;
  notificacoes: PreferenciasNotificacao;
  acessibilidade: ConfiguracoesAcessibilidade;
  atualizadoEm: string;
}

export interface AtualizarConfiguracoesDTO {
  settings?: Partial<Settings>;
  notificacoes?: Partial<PreferenciasNotificacao>;
  acessibilidade?: Partial<ConfiguracoesAcessibilidade>;
}

export interface ConfiguracoesRespostaApi {
  data: ConfiguracoesUsuario;
  message?: string;
}
