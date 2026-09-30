// ==============================================================================
// InTEA: Modelo da Tabela Sessão (Contratos, Tipos e Operações no Supabase)
// ==============================================================================

import { supabase } from "../../../core/supabase/supabase.client.js";
import { SessaoTokenService } from "../services/sessao-token.service.js";

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
  codigo_pareamento?: string;
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
      const sessionToken = dados.codigo_pareamento || SessaoTokenService.gerarCodigoPareamento();
      const modoSessao = dados.modo_sessao || 'sessao_clinica';
      const pacienteId = modoSessao === 'modo_livre' ? null : (dados.paciente_id || null);
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
          status_sessao: 'aguardando_pareamento' as StatusSessao,
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
