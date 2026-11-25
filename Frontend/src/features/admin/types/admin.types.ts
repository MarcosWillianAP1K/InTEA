/**
 * ============================================================================
 * MODELOS CANÔNICOS DE AUDITORIA E ADMINISTRAÇÃO (admin.types.ts)
 * Tipagens estritas para trilha de auditoria forense, conformidade LGPD e filtros.
 * TypeScript estrito sem o uso de `any`.
 * ============================================================================
 */

export type EntidadeAuditoria =
  | "autenticacao"
  | "terapeuta"
  | "paciente"
  | "vinculo"
  | "sessao"
  | "anotacao"
  | "clinica"
  | "jogo"
  | "exportacao"
  | string;

export type OrigemAuditoria =
  | "terapeuta_web"
  | "dispositivo_jogo"
  | "sistema_dda"
  | "sistema_admin"
  | "api_rest";

export type TipoAcaoAuditoria =
  | "acesso_prontuario"
  | "sessao_criada"
  | "dispositivo_pareado"
  | "sessao_pausada"
  | "sessao_retomada"
  | "sessao_finalizada"
  | "sessao_cancelada"
  | "intervencao_dda"
  | "comando_manual"
  | "anotacao_clinica_criada"
  | "anotacao_clinica_editada"
  | "anotacao_clinica_excluida"
  | "anotacao_clinica_reativada"
  | "paciente_vinculado"
  | "paciente_criado"
  | "paciente_atualizado"
  | "paciente_desativado"
  | "paciente_reativado"
  | "exportacao_laudo"
  | "exportacao_prontuario"
  | "login_realizado"
  | "logout_realizado"
  | "tentativa_acesso_negado";

export interface EventoAuditoria {
  id: string;
  created_at: string;
  entidade?: EntidadeAuditoria;
  recurso_id?: string | null;
  clinica_id?: string | null;
  clinica_nome?: string;
  terapeuta_id: string | null;
  terapeuta_nome?: string;
  terapeuta_email?: string;
  sessao_id?: string | null;
  paciente_id?: string | null;
  paciente_nome?: string;
  jogo_nome?: string;
  origem: OrigemAuditoria | string;
  acao: TipoAcaoAuditoria | string;
  descricao?: string;
  ip: string | null;
  user_agent: string | null;
  detalhes_json: Record<string, unknown>;
}

export interface FiltrosAuditoriaDTO {
  busca?: string;
  entidade?: string;
  terapeutaId?: string;
  pacienteId?: string;
  clinicaId?: string;
  tipoAcao?: string;
  dataInicio?: string;
  dataFim?: string;
  origem?: string;
  page?: number;
  limit?: number;
}

export interface RespostaPaginadaAuditoria {
  data: EventoAuditoria[];
  total: number;
  meta: {
    page: number;
    limit: number;
    totalPages: number;
    total: number;
  };
}

export interface EstatisticasAuditoria {
  totalEventos: number;
  acessosProntuario: number;
  sessoesEIntervencoes: number;
  alertasSeguranca: number;
}
