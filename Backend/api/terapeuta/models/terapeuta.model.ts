import { supabase } from '../../../core/supabase/supabase.client.js';

// ==============================================================================
// 1. INTERFACES E DTOs (TypeScript)
// ==============================================================================

/**
 * Representa a entidade Terapeuta mapeada no banco de dados e sincronizada com auth.users.
 */
export interface Terapeuta {
  id: string;                      // UUID sincronizado com auth.users(id)
  nome: string;                    // Nome completo do terapeuta
  email: string;                   // E-mail único de acesso
  telefone: string | null;         // Telefone / WhatsApp de contato
  crefito: string | null;          // Registro no Conselho Profissional (ex: CREFITO)
  registro_profissional: string | null;
  especialidade: string | null;    // Ex: "Terapia Ocupacional", "Psicologia"
  tempo_experiencia_anos: number;  // Anos de experiência clínica
  clinica_id: string | null;       // UUID da clínica vinculada
  is_super_admin: boolean;         // Flag de administrador geral
  status_ativo: boolean;           // Controle de Soft Delete
  created_at: string;
  updated_at: string;
  areas_foco?: any[];              // Áreas de foco associadas (opcional na listagem)
}

/**
 * DTO para cadastro de novo terapeuta.
 * Exige nome, email e senha de acesso.
 */
export interface CriarTerapeutaDTO {
  nome: string;
  email: string;
  password: string;                // Senha para autenticação no Supabase Auth
  telefone?: string | null;
  crefito?: string | null;
  registro_profissional?: string | null;
  especialidade?: string | null;
  tempo_experiencia_anos?: number;
  clinica_id?: string | null;
  is_super_admin?: boolean;
  areas_foco_ids?: string[];       // UUIDs das áreas de foco clínico (opcional)
}

/**
 * DTO para atualização parcial de dados do terapeuta.
 */
export interface AtualizarTerapeutaDTO {
  nome?: string;
  telefone?: string | null;
  crefito?: string | null;
  registro_profissional?: string | null;
  especialidade?: string | null;
  tempo_experiencia_anos?: number;
  clinica_id?: string | null;
  status_ativo?: boolean;
  areas_foco_ids?: string[];
}

/**
 * DTO para login e obtenção de token JWT.
 */
export interface LoginDTO {
  email: string;
  password: string;
}

// ==============================================================================
// 2. MODEL: TerapeutaModel
// ==============================================================================

export class TerapeutaModel {
  /**
   * Lists therapists from the database, filtering active ones by default (RN05).
   *
   * @param incluirInativos - If true, deactivated therapists are included in the results.
   * @returns Array of therapist entities including linked focus areas.
   * @throws {Error} If querying the database fails.
   */
  static async listar(incluirInativos: boolean = false): Promise<Terapeuta[]> {
    let query = supabase
      .from('terapeuta')
      .select('*, areas_foco:terapeuta_area_foco(areas_foco(*))')
      .order('nome', { ascending: true });

    if (!incluirInativos) {
      query = query.eq('status_ativo', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao listar terapeutas: ${error.message}`);
    }

    return (data as Terapeuta[]) || [];
  }

  /**
   * Retrieves a therapist record by their UUID.
   *
   * @param id - The UUID identifier of the therapist.
   * @returns The therapist entity if found, or null otherwise.
   * @throws {Error} If querying the database fails.
   */
  static async buscarPorId(id: string): Promise<Terapeuta | null> {
    const { data, error } = await supabase
      .from('terapeuta')
      .select('*, areas_foco:terapeuta_area_foco(areas_foco(*))')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar terapeuta por ID: ${error.message}`);
    }

    return (data as Terapeuta) || null;
  }

  /**
   * Retrieves a therapist record by their email address.
   *
   * @param email - The registered email address to query.
   * @returns The therapist entity if found, or null otherwise.
   * @throws {Error} If querying the database fails.
   */
  static async buscarPorEmail(email: string): Promise<Terapeuta | null> {
    const { data, error } = await supabase
      .from('terapeuta')
      .select('*, areas_foco:terapeuta_area_foco(areas_foco(*))')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar terapeuta por email: ${error.message}`);
    }

    return (data as Terapeuta) || null;
  }

  /**
   * Registers a new therapist, creating their Supabase Auth credentials and profile record.
   *
   * @param dto - Therapist registration details including email and password.
   * @returns The newly created therapist profile entity.
   * @throws {Error} If Supabase Auth account creation or profile lookup fails.
   */
  static async criar(dto: CriarTerapeutaDTO): Promise<Terapeuta> {
    // 1. Cria usuário autenticado no Supabase Auth via admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: {
        nome: dto.nome,
        telefone: dto.telefone ?? null,
        crefito: dto.crefito ?? dto.registro_profissional ?? null,
        registro_profissional: dto.registro_profissional ?? dto.crefito ?? null,
        especialidade: dto.especialidade ?? null,
        tempo_experiencia_anos: dto.tempo_experiencia_anos ?? 0,
        clinica_id: dto.clinica_id ?? null,
        is_super_admin: dto.is_super_admin ?? false,
      },
    });

    if (authError || !authData?.user) {
      throw new Error(`Erro ao criar conta de autenticação do terapeuta: ${authError?.message}`);
    }

    const terapeutaId = authData.user.id;

    // 2. Se houver áreas de foco para associar, insere na tabela N:N
    if (dto.areas_foco_ids && dto.areas_foco_ids.length > 0) {
      const vinculos = dto.areas_foco_ids.map((area_foco_id) => ({
        terapeuta_id: terapeutaId,
        area_foco_id,
      }));

      const { error: areaError } = await supabase
        .from('terapeuta_area_foco')
        .insert(vinculos);

      if (areaError) {
        console.warn(`[TerapeutaModel.criar] Aviso ao vincular áreas de foco: ${areaError.message}`);
      }
    }

    // 3. Retorna o perfil completo do terapeuta recém-criado
    const perfil = await this.buscarPorId(terapeutaId);
    if (!perfil) {
      throw new Error('Terapeuta criado no Auth, mas o perfil não pôde ser recuperado.');
    }

    return perfil;
  }

  /**
   * Updates fields of an existing therapist and syncs focus area relations.
   *
   * @param id - The UUID identifier of the therapist.
   * @param dto - Fields to update and optional array of focus area UUIDs.
   * @returns The updated therapist profile entity.
   * @throws {Error} If updating the database record fails.
   */
  static async atualizar(id: string, dto: AtualizarTerapeutaDTO): Promise<Terapeuta> {
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (dto.nome !== undefined) payload.nome = dto.nome;
    if (dto.telefone !== undefined) payload.telefone = dto.telefone;
    if (dto.crefito !== undefined) payload.crefito = dto.crefito;
    if (dto.registro_profissional !== undefined) payload.registro_profissional = dto.registro_profissional;
    if (dto.especialidade !== undefined) payload.especialidade = dto.especialidade;
    if (dto.tempo_experiencia_anos !== undefined) payload.tempo_experiencia_anos = dto.tempo_experiencia_anos;
    if (dto.clinica_id !== undefined) payload.clinica_id = dto.clinica_id;
    if (dto.status_ativo !== undefined) payload.status_ativo = dto.status_ativo;

    const { error: updateError } = await supabase
      .from('terapeuta')
      .update(payload)
      .eq('id', id);

    if (updateError) {
      throw new Error(`Erro ao atualizar terapeuta: ${updateError.message}`);
    }

    // Se áreas de foco foram informadas, sincroniza a tabela N:N
    if (dto.areas_foco_ids !== undefined) {
      await supabase.from('terapeuta_area_foco').delete().eq('terapeuta_id', id);

      if (dto.areas_foco_ids.length > 0) {
        const novosVinculos = dto.areas_foco_ids.map((area_foco_id) => ({
          terapeuta_id: id,
          area_foco_id,
        }));
        await supabase.from('terapeuta_area_foco').insert(novosVinculos);
      }
    }

    const atualizado = await this.buscarPorId(id);
    if (!atualizado) {
      throw new Error('Terapeuta atualizado com sucesso, mas o perfil não foi encontrado.');
    }

    return atualizado;
  }

  /**
   * Deactivates a therapist account using soft deletion (RN05).
   *
   * @param id - The UUID identifier of the therapist to deactivate.
   * @returns The updated therapist entity with `status_ativo = false`.
   * @throws {Error} If updating the database record fails.
   */
  static async desativar(id: string): Promise<Terapeuta> {
    const { error } = await supabase
      .from('terapeuta')
      .update({
        status_ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao desativar terapeuta (soft delete): ${error.message}`);
    }

    const desativado = await this.buscarPorId(id);
    return desativado!;
  }

  /**
   * Reactivates an inactive therapist record.
   *
   * @param id - The UUID identifier of the therapist to reactivate.
   * @returns The updated therapist entity with `status_ativo = true`.
   * @throws {Error} If updating the database record fails.
   */
  static async reativar(id: string): Promise<Terapeuta> {
    const { error } = await supabase
      .from('terapeuta')
      .update({
        status_ativo: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Erro ao reativar terapeuta: ${error.message}`);
    }

    const reativado = await this.buscarPorId(id);
    return reativado!;
  }

  /**
   * Permanently deletes a therapist and their auth user credentials (hard delete for dev/tests).
   *
   * @param id - The UUID identifier of the therapist.
   * @returns Resolves when the record is deleted.
   * @throws {Error} If deletion fails.
   */
  static async deletarHard(id: string): Promise<void> {
    const { error } = await supabase.auth.admin.deleteUser(id);

    if (error) {
      // Se não estiver no auth.users ou falhar, tenta deletar diretamente da tabela public.terapeuta
      const { error: tableError } = await supabase.from('terapeuta').delete().eq('id', id);
      if (tableError) {
        throw new Error(`Erro ao deletar terapeuta fisicamente: ${error.message || tableError.message}`);
      }
    }
  }

  /**
   * Authenticates a therapist and generates a JWT session.
   *
   * @param dto - Login credentials containing email and password.
   * @returns Object containing user, session, access token, and therapist profile.
   * @throws {Error} If credentials are invalid or the account is inactive.
   */
  static async login(dto: LoginDTO): Promise<{ user: any; session: any; access_token: string; terapeuta: Terapeuta | null }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data?.session) {
      throw new Error(`Falha no login: ${error?.message || 'Credenciais inválidas'}`);
    }

    const terapeuta = await this.buscarPorId(data.user.id);

    if (terapeuta && !terapeuta.status_ativo) {
      throw new Error('Esta conta de terapeuta encontra-se inativa. Contate o administrador.');
    }

    return {
      user: data.user,
      session: data.session,
      access_token: data.session.access_token,
      terapeuta,
    };
  }
}
