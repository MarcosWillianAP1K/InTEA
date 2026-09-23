import { Request, Response } from 'express';
import { AuthModel, LoginDTO, RecuperarSenhaDTO } from '../models/auth.model.js';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';

// ==============================================================================
// CONTROLLER: AuthController
// ==============================================================================

export class AuthController {
  /**
   * Handles POST /api/auth/login to authenticate a user and generate a JWT access token.
   *
   * @param req - Express request containing email and password in body.
   * @param res - Express response returning authentication tokens and user profile.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const dto: LoginDTO = req.body;

      if (!dto.email || dto.email.trim() === '') {
        res.status(400).json({ error: 'O campo "email" é obrigatório.' });
        return;
      }

      if (!dto.password || dto.password.trim() === '') {
        res.status(400).json({ error: 'O campo "password" é obrigatório.' });
        return;
      }

      const resultado = await AuthModel.login(dto);

      res.status(200).json({
        data: {
          access_token: resultado.access_token,
          token_type: 'Bearer',
          expires_in: resultado.session.expires_in,
          user: resultado.user,
          perfil: resultado.perfil,
        },
        message: 'Login realizado com sucesso.',
      });
    } catch (error: any) {
      console.error('[AuthController.login]', error);
      res.status(401).json({ error: error?.message || 'Credenciais inválidas.' });
    }
  }

  /**
   * Handles POST /api/auth/recuperar-senha to dispatch password reset instructions to the given email.
   *
   * @param req - Express request containing email address in body.
   * @param res - Express response acknowledging password recovery request.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async recuperarSenha(req: Request, res: Response): Promise<void> {
    try {
      const dto: RecuperarSenhaDTO = req.body;

      if (!dto.email || dto.email.trim() === '') {
        res.status(400).json({ error: 'O campo "email" é obrigatório.' });
        return;
      }

      const resultado = await AuthModel.recuperarSenha(dto.email);

      res.status(200).json(resultado);
    } catch (error: any) {
      console.error('[AuthController.recuperarSenha]', error);
      res.status(500).json({ error: 'Erro interno ao processar recuperação de senha.', detalhes: error?.message });
    }
  }

  /**
   * Handles GET /api/auth/me to return profile data for the authenticated caller.
   *
   * @param req - Authenticated Express request containing user credentials in `req.user`.
   * @param res - Express response returning the current user and therapist profile.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Usuário não autenticado.' });
        return;
      }

      const perfil = await AuthModel.buscarPerfilPorId(userId);

      res.status(200).json({
        data: {
          user: req.user,
          perfil,
        },
      });
    } catch (error: any) {
      console.error('[AuthController.me]', error);
      res.status(500).json({ error: 'Erro interno ao recuperar perfil.', detalhes: error?.message });
    }
  }
}
