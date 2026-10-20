// ==============================================================================
// InTEA: Modelo da Tabela Sessão (Contratos, Tipos e Operações no Supabase)
// ==============================================================================

import { supabase } from "../../../core/supabase/supabase.client.js";
import { CriarSessaoDTO, DispositivoInfoDTO, FiltrosSessaoDTO, RespostaListagemSessao } from "../dtos/sessao.dto.js";

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
  INTERROMPIDA_POR_QUEDA: 'interrompida_por_queda',
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
  dispositivo_info?: DispositivoInfoDTO | null;
  status_sessao: StatusSessao;
  data_hora_inicio: string;
  expira_em: string;
  data_hora_fim: string | null;
  created_at: string;
  updated_at: string;
  paciente?: {
    id: string;
    nome: string;
    data_nascimento?: string;
  } | null;
  jogo?: {
    id: string;
    nome: string;
    versao: string;
  };
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
   * Busca sessão ativa pelo código/token de pareamento único (suporta formatos com ou sem hífen)
   */
  static async buscarPorToken(token: string): Promise<Sessao | null> {
    try {
      const tokenLimpo = token.trim().toUpperCase();

      // 1. Busca direta pelo token fornecido
      const { data, error } = await supabase
        .from('sessao')
        .select('*')
        .eq('session_token', tokenLimpo)
        .maybeSingle();

      if (!error && data) return data as Sessao;

      // 2. Se não encontrou, tenta normalizar inserindo o hífen correspondente
      const semHifen = tokenLimpo.replace(/[^A-Z0-9]/g, '');
      let tokenFormatado: string | null = null;

      if (semHifen.length === 6 && !tokenLimpo.includes('-')) {
        tokenFormatado = `${semHifen.slice(0, 3)}-${semHifen.slice(3)}`;
      } else if (semHifen.length === 8 && !tokenLimpo.includes('-')) {
        tokenFormatado = `${semHifen.slice(0, 4)}-${semHifen.slice(4)}`;
      }

      if (tokenFormatado) {
        const { data: dataFormatada, error: errFormatada } = await supabase
          .from('sessao')
          .select('*')
          .eq('session_token', tokenFormatado)
          .maybeSingle();

        if (!errFormatada && dataFormatada) return dataFormatada as Sessao;
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar sessão por token:', error);
      return null;
    }
  }

  /**
   * Efetiva o pareamento remoto, registrando os metadados do dispositivo
   * e alterando o status da sessão para 'em_andamento'.
   */
  static async parearDispositivo(id: string, dispositivoInfo?: DispositivoInfoDTO): Promise<Sessao | null> {
    try {
      const { data, error } = await supabase
        .from('sessao')
        .update({
          status_sessao: STATUS_SESSAO.EM_ANDAMENTO,
          dispositivo_info: dispositivoInfo || {},
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error || !data) return null;
      return data as Sessao;
    } catch (error) {
      console.error('Erro ao parear dispositivo no Supabase:', error);
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

  /**
   * Finaliza formalmente uma sessão clínica, atualizando o status para 'finalizada'
   * e gravando o timestamp exato de encerramento em data_hora_fim.
   */
  static async finalizarSessao(id: string): Promise<Sessao | null> {
    try {
      const dataHoraFim = new Date().toISOString();
      const { data, error } = await supabase
        .from('sessao')
        .update({
          status_sessao: STATUS_SESSAO.FINALIZADA,
          data_hora_fim: dataHoraFim,
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error || !data) return null;
      return data as Sessao;
    } catch (error) {
      console.error('Erro ao finalizar sessão no Supabase:', error);
      return null;
    }
  }

  /**
   * Lista sessões com filtros clínicos, busca temporal, status e paginação.
   * Suporta visão restrita por terapeuta e visão global para administradores.
   */
  static async listar(filtros: FiltrosSessaoDTO = {}): Promise<RespostaListagemSessao<Sessao>> {
    try {
      const rawPage = Number(filtros.page);
      const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
      const rawLimit = Number(filtros.limit);
      const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(100, Math.floor(rawLimit)) : 10;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('sessao')
        .select('*, paciente:paciente_id(id, nome, data_nascimento), jogo:jogo_id(id, nome, versao)', { count: 'exact' });

      // Filtro de visibilidade institucional (RN04)
      if (filtros.terapeutaId) {
        query = query.eq('terapeuta_id', filtros.terapeutaId);
      }

      if (filtros.pacienteId) {
        query = query.eq('paciente_id', filtros.pacienteId);
      }

      if (filtros.jogoId) {
        query = query.eq('jogo_id', filtros.jogoId);
      }

      if (filtros.modo) {
        query = query.eq('modo_sessao', filtros.modo);
      }

      // Mapeamento semântico de status clínico conforme constraints do banco (chk_status_sessao)
      if (filtros.status) {
        const s = filtros.status.toLowerCase().trim();
        if (s === 'concluida' || s === 'concluidas' || s === 'finalizada' || s === 'completo') {
          query = query.eq('status_sessao', STATUS_SESSAO.FINALIZADA);
        } else if (s === 'cancelada' || s === 'canceladas') {
          query = query.eq('status_sessao', STATUS_SESSAO.CANCELADA);
        } else if (s === 'falha') {
          query = query.in('status_sessao', [
            STATUS_SESSAO.CANCELADA,
            STATUS_SESSAO.EXPIRADA,
            STATUS_SESSAO.INTERROMPIDA_POR_QUEDA,
          ]);
        } else if (s === 'pendente' || s === 'pendentes' || s === 'incompleto') {
          query = query.in('status_sessao', [
            STATUS_SESSAO.AGUARDANDO_PAREAMENTO,
            STATUS_SESSAO.CONECTADO,
            STATUS_SESSAO.EM_ANDAMENTO,
          ]);
        } else if (Object.values(STATUS_SESSAO).includes(s as StatusSessao)) {
          query = query.eq('status_sessao', s);
        }
      }

      // Filtros temporais
      if (filtros.data) {
        query = query
          .gte('data_hora_inicio', `${filtros.data}T00:00:00.000Z`)
          .lte('data_hora_inicio', `${filtros.data}T23:59:59.999Z`);
      } else {
        if (filtros.dataInicio) {
          query = query.gte('data_hora_inicio', `${filtros.dataInicio}T00:00:00.000Z`);
        }
        if (filtros.dataFim) {
          query = query.lte('data_hora_inicio', `${filtros.dataFim}T23:59:59.999Z`);
        }
      }

      // Ordenação decrescente: sessões mais recentes primeiro
      query = query.order('data_hora_inicio', { ascending: false });

      // Paginação
      const { data, error, count } = await query.range(offset, offset + limit - 1);

      if (error) {
        console.error('Erro ao listar sessões no Supabase:', error);
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        data: (data || []) as Sessao[],
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      console.error('Erro inesperado ao listar sessões:', error);
      return {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
    }
  }
}
