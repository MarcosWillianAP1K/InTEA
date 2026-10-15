import { Request, Response } from 'express';
import { TerapeutaModel, CriarTerapeutaDTO, AtualizarTerapeutaDTO } from '../models/terapeuta.model.js';
import { validarTelefone } from '../../../core/utils/validators.js';
import { formatarTelefone } from '../../../core/utils/formatters.js';

// ==============================================================================
// CONTROLLER: TerapeutaController
// ==============================================================================

export class TerapeutaController {
  /**
   * Handles GET /api/terapeuta to list registered therapists.
   *
   * @param req - Express request with optional query `incluirInativos=true`.
   * @param res - Express response returning therapist list.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const incluirInativos = req.query.incluirInativos === 'true';
      const terapeutas = await TerapeutaModel.listar(incluirInativos);
      const sanitizados = terapeutas.map((t: any) => ({
        ...t,
        areas_foco: Array.isArray(t.areas_foco)
          ? t.areas_foco.map((item: any) => (item?.areas_foco ? item.areas_foco : item))
          : [],
      }));
      res.status(200).json({ data: sanitizados });
    } catch (error: any) {
      console.error('[TerapeutaController.listar]', error);
      res.status(500).json({ error: 'Erro interno ao listar terapeutas.', detalhes: error?.message });
    }
  }

  /**
   * Handles GET /api/terapeuta/:id to retrieve therapist details by UUID.
   *
   * @param req - Express request containing therapist UUID in `:id`.
   * @param res - Express response returning therapist record or 404 if not found.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      const terapeuta = await TerapeutaModel.buscarPorId(id);

      if (!terapeuta) {
        res.status(404).json({ error: 'Terapeuta não encontrado.' });
        return;
      }

      const areasFoco = Array.isArray(terapeuta.areas_foco)
        ? terapeuta.areas_foco.map((item: any) => (item?.areas_foco ? item.areas_foco : item))
        : [];

      res.status(200).json({
        data: {
          ...terapeuta,
          areas_foco: areasFoco,
        },
      });
    } catch (error: any) {
      console.error('[TerapeutaController.buscarPorId]', error);
      res.status(500).json({ error: 'Erro interno ao buscar terapeuta.', detalhes: error?.message });
    }
  }

  /**
   * Handles POST /api/terapeuta to register a new therapist and create Supabase Auth credentials.
   *
   * @param req - Express request containing `CriarTerapeutaDTO` in body.
   * @param res - Express response returning status 201 with created therapist.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async criar(req: Request, res: Response): Promise<void> {
    try {
      const dto: CriarTerapeutaDTO = req.body;

      if (!dto.nome || dto.nome.trim() === '') {
        res.status(400).json({ error: 'O campo "nome" é obrigatório.' });
        return;
      }

      if (!dto.email || dto.email.trim() === '') {
        res.status(400).json({ error: 'O campo "email" é obrigatório.' });
        return;
      }

      if (!dto.password || dto.password.length < 6) {
        res.status(400).json({ error: 'O campo "password" é obrigatório e deve ter no mínimo 6 caracteres.' });
        return;
      }

      // Validação e formatação de telefone se informado
      if (dto.telefone && typeof dto.telefone === 'string' && dto.telefone.trim() !== '') {
        if (!validarTelefone(dto.telefone)) {
          res.status(400).json({
            error: 'O telefone informado é inválido. Deve conter DDD válido e o dígito 9 na frente (ex: +55 (11) 98765-4321 ou 11987654321).',
          });
          return;
        }
        dto.telefone = formatarTelefone(dto.telefone);
      }

      const novoTerapeuta = await TerapeutaModel.criar(dto);

      res.status(201).json({
        data: novoTerapeuta,
        message: 'Terapeuta cadastrado e conta de acesso criada com sucesso.',
      });
    } catch (error: any) {
      console.error('[TerapeutaController.criar]', error);

      if (error?.message?.includes('already registered') || error?.message?.includes('User already registered') || error?.message?.includes('duplicate key')) {
        res.status(409).json({ error: 'Este endereço de e-mail já está cadastrado para outro terapeuta.' });
        return;
      }

      res.status(500).json({ error: 'Erro interno ao cadastrar terapeuta.', detalhes: error?.message });
    }
  }

  /**
   * Handles PUT /api/terapeuta/:id to update therapist details.
   *
   * @param req - Express request containing therapist UUID in `:id` and update fields in body.
   * @param res - Express response returning status 200 with updated therapist.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const dto: AtualizarTerapeutaDTO = req.body;

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      const existente = await TerapeutaModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ error: 'Terapeuta não encontrado para atualização.' });
        return;
      }

      // Validação e formatação de telefone se informado
      if (dto.telefone !== undefined && dto.telefone !== null && dto.telefone.trim() !== '') {
        if (!validarTelefone(dto.telefone)) {
          res.status(400).json({
            error: 'O telefone informado é inválido. Deve conter DDD válido e o dígito 9 na frente (ex: +55 (11) 98765-4321 ou 11987654321).',
          });
          return;
        }
        dto.telefone = formatarTelefone(dto.telefone);
      }

      const atualizado = await TerapeutaModel.atualizar(id, dto);

      const areasFoco = atualizado && Array.isArray(atualizado.areas_foco)
        ? atualizado.areas_foco.map((item: any) => (item?.areas_foco ? item.areas_foco : item))
        : [];

      res.status(200).json({
        data: {
          ...atualizado,
          areas_foco: areasFoco,
        },
        message: 'Terapeuta atualizado com sucesso.',
      });
    } catch (error: any) {
      console.error('[TerapeutaController.atualizar]', error);
      res.status(500).json({ error: 'Erro interno ao atualizar terapeuta.', detalhes: error?.message });
    }
  }

  /**
   * Handles DELETE /api/terapeuta/:id applying soft deletion (RN05).
   *
   * @param req - Express request containing therapist UUID in `:id`.
   * @param res - Express response returning status 200 with deactivated therapist.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async desativar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      const existente = await TerapeutaModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ error: 'Terapeuta não encontrado para desativação.' });
        return;
      }

      if (!existente.status_ativo) {
        res.status(200).json({ data: existente, message: 'O terapeuta já se encontra inativo.' });
        return;
      }

      const desativado = await TerapeutaModel.desativar(id);

      res.status(200).json({
        data: desativado,
        message: 'Terapeuta desativado com sucesso (soft delete aplicado).',
      });
    } catch (error: any) {
      console.error('[TerapeutaController.desativar]', error);
      res.status(500).json({ error: 'Erro interno ao desativar terapeuta.', detalhes: error?.message });
    }
  }

  /**
   * Handles PATCH /api/terapeuta/:id/reativar to reactivate a therapist account.
   *
   * @param req - Express request containing therapist UUID in `:id`.
   * @param res - Express response returning status 200 with reactivated therapist.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async reativar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      const existente = await TerapeutaModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ error: 'Terapeuta não encontrado para reativação.' });
        return;
      }

      const reativado = await TerapeutaModel.reativar(id);

      res.status(200).json({
        data: reativado,
        message: 'Terapeuta reativado com sucesso.',
      });
    } catch (error: any) {
      console.error('[TerapeutaController.reativar]', error);
      res.status(500).json({ error: 'Erro interno ao reativar terapeuta.', detalhes: error?.message });
    }
  }

  /**
   * Handles DELETE /api/terapeuta/:id/hard to permanently delete a therapist (testing/dev).
   *
   * @param req - Express request containing therapist UUID in `:id`.
   * @param res - Express response acknowledging permanent removal.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async deletarHard(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      const existente = await TerapeutaModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ error: 'Terapeuta não encontrado para exclusão física.' });
        return;
      }

      await TerapeutaModel.deletarHard(id);

      res.status(200).json({
        message: 'Terapeuta e credenciais excluídos fisicamente com sucesso (hard delete para testes).',
      });
    } catch (error: any) {
      console.error('[TerapeutaController.deletarHard]', error);
      res.status(500).json({ error: 'Erro interno ao realizar exclusão física.', detalhes: error?.message });
    }
  }
}

