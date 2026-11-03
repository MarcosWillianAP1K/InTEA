// ==============================================================================
// InTEA: Controller de Anotações Clínicas de Sessão (sessao_id IS NOT NULL)
// ==============================================================================
// Responsabilidade Única (Thin Controller):
// - Validação de JWT e parâmetros básicos
// - Delegação da regra de negócio para AnotacaoService
// - Mapeamento das respostas HTTP seguindo o Envelope Pattern Categorizado
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

      res.status(201).json({
        data: {
          anotacao: resultado.dados,
        },
        message: 'Anotação clínica da sessão registrada com sucesso.',
      });
    } catch (error) {
      console.error('[AnotacaoSessaoController.criar]', error);
      res.status(500).json({ error: 'Erro interno ao criar anotação clínica de sessão.' });
    }
  }

  /**
   * Handles GET /api/anotacao/sessao/:sessaoId to list clinical notes associated with a specific session.
   *
   * @param req - Authenticated Express request containing session UUID in URL parameter `:sessaoId`.
   * @param res - Express response returning categorized list of clinical notes with metadata.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async listarPorSessao(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const sessaoId = String(req.params?.sessaoId || '');
      const resultado = await AnotacaoService.listarAnotacoesSessao(sessaoId);

      if (!resultado.sucesso) {
        res.status(resultado.status).json({ error: resultado.erro });
        return;
      }

      const todos = resultado.dados ?? [];
      const total = todos.length;
      const query = req.query || {};
      const pagina = Number(query.pagina || query.page) || 1;
      const temPaginacao = query.limite !== undefined || query.limit !== undefined;
      const limite = temPaginacao ? Number(query.limite || query.limit) : total;

      const inicio = (pagina - 1) * limite;
      const anotacoes = temPaginacao ? todos.slice(inicio, inicio + limite) : todos;

      res.status(200).json({
        data: {
          anotacoes,
          meta: {
            total,
            pagina,
            limite,
          },
        },
        message: 'Anotações clínicas da sessão listadas com sucesso.',
      });
    } catch (error) {
      console.error('[AnotacaoSessaoController.listarPorSessao]', error);
      res.status(500).json({ error: 'Erro interno ao consultar anotações da sessão.' });
    }
  }

  /**
   * Handles PATCH /api/anotacao/sessao/:id to update the content of an existing session note.
   *
   * @param req - Authenticated Express request containing note ID and new content in body.
   * @param res - Express response returning the updated clinical note record categorized in data.
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

      const { conteudo } = req.body || {};

      if (conteudo === undefined || typeof conteudo !== 'string') {
        res.status(400).json({ error: 'O campo conteudo é obrigatório para atualização.' });
        return;
      }

      const anotacao = req.contextoAnotacao;
      if (!anotacao) {
        res.status(404).json({ error: 'Anotação clínica não encontrada.' });
        return;
      }

      const resultado = await AnotacaoService.atualizarConteudo(anotacao, usuarioLogadoId, conteudo);

      if (!resultado.sucesso) {
        res.status(resultado.status).json({ error: resultado.erro });
        return;
      }

      res.status(200).json({
        data: {
          anotacao: resultado.dados,
        },
        message: 'Anotação clínica da sessão atualizada com sucesso.',
      });
    } catch (error) {
      console.error('[AnotacaoSessaoController.atualizar]', error);
      res.status(500).json({ error: 'Erro interno ao atualizar anotação de sessão.' });
    }
  }

  /**
   * Handles DELETE /api/anotacao/sessao/:id to logically delete (soft delete) a session note.
   * Preserves clinical history (RN05) and returns the updated deactivated record.
   *
   * @param req - Authenticated Express request containing note ID in URL parameter `:id`.
   * @param res - Express response returning status 200 with deactivated note payload.
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
      if (!anotacao) {
        res.status(404).json({ error: 'Anotação clínica não encontrada.' });
        return;
      }

      const resultado = await AnotacaoService.softDelete(anotacao, usuarioLogadoId);

      if (!resultado.sucesso) {
        res.status(resultado.status).json({ error: resultado.erro });
        return;
      }

      res.status(200).json({
        data: {
          anotacao: resultado.dados,
        },
        message: 'Anotação clínica da sessão desativada com sucesso (soft delete aplicado).',
      });
    } catch (error) {
      console.error('[AnotacaoSessaoController.deletar]', error);
      res.status(500).json({ error: 'Erro interno ao excluir anotação de sessão.' });
    }
  }

  /**
   * Handles PATCH /api/anotacao/sessao/:id/reativar to reactivate a soft-deleted session note.
   *
   * @param req - Authenticated Express request containing note UUID in params.
   * @param res - Express response returning status 200 with `{ data: { anotacao }, message }`.
   */
  static async reativar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const usuarioLogadoId = req.user?.id;
      if (!usuarioLogadoId) {
        res.status(401).json({
          error: 'Acesso não autorizado: identificação do terapeuta não encontrada no token de autenticação.',
        });
        return;
      }

      const isSuperAdmin = !!req.user?.is_super_admin;
      const id = String(req.params?.id || '');

      const resultado = await AnotacaoService.reativar(id, usuarioLogadoId, isSuperAdmin);

      if (!resultado.sucesso) {
        res.status(resultado.status).json({ error: resultado.erro });
        return;
      }

      res.status(200).json({
        data: {
          anotacao: resultado.dados,
        },
        message: 'Anotação clínica reativada com sucesso.',
      });
    } catch (error) {
      console.error('[AnotacaoSessaoController.reativar]', error);
      res.status(500).json({ error: 'Erro interno ao reativar anotação clínica de sessão.' });
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
      const id = String(req.params?.id || '');
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
