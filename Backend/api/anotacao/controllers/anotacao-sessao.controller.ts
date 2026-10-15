// ==============================================================================
// InTEA: Controller de Anotações Clínicas de Sessão (sessao_id IS NOT NULL)
// ==============================================================================
// Responsabilidade Única (Thin Controller):
// - Validação de JWT e parâmetros básicos
// - Delegação da regra de negócio para AnotacaoService
// - Mapeamento das respostas HTTP
// ==============================================================================

import { Response } from 'express';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { AnotacaoService } from '../services/anotacao.service.js';

export class AnotacaoSessaoController {
  /**
   * Handles POST /api/anotacao/sessao to record a clinical note associated with a session.
   *
   * @param req - Authenticated Express request containing session ID, note content, and optional therapist ID.
   * @param res - Express response returning the created session clinical note record.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async criar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const usuarioLogadoId = req.user?.id;
      if (!usuarioLogadoId) {
        res.status(401).json({
          error: 'Acesso não autorizado: identificação do terapeuta não encontrada no token de autenticação.',
        });
        return;
      }

      const { terapeuta_id: terapeutaIdBody, sessao_id, conteudo } = req.body || {};

      // Guarda Anti-Spoofing (RF21)
      if (terapeutaIdBody && terapeutaIdBody !== usuarioLogadoId) {
        res.status(403).json({
          error: 'Acesso negado: tentativa de registrar anotação para outro terapeuta não autorizada.',
        });
        return;
      }

      const pacienteId = req.pacienteAlvoId;
      if (!pacienteId) {
        res.status(400).json({ error: 'Não foi possível associar a sessão ao paciente correspondente.' });
        return;
      }

      const resultado = await AnotacaoService.criarAnotacaoSessao(
        usuarioLogadoId,
        String(sessao_id || ''),
        String(pacienteId),
        conteudo
      );

      if (!resultado.sucesso) {
        res.status(resultado.status).json({ error: resultado.erro });
        return;
      }

      res.status(201).json({ data: resultado.dados });
    } catch (error) {
      console.error('[AnotacaoSessaoController.criar]', error);
      res.status(500).json({ error: 'Erro interno ao criar anotação clínica de sessão.' });
    }
  }

  /**
   * Handles GET /api/anotacao/sessao/:sessaoId to list clinical notes associated with a specific session.
   *
   * @param req - Authenticated Express request containing session UUID in URL parameter `:sessaoId`.
   * @param res - Express response returning the list of clinical notes for the session.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async listarPorSessao(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sessaoId = String(req.params.sessaoId || '');
      const resultado = await AnotacaoService.listarAnotacoesSessao(sessaoId);

      res.status(200).json({ data: resultado.dados });
    } catch (error) {
      console.error('[AnotacaoSessaoController.listarPorSessao]', error);
      res.status(500).json({ error: 'Erro interno ao consultar anotações da sessão.' });
    }
  }

  /**
   * Handles PATCH /api/anotacao/sessao/:id to update the content of an existing session note.
   *
   * @param req - Authenticated Express request containing note ID and new content in body.
   * @param res - Express response returning the updated clinical note record.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async atualizar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const usuarioLogadoId = req.user?.id;
      if (!usuarioLogadoId) {
        res.status(401).json({
          error: 'Acesso não autorizado: identificação do terapeuta não encontrada no token de autenticação.',
        });
        return;
      }

      const anotacao = req.contextoAnotacao;
      const { conteudo } = req.body || {};

      if (conteudo === undefined || typeof conteudo !== 'string') {
        res.status(400).json({ error: 'O campo conteudo é obrigatório para atualização.' });
        return;
      }

      const resultado = await AnotacaoService.atualizarConteudo(anotacao, usuarioLogadoId, conteudo);

      if (!resultado.sucesso) {
        res.status(resultado.status).json({ error: resultado.erro });
        return;
      }

      res.status(200).json({ data: resultado.dados });
    } catch (error) {
      console.error('[AnotacaoSessaoController.atualizar]', error);
      res.status(500).json({ error: 'Erro interno ao atualizar anotação de sessão.' });
    }
  }

  /**
   * Handles DELETE /api/anotacao/sessao/:id to logically delete (soft delete) a session note.
   *
   * @param req - Authenticated Express request containing note ID in URL parameter `:id`.
   * @param res - Express response returning status 204 on successful deactivation.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async deletar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const usuarioLogadoId = req.user?.id;
      if (!usuarioLogadoId) {
        res.status(401).json({
          error: 'Acesso não autorizado: identificação do terapeuta não encontrada no token de autenticação.',
        });
        return;
      }

      const anotacao = req.contextoAnotacao;
      const resultado = await AnotacaoService.softDelete(anotacao, usuarioLogadoId);

      if (!resultado.sucesso) {
        res.status(resultado.status).json({ error: resultado.erro });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('[AnotacaoSessaoController.deletar]', error);
      res.status(500).json({ error: 'Erro interno ao excluir anotação de sessão.' });
    }
  }

  /**
   * Handles DELETE /api/anotacao/sessao/:id/hard to permanently delete a session note for development and testing.
   *
   * @param req - Authenticated Express request containing note ID in URL parameter `:id`.
   * @param res - Express response returning status 204 on successful deletion.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async deletarHard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = String(req.params.id || '');
      const resultado = await AnotacaoService.hardDeleteDev(id);

      if (!resultado.sucesso) {
        res.status(resultado.status).json({ error: resultado.erro });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('[AnotacaoSessaoController.deletarHard]', error);
      res.status(500).json({ error: 'Erro interno ao executar exclusão física de anotação.' });
    }
  }
}
