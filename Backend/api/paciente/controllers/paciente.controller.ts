import { Request, Response } from 'express';
import { PacienteModel, CriarPacienteDTO, AtualizarPacienteDTO } from '../models/paciente.model.js';

// ==============================================================================
// CONTROLLER: PacienteController
// 
// O que é o Controller no MVC?
// É o "maestro" da rota. Ele não acessa o banco diretamente nem cuida de SQL.
// A responsabilidade dele é:
// 1. Receber a requisição HTTP (req: dados enviados pelo frontend na URL, query ou body)
// 2. Fazer checagens básicas de entrada (ex: campos obrigatórios presentes)
// 3. Chamar o Model para executar a operação necessária
// 4. Responder ao cliente com o código HTTP adequado (res: 200, 201, 400, 404, 500)
// ==============================================================================

export class PacienteController {
  /**
   * GET /api/pacientes
   * Lista todos os pacientes cadastrados.
   * 
   * Suporta query param opcional: ?incluirInativos=true
   * Por padrão, lista apenas pacientes ativos (status_ativo = true), respeitando a regra de Soft Delete.
   */
  static async listar(req: Request, res: Response): Promise<void> {
    try {
      // Lê query param ?incluirInativos=true caso o frontend precise ver inativos
      const incluirInativos = req.query.incluirInativos === 'true';

      const pacientes = await PacienteModel.listar(incluirInativos);

      res.status(200).json({ data: pacientes });
    } catch (error) {
      console.error('[PacienteController.listar]', error);
      res.status(500).json({ error: 'Erro interno ao listar pacientes.' });
    }
  }

  /**
   * GET /api/pacientes/:id
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
   * POST /api/pacientes
   * Cria um novo paciente.
   * 
   * Campos obrigatórios mínimos: nome e data_nascimento.
   */
  static async criar(req: Request, res: Response): Promise<void> {
    try {
      const dto: CriarPacienteDTO = req.body;

      // Validação básica dos campos obrigatórios
      if (!dto.nome || dto.nome.trim() === '') {
        res.status(400).json({ error: 'O campo "nome" é obrigatório.' });
        return;
      }

      if (!dto.data_nascimento) {
        res.status(400).json({ error: 'O campo "data_nascimento" é obrigatório.' });
        return;
      }

      if (!dto.cpf || dto.cpf.trim() === '') {
        res.status(400).json({ error: 'O campo "cpf" é obrigatório.' });
        return;
      }

      const novoPaciente = await PacienteModel.criar(dto);

      // 201: Created (indica que um novo recurso foi criado com sucesso)
      res.status(201).json({ data: novoPaciente });
    } catch (error: any) {
      console.error('[PacienteController.criar]', error);

      // Tratamento amigável para chave única violada (ex: CPF já cadastrado)
      if (error?.message?.includes('duplicate key') || error?.message?.includes('violates unique constraint')) {
        res.status(409).json({ error: 'Já existe um paciente cadastrado com este CPF.' });
        return;
      }

      res.status(500).json({ error: 'Erro interno ao cadastrar paciente.' });
    }
  }

  /**
   * PUT /api/pacientes/:id
   * Atualiza os dados de um paciente existente.
   */
  static async atualizar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const dto: AtualizarPacienteDTO = req.body;

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      // Verifica se o paciente realmente existe antes de tentar atualizar
      const existente = await PacienteModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ error: 'Paciente não encontrado para atualização.' });
        return;
      }

      const pacienteAtualizado = await PacienteModel.atualizar(id, dto);

      res.status(200).json({ data: pacienteAtualizado });
    } catch (error: any) {
      console.error('[PacienteController.atualizar]', error);

      if (error?.message?.includes('duplicate key') || error?.message?.includes('violates unique constraint')) {
        res.status(409).json({ error: 'Já existe outro paciente cadastrado com este CPF.' });
        return;
      }

      res.status(500).json({ error: 'Erro interno ao atualizar paciente.' });
    }
  }

  /**
   * DELETE /api/pacientes/:id
   * 
   * SOFT DELETE (Exclusão Lógica):
   * Atende à regra clínica RN05 (Inalterabilidade do Histórico).
   * O paciente NÃO é apagado fisicamente do banco de dados. Em vez disso, seu campo
   * `status_ativo` é definido como `false`.
   */
  static async desativar(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);

      if (!id || id === 'undefined') {
        res.status(400).json({ error: 'O parâmetro ID é obrigatório.' });
        return;
      }

      // Verifica se o paciente existe
      const existente = await PacienteModel.buscarPorId(id);
      if (!existente) {
        res.status(404).json({ error: 'Paciente não encontrado para desativação.' });
        return;
      }

      // Se já estiver inativo, podemos avisar ou apenas confirmar
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
   * PATCH /api/pacientes/:id/reativar
   * Reativa um paciente que havia sido previamente inativado.
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
   * DELETE /api/pacientes/:id/hard
   * 
   * HARD DELETE (Exclusão Física Permanente):
   * ATENÇÃO: Esta rota é restrita para ambiente de testes e desenvolvimento.
   * Apaga definitivamente o registro do banco de dados (DELETE FROM paciente).
   * Para ambiente de produção clínico, utilize sempre o Soft Delete (DELETE /api/pacientes/:id).
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

      const pacienteDeletado = await PacienteModel.deletarHard(id);

      res.status(200).json({
        data: pacienteDeletado,
        message: 'Paciente excluído fisicamente do banco com sucesso (hard delete para testes).',
      });
    } catch (error: any) {
      console.error('[PacienteController.deletarHard]', error);
      res.status(500).json({
        error: error?.message || 'Erro interno ao realizar exclusão física do paciente.',
      });
    }
  }
}
