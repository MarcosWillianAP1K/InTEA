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
   * Lista terapeutas cadastrados.
   * Por padrão, filtra apenas terapeutas ativos (Soft Delete).
   * 
   * @param incluirInativos - Se true, inclui terapeutas desativados
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
   * Busca um terapeuta pelo UUID.
   * 
   * @param id - UUID do terapeuta
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
   * Busca um terapeuta pelo endereço de e-mail.
   * 
   * @param email - E-mail cadastrado
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
   * Cadastra um novo terapeuta.
   * Cria o usuário no Supabase Auth (auth.users), disparando o trigger handle_new_user()
   * que insere o registro em public.terapeuta. Se áreas de foco forem informadas, realiza a vinculação.
   * 
   * @param dto - Dados de cadastro e credenciais
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
   * Atualiza os dados de um terapeuta existente.
   * 
   * @param id - UUID do terapeuta
   * @param dto - Dados a atualizar
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
   * SOFT DELETE (Exclusão Lógica):
   * Altera status_ativo para false preservando histórico clínico e relatórios associados.
   * 
   * @param id - UUID do terapeuta
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
   * Reativa um terapeuta inativo.
   * 
   * @param id - UUID do terapeuta
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
   * HARD DELETE (Exclusão Física Permanente para DEV e Testes):
   * Remove o usuário de auth.users, o que propaga a exclusão em cascata (ON DELETE CASCADE)
   * para public.terapeuta e tabelas dependentes.
   * 
   * @param id - UUID do terapeuta
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
   * Autentica um terapeuta com email e senha e retorna o token JWT de acesso.
   * 
   * @param dto - Credenciais de login (email e password)
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
