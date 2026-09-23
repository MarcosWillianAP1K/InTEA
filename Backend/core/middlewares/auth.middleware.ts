import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase/supabase.client.js';

// Estende a interface Request do Express para incluir o usuário autenticado
export interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * Middleware for validating Supabase Auth JWT tokens.
 *
 * Extracts the bearer token from the `Authorization: Bearer <token>` HTTP header,
 * verifies its authenticity via Supabase Auth, and attaches the decoded user object to `req.user`.
 * Responds with HTTP 401 Unauthorized if the token is missing, malformed, or expired.
 *
 * @param req - Authenticated Express request object where `user` is attached upon success.
 * @param res - Express response object used to send unauthorized or error responses.
 * @param next - Express next function to advance to subsequent handlers.
 * @returns Resolves when authentication processing is complete.
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
