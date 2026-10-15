// ==============================================================================
// InTEA: Rotas de Telemetria Clínica (Sprint 9)
// ==============================================================================

import { Router } from 'express';
import { TelemetriaController } from '../controllers/telemetria.controller.js';
import { authMiddleware } from '../../../core/middlewares/auth.middleware.js';

export const telemetriaRoutes = Router();

/**
 * @swagger
 * /api/telemetria:
 *   post:
 *     summary: Ingestão de evento individual de telemetria clínica
 *     description: |
 *       Recebe um evento de telemetria emitido pelo tablet ou jogo durante a sessão.
 *       Se a sessão estiver em Modo Livre (RN01), o evento é processado apenas em memória
 *       sem persistência no prontuário clínico.
 *     tags: [Telemetria]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tipo_evento
 *               - dados
 *             properties:
 *               sessao_id:
 *                 type: string
 *                 format: uuid
 *                 example: "11111111-1111-1111-1111-111111111111"
 *                 description: UUID interno da sessão
 *               token_sessao:
 *                 type: string
 *                 example: "4M5S-8U7B"
 *                 description: PIN/token de pareamento da sessão (alternativa a sessao_id)
 *               tipo_evento:
 *                 type: string
 *                 example: "interacao_paciente"
 *                 description: Categoria do evento emitido
 *               dados:
 *                 type: object
 *                 required:
 *                   - id_metrica
 *                   - valor
 *                 properties:
 *                   id_metrica:
 *                     type: string
 *                     example: "tempo_resposta"
 *                     description: Identificador da métrica
 *                   valor:
 *                     description: Valor da métrica (polimórfico - número, string, etc.)
 *                     example: 3.5
 *               data_hora:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-09-01T15:30:22Z"
 *                 description: Timestamp da ocorrência do evento no tablet
 *     responses:
 *       201:
 *         description: Evento de telemetria persistido com sucesso na sessão clínica
 *       200:
 *         description: Evento processado em memória (Modo Livre não persiste telemetria - RN01)
 *       400:
 *         description: Dados incompletos ou payload inválido
 *       404:
 *         description: Sessão não encontrada
 *       409:
 *         description: Conflito — a sessão não está em andamento (status finalizada, cancelada ou aguardando)
 *       500:
 *         description: Erro interno ao registrar evento de telemetria
 */
telemetriaRoutes.post('/', TelemetriaController.registrar);

/**
 * @swagger
 * /api/telemetria/lote:
 *   post:
 *     summary: Ingestão em lote (batch insert) de telemetria contínua
 *     description: Permite envio de múltiplos eventos de telemetria de uma só vez para alta vazão e resiliência.
 *     tags: [Telemetria]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventos
 *             properties:
 *               sessao_id:
 *                 type: string
 *                 format: uuid
 *                 example: "11111111-1111-1111-1111-111111111111"
 *               token_sessao:
 *                 type: string
 *                 example: "4M5S-8U7B"
 *               eventos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - tipo_evento
 *                     - dados
 *                   properties:
 *                     tipo_evento:
 *                       type: string
 *                       example: "interacao_paciente"
 *                     dados:
 *                       type: object
 *                       properties:
 *                         id_metrica:
 *                           type: string
 *                           example: "tempo_resposta"
 *                         valor:
 *                           example: 2.8
 *                     data_hora:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-09-01T15:30:25Z"
 *     responses:
 *       201:
 *         description: Lote de telemetria registrado com sucesso
 *       200:
 *         description: Lote processado em memória (Modo Livre - RN01)
 *       400:
 *         description: Parâmetros inválidos, elemento do lote malformado ou limite de 500 excedido
 *       404:
 *         description: Sessão não encontrada
 *       409:
 *         description: Conflito — a sessão não está em andamento (status finalizada, cancelada ou aguardando)
 *       500:
 *         description: Erro interno ao registrar lote
 */
telemetriaRoutes.post('/lote', TelemetriaController.registrarLote);

/**
 * @swagger
 * /api/telemetria/sessao/{sessaoId}:
 *   get:
 *     summary: Consulta o histórico de eventos de telemetria de uma sessão
 *     description: Retorna a série temporal cronológica dos eventos de telemetria persistidos da sessão clínica, com filtro opcional por ID de métrica e paginação (protegido por RN04).
 *     tags: [Telemetria]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessaoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID da sessão
 *       - in: query
 *         name: metrica
 *         required: false
 *         schema:
 *           type: string
 *         description: Filtrar por identificador específico de métrica (ex. 'tempo_resposta')
 *       - in: query
 *         name: limite
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Quantidade máxima de registros retornados por página
 *       - in: query
 *         name: pagina
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número da página consultada
 *     responses:
 *       200:
 *         description: Histórico de telemetria retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       sessao_id:
 *                         type: string
 *                         format: uuid
 *                       tipo_evento:
 *                         type: string
 *                       dados:
 *                         type: object
 *                       data_hora:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Parâmetro sessaoId ausente ou não é um UUID válido
 *       401:
 *         description: Token JWT ausente ou inválido
 *       403:
 *         description: Acesso negado — terapeuta sem vínculo institucional com a sessão clínica (RN04)
 *       404:
 *         description: Sessão não encontrada
 *       500:
 *         description: Erro interno ao buscar eventos de telemetria
 */
telemetriaRoutes.get('/sessao/:sessaoId', authMiddleware, TelemetriaController.listarPorSessao);

/**
 * @swagger
 * /api/telemetria/sessao/{sessaoId}/agregada:
 *   get:
 *     summary: Compila e retorna estatísticas agregadas da telemetria da sessão (Card 2.1)
 *     description: |
 *       Consolida dados analíticos dos eventos brutos da sessão: contagem por tipo,
 *       taxa de precisão (acertos vs. erros), tempo de reação médio/mediano, estabilidade
 *       de atenção por janelas temporais e métricas consolidadas com tipagem estrita (RN02).
 *     tags: [Telemetria]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessaoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID da sessão clínica
 *     responses:
 *       200:
 *         description: Estatísticas consolidadas da telemetria retornadas com sucesso
 *       400:
 *         description: Parâmetro sessaoId ausente ou não é um UUID válido
 *       401:
 *         description: Token JWT ausente ou inválido
 *       403:
 *         description: Acesso negado — terapeuta sem vínculo institucional com a sessão clínica (RN04)
 *       404:
 *         description: Sessão não encontrada ou sem dados
 *       500:
 *         description: Erro interno ao compilar estatísticas da telemetria
 */
telemetriaRoutes.get('/sessao/:sessaoId/agregada', authMiddleware, TelemetriaController.obterEstatisticasSessao);

