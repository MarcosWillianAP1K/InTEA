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
 *         description: Se true, retorna também pacientes inativados (soft delete)
 *     responses:
 *       200:
 *         description: Lista de pacientes retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Paciente'
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
 *           format: uuid
 *         description: UUID do paciente
 *     responses:
 *       200:
 *         description: Paciente encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Paciente'
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
 *           schema:
 *             $ref: '#/components/schemas/CriarPacienteDTO'
 *           example:
 *             nome: "João Pedro Silva"
 *             data_nascimento: "2015-03-20"
 *             cpf: "123.456.789-00"
 *             telefone: "(11) 98765-4321"
 *             clinica_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *             cidade: "São Paulo"
 *             estado: "SP"
 *             cep: "01310-100"
 *             endereco: "Av. Paulista"
 *             bairro: "Bela Vista"
 *             numero: "1000"
 *     responses:
 *       201:
 *         description: Paciente cadastrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Paciente'
 *       400:
 *         description: Campo obrigatório ausente (nome, data_nascimento ou cpf)
 *       409:
 *         description: CPF já cadastrado para outro paciente
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
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AtualizarPacienteDTO'
 *           example:
 *             nome: "João Pedro Oliveira"
 *             telefone: "(11) 91234-5678"
 *             cidade: "Campinas"
 *     responses:
 *       200:
 *         description: Paciente atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Paciente'
 *       404:
 *         description: Paciente não encontrado
 *       409:
 *         description: CPF já pertence a outro paciente
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
 *     description: "ATENÇÃO: Remove o registro definitivamente do banco de dados. Use apenas em ambiente de desenvolvimento e testes. Em produção utilize o soft delete (DELETE /api/paciente/{id})."
 *     tags: [Paciente]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *     description: "Exclusão lógica conforme RN05 (Inalterabilidade do Histórico Clínico). O registro permanece no banco, apenas marcado como inativo."
 *     tags: [Paciente]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *           format: uuid
 *     responses:
 *       200:
 *         description: Paciente reativado com sucesso
 *       404:
 *         description: Paciente não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
pacienteRoutes.patch('/:id/reativar', PacienteController.reativar);
