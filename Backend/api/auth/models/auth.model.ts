import { supabase } from '../../../core/supabase/supabase.client.js';

// ==============================================================================
// DTOs e Tipagens de Autenticação
// ==============================================================================

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RecuperarSenhaDTO {
  email: string;
}

export interface AuthResponse {
  user: any;
  session: any;
  access_token: string;
  perfil: any | null;
}

// ==============================================================================
// MODEL: AuthModel
// ==============================================================================

export class AuthModel {
  /**
   * Realiza login no Supabase Auth com email e senha.
   * Valida se a conta do terapeuta associada está ativa.
   * 
   * @param dto - Credenciais de login
   */
  static async login(dto: LoginDTO): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data?.session) {
      throw new Error(`Falha na autenticação: ${error?.message || 'Credenciais inválidas.'}`);
    }

    // Busca o perfil do terapeuta vinculado
    const { data: perfil } = await supabase
      .from('terapeuta')
      .select('*, areas_foco:terapeuta_area_foco(areas_foco(*))')
      .eq('id', data.user.id)
      .maybeSingle();

    if (perfil && !perfil.status_ativo) {
      throw new Error('Esta conta de terapeuta encontra-se inativada. Contate o administrador.');
    }

    return {
      user: data.user,
      session: data.session,
      access_token: data.session.access_token,
      perfil,
    };
  }

  /**
   * Endpoint de EXEMPLO para recuperação de senha (mock / em desenvolvimento).
   * Não realiza disparo real de e-mail no momento.
   * 
   * @param email - E-mail informado para recuperação
   */
  static async recuperarSenha(email: string): Promise<{ message: string; exemplo: boolean }> {
    return {
      message: `[EXEMPLO] Solicitação recebida para o e-mail: ${email}. O envio de e-mails será ativado futuramente.`,
      exemplo: true,
    };
  }

  /**
   * Recupera o perfil do usuário logado a partir do seu UUID do Auth.
   * 
   * @param userId - UUID do usuário autenticado (auth.users.id)
   */
  static async buscarPerfilPorId(userId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('terapeuta')
      .select('*, areas_foco:terapeuta_area_foco(areas_foco(*))')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao recuperar perfil: ${error.message}`);
    }

    return data || null;
  }
}
