// ==============================================================================
// InTEA: Controller de Anotações Clínicas de Paciente (sessao_id IS NULL)
// ==============================================================================
// Responsabilidade Única (Thin Controller):
// - Validação de JWT e parâmetros básicos
// - Delegação da regra de negócio para AnotacaoService
// - Mapeamento das respostas HTTP seguindo o Envelope Pattern Categorizado
// ==============================================================================

import { Response } from 'express';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { AnotacaoService } from '../services/anotacao.service.js';
import { FiltrosAnotacaoDTO } from '../models/anotacao.model.js';

export class AnotacaoPacienteController {
  /**
   * Handles POST /api/anotacao/paciente to record a general clinical note for a patient.
   *
   * @param req - Authenticated Express request containing patient ID, note content, and optional therapist ID.
   * @param res - Express response returning the created clinical note record.
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

      const { terapeuta_id: terapeutaIdBody, paciente_id, conteudo } = req.body || {};

      // Guarda Anti-Spoofing (RF21)
      if (terapeutaIdBody && terapeutaIdBody !== usuarioLogadoId) {
        res.status(403).json({
          error: 'Acesso negado: tentativa de registrar anotação para outro terapeuta não autorizada.',
        });
        return;
      }

      const resultado = await AnotacaoService.criarAnotacaoPaciente(usuarioLogadoId, String(paciente_id || ''), conteudo);

      if (!resultado.sucesso) {
        res.status(resultado.status).json({ error: resultado.erro });
        return;
      }

      res.status(201).json({
        data: {
          anotacao: resultado.dados,
        },
        message: 'Anotação clínica registrada com sucesso.',
      });
    } catch (error) {
      console.error('[AnotacaoPacienteController.criar]', error);
      res.status(500).json({ error: 'Erro interno ao criar anotação clínica de paciente.' });
    }
  }

  /**
   * Handles GET /api/anotacao/paciente/:pacienteId to list clinical notes associated with a patient,
   * supporting advanced filters (author, session, date range, search) and pagination.
   *
   * @param req - Authenticated Express request containing patient UUID in URL parameter `:pacienteId`.
   * @param res - Express response returning categorized list of clinical notes with metadata.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async listarPorPaciente(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params?.pacienteId || '');
      const query = req.query || {};

      const terapeutaId = query.terapeutaId
        ? String(query.terapeutaId)
        : query.terapeuta_id
        ? String(query.terapeuta_id)
        : undefined;

      const sessaoId = query.sessaoId
        ? String(query.sessaoId)
        : query.sessao_id
        ? String(query.sessao_id)
        : undefined;

      let somenteSemSessao: boolean | undefined = undefined;
      if (query.somenteSemSessao !== undefined) {
        somenteSemSessao = String(query.somenteSemSessao).toLowerCase() === 'true';
      }

      let incluirDeletadas: boolean | undefined = undefined;
      if (query.incluirDeletadas !== undefined) {
        incluirDeletadas = String(query.incluirDeletadas).toLowerCase() === 'true';
      } else if (query.incluirInativos !== undefined) {
        incluirDeletadas = String(query.incluirInativos).toLowerCase() === 'true';
      }

      const dataInicio = query.dataInicio
        ? String(query.dataInicio)
        : query.data_inicio
        ? String(query.data_inicio)
        : undefined;

      const dataFim = query.dataFim
        ? String(query.dataFim)
        : query.data_fim
        ? String(query.data_fim)
        : undefined;

      const busca = query.busca ? String(query.busca) : query.q ? String(query.q) : undefined;

      const filtros: FiltrosAnotacaoDTO | undefined =
        terapeutaId ||
        sessaoId ||
        somenteSemSessao !== undefined ||
        incluirDeletadas !== undefined ||
        dataInicio ||
        dataFim ||
        busca
          ? {
              terapeutaId,
              sessaoId,
              somenteSemSessao,
              incluirDeletadas,
              dataInicio,
              dataFim,
              busca,
            }
          : undefined;

      const resultado = await AnotacaoService.listarAnotacoesPaciente(pacienteId, filtros);

      if (!resultado.sucesso) {
        res.status(resultado.status).json({ error: resultado.erro });
        return;
      }

      const todos = resultado.dados ?? [];
      const total = todos.length;
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
        message: 'Anotações clínicas do paciente listadas com sucesso.',
      });
    } catch (error) {
      console.error('[AnotacaoPacienteController.listarPorPaciente]', error);
      res.status(500).json({ error: 'Erro interno ao consultar anotações do paciente.' });
    }
  }

  /**
   * Handles GET /api/anotacao/:id to retrieve a single clinical note by UUID.
   * Reuses `req.contextoAnotacao` resolved by middleware.
   *
   * @param req - Authenticated Express request.
   * @param res - Express response returning status 200 with `{ data: { anotacao }, message }`.
   */
  static async buscarPorId(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const anotacao = req.contextoAnotacao;
      if (!anotacao) {
        res.status(404).json({ error: 'Anotação clínica não encontrada.' });
        return;
      }

      res.status(200).json({
        data: {
          anotacao,
        },
        message: 'Anotação clínica consultada com sucesso.',
      });
    } catch (error) {
      console.error('[AnotacaoPacienteController.buscarPorId]', error);
      res.status(500).json({ error: 'Erro interno ao consultar anotação clínica.' });
    }
  }

  /**
   * Handles PATCH /api/anotacao/paciente/:id to update the content of an existing patient note.
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
        message: 'Anotação clínica atualizada com sucesso.',
      });
    } catch (error) {
      console.error('[AnotacaoPacienteController.atualizar]', error);
      res.status(500).json({ error: 'Erro interno ao atualizar anotação de paciente.' });
    }
  }

  /**
   * Handles DELETE /api/anotacao/paciente/:id to logically delete (soft delete) a patient note.
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
        message: 'Anotação clínica desativada com sucesso (soft delete aplicado).',
      });
    } catch (error) {
      console.error('[AnotacaoPacienteController.deletar]', error);
      res.status(500).json({ error: 'Erro interno ao excluir anotação de paciente.' });
    }
  }

  /**
   * Handles PATCH /api/anotacao/:id/reativar or /api/anotacao/paciente/:id/reativar
   * to reactivate a soft-deleted clinical note.
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
      console.error('[AnotacaoPacienteController.reativar]', error);
      res.status(500).json({ error: 'Erro interno ao reativar anotação clínica.' });
    }
  }

  /**
   * Handles DELETE /api/anotacao/paciente/:id/hard to permanently delete a patient note for development and testing.
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
      console.error('[AnotacaoPacienteController.deletarHard]', error);
      res.status(500).json({ error: 'Erro interno ao executar exclusão física de anotação.' });
    }
  }
}
