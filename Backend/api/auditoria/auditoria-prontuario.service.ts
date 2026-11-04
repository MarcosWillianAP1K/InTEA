// ==============================================================================
// InTEA: Service da Trilha de Auditoria de Acessos ao Prontuário Médico
// Conformidade: RF08 (Auditoria de Vínculos e Acessos), RNF06 (Segurança / LGPD)
// ==============================================================================

import crypto from 'node:crypto';
import { supabase } from '../../core/supabase/supabase.client.js';
import { validarUUID } from '../../core/utils/validators.js';

export type TipoOperacaoProntuario = 'visualizacao' | 'alteracao' | 'exclusao_logica' | string;

export interface AuditoriaAcessoProntuario {
  id: string;
  paciente_id: string;
  terapeuta_id: string | null;
  operacao: TipoOperacaoProntuario;
  recurso_acessado: string;
  ip: string | null;
  user_agent: string | null;
  detalhes_json: Record<string, unknown>;
  created_at: string;
  terapeuta?: {
    id: string;
    nome: string;
    email: string;
    registro_profissional?: string;
  } | null;
  paciente?: {
    id: string;
    nome: string;
  } | null;
}

export interface RegistrarAcessoProntuarioDTO {
  paciente_id: string;
  terapeuta_id?: string | null;
  operacao: TipoOperacaoProntuario;
  recurso_acessado: string;
  ip?: string | null;
  user_agent?: string | null;
  detalhes_json?: Record<string, unknown>;
}

export interface FiltrosAuditoriaProntuario {
  paciente_id?: string;
  pacienteId?: string;
  terapeuta_id?: string;
  terapeutaId?: string;
  operacao?: string;
  data_inicio?: string;
  dataInicio?: string;
  data_fim?: string;
  dataFim?: string;
  periodo?: string; // ex: 'hoje', '7d', '30d'
  page?: number;
  limit?: number;
}

export interface ResultadoPaginadoAuditoriaProntuario {
  data: AuditoriaAcessoProntuario[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class AuditoriaProntuarioService {
  private static memoriaAuditoria: AuditoriaAcessoProntuario[] = [];

  private static isSupabaseAvailable(): boolean {
    if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
      const fromObj = supabase?.from as unknown as { _isMockFunction?: boolean; mock?: unknown };
      const isMock = typeof supabase?.from === 'function' && Boolean(fromObj?._isMockFunction || fromObj?.mock);
      return isMock;
    }
    const url = process.env.SUPABASE_URL;
    return Boolean(url && !url.includes('placeholder') && !url.includes('your-project'));
  }

  /**
   * Registra um novo acesso ou modificação na trilha imutável de prontuário.
   */
  static async registrarAcesso(dto: RegistrarAcessoProntuarioDTO): Promise<AuditoriaAcessoProntuario | null> {
    if (!dto.paciente_id || !validarUUID(dto.paciente_id)) {
      console.warn('[AuditoriaProntuarioService] paciente_id inválido para registro de auditoria.');
      return null;
    }

    const payload: AuditoriaAcessoProntuario = {
      id: crypto.randomUUID(),
      paciente_id: dto.paciente_id,
      terapeuta_id: dto.terapeuta_id || null,
      operacao: dto.operacao,
      recurso_acessado: dto.recurso_acessado || '/api/paciente',
      ip: dto.ip || null,
      user_agent: dto.user_agent || null,
      detalhes_json: dto.detalhes_json || {},
      created_at: new Date().toISOString(),
    };

    if (this.isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase
          .from('auditoria_acesso_prontuario')
          .insert({
            paciente_id: payload.paciente_id,
            terapeuta_id: payload.terapeuta_id,
            operacao: payload.operacao,
            recurso_acessado: payload.recurso_acessado,
            ip: payload.ip,
            user_agent: payload.user_agent,
            detalhes_json: payload.detalhes_json,
          })
          .select('*')
          .single();

        if (!error && data) {
          return data as AuditoriaAcessoProntuario;
        }
        if (error) {
          console.warn('[AuditoriaProntuarioService] Erro ao persistir no Supabase, usando memória fallback:', error.message);
        }
      } catch (err) {
        console.warn('[AuditoriaProntuarioService] Falha ao conectar ao Supabase, registrando em fallback local:', err);
      }
    }

    this.memoriaAuditoria.unshift(payload);
    return payload;
  }

  /**
   * Registra o evento de forma assíncrona e silenciosa para não degradar a latência da requisição HTTP do usuário.
   */
  static async registrarSilencioso(dto: RegistrarAcessoProntuarioDTO): Promise<void> {
    try {
      await this.registrarAcesso(dto);
    } catch (err) {
      console.error('[AuditoriaProntuarioService] Erro ao registrar log de auditoria silencioso:', err);
    }
  }

  /**
   * Consulta a trilha de auditoria de prontuário com filtros por período, terapeuta e paginação.
   */
  static async consultarAcessos(filtros: FiltrosAuditoriaProntuario = {}): Promise<ResultadoPaginadoAuditoriaProntuario> {
    const page = Math.max(1, Number(filtros.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filtros.limit) || 10));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const terapeutaId = filtros.terapeuta_id || filtros.terapeutaId;
    const pacienteId = filtros.paciente_id || filtros.pacienteId;
    const operacao = filtros.operacao;

    // Resolução de período
    let dataInicio = filtros.data_inicio || filtros.dataInicio;
    let dataFim = filtros.data_fim || filtros.dataFim;

    if (filtros.periodo) {
      const agora = new Date();
      if (filtros.periodo === 'hoje') {
        dataInicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).toISOString();
      } else if (filtros.periodo === '7d') {
        const seteDiasAtras = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);
        dataInicio = seteDiasAtras.toISOString();
      } else if (filtros.periodo === '30d' || filtros.periodo === 'mes') {
        const trintaDiasAtras = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);
        dataInicio = trintaDiasAtras.toISOString();
      }
    }

    if (this.isSupabaseAvailable()) {
      try {
        let query = supabase
          .from('auditoria_acesso_prontuario')
          .select(
            `
            *,
            terapeuta:terapeuta_id ( id, nome, email, crefito ),
            paciente:paciente_id ( id, nome )
          `,
            { count: 'exact' }
          )
          .order('created_at', { ascending: false });

        if (pacienteId) {
          query = query.eq('paciente_id', pacienteId);
        }
        if (terapeutaId) {
          query = query.eq('terapeuta_id', terapeutaId);
        }
        if (operacao) {
          query = query.eq('operacao', operacao);
        }
        if (dataInicio) {
          query = query.gte('created_at', dataInicio);
        }
        if (dataFim) {
          query = query.lte('created_at', dataFim);
        }

        const { data, count, error } = await query.range(from, to);

        if (!error && data) {
          const total = count ?? data.length;
          return {
            data: data as AuditoriaAcessoProntuario[],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
          };
        }
      } catch {
        console.warn('[AuditoriaProntuarioService] Falha na consulta Supabase, usando memória fallback.');
      }
    }

    // Consulta em fallback local em memória
    let filtrados = [...this.memoriaAuditoria];

    if (pacienteId) {
      filtrados = filtrados.filter((item) => item.paciente_id === pacienteId);
    }
    if (terapeutaId) {
      filtrados = filtrados.filter((item) => item.terapeuta_id === terapeutaId);
    }
    if (operacao) {
      filtrados = filtrados.filter((item) => item.operacao.toLowerCase() === operacao.toLowerCase());
    }
    if (dataInicio) {
      const tsInicio = new Date(dataInicio).getTime();
      filtrados = filtrados.filter((item) => new Date(item.created_at).getTime() >= tsInicio);
    }
    if (dataFim) {
      const tsFim = new Date(dataFim).getTime();
      filtrados = filtrados.filter((item) => new Date(item.created_at).getTime() <= tsFim);
    }

    const total = filtrados.length;
    const paginada = filtrados.slice(from, from + limit);

    return {
      data: paginada,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Limpa a memória de auditoria (útil para suítes de testes isoladas).
   */
  static limparMemoria(): void {
    this.memoriaAuditoria = [];
  }
}
