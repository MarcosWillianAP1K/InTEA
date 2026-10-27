import { supabase } from '../supabase/supabase.client.js';

/**
 * ==============================================================================
 * InTEA: Serviço Especializado de Recuperação de Senha (RF01, RNF03)
 * Responsável pelo fluxo seguro com token efêmero/Magic Link via Supabase Auth.
 * ==============================================================================
 */

export interface RecuperacaoSolicitacaoResultado {
  message: string;
}

export interface RedefinicaoSenhaResultado {
  message: string;
}

export class RecuperacaoService {
  /**
   * Dispara o envio de e-mail de recuperação com link mágico assinado pelo Supabase Auth.
   * Regra Anti-Enumeração (RNF03): Sempre retorna confirmação de sucesso para evitar enumeração de contas.
   *
   * @param email - Endereço de e-mail institucional do terapeuta
   */
  static async solicitarRecuperacao(email: string): Promise<RecuperacaoSolicitacaoResultado> {
    const emailLimpo = email.trim().toLowerCase();
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    try {
      if (supabase && typeof supabase.auth?.resetPasswordForEmail === 'function') {
        await supabase.auth.resetPasswordForEmail(emailLimpo, {
          redirectTo: `${frontendUrl}/redefinir-senha`,
        });
      }
    } catch (err: unknown) {
      // Log interno para monitoramento sem expor falha para o solicitante
      console.warn('[RecuperacaoService.solicitarRecuperacao] Supabase reset aviso:', err);
    }

    return {
      message: 'Se o e-mail informado estiver cadastrado, as instruções para redefinição de senha foram enviadas.',
    };
  }

  /**
   * Valida o token efêmero de uso único e aplica a nova senha criptografada no Supabase Auth.
   * Retorna erro com status 410 (Gone) se o token for inválido ou já tiver expirado (após 30 minutos).
   *
   * @param token - Token efêmero de recuperação ou JWT de sessão de recuperação
   * @param novaSenha - Nova senha em texto claro (mínimo de 6 caracteres)
   */
  static async redefinirSenha(token: string, novaSenha: string): Promise<RedefinicaoSenhaResultado> {
    const tokenLimpo = token.trim();
    const senhaLimpa = novaSenha.trim();

    let userId: string | null = null;

    // 1. Tenta validar se o token é um access_token de recuperação via getUser()
    try {
      if (supabase && typeof supabase.auth?.getUser === 'function') {
        const { data, error } = await supabase.auth.getUser(tokenLimpo);
        if (!error && data?.user?.id) {
          userId = data.user.id;
        }
      }
    } catch {
      // Segue para tentativa com verifyOtp
    }

    // 2. Se não identificou por getUser, tenta como token_hash / OTP de recovery
    if (!userId) {
      try {
        if (supabase && typeof supabase.auth?.verifyOtp === 'function') {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenLimpo,
            type: 'recovery',
          });
          if (!error && data?.user?.id) {
            userId = data.user.id;
          }
        }
      } catch {
        // Falha tratada abaixo
      }
    }

    // Se ainda assim o usuário não foi autenticado, o token é inválido ou expirou (TTL 30 min)
    if (!userId) {
      const errorGone = new Error('O token de recuperação é inválido ou expirou. Solicite um novo link.');
      (errorGone as unknown as { statusCode: number }).statusCode = 410;
      throw errorGone;
    }

    // 3. Aplica a nova senha via Supabase Auth Admin
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: senhaLimpa,
    });

    if (updateError) {
      throw new Error(`Falha ao redefinir credenciais: ${updateError.message}`);
    }

    return {
      message: 'Senha de acesso redefinida com sucesso.',
    };
  }
}
