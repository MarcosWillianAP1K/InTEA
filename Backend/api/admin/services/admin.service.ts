import { supabase } from '../../../core/supabase/supabase.client.js';
import { validarUUID } from '../../../core/utils/validators.js';

/**
 * ==============================================================================
 * InTEA: Serviço Administrativo Global (SuperAdmin)
 * ==============================================================================
 * Conformidade: RF07 (Gestão SuperAdmin), RF08 (Auditoria Institucional)
 * Padrões: Clean Architecture, TypeScript estrito sem o uso de `any`
 * ==============================================================================
 */

export interface Clinica {
  id: string;
  nome: string;
  cnpj: string | null;
  status_ativo: boolean;
  created_at: string;
  updated_at: string;
  total_terapeutas?: number;
  total_pacientes?: number;
}

export interface CriarClinicaDTO {
  nome: string;
  cnpj?: string | null;
}

export interface AtualizarClinicaDTO {
  nome?: string;
  cnpj?: string | null;
  status_ativo?: boolean;
}

export interface FiltrosClinicaDTO {
  busca?: string;
  status_ativo?: boolean;
  page?: number;
  limit?: number;
}

export interface TerapeutaAdminInfo {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  crefito: string | null;
  registro_profissional: string | null;
  especialidade: string | null;
  tempo_experiencia_anos: number;
  clinica_id: string | null;
  is_super_admin: boolean;
  status_ativo: boolean;
  created_at: string;
  updated_at: string;
  clinica?: { id: string; nome: string } | null;
  total_pacientes?: number;
}

export interface AtualizarTerapeutaAdminDTO {
  clinica_id?: string | null;
  especialidade?: string | null;
  telefone?: string | null;
  is_super_admin?: boolean;
  crefito?: string | null;
  nome?: string;
  status_ativo?: boolean;
}

export interface FiltrosTerapeutaAdminDTO {
  busca?: string;
  clinica_id?: string;
  status_ativo?: boolean;
  is_super_admin?: boolean;
  page?: number;
  limit?: number;
}

export interface FiltrosAuditoriaConsolidadaDTO {
  clinicaId?: string;
  terapeutaId?: string;
  dataInicio?: string;
  dataFim?: string;
  tipoAcao?: string;
  origem?: string;
  page?: number;
  limit?: number;
}

export interface RespostaListagemPaginada<T> {
  itens: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface EventoAuditoriaAdmin {
  id: string;
  sessao_id: string;
  terapeuta_id: string | null;
  origem: string;
  acao: string;
  detalhes_json: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  terapeuta?: { id: string; nome: string; email: string } | null;
}

export interface ResumoAuditoriaConsolidada {
  auditoria: EventoAuditoriaAdmin[];
  consolidado: {
    totalEventos: number;
    totalTerapeutasAtivos: number;
    eventosPorAcao: Record<string, number>;
    clinica: { id: string; nome: string } | null;
  };
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class AdminServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public detalhes?: unknown
  ) {
    super(message);
    this.name = 'AdminServiceError';
  }
}

export class AdminService {
  // ============================================================================
  // 1. MÓDULO DE CLÍNICAS (RF07)
  // ============================================================================

  /**
   * Lista todas as clínicas parceiras com paginação e contagens agregadas.
   */
  static async listarClinicas(
    filtros: FiltrosClinicaDTO = {}
  ): Promise<RespostaListagemPaginada<Clinica>> {
    const page = Math.max(1, Number(filtros.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filtros.limit) || 10));
    const offset = (page - 1) * limit;

    let query = supabase.from('clinica').select('*', { count: 'exact' });

    if (filtros.busca) {
      const termo = filtros.busca.trim();
      query = query.or(`nome.ilike.%${termo}%,cnpj.ilike.%${termo}%`);
    }

    if (filtros.status_ativo !== undefined) {
      query = query.eq('status_ativo', filtros.status_ativo);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('[AdminService.listarClinicas]', error);
      throw new AdminServiceError('Falha ao listar clínicas no banco de dados.', 500, error.message);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      itens: (data as Clinica[]) || [],
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Busca os detalhes de uma clínica pelo seu UUID.
   */
  static async buscarClinicaPorId(id: string): Promise<Clinica> {
    if (!validarUUID(id)) {
      throw new AdminServiceError('O parâmetro ID da clínica deve ser um UUID válido.', 400);
    }

    const { data, error } = await supabase
      .from('clinica')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[AdminService.buscarClinicaPorId]', error);
      throw new AdminServiceError('Falha ao buscar clínica no banco de dados.', 500, error.message);
    }

    if (!data) {
      throw new AdminServiceError(`Clínica com ID '${id}' não foi encontrada.`, 404);
    }

    return data as Clinica;
  }

  /**
   * Cadastra uma nova instituição parceira no ecossistema InTEA.
   */
  static async criarClinica(dto: CriarClinicaDTO): Promise<Clinica> {
    if (!dto.nome || typeof dto.nome !== 'string' || dto.nome.trim().length < 3) {
      throw new AdminServiceError('O nome da clínica é obrigatório e deve ter ao menos 3 caracteres.', 400);
    }

    // Se informado CNPJ, verifica duplicidade
    if (dto.cnpj) {
      const cnpjNormalizado = dto.cnpj.trim();
      const { data: existente } = await supabase
        .from('clinica')
        .select('id')
        .eq('cnpj', cnpjNormalizado)
        .maybeSingle();

      if (existente) {
        throw new AdminServiceError('Já existe uma clínica cadastrada com este CNPJ.', 409);
      }
    }

    const { data, error } = await supabase
      .from('clinica')
      .insert({
        nome: dto.nome.trim(),
        cnpj: dto.cnpj ? dto.cnpj.trim() : null,
        status_ativo: true,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('[AdminService.criarClinica]', error);
      throw new AdminServiceError('Falha ao registrar nova clínica.', 500, error?.message);
    }

    return data as Clinica;
  }

  /**
   * Atualiza informações cadastrais de uma clínica.
   */
  static async atualizarClinica(id: string, dto: AtualizarClinicaDTO): Promise<Clinica> {
    await this.buscarClinicaPorId(id);

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.nome !== undefined) {
      if (typeof dto.nome !== 'string' || dto.nome.trim().length < 3) {
        throw new AdminServiceError('O nome da clínica deve conter ao menos 3 caracteres.', 400);
      }
      updates.nome = dto.nome.trim();
    }

    if (dto.cnpj !== undefined) {
      if (dto.cnpj !== null) {
        const cnpjNormalizado = dto.cnpj.trim();
        const { data: existente } = await supabase
          .from('clinica')
          .select('id')
          .eq('cnpj', cnpjNormalizado)
          .neq('id', id)
          .maybeSingle();

        if (existente) {
          throw new AdminServiceError('O CNPJ informado já está em uso por outra clínica.', 409);
        }
        updates.cnpj = cnpjNormalizado;
      } else {
        updates.cnpj = null;
      }
    }

    if (dto.status_ativo !== undefined) {
      updates.status_ativo = Boolean(dto.status_ativo);
    }

    const { data, error } = await supabase
      .from('clinica')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      console.error('[AdminService.atualizarClinica]', error);
      throw new AdminServiceError('Falha ao atualizar clínica.', 500, error?.message);
    }

    return data as Clinica;
  }

  /**
   * Ativa uma clínica parceira permitindo operações no sistema.
   */
  static async ativarClinica(id: string): Promise<Clinica> {
    return this.atualizarClinica(id, { status_ativo: true });
  }

  /**
   * Desativa uma clínica parceira (bloqueio institucional suave).
   */
  static async desativarClinica(id: string): Promise<Clinica> {
    return this.atualizarClinica(id, { status_ativo: false });
  }

  // ============================================================================
  // 2. MÓDULO DE TERAPEUTAS (RF07, RN04)
  // ============================================================================

  /**
   * Lista todos os terapeutas cadastrados com filtros institucionais.
   */
  static async listarTerapeutas(
    filtros: FiltrosTerapeutaAdminDTO = {}
  ): Promise<RespostaListagemPaginada<TerapeutaAdminInfo>> {
    const page = Math.max(1, Number(filtros.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filtros.limit) || 10));
    const offset = (page - 1) * limit;

    let query = supabase.from('terapeuta').select('*, clinica:clinica_id (id, nome)', { count: 'exact' });

    if (filtros.busca) {
      const termo = filtros.busca.trim();
      query = query.or(`nome.ilike.%${termo}%,email.ilike.%${termo}%,crefito.ilike.%${termo}%`);
    }

    if (filtros.clinica_id) {
      if (!validarUUID(filtros.clinica_id)) {
        throw new AdminServiceError('clinica_id deve ser um UUID válido.', 400);
      }
      query = query.eq('clinica_id', filtros.clinica_id);
    }

    if (filtros.status_ativo !== undefined) {
      query = query.eq('status_ativo', filtros.status_ativo);
    }

    if (filtros.is_super_admin !== undefined) {
      query = query.eq('is_super_admin', filtros.is_super_admin);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('[AdminService.listarTerapeutas]', error);
      throw new AdminServiceError('Falha ao listar terapeutas.', 500, error.message);
    }

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      itens: (data as unknown as TerapeutaAdminInfo[]) || [],
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Busca perfil de um terapeuta pelo UUID.
   */
  static async buscarTerapeutaPorId(id: string): Promise<TerapeutaAdminInfo> {
    if (!validarUUID(id)) {
      throw new AdminServiceError('O parâmetro ID do terapeuta deve ser um UUID válido.', 400);
    }

    const { data, error } = await supabase
      .from('terapeuta')
      .select('*, clinica:clinica_id (id, nome)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[AdminService.buscarTerapeutaPorId]', error);
      throw new AdminServiceError('Falha ao buscar terapeuta.', 500, error.message);
    }

    if (!data) {
      throw new AdminServiceError(`Terapeuta com ID '${id}' não foi encontrado.`, 404);
    }

    return data as unknown as TerapeutaAdminInfo;
  }

  /**
   * Atualização de configurações institucionais do terapeuta pelo SuperAdmin.
   */
  static async atualizarTerapeuta(
    id: string,
    dto: AtualizarTerapeutaAdminDTO
  ): Promise<TerapeutaAdminInfo> {
    await this.buscarTerapeutaPorId(id);

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.clinica_id !== undefined) {
      if (dto.clinica_id !== null) {
        if (!validarUUID(dto.clinica_id)) {
          throw new AdminServiceError('clinica_id deve ser um UUID válido.', 400);
        }
        await this.buscarClinicaPorId(dto.clinica_id);
      }
      updates.clinica_id = dto.clinica_id;
    }

    if (dto.especialidade !== undefined) {
      updates.especialidade = dto.especialidade ? dto.especialidade.trim() : null;
    }

    if (dto.telefone !== undefined) {
      updates.telefone = dto.telefone ? dto.telefone.trim() : null;
    }

    if (dto.crefito !== undefined) {
      updates.crefito = dto.crefito ? dto.crefito.trim() : null;
    }

    if (dto.nome !== undefined) {
      if (typeof dto.nome !== 'string' || dto.nome.trim().length < 2) {
        throw new AdminServiceError('O nome deve conter ao menos 2 caracteres.', 400);
      }
      updates.nome = dto.nome.trim();
    }

    if (dto.is_super_admin !== undefined) {
      updates.is_super_admin = Boolean(dto.is_super_admin);
    }

    if (dto.status_ativo !== undefined) {
      updates.status_ativo = Boolean(dto.status_ativo);
    }

    const { data, error } = await supabase
      .from('terapeuta')
      .update(updates)
      .eq('id', id)
      .select('*, clinica:clinica_id (id, nome)')
      .single();

    if (error || !data) {
      console.error('[AdminService.atualizarTerapeuta]', error);
      throw new AdminServiceError('Falha ao atualizar dados do terapeuta.', 500, error?.message);
    }

    return data as unknown as TerapeutaAdminInfo;
  }

  /**
   * Ativa a conta institucional de um terapeuta.
   */
  static async ativarTerapeuta(id: string): Promise<TerapeutaAdminInfo> {
    return this.atualizarTerapeuta(id, { status_ativo: true });
  }

  /**
   * Desativa a conta institucional de um terapeuta (impede logins e acessos a prontuários).
   */
  static async desativarTerapeuta(id: string): Promise<TerapeutaAdminInfo> {
    return this.atualizarTerapeuta(id, { status_ativo: false });
  }

  // ============================================================================
  // 3. CONSULTA CONSOLIDADA DE AUDITORIA POR INSTITUIÇÃO (RF08, RNF06)
  // ============================================================================

  /**
   * Consulta a trilha de auditoria clínica consolidada por clínica ou globalmente.
   */
  static async consultarAuditoriaConsolidada(
    filtros: FiltrosAuditoriaConsolidadaDTO = {}
  ): Promise<ResumoAuditoriaConsolidada> {
    const page = Math.max(1, Number(filtros.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filtros.limit) || 20));
    const offset = (page - 1) * limit;

    let clinicaInfo: { id: string; nome: string } | null = null;
    let terapeutasIdsDaClinica: string[] | null = null;

    if (filtros.clinicaId) {
      if (!validarUUID(filtros.clinicaId)) {
        throw new AdminServiceError('clinicaId deve ser um UUID válido.', 400);
      }
      const clinica = await this.buscarClinicaPorId(filtros.clinicaId);
      clinicaInfo = { id: clinica.id, nome: clinica.nome };

      // Obtém os IDs de terapeutas pertencentes a esta clínica
      const { data: terapeutasClinica } = await supabase
        .from('terapeuta')
        .select('id')
        .eq('clinica_id', filtros.clinicaId);

      terapeutasIdsDaClinica = (terapeutasClinica || []).map((t) => t.id);
    }

    let query = supabase.from('auditoria_sessao').select(
      'id, sessao_id, terapeuta_id, origem, acao, detalhes_json, ip, user_agent, created_at, terapeuta:terapeuta_id (id, nome, email)',
      { count: 'exact' }
    );

    // Se filtrou por clínica e há terapeutas
    if (terapeutasIdsDaClinica !== null) {
      if (terapeutasIdsDaClinica.length > 0) {
        query = query.in('terapeuta_id', terapeutasIdsDaClinica);
      } else {
        // Clínica sem terapeutas: nenhum evento associado
        return {
          auditoria: [],
          consolidado: {
            totalEventos: 0,
            totalTerapeutasAtivos: 0,
            eventosPorAcao: {},
            clinica: clinicaInfo,
          },
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }
    }

    if (filtros.terapeutaId) {
      if (!validarUUID(filtros.terapeutaId)) {
        throw new AdminServiceError('terapeutaId deve ser um UUID válido.', 400);
      }
      query = query.eq('terapeuta_id', filtros.terapeutaId);
    }

    if (filtros.tipoAcao) {
      query = query.eq('acao', filtros.tipoAcao);
    }

    if (filtros.origem) {
      query = query.eq('origem', filtros.origem);
    }

    if (filtros.dataInicio) {
      query = query.gte('created_at', filtros.dataInicio);
    }

    if (filtros.dataFim) {
      query = query.lte('created_at', filtros.dataFim);
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error('[AdminService.consultarAuditoriaConsolidada]', error);
      throw new AdminServiceError('Falha ao consultar logs de auditoria consolidada.', 500, error.message);
    }

    const eventos = (data as unknown as EventoAuditoriaAdmin[]) || [];
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    // Agregação estatística de ações nos eventos recuperados
    const eventosPorAcao: Record<string, number> = {};
    const terapeutasDistintos = new Set<string>();

    eventos.forEach((ev) => {
      eventosPorAcao[ev.acao] = (eventosPorAcao[ev.acao] || 0) + 1;
      if (ev.terapeuta_id) terapeutasDistintos.add(ev.terapeuta_id);
    });

    return {
      auditoria: eventos,
      consolidado: {
        totalEventos: total,
        totalTerapeutasAtivos: terapeutasDistintos.size,
        eventosPorAcao,
        clinica: clinicaInfo,
      },
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}
