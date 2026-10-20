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

      const tokens = {
        access_token: resultado.access_token,
        refresh_token: resultado.session.refresh_token ?? null,
        token_type: 'Bearer',
        expires_in: resultado.session.expires_in,
      };

      const user = resultado.perfil
        ? {
            id: resultado.perfil.id,
            nome: resultado.perfil.nome,
            email: resultado.perfil.email,
            clinica_id: resultado.perfil.clinica_id ?? null,
            is_super_admin: Boolean(resultado.perfil.is_super_admin ?? false),
            status_ativo: Boolean(resultado.perfil.status_ativo),
            role: (resultado.perfil.is_super_admin ? 'super_admin' : 'terapeuta') as 'terapeuta' | 'super_admin',
            crefito: resultado.perfil.crefito ?? resultado.perfil.registro_profissional ?? null,
            registro_profissional: resultado.perfil.registro_profissional ?? resultado.perfil.crefito ?? null,
            especialidade: resultado.perfil.especialidade ?? null,
            created_at: resultado.perfil.created_at ?? resultado.user?.created_at,
          }
        : {
            id: resultado.user.id,
            nome: (resultado.user.user_metadata?.nome as string) || resultado.user.email || 'Usuário',
            email: resultado.user.email || '',
            clinica_id: null,
            is_super_admin: Boolean(resultado.user.user_metadata?.is_super_admin ?? false),
            status_ativo: true,
            role: (resultado.user.user_metadata?.is_super_admin ? 'super_admin' : 'terapeuta') as 'terapeuta' | 'super_admin',
            created_at: resultado.user.created_at,
          };

      res.status(200).json({
        data: {
          access_token: resultado.access_token,
          refresh_token: resultado.session.refresh_token ?? null,
          token_type: 'Bearer',
          expires_in: resultado.session.expires_in,
          tokens,
          user,
        },
        message: 'Login realizado com sucesso.',
      });
    } catch (error: unknown) {
      console.error('[AuthController.login]', error);
      const errorMessage = error instanceof Error ? error.message : 'Credenciais inválidas.';
      if (errorMessage.includes('inativada')) {
        res.status(403).json({ error: errorMessage });
        return;
      }
      res.status(401).json({ error: errorMessage });
    }
  }

  /**
   * Handles POST /api/auth/refresh to renew an expired access token using a refresh token.
   *
   * @param req - Express request containing `refresh_token` in body.
   * @param res - Express response returning the refreshed access token and expiration.
   */
  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token || typeof refresh_token !== 'string' || refresh_token.trim() === '') {
        res.status(400).json({ error: 'O campo "refresh_token" é obrigatório.' });
        return;
      }

      const tokens = await AuthModel.refreshSession(refresh_token);

      res.status(200).json({
        data: tokens,
        message: 'Token renovado com sucesso.',
      });
    } catch (error: unknown) {
      console.error('[AuthController.refresh]', error);
      const errorMessage = error instanceof Error ? error.message : 'Falha ao renovar token.';
      res.status(401).json({ error: errorMessage });
    }
  }

  /**
   * Handles POST /api/auth/logout to invalidate user session.
   *
   * @param _req - Express request.
   * @param res - Express response acknowledging logout.
   */
  static async logout(_req: Request, res: Response): Promise<void> {
    try {
      const resultado = await AuthModel.logout();
      res.status(200).json(resultado);
    } catch (error: unknown) {
      console.error('[AuthController.logout]', error);
      res.status(200).json({ success: true, message: 'Logout realizado com sucesso.' });
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
    } catch (error: unknown) {
      console.error('[AuthController.recuperarSenha]', error);
      const detalhes = error instanceof Error ? error.message : undefined;
      res.status(500).json({ error: 'Erro interno ao processar recuperação de senha.', detalhes });
    }
  }

  /**
   * Handles GET /api/auth/me to return organized profile and session metadata for the authenticated caller.
   *
   * @param req - Authenticated Express request containing user credentials in `req.user`.
   * @param res - Express response returning the therapist profile and structured metadata.
   * @returns Resolves when the HTTP response has been sent.
   */
  /**
   * Handles PATCH /api/auth/alterar-senha to update password for authenticated user.
   */
  static async alterarSenha(req: Request, res: Response): Promise<void> {
    try {
      const usuarioLogado = (req as AuthenticatedRequest).user;
      if (!usuarioLogado || !usuarioLogado.id) {
        res.status(401).json({ error: 'Acesso não autorizado. Usuário não autenticado.' });
        return;
      }
      const { novaSenha } = req.body;
      if (!novaSenha || typeof novaSenha !== 'string' || novaSenha.trim().length < 6) {
        res.status(400).json({ error: 'A nova senha deve conter no mínimo 6 caracteres.' });
        return;
      }
      const resultado = await AuthModel.alterarSenha(usuarioLogado.id, novaSenha.trim());
      res.status(200).json(resultado);
    } catch (error: unknown) {
      console.error('[AuthController.alterarSenha]', error);
      const detalhes = error instanceof Error ? error.message : undefined;
      res.status(500).json({ error: 'Erro interno ao alterar senha de acesso.', detalhes });
    }
  }

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
        ? perfil.areas_foco.map((item: unknown) => {
            if (item && typeof item === 'object' && 'areas_foco' in item) {
              return (item as { areas_foco: unknown }).areas_foco;
            }
            return item;
          })
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
    } catch (error: unknown) {
      console.error('[AuthController.me]', error);
      const detalhes = error instanceof Error ? error.message : undefined;
      res.status(500).json({ error: 'Erro interno ao recuperar perfil.', detalhes });
    }
  }
}
