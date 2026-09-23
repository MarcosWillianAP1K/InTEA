import { Router } from 'express';
import { PacienteController } from '../controllers/paciente.controller.js';
import { authMiddleware } from '../../../core/middlewares/auth.middleware.js';
import { verificarVisibilidadePaciente } from '../../../core/middlewares/visibilidade.middleware.js';

// ==============================================================================
// ROTAS: /api/paciente
// ==============================================================================

export const pacienteRoutes = Router();

// ------------------------------------------------------------------------------
// 1. Consultas, Busca e Filtros
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/paciente:
 *   get:
 *     summary: Lista pacientes com busca, filtros e paginação
 *     tags: [Paciente]
 *     parameters:
 *       - in: query
 *         name: nome
 *         schema:
 *           type: string
 *         description: Busca parcial por nome (case-insensitive)
 *       - in: query
 *         name: cpf
 *         schema:
 *           type: string
 *         description: Busca por CPF
 *       - in: query
 *         name: idadeMin
 *         schema:
 *           type: integer
 *         description: Idade mínima (anos)
 *       - in: query
 *         name: idadeMax
 *         schema:
 *           type: integer
 *         description: Idade máxima (anos)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página (padrão 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Quantidade de itens por página (padrão 10)
 *       - in: query
 *         name: incluirInativos
 *         schema:
 *           type: boolean
 *         description: Se true, inclui também pacientes inativos (soft delete)
 *     responses:
 *       200:
 *         description: Lista de pacientes e metadados de paginação retornados com sucesso
 *       500:
 *         description: Erro interno do servidor
 */
pacienteRoutes.get('/', PacienteController.listar);

/**
 * @swagger
 * /api/paciente/{id}:
 *   get:
 *     summary: Busca dados e prontuário do paciente (com verificação de vínculo)
 *     tags: [Paciente]
 *     security:
 *       - BearerAuth: []
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
 *       400:
 *         description: Identificador UUID inválido
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado (sem vínculo ativo com o paciente)
 *       404:
 *         description: Paciente não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
pacienteRoutes.get('/:id', authMiddleware, verificarVisibilidadePaciente, PacienteController.buscarPorId);

// ------------------------------------------------------------------------------
// 2. Persistência (Criação e Atualização de Pacientes)
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/paciente:
 *   post:
 *     summary: Cadastra um novo paciente e opcionalmente seu responsável
 *     tags: [Paciente]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nome: "Pedro Henrique Silveira"
 *             data_nascimento: "2018-06-15"
 *             cpf: "529.982.247-25"
 *             telefone: "(11) 98765-4321"
 *             cep: "01310-100"
 *             cidade: "São Paulo"
 *             estado: "SP"
 *             responsavel:
 *               nome: "Juliana Silveira"
 *               telefone: "(11) 99887-6655"
 *               cpf: "364.721.890-50"
 *               parentesco: "Mãe"
 *     responses:
 *       201:
 *         description: Paciente cadastrado com sucesso
 *       400:
 *         description: Erro de validação nos dados do paciente ou CPF inválido
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
 *     summary: Atualiza os dados de um paciente existente (com verificação de vínculo)
 *     tags: [Paciente]
 *     security:
 *       - BearerAuth: []
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
 *             nome: "Pedro Henrique Silveira Lima"
 *             telefone: "(11) 99999-8888"
 *             cidade: "Campinas"
 *     responses:
 *       200:
 *         description: Paciente atualizado com sucesso
 *       400:
 *         description: Erro de validação nos dados fornecidos
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado (sem vínculo ativo com o paciente)
 *       404:
 *         description: Paciente não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
pacienteRoutes.put('/:id', authMiddleware, verificarVisibilidadePaciente, PacienteController.atualizar);

// ------------------------------------------------------------------------------
// 3. Exclusão e Reativação (Soft Delete e Hard Delete)
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

// ------------------------------------------------------------------------------
// 4. Gestão de Vínculos Terapeuta-Paciente
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/paciente/{id}/terapeutas:
 *   get:
 *     summary: Lista todos os terapeutas vinculados ao paciente (com verificação de vínculo)
 *     tags: [Paciente]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do paciente
 *     responses:
 *       200:
 *         description: Lista de terapeutas vinculados retornada com sucesso
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado (sem vínculo ativo com o paciente)
 *       404:
 *         description: Paciente não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
pacienteRoutes.get('/:id/terapeutas', authMiddleware, verificarVisibilidadePaciente, PacienteController.listarTerapeutas);

/**
 * @swagger
 * /api/paciente/{id}/terapeutas:
 *   post:
 *     summary: Vincula um novo terapeuta ao paciente (equipe multidisciplinar)
 *     tags: [Paciente]
 *     security:
 *       - BearerAuth: []
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
 *             terapeuta_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *     responses:
 *       201:
 *         description: Terapeuta vinculado com sucesso
 *       400:
 *         description: Terapeuta de clínica diferente, paciente inativo ou IDs inválidos
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       404:
 *         description: Paciente ou terapeuta não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
pacienteRoutes.post('/:id/terapeutas', authMiddleware, PacienteController.vincularTerapeuta);

/**
 * @swagger
 * /api/paciente/{id}/terapeutas/{terapeutaId}:
 *   delete:
 *     summary: Remove o vínculo de um terapeuta com o paciente
 *     tags: [Paciente]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do paciente
 *       - in: path
 *         name: terapeutaId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do terapeuta a ser desvinculado
 *     responses:
 *       200:
 *         description: Vínculo removido com sucesso
 *       400:
 *         description: Parâmetros UUID inválidos
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       404:
 *         description: Paciente não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
pacienteRoutes.delete('/:id/terapeutas/:terapeutaId', authMiddleware, PacienteController.desvincularTerapeuta);
