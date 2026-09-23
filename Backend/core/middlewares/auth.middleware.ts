import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase/supabase.client.js';

// Estende a interface Request do Express para incluir o usuário autenticado
export interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * Middleware para validação do Token JWT do Supabase Auth.
 * 
 * Extrai o token do cabeçalho `Authorization: Bearer <token>`,
 * valida a autenticidade com o Supabase e injeta o `user` em `req.user`.
 * Caso o token seja ausente ou inválido, retorna 401 Unauthorized.
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Acesso não autorizado. Forneça um token no cabeçalho Authorization: Bearer <token>.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token || token.trim() === '') {
      res.status(401).json({ error: 'Token JWT não informado após Bearer.' });
      return;
    }

    // Valida o token diretamente no serviço de Auth do Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        error: 'Token JWT inválido ou expirado.',
        detalhes: error?.message,
      });
      return;
    }

    // Anexa o usuário logado na requisição para consumo pelos controllers
    req.user = user;
    next();
  } catch (error: any) {
    console.error('[authMiddleware]', error);
    res.status(500).json({ error: 'Erro interno ao validar autenticação.' });
  }
}
