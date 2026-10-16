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
          refresh_token: resultado.session.refresh_token ?? null,
          token_type: 'Bearer',
          expires_in: resultado.session.expires_in,
        },
        message: 'Login realizado com sucesso.',
      });
    } catch (error: any) {
      console.error('[AuthController.login]', error);
      if (error?.message?.includes('inativada')) {
        res.status(403).json({ error: error.message });
        return;
      }
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
   * Handles GET /api/auth/me to return organized profile and session metadata for the authenticated caller.
   *
   * @param req - Authenticated Express request containing user credentials in `req.user`.
   * @param res - Express response returning the therapist profile and structured metadata.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const userId = user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Usuário não autenticado.' });
        return;
      }

      const perfil = await AuthModel.buscarPerfilPorId(userId);

      if (!perfil) {
        res.status(404).json({ error: 'Perfil de terapeuta associado ao token não encontrado.' });
        return;
      }

      // Normaliza áreas de foco caso venham aninhadas pelo relacionamento
      const areasFocoNormalizadas = Array.isArray(perfil.areas_foco)
        ? perfil.areas_foco.map((item: any) => (item?.areas_foco ? item.areas_foco : item))
        : [];

      // 1. Dados cadastrais completos do perfil
      const dadosPerfil = {
        id: perfil.id,
        nome: perfil.nome,
        email: perfil.email,
        telefone: perfil.telefone ?? null,
        registro_profissional: perfil.registro_profissional ?? perfil.crefito ?? null,
        especialidade: perfil.especialidade ?? null,
        crefito: perfil.crefito ?? perfil.registro_profissional ?? null,
        tempo_experiencia_anos: perfil.tempo_experiencia_anos ?? 0,
        clinica_id: perfil.clinica_id ?? null,
        areas_foco: areasFocoNormalizadas,
      };

      // 2. Metadados de sessão, autenticação e auditoria
      const metadados = {
        is_admin: Boolean(perfil.is_super_admin ?? user?.user_metadata?.is_super_admin ?? false),
        autenticado: user?.role === 'authenticated' || Boolean(user?.id),
        email_confirmado: Boolean(user?.email_confirmed_at || user?.confirmed_at || user?.user_metadata?.email_verified),
        telefone_confirmado: Boolean(user?.phone_confirmed_at),
        status_ativo: Boolean(perfil.status_ativo),
        last_sign_in_at: user?.last_sign_in_at ?? null,
        created_at: perfil.created_at ?? user?.created_at ?? null,
        updated_at: perfil.updated_at ?? user?.updated_at ?? null,
      };

      res.status(200).json({
        data: {
          perfil: dadosPerfil,
          metadados,
        },
      });
    } catch (error: any) {
      console.error('[AuthController.me]', error);
      res.status(500).json({ error: 'Erro interno ao recuperar perfil.', detalhes: error?.message });
    }
  }
}
