export interface DispositivoInfoDTO {
  tipo_dispositivo?: 'tablet' | 'vr' | 'pc' | 'mobile' | string;
  modelo?: string;
  sistema_operacional?: string;
  resolucao?: string;
  versao_jogo?: string;
  identificador_dispositivo?: string;
}

export interface ParearSessaoDTO {
  session_token: string;
  dispositivo_info?: DispositivoInfoDTO;
}

export interface CriarSessaoDTO {
  terapeuta_id: string;
  paciente_id?: string | null;
  jogo_id: string;
  session_token?: string;
  modo_sessao?: 'sessao_clinica' | 'modo_livre';
  contexto_dda_json?: Record<string, unknown>;
  expira_em?: string;
}

export interface PareamentoRespostaDTO {
  sessao_id: string;
  session_token: string;
  status_sessao: string;
  modo_sessao: string;
  jogo: {
    id: string;
    nome: string;
    versao: string;
  };
  contexto_dda: Record<string, unknown>;
  websocket: {
    url: string;
    canal: string;
  };
  dispositivo_info?: DispositivoInfoDTO | null;
  pareado_em: string;
}
