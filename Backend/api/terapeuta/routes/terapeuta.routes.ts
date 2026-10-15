import { Router } from 'express';
import { TerapeutaController } from '../controllers/terapeuta.controller.js';
import { authMiddleware } from '../../../core/middlewares/auth.middleware.js';
import { adminMiddleware } from '../../../core/middlewares/admin.middleware.js';

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
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: incluirInativos
 *         schema:
 *           type: boolean
 *         description: Se true, inclui terapeutas inativados (soft delete)
 *     responses:
 *       200:
 *         description: Lista de terapeutas retornada com sucesso
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.get('/', authMiddleware, adminMiddleware, TerapeutaController.listar);

/**
 * @swagger
 * /api/terapeuta/{id}:
 *   get:
 *     summary: Busca dados de um terapeuta pelo ID (UUID)
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
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
 *       400:
 *         description: Identificador UUID inválido ou ausente
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado (operação restrita a administradores ativos)
 *       404:
 *         description: Terapeuta não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.get('/:id', authMiddleware, adminMiddleware, TerapeutaController.buscarPorId);

// ------------------------------------------------------------------------------
// 3. Persistência (Criação e Edição)
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/terapeuta:
 *   post:
 *     summary: Cadastra um novo terapeuta e cria conta de login
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado (operação restrita a administradores ativos)
 *       409:
 *         description: E-mail já cadastrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.post('/', authMiddleware, adminMiddleware, TerapeutaController.criar);

/**
 * @swagger
 * /api/terapeuta/{id}:
 *   put:
 *     summary: Atualiza dados cadastrais de um terapeuta
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
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
 *       400:
 *         description: Dados de atualização inválidos
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado (operação restrita a administradores ativos)
 *       404:
 *         description: Terapeuta não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.put('/:id', authMiddleware, adminMiddleware, TerapeutaController.atualizar);

// ------------------------------------------------------------------------------
// 4. Exclusão e Reativação
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/terapeuta/{id}/hard:
 *   delete:
 *     summary: "[DEV/TESTES] Exclusão física permanente do terapeuta"
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado (operação restrita a administradores ativos)
 *       404:
 *         description: Terapeuta não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.delete('/:id/hard', authMiddleware, adminMiddleware, TerapeutaController.deletarHard);

/**
 * @swagger
 * /api/terapeuta/{id}:
 *   delete:
 *     summary: Soft Delete — Inativa o cadastro do terapeuta (status_ativo = false)
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado (operação restrita a administradores ativos)
 *       404:
 *         description: Terapeuta não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.delete('/:id', authMiddleware, adminMiddleware, TerapeutaController.desativar);

/**
 * @swagger
 * /api/terapeuta/{id}/reativar:
 *   patch:
 *     summary: Reativa o cadastro de um terapeuta
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado (operação restrita a administradores ativos)
 *       404:
 *         description: Terapeuta não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.patch('/:id/reativar', authMiddleware, adminMiddleware, TerapeutaController.reativar);
