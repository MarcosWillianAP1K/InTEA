/**
 * ============================================================================
 * MODELOS CANÔNICOS DE AUDITORIA E ADMINISTRAÇÃO (admin.types.ts)
 * Tipagens estritas para trilha de auditoria forense, conformidade LGPD e filtros.
 * Conformidade com RF07 (Gestão SuperAdmin), RF08 (Auditoria de Acessos),
 * RN04 (Isolamento Institucional) e RN05 (Imutabilidade de Registros Clínicos).
 * TypeScript estrito sem o uso de `any`.
 * ============================================================================
 */

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
  | "sessao_finalizada"
  | "sessao_cancelada"
  | "intervencao_dda"
  | "comando_manual"
  | "anotacao_clinica_criada"
  | "anotacao_clinica_editada"
  | "paciente_vinculado"
  | "paciente_desativado"
  | "paciente_reativado"
  | "exportacao_laudo"
  | "login_realizado"
  | "tentativa_acesso_negado";

export interface EventoAuditoria {
  id: string;
  created_at: string;
  terapeuta_id: string | null;
  terapeuta_nome?: string;
  terapeuta_email?: string;
  sessao_id?: string | null;
  paciente_id?: string | null;
  paciente_nome?: string;
  jogo_nome?: string;
  origem: OrigemAuditoria;
  acao: TipoAcaoAuditoria | string;
  descricao?: string;
  ip: string | null;
  user_agent: string | null;
  detalhes_json: Record<string, unknown>;
}

export interface FiltrosAuditoriaDTO {
  busca?: string;
  terapeutaId?: string;
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
