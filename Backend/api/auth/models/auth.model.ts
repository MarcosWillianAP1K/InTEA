import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../../core/supabase/supabase.client.js';
import type { Terapeuta } from '../../terapeuta/models/terapeuta.model.js';

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
  user: User;
  session: Session;
  access_token: string;
  perfil: Terapeuta | null;
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
      perfil: (perfil as unknown as Terapeuta) || null,
    };
  }

  /**
   * Updates the password for an authenticated user in Supabase Auth.
   *
   * @param userId - The user UUID identifier in `auth.users`.
   * @param novaSenha - The new plaintext password to set (minimum 6 characters).
   * @returns Confirmation message indicating the password was updated successfully.
   * @throws {Error} If updating the user credentials fails in Supabase Auth.
   */
  static async alterarSenha(userId: string, novaSenha: string): Promise<{ message: string }> {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: novaSenha,
    });
    if (error) {
      throw new Error(error.message);
    }
    return {
      message: 'Senha de acesso atualizada com sucesso.',
    };
  }

  /**
   * Initiates a mock password recovery request for the given email address.
   *
   * @param email - Target email address for the password reset instructions.
   * @returns Object containing the confirmation message and a demonstration flag.
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
  static async buscarPerfilPorId(userId: string): Promise<Terapeuta | null> {
    const { data, error } = await supabase
      .from('terapeuta')
      .select('*, areas_foco:terapeuta_area_foco(areas_foco(*))')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao recuperar perfil: ${error.message}`);
    }

    return (data as unknown as Terapeuta) || null;
  }

  /**
   * Refreshes an active session using a valid refresh token.
   *
   * @param refreshToken - The refresh token issued during authentication.
   * @returns Updated session data containing access_token, refresh_token, token_type, and expires_in.
   * @throws {Error} If session refresh fails.
   */
  static async refreshSession(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string | null;
    token_type: string;
    expires_in: number;
  }> {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data?.session) {
      throw new Error(`Falha ao renovar sessão: ${error?.message || 'Token inválido ou expirado.'}`);
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token ?? null,
      token_type: 'Bearer',
      expires_in: data.session.expires_in,
    };
  }

  /**
   * Logs out the user from Supabase auth.
   *
   * @returns Confirmation of successful logout.
   */
  static async logout(): Promise<{ success: boolean; message: string }> {
    try {
      await supabase.auth.signOut();
    } catch {
      // Falha silenciosa caso o signOut falhe
    }
    return {
      success: true,
      message: 'Logout realizado com sucesso.',
    };
  }
}
