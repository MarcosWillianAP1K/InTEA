// ==============================================================================
// InTEA: Modelo da Tabela Sessão (Contratos, Tipos e Operações no Supabase)
// ==============================================================================

import { supabase } from "../../../core/supabase/supabase.client.js";
import { SessaoTokenService } from "../services/sessao-token.service.js";

export const MODO_SESSAO = {
  SESSAO_CLINICA: 'sessao_clinica',
  MODO_LIVRE: 'modo_livre',
} as const;

export type ModoSessao = (typeof MODO_SESSAO)[keyof typeof MODO_SESSAO];

export const STATUS_SESSAO = {
  AGUARDANDO_PAREAMENTO: 'aguardando_pareamento',
  CONECTADO: 'conectado',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada',
  EXPIRADA: 'expirada',
  CANCELADA: 'cancelada',
} as const;

export type StatusSessao = (typeof STATUS_SESSAO)[keyof typeof STATUS_SESSAO];

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
  codigo_pareamento: string;
  terapeuta_id: string;
  jogo_id: string;
  paciente_id?: string | null;
  modo_sessao?: ModoSessao;
  contexto_dda_json?: ContextoDDA;
}

export class SessaoModel {
  /**
   * Persiste uma nova sessão no banco de dados Supabase
   */
  static async criar(dados: CriarSessaoDTO): Promise<Sessao | null> {
    try {
      const sessionToken = dados.codigo_pareamento;
      const modoSessao = dados.modo_sessao || MODO_SESSAO.SESSAO_CLINICA;
      const pacienteId = modoSessao === MODO_SESSAO.MODO_LIVRE ? null : (dados.paciente_id || null);
      const expiraEm = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // TTL de 15 minutos (Card 530/556)

      const { data, error } = await supabase
        .from('sessao')
        .insert([{
          terapeuta_id: dados.terapeuta_id,
          paciente_id: pacienteId,
          jogo_id: dados.jogo_id,
          session_token: sessionToken,
          modo_sessao: modoSessao,
          contexto_dda_json: dados.contexto_dda_json || {},
          status_sessao: STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
          expira_em: expiraEm,
        }])
        .select('*')
        .single();

      if (error) {
        console.error('Erro ao criar sessão no Supabase:', error);
        return null;
      }

      return data as Sessao;
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      return null;
    }
  }

  /**
   * Busca uma sessão pelo seu ID primário (UUID)
   */
  static async buscarPorId(id: string): Promise<Sessao | null> {
    try {
      const { data, error } = await supabase
        .from('sessao')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return data as Sessao;
    } catch (error) {
      console.error('Erro ao buscar sessão por id:', error);
      return null;
    }
  }

  /**
   * Busca sessão ativa pelo código/token de pareamento único
   */
  static async buscarPorToken(token: string): Promise<Sessao | null> {
    try {
      const { data, error } = await supabase
        .from('sessao')
        .select('*')
        .eq('session_token', token)
        .single();

      if (error || !data) return null;
      return data as Sessao;
    } catch (error) {
      console.error('Erro ao buscar sessão por token:', error);
      return null;
    }
  }

  /**
   * Atualiza a máquina de estados da sessão
   */
  static async atualizarStatus(id: string, status: StatusSessao): Promise<Sessao | null> {
    try {
      const { data, error } = await supabase
        .from('sessao')
        .update({ status_sessao: status })
        .eq('id', id)
        .select('*')
        .single();

      if (error || !data) return null;
      
      return data as Sessao;
    } catch (error) {
      console.error('Erro ao atualizar status da sessão:', error);
      return null;
    }
  }
}
