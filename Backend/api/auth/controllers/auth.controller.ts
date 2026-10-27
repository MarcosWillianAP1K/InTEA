import { Request, Response } from 'express';
import { AuthModel, LoginDTO, RecuperarSenhaDTO, RedefinirSenhaDTO } from '../models/auth.model.js';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { SessoesAtivasService } from '../../../core/auth/sessoes-ativas.service.js';

// ==============================================================================
// CONTROLLER: AuthController
// ==============================================================================

export class AuthController {
  /**
   * Handles POST /api/auth/login to authenticate a user and generate a JWT access token.
   *
   * @param req - Express request containing email and password in body.
   * @param res - Express response returning authentication tokens categorized strictly under data.token.
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

      // Rastreia a nova sessão ativa do terapeuta (RF02)
      try {
        const xForwardedFor = req.headers?.['x-forwarded-for'];
        const ip =
          typeof xForwardedFor === 'string'
            ? xForwardedFor.split(',')[0]?.trim()
            : req.ip || req.socket?.remoteAddress || null;
        const userAgent = (req.headers?.['user-agent'] as string) || null;

        await SessoesAtivasService.registrarSessao({
          usuarioId: resultado.user.id,
          token: resultado.access_token,
          ip: ip ?? null,
          userAgent,
        });
      } catch (errSession) {
        console.warn('[AuthController.login] Falha ao registrar sessão ativa:', errSession);
      }

      res.status(200).json({
        data: {
          token: tokens,
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
   * @param res - Express response returning the refreshed tokens categorized under data.token.
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
        data: {
          token: tokens,
        },
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
   * @param res - Express response acknowledging logout with data: null and message.
   */
  static async logout(_req: Request, res: Response): Promise<void> {
    try {
      await AuthModel.logout();
      res.status(200).json({
        data: null,
        message: 'Logout realizado com sucesso.',
      });
    } catch (error: unknown) {
      console.error('[AuthController.logout]', error);
      res.status(200).json({
        data: null,
        message: 'Logout realizado com sucesso.',
      });
    }
  }

  /**
   * Handles POST /api/auth/recuperar-senha to dispatch password reset instructions to the given email.
   *
   * @param req - Express request containing email address in body.
   * @param res - Express response acknowledging password recovery request in Envelope Pattern.
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

      res.status(200).json({
        data: {
          recuperacao: {
            email: dto.email,
            solicitado: true,
          },
        },
        message: resultado.message,
      });
    } catch (error: unknown) {
      console.error('[AuthController.recuperarSenha]', error);
      const detalhes = error instanceof Error ? error.message : undefined;
      res.status(500).json({ error: 'Erro interno ao processar recuperação de senha.', detalhes });
    }
  }

  /**
   * Handles PATCH /api/auth/alterar-senha to update password for authenticated user.
   */

  /**
   * Handles POST /api/auth/redefinir-senha to validate ephemeral recovery token and apply new password (RF01, RNF03).
   *
   * @param req - Express request containing token (in body or Authorization header) and novaSenha.
   * @param res - Express response acknowledging password reset with Envelope Pattern { data: null, message }.
   */
  static async redefinirSenha(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers?.authorization;
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
      const body: Partial<RedefinirSenhaDTO> = req.body || {};

      const token = body.token || bearerToken;

      if (!token || typeof token !== 'string' || token.trim() === '') {
        res.status(400).json({ error: 'O token de recuperação é obrigatório.' });
        return;
      }

      if (!body.novaSenha || typeof body.novaSenha !== 'string' || body.novaSenha.trim().length < 6) {
        res.status(400).json({ error: 'A nova senha deve conter no mínimo 6 caracteres.' });
        return;
      }

      const resultado = await AuthModel.redefinirSenha(token.trim(), body.novaSenha.trim());

      res.status(200).json({
        data: null,
        message: resultado.message,
      });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number })?.statusCode;
      if (status === 410) {
        res.status(410).json({
          error: (error as Error).message || 'O link de recuperação expirou ou é inválido. Solicite um novo link.',
        });
        return;
      }

      const msg = error instanceof Error ? error.message : 'Erro interno ao redefinir senha.';
      if (msg.includes('expirou') || msg.includes('inválido') || msg.includes('expired') || msg.includes('invalid')) {
        res.status(410).json({
          error: 'O link de recuperação expirou ou é inválido. Solicite um novo link.',
        });
        return;
      }

      console.error('[AuthController.redefinirSenha]', error);
      res.status(500).json({ error: 'Erro interno ao redefinir senha.', detalhes: msg });
    }
  }

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
      res.status(200).json({
        data: null,
        message: resultado.message,
      });
    } catch (error: unknown) {
      console.error('[AuthController.alterarSenha]', error);
      const detalhes = error instanceof Error ? error.message : undefined;
      res.status(500).json({ error: 'Erro interno ao alterar senha de acesso.', detalhes });
    }
  }

  /**
   * Handles GET /api/auth/me to return organized profile and session metadata for the authenticated caller.
   *
   * @param req - Authenticated Express request containing user credentials in `req.user`.
   * @param res - Express response returning user profile categorized strictly under data.user.
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
        ? perfil.areas_foco.map((item: unknown) => {
            if (item && typeof item === 'object' && 'areas_foco' in item) {
              return (item as { areas_foco: unknown }).areas_foco;
            }
            return item;
          })
        : [];

      // Dados cadastrais e metadados consolidados na categoria semântica user
      const userData = {
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
        is_admin: Boolean(perfil.is_super_admin ?? user?.user_metadata?.is_super_admin ?? false),
        role: Boolean(perfil.is_super_admin ?? user?.user_metadata?.is_super_admin ?? false)
          ? 'super_admin'
          : 'terapeuta',
        status_ativo: Boolean(perfil.status_ativo),
        autenticado: user?.role === 'authenticated' || Boolean(user?.id),
        email_confirmado: Boolean(
          user?.email_confirmed_at || user?.confirmed_at || user?.user_metadata?.email_verified
        ),
        telefone_confirmado: Boolean(user?.phone_confirmed_at),
        last_sign_in_at: user?.last_sign_in_at ?? null,
        created_at: perfil.created_at ?? user?.created_at ?? null,
        updated_at: perfil.updated_at ?? user?.updated_at ?? null,
      };

      res.status(200).json({
        data: {
          user: userData,
        },
        message: 'Dados do perfil do usuário autenticado recuperados com sucesso.',
      });
    } catch (error: unknown) {
      console.error('[AuthController.me]', error);
      const detalhes = error instanceof Error ? error.message : undefined;
      res.status(500).json({ error: 'Erro interno ao recuperar perfil.', detalhes });
    }
  }

  /**
   * Handles GET /api/auth/sessoes to list all active sessions for authenticated therapist (RF02).
   */
  static async listarSessoes(req: Request, res: Response): Promise<void> {
    try {
      const usuarioLogado = (req as AuthenticatedRequest).user;
      if (!usuarioLogado || !usuarioLogado.id) {
        res.status(401).json({ error: 'Usuário não autenticado.' });
        return;
      }

      const authHeader = req.headers.authorization;
      const tokenAtual = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

      const sessoes = await SessoesAtivasService.listarSessoes(usuarioLogado.id, tokenAtual);

      res.status(200).json({
        data: sessoes,
        total: sessoes.length,
      });
    } catch (error: unknown) {
      console.error('[AuthController.listarSessoes]', error);
      res.status(500).json({ error: 'Erro interno ao listar sessões ativas.' });
    }
  }

  /**
   * Handles POST /api/auth/logout-all to remotely disconnect all other active sessions (RF02).
   */
  static async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      const usuarioLogado = (req as AuthenticatedRequest).user;
      if (!usuarioLogado || !usuarioLogado.id) {
        res.status(401).json({ error: 'Usuário não autenticado.' });
        return;
      }

      const authHeader = req.headers.authorization;
      const tokenAtual = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : undefined;

      if (!tokenAtual) {
        res.status(400).json({ error: 'Token JWT não fornecido no cabeçalho Authorization.' });
        return;
      }

      const resultado = await SessoesAtivasService.revogarOutrasSessoes(usuarioLogado.id, tokenAtual);

      res.status(200).json({
        data: null,
        message: 'Todas as outras sessões ativas foram desconectadas com sucesso.',
        sessoesRevogadas: resultado.revogadas,
      });
    } catch (error: unknown) {
      console.error('[AuthController.logoutAll]', error);
      res.status(500).json({ error: 'Erro interno ao desconectar outras sessões ativas.' });
    }
  }

  /**
   * Handles DELETE /api/auth/sessoes/:id to revoke a specific remote active session by UUID.
   */
  static async revogarSessao(req: Request, res: Response): Promise<void> {
    try {
      const usuarioLogado = (req as AuthenticatedRequest).user;
      if (!usuarioLogado || !usuarioLogado.id) {
        res.status(401).json({ error: 'Usuário não autenticado.' });
        return;
      }

      const sessaoId = String(req.params.id || '').trim();
      if (!sessaoId || sessaoId.length < 10) {
        res.status(400).json({ error: 'Identificador de sessão inválido.' });
        return;
      }

      const revogado = await SessoesAtivasService.revogarSessaoPorId(usuarioLogado.id, sessaoId);
      if (!revogado) {
        res.status(404).json({ error: 'Sessão ativa não encontrada ou já revogada.' });
        return;
      }

      res.status(200).json({
        data: null,
        message: 'Sessão revogada com sucesso.',
      });
    } catch (error: unknown) {
      console.error('[AuthController.revogarSessao]', error);
      res.status(500).json({ error: 'Erro interno ao revogar sessão remota.' });
    }
  }
}

