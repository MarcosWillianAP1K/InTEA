import { Router } from 'express';
import { SessaoController } from '../controllers/sessao.controller.js';

// ==============================================================================
// ROTAS: /api/sessao (Orquestração, Pareamento Remoto e Ciclo de Sessão)
// ==============================================================================

export const sessaoRoutes = Router();

/**
 * @swagger
 * /api/sessao/parear:
 *   post:
 *     summary: Handshake de pareamento remoto do jogo externo via session_token (RF10)
 *     description: Consumido pelo dispositivo externo (tablet, computador ou headset de RV onde o jogo é executado). O jogo envia o session_token gerado no painel do terapeuta e seus metadados de hardware. O backend valida a vigência do token, associa o dispositivo e retorna as credenciais WebSocket e os parâmetros DDA iniciais.
 *     tags: [Sessão]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_token
 *             properties:
 *               session_token:
 *                 type: string
 *                 example: "849-291"
 *                 description: Código PIN efêmero de 6 dígitos gerado pelo terapeuta
 *               dispositivo_info:
 *                 type: object
 *                 properties:
 *                   tipo_dispositivo:
 *                     type: string
 *                     example: "tablet"
 *                   modelo:
 *                     type: string
 *                     example: "iPad 10th Gen"
 *                   sistema_operacional:
 *                     type: string
 *                     example: "iPadOS 17.4"
 *                   resolucao:
 *                     type: string
 *                     example: "2160x1620"
 *                   versao_jogo:
 *                     type: string
 *                     example: "1.2.0"
 *                   identificador_dispositivo:
 *                     type: string
 *                     example: "device-uuid-987"
 *     responses:
 *       200:
 *         description: Dispositivo pareado com sucesso e parâmetros de sessão liberados
 *         content:
 *           application/json:
 *             example:
 *               message: "Dispositivo pareado com sucesso"
 *               data:
 *                 sessao_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
 *                 session_token: "849-291"
 *                 status_sessao: "em_andamento"
 *                 modo_sessao: "sessao_clinica"
 *                 jogo:
 *                   id: "11111111-2222-3333-4444-555555555555"
 *                   nome: "Aventura das Cores"
 *                   versao: "1.2.0"
 *                 contexto_dda:
 *                   nivel_estresse_inicial: 2
 *                   gatilhos_a_evitar: ["som_alto"]
 *                   objetivo_clinico: "Foco Atencional"
 *                 websocket:
 *                   url: "ws://localhost:3000/sessao"
 *                   canal: "session_849-291"
 *                 pareado_em: "2026-09-28T21:00:00.000Z"
 *       400:
 *         description: Token não informado ou payload inválido
 *         content:
 *           application/json:
 *             example:
 *               error: "Parâmetro obrigatório ausente ou inválido: session_token"
 *               detalhes: "Informe o código PIN de pareamento exibido no painel do terapeuta."
 *       404:
 *         description: Sessão não encontrada para o token informado
 *         content:
 *           application/json:
 *             example:
 *               error: "Sessão não encontrada para o token informado"
 *               detalhes: "Verifique se o PIN foi digitado corretamente ou solicite um novo código."
 *       409:
 *         description: Sessão já em andamento ou pareada por outro dispositivo
 *         content:
 *           application/json:
 *             example:
 *               error: "Sessão já pareada ou em andamento"
 *               detalhes: "Esta sessão já foi iniciada por outro dispositivo."
 *       410:
 *         description: Token expirado ou sessão já finalizada/cancelada
 *         content:
 *           application/json:
 *             example:
 *               error: "Token de pareamento expirado"
 *               detalhes: "O tempo limite de 15 minutos para pareamento foi ultrapassado. Solicite ao terapeuta a emissão de um novo código."
 *       500:
 *         description: Erro interno do servidor
 */
sessaoRoutes.post('/parear', SessaoController.parear);

/**
 * @swagger
 * /api/sessao/{token}/status:
 *   get:
 *     summary: Consulta o status atual de pareamento da sessão (RF10)
 *     description: Permite polling do status da sessão pelo token de pareamento.
 *     tags: [Sessão]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Código PIN ou token da sessão
 *     responses:
 *       200:
 *         description: Status da sessão retornado com sucesso
 *       404:
 *         description: Sessão não encontrada
 */
sessaoRoutes.get('/:token/status', SessaoController.consultarStatus);
