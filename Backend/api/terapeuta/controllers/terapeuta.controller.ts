// ==============================================================================
// InTEA: Controller de Terapeutas (Camada HTTP / Thin Controller)
// ==============================================================================
// Conformidade: RF21 (Autoria), RN04 (Vínculo), RN05 (Soft Delete)
// ==============================================================================

import { Request, Response } from 'express';
import { CriarTerapeutaDTO, AtualizarTerapeutaDTO } from '../models/terapeuta.model.js';
import { TerapeutaService, TerapeutaServiceError } from '../services/terapeuta.service.js';
import { obterMensagemErro } from '../../../core/utils/formatters.js';

export class TerapeutaController {
  /**
   * Handles GET /api/terapeuta to list registered therapists.
   *
   * @param req - Express request with optional query `incluirInativos=true`.
   * @param res - Express response returning therapist list.
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const incluirInativos = req.query.incluirInativos === 'true';
      const terapeutas = await TerapeutaService.listar(incluirInativos);
      res.status(200).json({ data: terapeutas });
    } catch (error: unknown) {
      console.error('[TerapeutaController.listar]', error);
      res.status(500).json({
        error: 'Erro interno ao listar terapeutas.',
        detalhes: obterMensagemErro(error),
      });
    }
  }

  /**
   * Handles GET /api/terapeuta/:id to retrieve therapist details by UUID.
   *
   * @param req - Express request containing therapist UUID in `:id`.
   * @param res - Express response returning therapist record or 404 if not found.
   */
  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const terapeuta = await TerapeutaService.buscarPorId(id);

      if (!terapeuta) {
        res.status(404).json({ error: 'Terapeuta não encontrado.' });
        return;
      }

      res.status(200).json({ data: terapeuta });
    } catch (error: unknown) {
      if (error instanceof TerapeutaServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error('[TerapeutaController.buscarPorId]', error);
      res.status(500).json({
        error: 'Erro interno ao buscar terapeuta.',
        detalhes: obterMensagemErro(error),
      });
    }
  }

  /**
   * Handles POST /api/terapeuta to register a new therapist and create Supabase Auth credentials.
   *
   * @param req - Express request containing `CriarTerapeutaDTO` in body.
   * @param res - Express response returning status 201 with created therapist.
   */
  static async criar(req: Request, res: Response): Promise<void> {
    try {
      const dto: CriarTerapeutaDTO = req.body;
      const novoTerapeuta = await TerapeutaService.criar(dto);

      res.status(201).json({
        data: novoTerapeuta,
        message: 'Terapeuta cadastrado e conta de acesso criada com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof TerapeutaServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      const msg = obterMensagemErro(error);
      if (
        msg.includes('already registered') ||
        msg.includes('User already registered') ||
        msg.includes('duplicate key') ||
        msg.includes('23505')
      ) {
        res.status(409).json({ error: 'Este endereço de e-mail já está cadastrado para outro terapeuta.' });
        return;
      }

      console.error('[TerapeutaController.criar]', error);
      res.status(500).json({ error: 'Erro interno ao cadastrar terapeuta.', detalhes: msg });
    }
  }

  /**
   * Handles PUT /api/terapeuta/:id to update therapist details.
   *
   * @param req - Express request containing therapist UUID in `:id` and update fields in body.
   * @param res - Express response returning status 200 with updated therapist.
   */
  static async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const dto: AtualizarTerapeutaDTO = req.body;

      const atualizado = await TerapeutaService.atualizar(id, dto);

      res.status(200).json({
        data: atualizado,
        message: 'Terapeuta atualizado com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof TerapeutaServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      console.error('[TerapeutaController.atualizar]', error);
      res.status(500).json({
        error: 'Erro interno ao atualizar terapeuta.',
        detalhes: obterMensagemErro(error),
      });
    }
  }

  /**
   * Handles DELETE /api/terapeuta/:id applying soft deletion (RN05).
   *
   * @param req - Express request containing therapist UUID in `:id`.
   * @param res - Express response returning status 200 with deactivated therapist.
   */
  static async desativar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { terapeuta, jaInativo } = await TerapeutaService.desativar(id);

      if (jaInativo) {
        res.status(200).json({
          data: terapeuta,
          message: 'O terapeuta já se encontra inativo.',
        });
        return;
      }

      res.status(200).json({
        data: terapeuta,
        message: 'Terapeuta desativado com sucesso (soft delete aplicado).',
      });
    } catch (error: unknown) {
      if (error instanceof TerapeutaServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      console.error('[TerapeutaController.desativar]', error);
      res.status(500).json({
        error: 'Erro interno ao desativar terapeuta.',
        detalhes: obterMensagemErro(error),
      });
    }
  }

  /**
   * Handles PATCH /api/terapeuta/:id/reativar to reactivate a therapist account.
   *
   * @param req - Express request containing therapist UUID in `:id`.
   * @param res - Express response returning status 200 with reactivated therapist.
   */
  static async reativar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const reativado = await TerapeutaService.reativar(id);

      res.status(200).json({
        data: reativado,
        message: 'Terapeuta reativado com sucesso.',
      });
    } catch (error: unknown) {
      if (error instanceof TerapeutaServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      console.error('[TerapeutaController.reativar]', error);
      res.status(500).json({
        error: 'Erro interno ao reativar terapeuta.',
        detalhes: obterMensagemErro(error),
      });
    }
  }

  /**
   * Handles DELETE /api/terapeuta/:id/hard to permanently delete a therapist (testing/dev).
   *
   * @param req - Express request containing therapist UUID in `:id`.
   * @param res - Express response acknowledging permanent removal.
   */
  static async deletarHard(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      await TerapeutaService.deletarHard(id);

      res.status(200).json({
        message: 'Terapeuta e credenciais excluídos fisicamente com sucesso (hard delete para testes).',
      });
    } catch (error: unknown) {
      if (error instanceof TerapeutaServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      console.error('[TerapeutaController.deletarHard]', error);
      res.status(500).json({
        error: 'Erro interno ao realizar exclusão física.',
        detalhes: obterMensagemErro(error),
      });
    }
  }
}
