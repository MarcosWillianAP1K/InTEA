import { Response, NextFunction } from 'express';
import { supabase } from '../supabase/supabase.client.js';
import { AuthenticatedRequest } from './auth.middleware.js';

/**
 * Middleware de autorização para restringir endpoints exclusivamente a administradores (Super Admins).
 * 
 * Fluxo de verificação:
 * 1. Exige que a requisição tenha passado previamente pelo authMiddleware (req.user preenchido).
 * 2. Verifica se a conta do terapeuta está ativa (status_ativo = true).
 * 3. Valida se o usuário possui privilégios de super admin (via user_metadata ou tabela terapeuta).
 * 4. Retorna 403 Forbidden caso o usuário não seja administrador ou esteja inativo.
 *
 * @param req - Requisição Express autenticada contendo o objeto `req.user`.
 * @param res - Resposta Express.
 * @param next - Avança o pipeline de execução caso autorizado.
 */
export async function adminMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const usuarioLogado = req.user;

    // 1. Verificação prévia de autenticação
    if (!usuarioLogado || !usuarioLogado.id) {
      res.status(401).json({
        error: 'Acesso não autorizado. É necessário estar autenticado para acessar este recurso.',
      });
      return;
    }

    // 2. Consulta o perfil do terapeuta no banco para validar status_ativo e is_super_admin
    const { data: terapeuta, error: terError } = await supabase
      .from('terapeuta')
      .select('is_super_admin, status_ativo')
      .eq('id', usuarioLogado.id)
      .maybeSingle();

    if (terError) {
      console.error('[adminMiddleware] Erro ao consultar perfil de terapeuta:', terError);
      res.status(500).json({
        error: 'Erro interno ao validar privilégios de administrador.',
        detalhes: terError.message,
      });
      return;
    }

    if (!terapeuta) {
      res.status(403).json({
        error: 'Acesso negado: perfil de terapeuta associado ao token não encontrado.',
      });
      return;
    }

    if (!terapeuta.status_ativo) {
      res.status(403).json({
        error: 'Acesso negado: a conta do usuário encontra-se inativa.',
      });
      return;
    }

    // 3. Valida permissão de administrador (via tabela ou user_metadata do Supabase Auth)
    const isSuperAdmin =
      terapeuta.is_super_admin === true ||
      usuarioLogado.user_metadata?.is_super_admin === true;

    if (!isSuperAdmin) {
      res.status(403).json({
        error: 'Acesso negado: esta operação é restrita a administradores do sistema.',
      });
      return;
    }

    // Autorizado como administrador ativo
    next();
  } catch (error: any) {
    console.error('[adminMiddleware]', error);
    res.status(500).json({
      error: 'Erro interno ao validar privilégios de administrador.',
      detalhes: error?.message || String(error),
    });
  }
}
