import { Router } from 'express';
import { TerapeutaController } from '../controllers/terapeuta.controller.js';

// ==============================================================================
// ROTAS: /api/terapeuta
// ==============================================================================

export const terapeutaRoutes = Router();

// ------------------------------------------------------------------------------
// 1. Consultas (Leitura)
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/terapeuta:
 *   get:
 *     summary: Lista terapeutas ativos
 *     tags: [Terapeuta]
 *     parameters:
 *       - in: query
 *         name: incluirInativos
 *         schema:
 *           type: boolean
 *         description: Se true, inclui terapeutas inativados (soft delete)
 *     responses:
 *       200:
 *         description: Lista de terapeutas retornada com sucesso
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.get('/', TerapeutaController.listar);

/**
 * @swagger
 * /api/terapeuta/{id}:
 *   get:
 *     summary: Busca dados de um terapeuta pelo ID (UUID)
 *     tags: [Terapeuta]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do terapeuta
 *     responses:
 *       200:
 *         description: Terapeuta encontrado
 *       404:
 *         description: Terapeuta não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.get('/:id', TerapeutaController.buscarPorId);

// ------------------------------------------------------------------------------
// 3. Persistência (Criação e Edição)
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/terapeuta:
 *   post:
 *     summary: Cadastra um novo terapeuta e cria conta de login
 *     tags: [Terapeuta]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nome: "Dra. Mariana Costa"
 *             email: "mariana.costa@intea.com.br"
 *             password: "senhaSegura123"
 *             telefone: "(11) 98765-4321"
 *             crefito: "CREFITO-3/12345-TO"
 *             especialidade: "Terapia Ocupacional e Integração Sensorial"
 *             tempo_experiencia_anos: 5
 *     responses:
 *       201:
 *         description: Terapeuta cadastrado e conta criada com sucesso
 *       400:
 *         description: Campos obrigatórios ausentes ou senha curta (< 6 caracteres)
 *       409:
 *         description: E-mail já cadastrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.post('/', TerapeutaController.criar);

/**
 * @swagger
 * /api/terapeuta/{id}:
 *   put:
 *     summary: Atualiza dados cadastrais de um terapeuta
 *     tags: [Terapeuta]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do terapeuta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nome: "Dra. Mariana Costa Silva"
 *             telefone: "(11) 91111-2222"
 *             especialidade: "Terapia Ocupacional e ABA"
 *             tempo_experiencia_anos: 6
 *     responses:
 *       200:
 *         description: Terapeuta atualizado com sucesso
 *       404:
 *         description: Terapeuta não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.put('/:id', TerapeutaController.atualizar);

// ------------------------------------------------------------------------------
// 4. Exclusão e Reativação
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/terapeuta/{id}/hard:
 *   delete:
 *     summary: "[DEV/TESTES] Exclusão física permanente do terapeuta"
 *     tags: [Terapeuta]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do terapeuta
 *     responses:
 *       200:
 *         description: Terapeuta e credenciais removidos fisicamente
 *       404:
 *         description: Terapeuta não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.delete('/:id/hard', TerapeutaController.deletarHard);

/**
 * @swagger
 * /api/terapeuta/{id}:
 *   delete:
 *     summary: Soft Delete — Inativa o cadastro do terapeuta (status_ativo = false)
 *     tags: [Terapeuta]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do terapeuta
 *     responses:
 *       200:
 *         description: Terapeuta desativado com sucesso (soft delete)
 *       404:
 *         description: Terapeuta não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.delete('/:id', TerapeutaController.desativar);

/**
 * @swagger
 * /api/terapeuta/{id}/reativar:
 *   patch:
 *     summary: Reativa o cadastro de um terapeuta
 *     tags: [Terapeuta]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do terapeuta
 *     responses:
 *       200:
 *         description: Terapeuta reativado com sucesso
 *       404:
 *         description: Terapeuta não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.patch('/:id/reativar', TerapeutaController.reativar);
