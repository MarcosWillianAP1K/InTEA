import { Request, Response } from 'express';
import { PacienteModel, CriarPacienteDTO, AtualizarPacienteDTO, FiltrosPacienteDTO } from '../models/paciente.model.js';
import { validarCriarPacienteDTO, validarAtualizarPacienteDTO, validarUUID } from '../../../core/utils/validators.js';
import { formatarCPF, formatarCEP, formatarTelefone } from '../../../core/utils/formatters.js';

// ==============================================================================
// CONTROLLER: PacienteController
// ==============================================================================

export class PacienteController {
  /**
   * Handles GET /api/paciente to list patients with optional filtering, search, and pagination.
   *
   * @param req - Express request with optional query filters (nome, cpf, idadeMin, idadeMax, page, limit).
   * @param res - Express response returning patient list data and pagination metadata.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      const filtros: FiltrosPacienteDTO = {
        incluirInativos: req.query.incluirInativos === 'true',
        nome: typeof req.query.nome === 'string' ? req.query.nome : undefined,
        cpf: typeof req.query.cpf === 'string' ? req.query.cpf : undefined,
        idadeMin: req.query.idadeMin !== undefined ? Number(req.query.idadeMin) : undefined,
        idadeMax: req.query.idadeMax !== undefined ? Number(req.query.idadeMax) : undefined,
        page: req.query.page !== undefined ? Number(req.query.page) : undefined,
        limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
      };

      const resultado = await PacienteModel.listar(filtros);

      res.status(200).json({
        data: resultado.data,
        meta: resultado.meta,
      });
    } catch (error: any) {
      console.error('[PacienteController.listar]', error);
      res.status(500).json({
        error: 'Erro interno ao listar pacientes.',
        detalhes: error?.message || String(error),
      });
    }
  }

  /**
   * Handles GET /api/paciente/:id to retrieve a single patient by UUID.
   *
   * @param req - Express request containing the patient UUID in URL parameter `:id`.
   * @param res - Express response returning the patient record or 404 if not found.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      if (!validarUUID(id)) {
        res.status(400).json({ error: 'O parâmetro ID deve ser um UUID válido.' });
        return;
      }

      const paciente = await PacienteModel.buscarPorId(id);

      if (!paciente) {
        res.status(404).json({ error: 'Paciente não encontrado.' });
        return;
      }

      res.status(200).json({ data: paciente });
    } catch (error) {
      console.error('[PacienteController.buscarPorId]', error);
      res.status(500).json({ error: 'Erro interno ao buscar paciente.' });
    }
  }

  /**
   * Handles POST /api/paciente to create a new patient with sanitized and validated demographic data.
   *
   * @param req - Express request containing `CriarPacienteDTO` in body.
   * @param res - Express response returning status 201 with newly created patient.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async criar(req: Request, res: Response): Promise<void> {
    try {
      const dto: CriarPacienteDTO = req.body;

      // Validação dos dados do paciente e responsável
      const validacao = validarCriarPacienteDTO(dto);
      if (!validacao.valido) {
        res.status(400).json({
          error: 'Erro de validação nos dados do paciente.',
          erros: validacao.erros,
        });
        return;
      }

      // Normalização e formatação de máscaras (CPF, CEP, Telefone)
      dto.cpf = formatarCPF(dto.cpf);
      if (dto.cep) dto.cep = formatarCEP(dto.cep);
      if (dto.telefone) dto.telefone = formatarTelefone(dto.telefone);

      if (dto.responsavel) {
        if (dto.responsavel.cpf) dto.responsavel.cpf = formatarCPF(dto.responsavel.cpf);
        if (dto.responsavel.telefone) dto.responsavel.telefone = formatarTelefone(dto.responsavel.telefone);
      }

      const novoPaciente = await PacienteModel.criar(dto);

      res.status(201).json({
        data: novoPaciente,
        message: 'Paciente cadastrado com sucesso.',
      });
    } catch (error: any) {
      console.error('[PacienteController.criar]', error);

      if (error?.message?.includes('duplicate key') || error?.message?.includes('violates unique constraint')) {
        res.status(409).json({ error: 'Já existe um paciente cadastrado com este CPF.' });
        return;
      }

      res.status(500).json({ error: 'Erro interno ao cadastrar paciente.', detalhes: error?.message });
    }
  }

  /**
   * Handles PUT /api/paciente/:id to update fields of an existing patient.
   *
   * @param req - Express request with patient UUID in `:id` and update fields in body.
   * @param res - Express response returning status 200 with the updated patient.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const dto: AtualizarPacienteDTO = req.body;

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      if (!validarUUID(id)) {
        res.status(400).json({ error: 'O parâmetro ID deve ser um UUID válido.' });
        return;
      }

      // Validação dos dados parciais
      const validacao = validarAtualizarPacienteDTO(dto);
      if (!validacao.valido) {
        res.status(400).json({
          error: 'Erro de validação na atualização do paciente.',
          erros: validacao.erros,
        });
        return;
      }

      // Normalização e formatação de máscaras caso enviados
      if (dto.cpf) dto.cpf = formatarCPF(dto.cpf);
      if (dto.cep) dto.cep = formatarCEP(dto.cep);
      if (dto.telefone) dto.telefone = formatarTelefone(dto.telefone);

      const existente = await PacienteModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ error: 'Paciente não encontrado para atualização.' });
        return;
      }

      const pacienteAtualizado = await PacienteModel.atualizar(id, dto);

      res.status(200).json({
        data: pacienteAtualizado,
        message: 'Paciente atualizado com sucesso.',
      });
    } catch (error: any) {
      console.error('[PacienteController.atualizar]', error);

      if (error?.message?.includes('duplicate key') || error?.message?.includes('violates unique constraint')) {
        res.status(409).json({ error: 'Já existe outro paciente cadastrado com este CPF.' });
        return;
      }

      res.status(500).json({ error: 'Erro interno ao atualizar paciente.', detalhes: error?.message });
    }
  }

  /**
   * Handles DELETE /api/paciente/:id applying soft deletion (RN05).
   *
   * @param req - Express request with patient UUID in `:id`.
   * @param res - Express response returning status 200 with deactivated patient info.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async desativar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      if (!validarUUID(id)) {
        res.status(400).json({ error: 'O parâmetro ID deve ser um UUID válido.' });
        return;
      }

      const existente = await PacienteModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ error: 'Paciente não encontrado para desativação.' });
        return;
      }

      if (!existente.status_ativo) {
        res.status(200).json({
          data: existente,
          message: 'O paciente já se encontra inativo.',
        });
        return;
      }

      const pacienteDesativado = await PacienteModel.desativar(id);

      res.status(200).json({
        data: pacienteDesativado,
        message: 'Paciente desativado com sucesso (soft delete aplicado).',
      });
    } catch (error) {
      console.error('[PacienteController.desativar]', error);
      res.status(500).json({ error: 'Erro interno ao desativar paciente.' });
    }
  }

  /**
   * Handles PATCH /api/paciente/:id/reativar to reactivate an inactive patient record.
   *
   * @param req - Express request with patient UUID in `:id`.
   * @param res - Express response returning status 200 with reactivated patient.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async reativar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      if (!validarUUID(id)) {
        res.status(400).json({ error: 'O parâmetro ID deve ser um UUID válido.' });
        return;
      }

      const existente = await PacienteModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ error: 'Paciente não encontrado para reativação.' });
        return;
      }

      const pacienteReativado = await PacienteModel.reativar(id);

      res.status(200).json({
        data: pacienteReativado,
        message: 'Paciente reativado com sucesso.',
      });
    } catch (error) {
      console.error('[PacienteController.reativar]', error);
      res.status(500).json({ error: 'Erro interno ao reativar paciente.' });
    }
  }

  /**
   * Handles DELETE /api/paciente/:id/hard to permanently delete a patient (testing/dev).
   *
   * @param req - Express request with patient UUID in `:id`.
   * @param res - Express response confirming permanent deletion.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async deletarHard(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      if (!validarUUID(id)) {
        res.status(400).json({ error: 'O parâmetro ID deve ser um UUID válido.' });
        return;
      }

      const existente = await PacienteModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ error: 'Paciente não encontrado para exclusão física.' });
        return;
      }

      await PacienteModel.deletarHard(id);

      res.status(200).json({
        message: 'Paciente excluído fisicamente do banco com sucesso (hard delete para testes).',
      });
    } catch (error: any) {
      console.error('[PacienteController.deletarHard]', error);
      res.status(500).json({
        error: error?.message || 'Erro interno ao realizar exclusão física do paciente.',
      });
    }
  }

  // ============================================================================
  // GESTÃO DE VÍNCULOS TERAPEUTA-PACIENTE
  // ============================================================================

  /**
   * Handles POST /api/paciente/:id/terapeutas to associate a therapist with a patient.
   *
   * @param req - Express request with patient UUID in `:id` and `terapeuta_id` in body.
   * @param res - Express response returning status 201 on success.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async vincularTerapeuta(req: Request, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params.id);
      const { terapeuta_id } = req.body;

      if (!pacienteId || pacienteId === 'undefined') {
        res.status(400).json({ error: 'O ID do paciente é obrigatório.' });
        return;
      }

      if (!validarUUID(pacienteId)) {
        res.status(400).json({ error: 'O ID do paciente deve ser um UUID válido.' });
        return;
      }

      if (!terapeuta_id || typeof terapeuta_id !== 'string') {
        res.status(400).json({ error: 'O campo "terapeuta_id" (UUID) é obrigatório.' });
        return;
      }

      if (!validarUUID(terapeuta_id)) {
        res.status(400).json({ error: 'O campo "terapeuta_id" deve ser um UUID válido.' });
        return;
      }

      await PacienteModel.vincularTerapeuta(pacienteId, terapeuta_id);

      res.status(201).json({
        message: 'Terapeuta vinculado ao paciente com sucesso.',
      });
    } catch (error: any) {
      console.error('[PacienteController.vincularTerapeuta]', error);

      if (error?.message?.includes('não encontrado')) {
        res.status(404).json({ error: error.message });
        return;
      }

      if (error?.message?.includes('Bloqueio de segurança') || error?.message?.includes('inativo')) {
        res.status(400).json({ error: error.message });
        return;
      }

      res.status(500).json({
        error: 'Erro ao vincular terapeuta ao paciente.',
        detalhes: error?.message,
      });
    }
  }

  /**
   * Handles DELETE /api/paciente/:id/terapeutas/:terapeutaId to unlink a therapist.
   *
   * @param req - Express request with patient UUID in `:id` and therapist UUID in `:terapeutaId`.
   * @param res - Express response returning status 200 on unlinking.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async desvincularTerapeuta(req: Request, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params.id);
      const terapeutaId = String(req.params.terapeutaId);

      if (!pacienteId || !terapeutaId) {
        res.status(400).json({ error: 'Os parâmetros "id" e "terapeutaId" são obrigatórios.' });
        return;
      }

      if (!validarUUID(pacienteId)) {
        res.status(400).json({ error: 'O parâmetro "id" deve ser um UUID válido.' });
        return;
      }

      if (!validarUUID(terapeutaId)) {
        res.status(400).json({ error: 'O parâmetro "terapeutaId" deve ser um UUID válido.' });
        return;
      }

      await PacienteModel.desvincularTerapeuta(pacienteId, terapeutaId);

      res.status(200).json({
        message: 'Vínculo do terapeuta com o paciente removido com sucesso.',
      });
    } catch (error: any) {
      console.error('[PacienteController.desvincularTerapeuta]', error);

      if (error?.message?.includes('não encontrado')) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(500).json({
        error: 'Erro ao remover vínculo do terapeuta.',
        detalhes: error?.message,
      });
    }
  }

  /**
   * Handles GET /api/paciente/:id/terapeutas to retrieve all linked therapists.
   *
   * @param req - Express request with patient UUID in `:id`.
   * @param res - Express response returning the array of linked therapists.
   * @returns Resolves when the HTTP response has been sent.
   */
  static async listarTerapeutas(req: Request, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params.id);

      if (!pacienteId || pacienteId === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      if (!validarUUID(pacienteId)) {
        res.status(400).json({ error: 'O parâmetro ID deve ser um UUID válido.' });
        return;
      }

      const terapeutas = await PacienteModel.listarTerapeutasVinculados(pacienteId);

      res.status(200).json({ data: terapeutas });
    } catch (error: any) {
      console.error('[PacienteController.listarTerapeutas]', error);

      if (error?.message?.includes('não encontrado')) {
        res.status(404).json({ error: error.message });
        return;
      }

      res.status(500).json({
        error: 'Erro ao listar terapeutas vinculados.',
        detalhes: error?.message,
      });
    }
  }
}
