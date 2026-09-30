// ==============================================================================
// InTEA: Rotas da Feature de Sessão e Pareamento Remoto
// ==============================================================================

import { Router } from 'express';
import { SessaoController } from '../controllers/sessao.controller.js';

export const sessaoRoutes = Router();

/**
 * @swagger
 * /api/sessao/gerarCodigoPareamento:
 *   get:
 *     summary: Gera um código legível único de pareamento remoto (PIN)
 *     description: Gera um código alfanumérico único de pareamento (ex. '4M5S-8U7B') para ser inserido no game externo pelo paciente, verificando unicidade contra sessões existentes.
 *     tags: [Sessão]
 *     responses:
 *       200:
 *         description: Código de pareamento gerado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 codigo:
 *                   type: string
 *                   example: "4M5S-8U7B"
 *       500:
 *         description: Erro ao gerar código de pareamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Erro interno ao gerar código de pareamento"
 */
sessaoRoutes.get('/gerarCodigoPareamento', SessaoController.gerarCodigoPareamento);

// Iniciar sessão (Sessão Clínica ou Modo Livre)
sessaoRoutes.post('/', SessaoController.iniciar);

// Buscar sessão por ID interno
sessaoRoutes.get('/:id', SessaoController.buscarPorId);

// Buscar sessão por código/token de pareamento (Jogo Externo)
sessaoRoutes.get('/token/:token', SessaoController.buscarPorToken);

// Finalizar sessão
sessaoRoutes.patch('/:id/finalizar', SessaoController.finalizar);

/**
 * @swagger
 * /api/sessao/{id}/status:
 *   patch:
 *     summary: Atualiza o status da máquina de estados de uma sessão
 *     description: Permite transicionar a sessão para um dos estados válidos ('aguardando_pareamento', 'conectado', 'em_andamento', 'finalizada', 'expirada', 'cancelada').
 *     tags: [Sessão]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID da sessão
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - aguardando_pareamento
 *                   - conectado
 *                   - em_andamento
 *                   - finalizada
 *                   - expirada
 *                   - cancelada
 *                 example: "conectado"
 *                 description: Novo status da máquina de estados da sessão
 *     responses:
 *       200:
 *         description: Status da sessão atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     status_sessao:
 *                       type: string
 *                       example: "conectado"
 *       400:
 *         description: Campo status ausente ou valor fora dos status permitidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "O status informado é inválido, deve conter algum desses valores: aguardando_pareamento, conectado, em_andamento, finalizada, expirada, cancelada"
 *       404:
 *         description: Sessão não encontrada para atualização de status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Sessão não encontrada para atualização de status"
 *       500:
 *         description: Erro interno ao atualizar status da sessão
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Erro interno ao atualizar status da sessão"
 */
sessaoRoutes.patch('/:id/status', SessaoController.atualizarStatus);
