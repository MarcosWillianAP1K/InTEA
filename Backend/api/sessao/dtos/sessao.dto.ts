export interface DispositivoInfoDTO {
  tipo_dispositivo?: 'tablet' | 'vr' | 'pc' | 'mobile' | string;
  modelo?: string;
  sistema_operacional?: string;
  resolucao?: string;
  versao_jogo?: string;
  identificador_dispositivo?: string;
  reconectado?: boolean;
}

export interface CriarSessaoDTO {
  terapeuta_id: string;
  jogo_id: string;
  paciente_id?: string | null;
  modo_sessao?: 'sessao_clinica' | 'modo_livre';
  contexto_dda_json?: Record<string, unknown>;
  codigo_pareamento: string;
  dispositivo_info?: DispositivoInfoDTO | null;
  status_sessao?: string;
}

export interface ParearSessaoDTO {
  session_token: string;
  jogo_id?: string;
  dispositivo_info?: DispositivoInfoDTO;
}

export interface PareamentoRespostaDTO {
  sessao_id: string;
  session_token: string;
  status_sessao: string;
  modo_sessao: string;
  jogo?: {
    id: string;
    nome: string;
    versao: string;
  };
  jogo_id?: string;
  paciente_id?: string | null;
  contexto_dda: Record<string, unknown>;
  websocket: {
    url: string;
    canal: string;
  };
  dispositivo_info?: DispositivoInfoDTO | null;
  pareado_em: string;
}

export interface FiltrosSessaoDTO {
  terapeutaId?: string;
  pacienteId?: string;
  jogoId?: string;
  status?: string;
  modo?: string;
  data?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
}

export interface RespostaListagemSessao<T = unknown> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ==============================================================================
// DTOs de Concorrência e Permissões Multi-terapeuta (Sprint 13 — RF13, RF18, RF21)
// ==============================================================================

export interface EspecialistaResponsavelDTO {
  id: string;
  nome?: string;
  especialidade?: string;
  registro_conselho?: string;
}

export interface SessaoAtivaConcorrenteDTO {
  id: string;
  status_sessao: string;
  terapeuta_id: string;
  expira_em?: string;
  data_hora_inicio?: string;
  especialista_responsavel?: EspecialistaResponsavelDTO;
  mesmo_terapeuta?: boolean;
}

export interface ResultadoConcorrenciaDTO {
  conflito: boolean;
  statusHttp?: 409;
  codigo?: string;
  mensagem?: string;
  sessaoAtiva?: SessaoAtivaConcorrenteDTO;
}

export interface ResultadoPermissaoMutacaoDTO {
  permitido: boolean;
  statusHttp?: 403;
  codigo?: 'FORBIDDEN_MUTACAO_CONDUTOR' | string;
  mensagem?: string;
  terapeutaCondutorId?: string;
  usuarioSolicitanteId?: string;
}

