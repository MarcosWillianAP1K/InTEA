// ==============================================================================
// InTEA: Model da Trilha de Auditoria Clínica de Sessão (Sprint 9 - Task 1.3)
// ==============================================================================
// Conformidade: RF13, RNF06 (LGPD / Segurança), RN04, RN05 (Imutabilidade)
// ==============================================================================

import { supabase } from '../../../core/supabase/supabase.client.js';

export type OrigemAuditoria = 'terapeuta_web' | 'dispositivo_jogo' | 'sistema_dda' | string;

export type AcaoAuditoria =
  | 'sessao_criada'
  | 'dispositivo_pareado'
  | 'sessao_finalizada'
  | 'sessao_cancelada'
  | 'intervencao_dda'
  | 'comando_manual'
  | string;

export interface AuditoriaSessao {
  id: string;
  sessao_id: string;
  terapeuta_id: string | null;
  origem: OrigemAuditoria;
  acao: AcaoAuditoria;
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

export class AuditoriaModel {
  /**
   * Registra um novo evento imutável de auditoria na tabela 'auditoria_sessao'.
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
   * Busca toda a trilha cronológica de auditoria de uma sessão pelo sessao_id.
   * Retorna os eventos em ordem cronológica crescente (do mais antigo ao mais recente).
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
}
