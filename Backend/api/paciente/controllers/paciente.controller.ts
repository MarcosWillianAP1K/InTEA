// ==============================================================================
// InTEA: Controller de Pacientes (Camada HTTP / Thin Controller)
// ==============================================================================
// Conformidade: RF10, RN04 (Visibilidade), RN05 (Soft Delete)
// ==============================================================================

import { Request, Response } from 'express';
import { CriarPacienteDTO, AtualizarPacienteDTO, FiltrosPacienteDTO } from '../models/paciente.model.js';
import { PacienteService, PacienteServiceError } from '../services/paciente.service.js';
import { AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { obterMensagemErro } from '../../../core/utils/formatters.js';

export class PacienteController {
  /**
   * Handles GET /api/paciente to list patients with optional filtering, search, and pagination.
   *
   * @param req - Express request with optional query filters (nome, cpf, idadeMin, idadeMax, page, limit).
   * @param res - Express response returning patient list data and pagination metadata.
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const verTodosPacientes = req.query.all === 'true' || req.query.todos === 'true';
      const usuarioLogado = (req as AuthenticatedRequest).user;

      const filtros: FiltrosPacienteDTO = {
        incluirInativos: req.query.incluirInativos === 'true',
        nome: typeof req.query.nome === 'string' ? req.query.nome : undefined,
        cpf: typeof req.query.cpf === 'string' ? req.query.cpf : undefined,
        idadeMin: req.query.idadeMin !== undefined ? Number(req.query.idadeMin) : undefined,
        idadeMax: req.query.idadeMax !== undefined ? Number(req.query.idadeMax) : undefined,
        page: req.query.page !== undefined ? Number(req.query.page) : undefined,
        limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
        terapeutaId: undefined,
      };

      const resultado = await PacienteService.listar(filtros, usuarioLogado, verTodosPacientes);

      res.status(200).json({
        data: resultado.data,
        meta: resultado.meta,
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({
          error: error.message,
          detalhes: error.detalhes,
        });
        return;
      }
      console.error('[PacienteController.listar]', error);
      res.status(500).json({
        error: 'Erro interno ao listar pacientes.',
        detalhes: obterMensagemErro(error),
      });
    }
  }

  /**
   * Handles GET /api/paciente/:id to retrieve a single patient by UUID.
   *
   * @param req - Express request containing the patient UUID in URL parameter `:id`.
   * @param res - Express response returning the patient record or 404 if not found.
   */
  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const paciente = await PacienteService.buscarPorId(id);

      if (!paciente) {
        res.status(404).json({ error: 'Paciente não encontrado.' });
        return;
      }

      res.status(200).json({ data: paciente });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('[PacienteController.buscarPorId]', error);
      res.status(500).json({ error: 'Erro interno ao buscar paciente.' });
    }
  }

  /**
   * Handles POST /api/paciente to create a new patient with sanitized demographic data.
   *
   * @param req - Express request containing `CriarPacienteDTO` in body.
   * @param res - Express response returning status 201 with newly created patient.
   */
  static async criar(req: Request, res: Response): Promise<void> {
    try {
      const dto: CriarPacienteDTO = req.body;
      const usuarioLogado = (req as AuthenticatedRequest).user;
      const novoPaciente = await PacienteService.criar(dto, usuarioLogado);

      res.status(201).json({
        data: novoPaciente,
        message: 'Paciente cadastrado com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({
          error: error.message,
          erros: error.detalhes,
        });
        return;
      }

      const msg = obterMensagemErro(error);
      const isDuplicate =
        msg.includes('duplicate key') ||
        msg.includes('violates unique constraint') ||
        msg.includes('chave duplicada') ||
        msg.includes('restrição de unicidade') ||
        msg.includes('Já existe um paciente') ||
        msg.includes('23505');

      if (isDuplicate) {
        res.status(409).json({
          error: msg.includes('ativo') ? msg : 'Já existe um paciente cadastrado com este CPF.',
        });
        return;
      }

      console.error('[PacienteController.criar]', error);
      res.status(500).json({ error: 'Erro interno ao cadastrar paciente.', detalhes: msg });
    }
  }

  /**
   * Handles PUT /api/paciente/:id to update fields of an existing patient.
   *
   * @param req - Express request with patient UUID in `:id` and update fields in body.
   * @param res - Express response returning status 200 with the updated patient.
   */
  static async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const dto: AtualizarPacienteDTO = req.body;

      const pacienteAtualizado = await PacienteService.atualizar(id, dto);

      res.status(200).json({
        data: pacienteAtualizado,
        message: 'Paciente atualizado com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({
          error: error.message,
          erros: error.detalhes,
        });
        return;
      }

      const msg = obterMensagemErro(error);
      const isDuplicate =
        msg.includes('duplicate key') ||
        msg.includes('violates unique constraint') ||
        msg.includes('chave duplicada') ||
        msg.includes('restrição de unicidade') ||
        msg.includes('23505');

      if (isDuplicate) {
        res.status(409).json({ error: 'Já existe outro paciente cadastrado com este CPF.' });
        return;
      }

      console.error('[PacienteController.atualizar]', error);
      res.status(500).json({ error: 'Erro interno ao atualizar paciente.', detalhes: msg });
    }
  }

  /**
   * Handles DELETE /api/paciente/:id applying soft deletion (RN05).
   *
   * @param req - Express request with patient UUID in `:id`.
   * @param res - Express response returning status 200 with deactivated patient info.
   */
  static async desativar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { paciente, jaInativo } = await PacienteService.desativar(id);

      if (jaInativo) {
        res.status(200).json({
          data: paciente,
          message: 'O paciente já se encontra inativo.',
        });
        return;
      }

      res.status(200).json({
        data: paciente,
        message: 'Paciente desativado com sucesso (soft delete aplicado).',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('[PacienteController.desativar]', error);
      res.status(500).json({ error: 'Erro interno ao desativar paciente.' });
    }
  }

  /**
   * Handles PATCH /api/paciente/:id/reativar to reactivate an inactive patient record.
   *
   * @param req - Express request with patient UUID in `:id`.
   * @param res - Express response returning status 200 with reactivated patient.
   */
  static async reativar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const pacienteReativado = await PacienteService.reativar(id);

      res.status(200).json({
        data: pacienteReativado,
        message: 'Paciente reativado com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('[PacienteController.reativar]', error);
      res.status(500).json({ error: 'Erro interno ao reativar paciente.' });
    }
  }

  /**
   * Handles DELETE /api/paciente/:id/hard to permanently delete a patient (testing/dev).
   *
   * @param req - Express request with patient UUID in `:id`.
   * @param res - Express response confirming permanent deletion.
   */
  static async deletarHard(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      await PacienteService.deletarHard(id);

      res.status(200).json({
        message: 'Paciente excluído fisicamente do banco com sucesso (hard delete para testes).',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('[PacienteController.deletarHard]', error);
      res.status(500).json({
        error: obterMensagemErro(error) || 'Erro interno ao realizar exclusão física do paciente.',
      });
    }
  }

  /**
   * Handles POST /api/paciente/:id/terapeutas to associate a therapist with a patient.
   *
   * @param req - Express request with patient UUID in `:id` and `terapeuta_id` in body.
   * @param res - Express response returning status 201 on success.
   */
  static async vincularTerapeuta(req: Request, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params.id);
      const { terapeuta_id } = req.body || {};

      if (!terapeuta_id || typeof terapeuta_id !== 'string') {
        res.status(400).json({ error: 'O campo "terapeuta_id" (UUID) é obrigatório.' });
        return;
      }

      await PacienteService.vincularTerapeuta(pacienteId, terapeuta_id);

      res.status(201).json({
        message: 'Terapeuta vinculado ao paciente com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      const msg = obterMensagemErro(error);
      if (msg.includes('não encontrado')) {
        res.status(404).json({ error: msg });
        return;
      }

      if (msg.includes('Bloqueio de segurança') || msg.includes('inativo')) {
        res.status(400).json({ error: msg });
        return;
      }

      console.error('[PacienteController.vincularTerapeuta]', error);
      res.status(500).json({
        error: 'Erro ao vincular terapeuta ao paciente.',
        detalhes: msg,
      });
    }
  }

  /**
   * Handles DELETE /api/paciente/:id/terapeutas/:terapeutaId to unlink a therapist.
   *
   * @param req - Express request with patient UUID in `:id` and therapist UUID in `:terapeutaId`.
   * @param res - Express response returning status 200 on unlinking.
   */
  static async desvincularTerapeuta(req: Request, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params.id);
      const terapeutaId = String(req.params.terapeutaId);

      await PacienteService.desvincularTerapeuta(pacienteId, terapeutaId);

      res.status(200).json({
        message: 'Vínculo do terapeuta com o paciente removido com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      const msg = obterMensagemErro(error);
      if (msg.includes('não encontrado')) {
        res.status(404).json({ error: msg });
        return;
      }

      console.error('[PacienteController.desvincularTerapeuta]', error);
      res.status(500).json({
        error: 'Erro ao remover vínculo do terapeuta.',
        detalhes: msg,
      });
    }
  }

  /**
   * Handles GET /api/paciente/:id/terapeutas to retrieve all linked therapists.
   *
   * @param req - Express request with patient UUID in `:id`.
   * @param res - Express response returning the array of linked therapists.
   */
  static async listarTerapeutas(req: Request, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params.id);
      const terapeutas = await PacienteService.listarTerapeutas(pacienteId);

      res.status(200).json({ data: terapeutas });
    } catch (error: unknown) {
      if (error instanceof PacienteServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      const msg = obterMensagemErro(error);
      if (msg.includes('não encontrado')) {
        res.status(404).json({ error: msg });
        return;
      }

      console.error('[PacienteController.listarTerapeutas]', error);
      res.status(500).json({
        error: 'Erro ao listar terapeutas vinculados.',
        detalhes: msg,
      });
    }
  }
}
