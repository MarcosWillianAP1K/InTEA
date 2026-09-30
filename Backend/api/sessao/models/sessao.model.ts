// ==============================================================================
// InTEA: Modelo da Tabela Sessão (Contratos, Tipos e Stubs)
// ==============================================================================

export type ModoSessao = 'sessao_clinica' | 'modo_livre';

export type StatusSessao =
  | 'aguardando_pareamento'
  | 'conectado'
  | 'em_andamento'
  | 'finalizada'
  | 'expirada'
  | 'cancelada';

export interface ContextoDDA {
  estresse_inicial?: number;
  gatilhos_a_evitar?: string[];
  objetivo_clinico?: string;
  [key: string]: unknown;
}

export interface Sessao {
  id: string;
  terapeuta_id: string;
  paciente_id: string | null;
  jogo_id: string;
  session_token: string;
  modo_sessao: ModoSessao;
  contexto_dda_json: ContextoDDA;
  status_sessao: StatusSessao;
  data_hora_inicio: string;
  expira_em: string;
  data_hora_fim: string | null;
  created_at: string;
  updated_at: string;
}

export interface CriarSessaoDTO {
  terapeuta_id: string;
  jogo_id: string;
  paciente_id?: string | null;
  modo_sessao?: ModoSessao;
  contexto_dda_json?: ContextoDDA;
}

export class SessaoModel {
  // Stubs para implementação da lógica de persistência no Supabase
  static async criar(_dados: CriarSessaoDTO): Promise<Sessao | null> {
    return null;
  }

  static async buscarPorId(_id: string): Promise<Sessao | null> {
    return null;
  }

  static async buscarPorToken(_token: string): Promise<Sessao | null> {
    return null;
  }

  static async atualizarStatus(_id: string, _status: StatusSessao): Promise<Sessao | null> {
    return null;
  }
  
}
