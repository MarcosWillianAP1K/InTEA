// ==============================================================================
// InTEA: Controller de Anotações Clínicas de Paciente (sessao_id IS NULL)
// ==============================================================================
// Responsabilidade Única (Thin Controller):
// - Validação de JWT e parâmetros básicos
// - Delegação da regra de negócio para AnotacaoService
// - Mapeamento das respostas HTTP
// ==============================================================================

import { Response } from 'express';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { AnotacaoService } from '../services/anotacao.service.js';

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

      res.status(201).json({ data: resultado.dados });
    } catch (error) {
      console.error('[AnotacaoPacienteController.criar]', error);
      res.status(500).json({ error: 'Erro interno ao criar anotação clínica de paciente.' });
    }
  }

  /**
   * Handles GET /api/anotacao/paciente/:pacienteId to list clinical notes associated with a patient.
   *
   * @param req - Authenticated Express request containing patient UUID in URL parameter `:pacienteId`.
   * @param res - Express response returning the list of clinical notes.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async listarPorPaciente(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params.pacienteId || '');
      const resultado = await AnotacaoService.listarAnotacoesPaciente(pacienteId);

      res.status(200).json({ data: resultado.dados });
    } catch (error) {
      console.error('[AnotacaoPacienteController.listarPorPaciente]', error);
      res.status(500).json({ error: 'Erro interno ao consultar anotações do paciente.' });
    }
  }

  /**
   * Handles PATCH /api/anotacao/paciente/:id to update the content of an existing patient note.
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
      console.error('[AnotacaoPacienteController.atualizar]', error);
      res.status(500).json({ error: 'Erro interno ao atualizar anotação de paciente.' });
    }
  }

  /**
   * Handles DELETE /api/anotacao/paciente/:id to logically delete (soft delete) a patient note.
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
      console.error('[AnotacaoPacienteController.deletar]', error);
      res.status(500).json({ error: 'Erro interno ao excluir anotação de paciente.' });
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
      const id = String(req.params.id || '');
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
