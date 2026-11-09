// ==============================================================================
// InTEA: Utilitário de Verificação de Privilégios Administrativos (RNF06 / OWASP)
// ==============================================================================
// Garante que claims de SuperAdmin sejam lidas exclusivamente de fontes confiáveis
// (tabela public.terapeuta sincronizada em user.is_super_admin ou app_metadata
// assinado pelo servidor), ignorando user_metadata editável pelo cliente.
// ==============================================================================

import type { UsuarioAutenticado } from '../middlewares/auth.middleware.js';

export type UsuarioComClaims = Pick<
  Partial<UsuarioAutenticado>,
  'is_super_admin' | 'app_metadata'
>;

/**
 * Verifica se o objeto de usuário autenticado possui a claim confiável de SuperAdmin.
 * Avalia exclusivamente `user.is_super_admin` e `user.app_metadata.is_super_admin`.
 * Nunca confia em `user_metadata`.
 *
 * @param user - Usuário autenticado ou parcial extraído do request.
 * @returns `true` se possuir privilégio de SuperAdmin confiável.
 */
export function hasSuperAdminClaim(user?: UsuarioComClaims | null): boolean {
  return Boolean(
    user?.is_super_admin === true ||
      user?.app_metadata?.is_super_admin === true
  );
}
