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

/**
 * @swagger
 * /api/sessao/iniciar:
 *   post:
 *     summary: Inicia uma nova sessão clínica ou em modo livre (emite token de pareamento)
 *     description: Cria uma nova sessão no banco de dados com status 'aguardando_pareamento', gera ou associa o código único de pareamento (PIN) com TTL de 15 minutos e vincula o contexto DDA pré-sessão para a IA (RN03).
 *     tags: [Sessão]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - terapeuta_id
 *               - jogo_id
 *               - codigo_pareamento
 *             properties:
 *               terapeuta_id:
 *                 type: string
 *                 format: uuid
 *                 example: "11111111-1111-1111-1111-111111111111"
 *                 description: UUID do terapeuta responsável
 *               jogo_id:
 *                 type: string
 *                 format: uuid
 *                 example: "22222222-2222-2222-2222-222222222222"
 *                 description: UUID do jogo selecionado
 *               paciente_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 example: "33333333-3333-3333-3333-333333333333"
 *                 description: UUID do paciente (obrigatório para 'sessao_clinica', nulo para 'modo_livre' conforme RN01)
 *               modo_sessao:
 *                 type: string
 *                 enum:
 *                   - sessao_clinica
 *                   - modo_livre
 *                 default: sessao_clinica
 *                 example: "sessao_clinica"
 *                 description: Modalidade da sessão (RN01)
 *               codigo_pareamento:
 *                 type: string
 *                 example: "4M5S-8U7B"
 *                 description: Código único de pareamento gerado previamente pela rota /gerarCodigoPareamento (obrigatório)
 *               contexto_dda_json:
 *                 type: object
 *                 description: Parâmetros pré-sessão injetados para o Agente de IA DDA (RN03)
 *                 example:
 *                   estresse_inicial: 2
 *                   gatilhos_a_evitar: ["Sons Altos ou Repentinos"]
 *                   objetivo_clinico: "Foco atencional e regulação sensorial"
 *     responses:
 *       201:
 *         description: Sessão iniciada com sucesso (token de pareamento gerado)
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
 *                     session_token:
 *                       type: string
 *                       example: "4M5S-8U7B"
 *                     status_sessao:
 *                       type: string
 *                       example: "aguardando_pareamento"
 *                     modo_sessao:
 *                       type: string
 *                       example: "sessao_clinica"
 *                     expira_em:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Dados incompletos ou violação da regra RN01 (modo livre com paciente ou sessão clínica sem paciente)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "O paciente_id é obrigatório para sessões clínicas (RN01)"
 *       500:
 *         description: Erro interno ao criar sessão
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Erro interno ao iniciar sessão"
 */
sessaoRoutes.post('/iniciar', SessaoController.iniciar);

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
