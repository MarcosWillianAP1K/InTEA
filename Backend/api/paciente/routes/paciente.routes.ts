import { Router } from 'express';
import { PacienteController } from '../controllers/paciente.controller.js';

// ==============================================================================
// ROTAS: /api/paciente
// Mapeia as URLs e métodos HTTP para as funções correspondentes no PacienteController.
// ==============================================================================

export const pacienteRoutes = Router();

// ------------------------------------------------------------------------------
// 1. Consultas (Leitura)
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/paciente:
 *   get:
 *     summary: Lista todos os pacientes ativos
 *     tags: [Paciente]
 *     parameters:
 *       - in: query
 *         name: incluirInativos
 *         schema:
 *           type: boolean
 *         description: Se true, inclui também pacientes inativos (soft delete)
 *     responses:
 *       200:
 *         description: Lista de pacientes retornada com sucesso
 *       500:
 *         description: Erro interno do servidor
 */
pacienteRoutes.get('/', PacienteController.listar);

/**
 * @swagger
 * /api/paciente/{id}:
 *   get:
 *     summary: Busca um paciente pelo ID
 *     tags: [Paciente]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do paciente
 *     responses:
 *       200:
 *         description: Paciente encontrado com sucesso
 *       404:
 *         description: Paciente não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
pacienteRoutes.get('/:id', PacienteController.buscarPorId);

// ------------------------------------------------------------------------------
// 2. Persistência (Criação e Atualização)
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/paciente:
 *   post:
 *     summary: Cadastra um novo paciente
 *     tags: [Paciente]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nome: "João Pedro Silva"
 *             data_nascimento: "2015-03-20"
 *             cpf: "123.456.789-00"
 *             telefone: "(11) 98765-4321"
 *             cidade: "São Paulo"
 *             estado: "SP"
 *     responses:
 *       201:
 *         description: Paciente cadastrado com sucesso
 *       400:
 *         description: Campos obrigatórios ausentes
 *       409:
 *         description: CPF já cadastrado
 *       500:
 *         description: Erro interno do servidor
 */
pacienteRoutes.post('/', PacienteController.criar);

/**
 * @swagger
 * /api/paciente/{id}:
 *   put:
 *     summary: Atualiza os dados de um paciente
 *     tags: [Paciente]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do paciente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nome: "João Pedro Atualizado"
 *             telefone: "(11) 99999-8888"
 *             cidade: "Campinas"
 *     responses:
 *       200:
 *         description: Paciente atualizado com sucesso
 *       404:
 *         description: Paciente não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
pacienteRoutes.put('/:id', PacienteController.atualizar);

// ------------------------------------------------------------------------------
// 3. Exclusão e Reativação
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/paciente/{id}/hard:
 *   delete:
 *     summary: "[DEV/TESTES] Exclusão física permanente do paciente"
 *     tags: [Paciente]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do paciente
 *     responses:
 *       200:
 *         description: Paciente excluído fisicamente com sucesso
 *       404:
 *         description: Paciente não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
pacienteRoutes.delete('/:id/hard', PacienteController.deletarHard);

/**
 * @swagger
 * /api/paciente/{id}:
 *   delete:
 *     summary: Soft Delete — Desativa um paciente (status_ativo = false)
 *     tags: [Paciente]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do paciente
 *     responses:
 *       200:
 *         description: Paciente desativado com sucesso (soft delete)
 *       404:
 *         description: Paciente não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
pacienteRoutes.delete('/:id', PacienteController.desativar);

/**
 * @swagger
 * /api/paciente/{id}/reativar:
 *   patch:
 *     summary: Reativa um paciente previamente inativado
 *     tags: [Paciente]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do paciente
 *     responses:
 *       200:
 *         description: Paciente reativado com sucesso
 *       404:
 *         description: Paciente não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
pacienteRoutes.patch('/:id/reativar', PacienteController.reativar);
