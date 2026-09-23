import { Request, Response } from 'express';
import { AuthModel, LoginDTO, RecuperarSenhaDTO } from '../models/auth.model.js';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';

// ==============================================================================
// CONTROLLER: AuthController
// ==============================================================================

export class AuthController {
  /**
   * POST /api/auth/login
   * Realiza login e retorna o token JWT de acesso.
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
   * POST /api/auth/recuperar-senha
   * Envia instruções de redefinição de senha para o e-mail informado.
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
   * GET /api/auth/me
   * Retorna os dados do usuário autenticado através do token JWT Bearer.
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
