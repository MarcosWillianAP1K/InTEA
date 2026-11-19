// ==============================================================================
// InTEA: Model da Trilha Unificada de Auditoria do Ecossistema (Item 3)
// ==============================================================================
// Conformidade: RF07, RF08, RF13, RNF05, RNF06 (LGPD / Segurança), RN04, RN05
// Tabela única append-only: public.auditoria_evento
// ==============================================================================

import { supabase } from '../../../core/supabase/supabase.client.js';

export type OrigemAuditoria =
  | 'terapeuta_web'
  | 'dispositivo_jogo'
  | 'sistema_dda'
  | 'sistema_admin'
  | 'api_rest'
  | string;

export type AcaoAuditoria =
  | 'sessao_criada'
  | 'dispositivo_pareado'
  | 'sessao_pausada'
  | 'sessao_retomada'
  | 'sessao_finalizada'
  | 'sessao_cancelada'
  | 'intervencao_dda'
  | 'comando_manual'
  | 'interrompida_por_queda'
  | 'acesso_prontuario'
  | 'tentativa_acesso_negado'
  | 'vinculo_equipe_criado'
  | 'vinculo_equipe_removido'
  | 'login_realizado'
  | 'logout_realizado'
  | 'senha_alterada'
  | 'sessao_auth_revogada'
  | 'terapeuta_criado'
  | 'terapeuta_atualizado'
  | 'terapeuta_desativado'
  | 'terapeuta_reativado'
  | 'paciente_criado'
  | 'paciente_atualizado'
  | 'paciente_desativado'
  | 'paciente_reativado'
  | 'consentimento_lgpd_registrado'
  | 'anotacao_clinica_criada'
  | 'anotacao_clinica_editada'
  | 'anotacao_clinica_excluida'
  | 'anotacao_clinica_reativada'
  | 'clinica_criada'
  | 'clinica_atualizada'
  | 'clinica_ativada'
  | 'clinica_desativada'
  | 'terapeuta_atualizado_admin'
  | 'terapeuta_ativado_admin'
  | 'terapeuta_desativado_admin'
  | 'jogo_cadastrado'
  | 'jogo_atualizado'
  | 'jogo_excluido'
  | 'exportacao_laudo'
  | 'exportacao_prontuario'
  | string;

export interface CriarAuditoriaVinculoDTO {
  paciente_id: string;
  terapeuta_autor_id: string;
  terapeuta_alvo_id: string;
  acao: 'vinculo_equipe_criado' | 'vinculo_equipe_removido';
  ip?: string | null;
  user_agent?: string | null;
}

export interface AuditoriaVinculoRegistro {
  id: string;
  paciente_id: string;
  terapeuta_autor_id: string;
  terapeuta_alvo_id: string;
  acao: 'vinculo_equipe_criado' | 'vinculo_equipe_removido';
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditoriaSessao {
  id: string;
  entidade?: string;
  sessao_id: string | null;
  terapeuta_id: string | null;
  terapeuta_nome?: string;
  terapeuta_email?: string;
  paciente_id?: string | null;
  paciente_nome?: string;
  clinica_id?: string | null;
  clinica_nome?: string;
  recurso_id?: string | null;
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
  entidade?: string;
  sessao_id: string;
  terapeuta_id?: string | null;
  paciente_id?: string | null;
  clinica_id?: string | null;
  recurso_id?: string | null;
  descricao?: string | null;
  origem: OrigemAuditoria;
  acao: AcaoAuditoria;
  detalhes_json?: Record<string, unknown>;
  ip?: string | null;
  user_agent?: string | null;
}

export interface CriarAuditoriaEventoDTO {
  entidade: string;
  acao: AcaoAuditoria;
  origem: OrigemAuditoria;
  terapeuta_id?: string | null;
  paciente_id?: string | null;
  sessao_id?: string | null;
  clinica_id?: string | null;
  recurso_id?: string | null;
  descricao?: string | null;
  detalhes_json?: Record<string, unknown>;
  ip?: string | null;
  user_agent?: string | null;
}

export interface FiltrosAuditoriaDTO {
  busca?: string;
  entidade?: string;
  terapeutaId?: string;
  pacienteId?: string;
  clinicaId?: string | null;
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

interface ItemAuditoriaNormalizado {
  evento: AuditoriaSessao;
  clinicaId?: string | null;
}

function inferirEntidadePorAcao(acao: string): string {
  if (acao === 'acesso_prontuario' || acao.startsWith('paciente_') || acao === 'consentimento_lgpd_registrado') {
    return 'paciente';
  }
  if (acao.startsWith('vinculo_')) return 'vinculo';
  if (acao.startsWith('anotacao_')) return 'anotacao';
  if (acao.startsWith('clinica_')) return 'clinica';
  if (acao.startsWith('jogo_')) return 'jogo';
  if (acao.startsWith('exportacao_')) return 'exportacao';
  if (
    acao === 'login_realizado' ||
    acao === 'logout_realizado' ||
    acao === 'senha_alterada' ||
    acao === 'sessao_auth_revogada' ||
    acao === 'tentativa_acesso_negado'
  ) {
    return 'autenticacao';
  }
  if (acao.startsWith('terapeuta_')) return 'terapeuta';
  return 'sessao';
}

export class AuditoriaModel {
  /**
   * Records a unified ecosystem audit event in `public.auditoria_evento`.
   */
  static async registrarEventoUnificado(dto: CriarAuditoriaEventoDTO): Promise<AuditoriaSessao | null> {
    try {
      if (!dto.entidade || !dto.origem || !dto.acao) {
        console.warn('[AuditoriaModel] entidade, origem e acao sao obrigatorios para registrar auditoria');
        return null;
      }

      const payloadInsert: Record<string, unknown> = {
        entidade: dto.entidade,
        acao: dto.acao,
        origem: dto.origem,
        terapeuta_id: dto.terapeuta_id || null,
        paciente_id: dto.paciente_id || null,
        sessao_id: dto.sessao_id || null,
        clinica_id: dto.clinica_id || null,
        recurso_id: dto.recurso_id || null,
        descricao: dto.descricao || null,
        detalhes_json: dto.detalhes_json || {},
        ip: dto.ip || null,
        user_agent: dto.user_agent || null,
      };

      const { data, error } = await supabase
        .from('auditoria_evento')
        .insert(payloadInsert)
        .select('*')
        .single();

      if (error || !data) {
        console.error('[AuditoriaModel] Erro ao inserir evento em auditoria_evento:', error);
        return null;
      }

      return AuditoriaModel.normalizarLinhaAuditoria(data).evento;
    } catch (err) {
      console.error('[AuditoriaModel] Excecao ao registrar evento unificado:', err);
      return null;
    }
  }

  /**
   * Records a new immutable session audit event in `public.auditoria_evento`.
   */
  static async registrar(dto: CriarAuditoriaDTO): Promise<AuditoriaSessao | null> {
    try {
      if (!dto.sessao_id || !dto.origem || !dto.acao) {
        console.warn('[AuditoriaModel] sessao_id, origem e acao sao obrigatorios para registrar auditoria');
        return null;
      }

      const payloadInsert: Record<string, unknown> = {
        entidade: dto.entidade || 'sessao',
        sessao_id: dto.sessao_id,
        terapeuta_id: dto.terapeuta_id || null,
        origem: dto.origem,
        acao: dto.acao,
        detalhes_json: dto.detalhes_json || {},
        ip: dto.ip || null,
        user_agent: dto.user_agent || null,
      };

      if (dto.paciente_id !== undefined) payloadInsert.paciente_id = dto.paciente_id;
      if (dto.clinica_id !== undefined) payloadInsert.clinica_id = dto.clinica_id;
      if (dto.recurso_id !== undefined) payloadInsert.recurso_id = dto.recurso_id;
      if (dto.descricao !== undefined) payloadInsert.descricao = dto.descricao;

      const { data, error } = await supabase
        .from('auditoria_evento')
        .insert(payloadInsert)
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
   * Records a new immutable team link audit event in `public.auditoria_evento` (RF08, RN05).
   */
  static async registrarVinculo(dto: CriarAuditoriaVinculoDTO): Promise<AuditoriaVinculoRegistro | null> {
    try {
      if (!dto.paciente_id || !dto.terapeuta_autor_id || !dto.terapeuta_alvo_id || !dto.acao) {
        console.warn(
          '[AuditoriaModel] paciente_id, terapeuta_autor_id, terapeuta_alvo_id e acao sao obrigatorios para registrar auditoria de vinculo'
        );
        return null;
      }

      const { data, error } = await supabase
        .from('auditoria_evento')
        .insert({
          entidade: 'vinculo',
          acao: dto.acao,
          origem: 'terapeuta_web',
          paciente_id: dto.paciente_id,
          terapeuta_id: dto.terapeuta_autor_id,
          recurso_id: dto.terapeuta_alvo_id,
          detalhes_json: {
            paciente_id: dto.paciente_id,
            terapeuta_autor_id: dto.terapeuta_autor_id,
            terapeuta_alvo_id: dto.terapeuta_alvo_id,
          },
          ip: dto.ip || null,
          user_agent: dto.user_agent || null,
        })
        .select('*')
        .single();

      if (error || !data) {
        console.error('[AuditoriaModel] Erro ao inserir registro de auditoria de vinculo:', error);
        return null;
      }

      const row = data as Record<string, unknown>;
      const detalhes =
        typeof row.detalhes_json === 'object' && row.detalhes_json !== null
          ? (row.detalhes_json as Record<string, unknown>)
          : {};

      return {
        id: String(row.id),
        paciente_id: String(row.paciente_id || detalhes.paciente_id || dto.paciente_id),
        terapeuta_autor_id: String(row.terapeuta_id || detalhes.terapeuta_autor_id || dto.terapeuta_autor_id),
        terapeuta_alvo_id: String(row.recurso_id || detalhes.terapeuta_alvo_id || dto.terapeuta_alvo_id),
        acao: (row.acao as 'vinculo_equipe_criado' | 'vinculo_equipe_removido') || dto.acao,
        ip: (row.ip as string | null) ?? null,
        user_agent: (row.user_agent as string | null) ?? null,
        created_at: String(row.created_at),
      };
    } catch (err) {
      console.error('[AuditoriaModel] Excecao ao registrar auditoria de vinculo:', err);
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
        .from('auditoria_evento')
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
   * Normalizes a raw row from `auditoria_evento` into an `AuditoriaSessao` item.
   */
  static normalizarLinhaAuditoria(rowRaw: unknown): ItemAuditoriaNormalizado {
    const row = rowRaw as Record<string, unknown> & {
      clinica_id?: string | null;
      clinica?: { id: string; nome: string };
      terapeuta?: { id: string; nome: string; email?: string; clinica_id?: string | null };
      autor?: { id: string; nome: string; email?: string; clinica_id?: string | null };
      alvo?: { id: string; nome: string; email?: string; clinica_id?: string | null };
      paciente?: { id: string; nome: string; clinica_id?: string | null };
      sessao?: {
        id: string;
        paciente_id?: string;
        jogo_id?: string;
        clinica_id?: string | null;
        paciente?: { id: string; nome: string; clinica_id?: string | null };
        jogo?: { id: string; nome: string };
      };
    };

    const detalhesExistentes =
      typeof row.detalhes_json === 'object' && row.detalhes_json !== null
        ? (row.detalhes_json as Record<string, unknown>)
        : {};

    const acao = String(row.acao || '');
    const entidade =
      typeof row.entidade === 'string' && row.entidade.trim() !== ''
        ? row.entidade.trim()
        : inferirEntidadePorAcao(acao);

    const terapeutaIdResolvido =
      (row.terapeuta_id as string | null | undefined) ??
      (row.terapeuta_autor_id as string | null | undefined) ??
      row.terapeuta?.id ??
      row.autor?.id ??
      null;

    const pacienteIdResolvido =
      (row.paciente_id as string | null | undefined) ??
      row.sessao?.paciente_id ??
      row.paciente?.id ??
      (detalhesExistentes.paciente_id as string | null | undefined) ??
      null;

    const sessaoIdResolvido =
      (row.sessao_id as string | null | undefined) ?? row.sessao?.id ?? null;

    const clinicaIdResolvida =
      (row.clinica_id as string | null | undefined) ??
      row.clinica?.id ??
      row.paciente?.clinica_id ??
      row.sessao?.paciente?.clinica_id ??
      row.sessao?.clinica_id ??
      row.terapeuta?.clinica_id ??
      row.autor?.clinica_id ??
      (detalhesExistentes.clinica_id as string | null | undefined) ??
      null;

    const recursoIdResolvido =
      (row.recurso_id as string | null | undefined) ??
      (row.terapeuta_alvo_id as string | null | undefined) ??
      (detalhesExistentes.recurso_id as string | null | undefined) ??
      sessaoIdResolvido ??
      pacienteIdResolvido ??
      null;

    return {
      evento: {
        id: String(row.id),
        entidade,
        sessao_id: sessaoIdResolvido,
        terapeuta_id: terapeutaIdResolvido,
        terapeuta_nome:
          row.terapeuta?.nome || row.autor?.nome || (row.terapeuta_nome as string) || undefined,
        terapeuta_email:
          row.terapeuta?.email || row.autor?.email || (row.terapeuta_email as string) || undefined,
        paciente_id: pacienteIdResolvido,
        paciente_nome:
          row.paciente?.nome || row.sessao?.paciente?.nome || (row.paciente_nome as string) || undefined,
        clinica_id: clinicaIdResolvida,
        clinica_nome: row.clinica?.nome || (row.clinica_nome as string) || undefined,
        recurso_id: recursoIdResolvido,
        jogo_nome: row.sessao?.jogo?.nome || (row.jogo_nome as string) || undefined,
        origem: String(row.origem || 'terapeuta_web'),
        acao,
        descricao: typeof row.descricao === 'string' ? row.descricao : undefined,
        detalhes_json: {
          ...detalhesExistentes,
          ...((row.terapeuta_autor_id || row.terapeuta_alvo_id || acao.startsWith('vinculo_'))
            ? {
                ...(pacienteIdResolvido && !detalhesExistentes.paciente_id
                  ? { paciente_id: pacienteIdResolvido }
                  : {}),
                ...(row.terapeuta_autor_id && !detalhesExistentes.terapeuta_autor_id
                  ? { terapeuta_autor_id: row.terapeuta_autor_id }
                  : {}),
                ...(row.terapeuta_alvo_id && !detalhesExistentes.terapeuta_alvo_id
                  ? { terapeuta_alvo_id: row.terapeuta_alvo_id }
                  : {}),
              }
            : {}),
          ...(row.alvo?.nome && !detalhesExistentes.terapeuta_alvo_nome
            ? { terapeuta_alvo_nome: row.alvo.nome }
            : {}),
          ...(row.alvo?.email && !detalhesExistentes.terapeuta_alvo_email
            ? { terapeuta_alvo_email: row.alvo.email }
            : {}),
        },
        ip: (row.ip as string) || null,
        user_agent: (row.user_agent as string) || null,
        created_at: String(row.created_at),
      },
      clinicaId: clinicaIdResolvida,
    };
  }

  private static aplicarFiltrosNaQuery(queryInicial: unknown, filtros: FiltrosAuditoriaDTO): unknown {
    let query = queryInicial;

    const aplicar = (metodo: 'eq' | 'gte' | 'lte', col: string, val: string): void => {
      const candidate = query as Record<string, unknown> | null | undefined;
      const fn = candidate?.[metodo];
      if (typeof fn === 'function') {
        query = (fn as (c: string, v: string) => unknown).call(candidate, col, val);
      }
    };

    if (filtros.entidade && filtros.entidade !== 'todas') {
      aplicar('eq', 'entidade', filtros.entidade);
    }

    if (filtros.terapeutaId && filtros.terapeutaId !== 'todos') {
      aplicar('eq', 'terapeuta_id', filtros.terapeutaId);
    }

    if (filtros.pacienteId) {
      aplicar('eq', 'paciente_id', filtros.pacienteId);
    }

    if (filtros.clinicaId) {
      aplicar('eq', 'clinica_id', filtros.clinicaId);
    }

    if (filtros.tipoAcao && filtros.tipoAcao !== 'todas') {
      aplicar('eq', 'acao', filtros.tipoAcao);
    }

    if (filtros.origem && filtros.origem !== 'todas') {
      aplicar('eq', 'origem', filtros.origem);
    }

    if (filtros.dataInicio) {
      aplicar('gte', 'created_at', `${filtros.dataInicio}T00:00:00.000Z`);
    }

    if (filtros.dataFim) {
      aplicar('lte', 'created_at', `${filtros.dataFim}T23:59:59.999Z`);
    }

    return query;
  }

  /**
   * Lists unified audit events from `public.auditoria_evento` with pagination and filters.
   */
  static async listarComFiltros(
    filtros: FiltrosAuditoriaDTO = {}
  ): Promise<{ auditoria: AuditoriaSessao[]; total: number }> {
    try {
      const page = Math.max(1, Number(filtros.page) || 1);
      const limit = Math.max(1, Math.min(100, Number(filtros.limit) || 10));
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const selectComJoin =
        '*, terapeuta:terapeuta_id(id, nome, email, clinica_id), paciente:paciente_id(id, nome, clinica_id), clinica:clinica_id(id, nome), sessao:sessao_id(id, paciente_id, jogo_id, paciente:paciente_id(id, nome, clinica_id), jogo:jogo_id(id, nome))';

      const executarConsulta = async (selectExpr: string): Promise<{ itens: ItemAuditoriaNormalizado[]; count: number | null; ok: boolean }> => {
        const tabela = supabase.from('auditoria_evento') as unknown as {
          select?: (cols: string, opts: { count: 'exact' }) => unknown;
        };
        if (!tabela || typeof tabela.select !== 'function') {
          return { itens: [], count: 0, ok: false };
        }

        let query = tabela.select(selectExpr, { count: 'exact' });
        query = AuditoriaModel.aplicarFiltrosNaQuery(query, filtros);

        const qObj = query as Record<string, unknown>;
        if (typeof qObj?.order === 'function') {
          query = (qObj.order as (c: string, o: { ascending: boolean }) => unknown).call(qObj, 'created_at', {
            ascending: false,
          });
        }
        const qAfterOrder = query as Record<string, unknown>;
        if (typeof qAfterOrder?.range === 'function') {
          query = (qAfterOrder.range as (f: number, t: number) => unknown).call(qAfterOrder, from, to);
        }

        const res = (await query) as { data?: unknown[] | null; error?: unknown; count?: number | null } | null;
        if (!res || res.error || !Array.isArray(res.data)) {
          return { itens: [], count: 0, ok: false };
        }

        return {
          itens: res.data.map((row) => AuditoriaModel.normalizarLinhaAuditoria(row)),
          count: typeof res.count === 'number' ? res.count : res.data.length,
          ok: true,
        };
      };

      let resultado = await executarConsulta(selectComJoin);
      if (!resultado.ok) {
        resultado = await executarConsulta('*');
      }

      let itens = resultado.itens;
      const quantidadeOriginal = itens.length;

      if (filtros.entidade && filtros.entidade !== 'todas') {
        itens = itens.filter((item) => item.evento.entidade === filtros.entidade);
      }
      if (filtros.pacienteId) {
        itens = itens.filter(
          (item) =>
            item.evento.paciente_id === filtros.pacienteId ||
            item.evento.detalhes_json?.paciente_id === filtros.pacienteId
        );
      }
      if (filtros.clinicaId) {
        itens = itens.filter(
          (item) => !item.clinicaId || item.clinicaId === filtros.clinicaId
        );
      }
      if (filtros.tipoAcao && filtros.tipoAcao !== 'todas') {
        itens = itens.filter((item) => item.evento.acao === filtros.tipoAcao);
      }
      if (filtros.terapeutaId && filtros.terapeutaId !== 'todos') {
        itens = itens.filter(
          (item) =>
            item.evento.terapeuta_id === filtros.terapeutaId ||
            item.evento.detalhes_json?.terapeuta_autor_id === filtros.terapeutaId ||
            item.evento.detalhes_json?.terapeuta_alvo_id === filtros.terapeutaId
        );
      }
      if (filtros.busca && filtros.busca.trim() !== '') {
        const termo = filtros.busca.trim().toLowerCase();
        itens = itens.filter((item) => {
          const ev = item.evento;
          return [
            ev.terapeuta_nome,
            ev.terapeuta_email,
            ev.paciente_nome,
            ev.clinica_nome,
            ev.entidade,
            ev.acao,
            ev.origem,
            ev.descricao,
            ev.ip,
            ev.sessao_id,
            ev.paciente_id,
            ev.terapeuta_id,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(termo);
        });
      }

      const houveReducaoEmMemoria = itens.length < quantidadeOriginal;
      const formatados = itens.map((item) => item.evento);
      const total = houveReducaoEmMemoria
        ? formatados.length
        : (resultado.count ?? formatados.length);

      return {
        auditoria: formatados,
        total,
      };
    } catch (err) {
      console.error('[AuditoriaModel] Excecao ao listar auditoria com filtros:', err);
      return { auditoria: [], total: 0 };
    }
  }

  /**
   * Aggregates consolidated clinical and ecosystem audit statistics.
   */
  static async obterEstatisticas(): Promise<EstatisticasAuditoriaModel> {
    try {
      const { data, error } = await supabase
        .from('auditoria_evento')
        .select('acao, entidade');

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
        const row = item as { acao: string; entidade?: string };
        const acao = row.acao;
        if (acao === 'acesso_prontuario') {
          acessosProntuario++;
        } else if (
          row.entidade === 'sessao' ||
          ['sessao_criada', 'sessao_finalizada', 'intervencao_dda', 'dispositivo_pareado', 'sessao_pausada', 'sessao_retomada'].includes(acao)
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
