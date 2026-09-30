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
