// ==============================================================================
// InTEA: Utilitário de Verificação de Privilégios Administrativos
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
 * Checks whether the authenticated user object has a trusted SuperAdmin claim.
 * Evaluates `user.is_super_admin` and `user.app_metadata.is_super_admin` exclusively.
 * Never trusts `user_metadata`.
 *
 * @param user - Authenticated or partial user extracted from the request.
 * @returns `true` if the user holds a trusted SuperAdmin privilege.
 */
export function hasSuperAdminClaim(user?: UsuarioComClaims | null): boolean {
  return Boolean(
    user?.is_super_admin === true ||
      user?.app_metadata?.is_super_admin === true
  );
}
