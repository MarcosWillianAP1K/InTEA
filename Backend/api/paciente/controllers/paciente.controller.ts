import { Request, Response } from 'express';
import { PacienteModel, CriarPacienteDTO, AtualizarPacienteDTO, FiltrosPacienteDTO } from '../models/paciente.model.js';
import { validarCriarPacienteDTO, validarAtualizarPacienteDTO } from '../../../core/utils/validators.js';
import { formatarCPF, formatarCEP, formatarTelefone } from '../../../core/utils/formatters.js';

// ==============================================================================
// CONTROLLER: PacienteController
// ==============================================================================

export class PacienteController {
  /**
   * GET /api/paciente
   * Lista pacientes com suporte a busca, filtros e paginação.
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
   * GET /api/paciente/:id
   * Busca um paciente específico pelo seu ID (UUID).
   */
  static async buscarPorId(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
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
   * POST /api/paciente
   * Cria um novo paciente com validação de dados cadastrais.
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
   * PUT /api/paciente/:id
   * Atualiza os dados de um paciente existente com validação.
   */
  static async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const dto: AtualizarPacienteDTO = req.body;

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
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
   * DELETE /api/paciente/:id
   * Soft Delete: Inativa o paciente preservando os dados.
   */
  static async desativar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
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
   * PATCH /api/paciente/:id/reativar
   * Reativa um paciente inativo.
   */
  static async reativar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
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
   * DELETE /api/paciente/:id/hard
   * Hard Delete: Exclusão definitiva do paciente.
   */
  static async deletarHard(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
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
   * POST /api/paciente/:id/terapeutas
   * Associa um terapeuta ao paciente.
   */
  static async vincularTerapeuta(req: Request, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params.id);
      const { terapeuta_id } = req.body;

      if (!pacienteId || pacienteId === 'undefined') {
        res.status(400).json({ error: 'O ID do paciente é obrigatório.' });
        return;
      }

      if (!terapeuta_id || typeof terapeuta_id !== 'string') {
        res.status(400).json({ error: 'O campo "terapeuta_id" (UUID) é obrigatório.' });
        return;
      }

      await PacienteModel.vincularTerapeuta(pacienteId, terapeuta_id);

      res.status(201).json({
        message: 'Terapeuta vinculado ao paciente com sucesso.',
      });
    } catch (error: any) {
      console.error('[PacienteController.vincularTerapeuta]', error);

      if (error?.message?.includes('Bloqueio de segurança')) {
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
   * DELETE /api/paciente/:id/terapeutas/:terapeutaId
   * Remove o vínculo de um terapeuta com o paciente.
   */
  static async desvincularTerapeuta(req: Request, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params.id);
      const terapeutaId = String(req.params.terapeutaId);

      if (!pacienteId || !terapeutaId) {
        res.status(400).json({ error: 'Os parâmetros "id" e "terapeutaId" são obrigatórios.' });
        return;
      }

      await PacienteModel.desvincularTerapeuta(pacienteId, terapeutaId);

      res.status(200).json({
        message: 'Vínculo do terapeuta com o paciente removido com sucesso.',
      });
    } catch (error: any) {
      console.error('[PacienteController.desvincularTerapeuta]', error);
      res.status(500).json({
        error: 'Erro ao remover vínculo do terapeuta.',
        detalhes: error?.message,
      });
    }
  }

  /**
   * GET /api/paciente/:id/terapeutas
   * Lista todos os terapeutas vinculados ao paciente.
   */
  static async listarTerapeutas(req: Request, res: Response): Promise<void> {
    try {
      const pacienteId = String(req.params.id);

      if (!pacienteId || pacienteId === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      const terapeutas = await PacienteModel.listarTerapeutasVinculados(pacienteId);

      res.status(200).json({ data: terapeutas });
    } catch (error: any) {
      console.error('[PacienteController.listarTerapeutas]', error);
      res.status(500).json({
        error: 'Erro ao listar terapeutas vinculados.',
        detalhes: error?.message,
      });
    }
  }
}
