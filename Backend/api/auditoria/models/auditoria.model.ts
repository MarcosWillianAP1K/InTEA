// ==============================================================================
// InTEA: Model da Trilha de Auditoria Clínica de Sessão (Sprint 9 - Task 1.3)
// ==============================================================================
// Conformidade: RF13, RNF06 (LGPD / Segurança), RN04, RN05 (Imutabilidade)
// ==============================================================================

import { supabase } from '../../../core/supabase/supabase.client.js';

export type OrigemAuditoria = 'terapeuta_web' | 'dispositivo_jogo' | 'sistema_dda' | 'sistema_admin' | 'api_rest' | string;

export type AcaoAuditoria =
  | 'sessao_criada'
  | 'dispositivo_pareado'
  | 'sessao_finalizada'
  | 'sessao_cancelada'
  | 'intervencao_dda'
  | 'comando_manual'
  | 'acesso_prontuario'
  | 'tentativa_acesso_negado'
  | string;

export interface AuditoriaSessao {
  id: string;
  sessao_id: string;
  terapeuta_id: string | null;
  terapeuta_nome?: string;
  terapeuta_email?: string;
  paciente_id?: string | null;
  paciente_nome?: string;
  jogo_nome?: string;
  origem: OrigemAuditoria;
  acao: AcaoAuditoria;
  descricao?: string;
  detalhes_json: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface CriarAuditoriaDTO {
  sessao_id: string;
  terapeuta_id?: string | null;
  origem: OrigemAuditoria;
  acao: AcaoAuditoria;
  detalhes_json?: Record<string, unknown>;
  ip?: string | null;
  user_agent?: string | null;
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

export interface EstatisticasAuditoriaModel {
  totalEventos: number;
  acessosProntuario: number;
  sessoesEIntervencoes: number;
  alertasSeguranca: number;
}

export class AuditoriaModel {
  /**
   * Records a new immutable audit event in the 'auditoria_sessao' table.
   */
  static async registrar(dto: CriarAuditoriaDTO): Promise<AuditoriaSessao | null> {
    try {
      if (!dto.sessao_id || !dto.origem || !dto.acao) {
        console.warn('[AuditoriaModel] sessao_id, origem e acao sao obrigatorios para registrar auditoria');
        return null;
      }

      const { data, error } = await supabase
        .from('auditoria_sessao')
        .insert({
          sessao_id: dto.sessao_id,
          terapeuta_id: dto.terapeuta_id || null,
          origem: dto.origem,
          acao: dto.acao,
          detalhes_json: dto.detalhes_json || {},
          ip: dto.ip || null,
          user_agent: dto.user_agent || null,
        })
        .select('*')
        .single();

      if (error || !data) {
        console.error('[AuditoriaModel] Erro ao inserir registro de auditoria:', error);
        return null;
      }

      return data as AuditoriaSessao;
    } catch (err) {
      console.error('[AuditoriaModel] Excecao ao registrar auditoria:', err);
      return null;
    }
  }

  /**
   * Retrieves the complete chronological audit trail of a session by sessao_id.
   * Returns events in ascending chronological order (oldest to newest).
   */
  static async buscarPorSessaoId(sessaoId: string): Promise<AuditoriaSessao[]> {
    try {
      if (!sessaoId) return [];

      const { data, error } = await supabase
        .from('auditoria_sessao')
        .select('*')
        .eq('sessao_id', sessaoId)
        .order('created_at', { ascending: true });

      if (error || !data) {
        console.error('[AuditoriaModel] Erro ao buscar auditoria da sessao:', error);
        return [];
      }

      return data as AuditoriaSessao[];
    } catch (err) {
      console.error('[AuditoriaModel] Excecao ao buscar auditoria da sessao:', err);
      return [];
    }
  }

  /**
   * Lists audit events with support for pagination, searching, and filtering.
   */
  static async listarComFiltros(
    filtros: FiltrosAuditoriaDTO = {}
  ): Promise<{ auditoria: AuditoriaSessao[]; total: number }> {
    try {
      const page = Math.max(1, Number(filtros.page) || 1);
      const limit = Math.max(1, Math.min(100, Number(filtros.limit) || 10));
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('auditoria_sessao')
        .select(
          '*, terapeuta:terapeuta_id(id, nome, email), sessao:sessao_id(id, paciente_id, jogo_id, paciente:paciente_id(id, nome), jogo:jogo_id(id, nome))',
          { count: 'exact' }
        );

      if (filtros.terapeutaId && filtros.terapeutaId !== 'todos') {
        query = query.eq('terapeuta_id', filtros.terapeutaId);
      }

      if (filtros.tipoAcao && filtros.tipoAcao !== 'todas') {
        query = query.eq('acao', filtros.tipoAcao);
      }

      if (filtros.origem && filtros.origem !== 'todas') {
        query = query.eq('origem', filtros.origem);
      }

      if (filtros.dataInicio) {
        query = query.gte('created_at', `${filtros.dataInicio}T00:00:00.000Z`);
      }

      if (filtros.dataFim) {
        query = query.lte('created_at', `${filtros.dataFim}T23:59:59.999Z`);
      }

      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, error, count } = await query;

      if (error || !data) {
        // Fallback resiliente: consulta simples sem joins
        let fallbackQuery = supabase
          .from('auditoria_sessao')
          .select('*', { count: 'exact' });

        if (filtros.terapeutaId && filtros.terapeutaId !== 'todos') {
          fallbackQuery = fallbackQuery.eq('terapeuta_id', filtros.terapeutaId);
        }
        if (filtros.tipoAcao && filtros.tipoAcao !== 'todas') {
          fallbackQuery = fallbackQuery.eq('acao', filtros.tipoAcao);
        }
        if (filtros.origem && filtros.origem !== 'todas') {
          fallbackQuery = fallbackQuery.eq('origem', filtros.origem);
        }
        if (filtros.dataInicio) {
          fallbackQuery = fallbackQuery.gte('created_at', `${filtros.dataInicio}T00:00:00.000Z`);
        }
        if (filtros.dataFim) {
          fallbackQuery = fallbackQuery.lte('created_at', `${filtros.dataFim}T23:59:59.999Z`);
        }

        fallbackQuery = fallbackQuery.order('created_at', { ascending: false }).range(from, to);
        const fbRes = await fallbackQuery;

        if (fbRes.error || !fbRes.data) {
          return { auditoria: [], total: 0 };
        }

        return {
          auditoria: fbRes.data as AuditoriaSessao[],
          total: fbRes.count ?? fbRes.data.length,
        };
      }

      const formatados: AuditoriaSessao[] = (data as unknown[]).map((rowRaw) => {
        const row = rowRaw as Record<string, unknown> & {
          terapeuta?: { id: string; nome: string; email: string };
          sessao?: {
            id: string;
            paciente_id?: string;
            jogo_id?: string;
            paciente?: { id: string; nome: string };
            jogo?: { id: string; nome: string };
          };
        };

        return {
          id: String(row.id),
          sessao_id: String(row.sessao_id),
          terapeuta_id: (row.terapeuta_id as string) || null,
          terapeuta_nome: row.terapeuta?.nome || undefined,
          terapeuta_email: row.terapeuta?.email || undefined,
          paciente_id: row.sessao?.paciente_id || undefined,
          paciente_nome: row.sessao?.paciente?.nome || undefined,
          jogo_nome: row.sessao?.jogo?.nome || undefined,
          origem: String(row.origem),
          acao: String(row.acao),
          detalhes_json: (row.detalhes_json as Record<string, unknown>) || {},
          ip: (row.ip as string) || null,
          user_agent: (row.user_agent as string) || null,
          created_at: String(row.created_at),
        };
      });

      return {
        auditoria: formatados,
        total: count ?? formatados.length,
      };
    } catch (err) {
      console.error('[AuditoriaModel] Excecao ao listar auditoria com filtros:', err);
      return { auditoria: [], total: 0 };
    }
  }

  /**
   * Aggregates consolidated clinical audit statistics.
   */
  static async obterEstatisticas(): Promise<EstatisticasAuditoriaModel> {
    try {
      const { data, error } = await supabase
        .from('auditoria_sessao')
        .select('acao');

      if (error || !data) {
        return {
          totalEventos: 0,
          acessosProntuario: 0,
          sessoesEIntervencoes: 0,
          alertasSeguranca: 0,
        };
      }

      const totalEventos = data.length;
      let acessosProntuario = 0;
      let sessoesEIntervencoes = 0;
      let alertasSeguranca = 0;

      for (const item of data) {
        const acao = (item as { acao: string }).acao;
        if (acao === 'acesso_prontuario') {
          acessosProntuario++;
        } else if (
          ['sessao_criada', 'sessao_finalizada', 'intervencao_dda', 'dispositivo_pareado'].includes(acao)
        ) {
          sessoesEIntervencoes++;
        } else if (
          ['tentativa_acesso_negado', 'bloqueio_rn04', 'bloqueio_seguranca'].includes(acao)
        ) {
          alertasSeguranca++;
        }
      }

      return {
        totalEventos,
        acessosProntuario,
        sessoesEIntervencoes,
        alertasSeguranca,
      };
    } catch (err) {
      console.error('[AuditoriaModel] Excecao ao obter estatisticas:', err);
      return {
        totalEventos: 0,
        acessosProntuario: 0,
        sessoesEIntervencoes: 0,
        alertasSeguranca: 0,
      };
    }
  }
}
