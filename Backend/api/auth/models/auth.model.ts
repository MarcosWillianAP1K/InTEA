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
   * Authenticates a user via Supabase Auth using email and password credentials.
   * Verifies that the associated therapist record is active.
   *
   * @param dto - User credentials containing email and password.
   * @returns Authentication bundle containing user, session, access token, and therapist profile.
   * @throws {Error} If credentials are invalid or the account is deactivated.
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
   * Mock endpoint for initiating a password recovery flow.
   *
   * @param email - Target email address for password reset.
   * @returns Confirmation message detailing the mock recovery action.
   */
  static async recuperarSenha(email: string): Promise<{ message: string; exemplo: boolean }> {
    return {
      message: `[EXEMPLO] Solicitação recebida para o e-mail: ${email}. O envio de e-mails será ativado futuramente.`,
      exemplo: true,
    };
  }

  /**
   * Retrieves the therapist profile associated with an authenticated Supabase Auth user ID.
   *
   * @param userId - The UUID identifier from `auth.users`.
   * @returns The therapist profile if found, or null otherwise.
   * @throws {Error} If querying the database fails.
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
