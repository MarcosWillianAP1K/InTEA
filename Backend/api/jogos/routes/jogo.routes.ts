import { Router } from 'express';
import { JogoController } from '../controllers/jogo.controller.js';

// ==============================================================================
// ROTAS: /api/jogos (Catálogo de Jogos, Manifestos e Telemetria)
// ==============================================================================

export const jogosRoutes = Router();

/**
 * @swagger
 * /api/jogos:
 *   get:
 *     summary: Lista o catálogo de jogos com suporte a filtros e paginação
 *     description: Retorna a biblioteca de jogos terapêuticos com suporte a filtro por objetivo clínico e paginação de resultados.
 *     tags: [Jogos]
 *     parameters:
 *       - in: query
 *         name: objetivo
 *         schema:
 *           type: string
 *         description: "Filtrar por objetivo clínico (ex: foco_atencional, regulacao_emocional, desenvolvimento_linguagem)"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página desejada
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Quantidade máxima de registros por página
 *     responses:
 *       200:
 *         description: Catálogo de jogos retornado com sucesso
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
 *                         example: "1"
 *                       nome:
 *                         type: string
 *                         example: "Aventura das Cores"
 *                       descricao:
 *                         type: string
 *                         example: "Estimula atenção compartilhada e reconhecimento facial."
 *                       versao:
 *                         type: string
 *                         example: "1.2.0"
 *                       status_instalacao:
 *                         type: string
 *                         example: "instalado"
 *                 total:
 *                   type: integer
 *                   example: 3
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *       500:
 *         description: Erro interno ao listar catálogo de jogos
 */
jogosRoutes.get('/', JogoController.listar);

/**
 * @swagger
 * /api/jogos/validar-manifesto:
 *   post:
 *     summary: Valida a conformidade de um manifesto de jogo
 *     description: Valida a estrutura JSON de um manifesto contra o Contrato 1 de integração de jogos terapêuticos.
 *     tags: [Jogos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_jogo
 *               - nome
 *               - versao
 *               - metricas_suportadas
 *             properties:
 *               id_jogo:
 *                 type: string
 *                 example: "aventura-das-cores"
 *               nome:
 *                 type: string
 *                 example: "Aventura das Cores"
 *               versao:
 *                 type: string
 *                 example: "1.2.0"
 *               objetivo_clinico:
 *                 type: string
 *                 example: "foco_atencional"
 *               metricas_suportadas:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id_metrica
 *                     - tipo_metrica
 *                   properties:
 *                     id_metrica:
 *                       type: string
 *                       example: "tempo_resposta"
 *                     tipo_metrica:
 *                       type: string
 *                       enum: [numerica, categorica]
 *                       example: "numerica"
 *                     unidade:
 *                       type: string
 *                       example: "segundos"
 *                     valores:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["baixo", "medio", "alto"]
 *     responses:
 *       200:
 *         description: Manifesto válido e em conformidade
 *       400:
 *         description: Manifesto inválido ou com campos faltantes
 *       500:
 *         description: Erro interno ao processar validação
 */
jogosRoutes.post('/validar-manifesto', JogoController.validarManifesto);

/**
 * @swagger
 * /api/jogos/{id}:
 *   get:
 *     summary: Consulta detalhes completos de um jogo pelo ID
 *     description: Retorna as informações do jogo e o seu manifesto JSON de métricas.
 *     tags: [Jogos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identificador do jogo (ID numérico ou UUID)
 *     responses:
 *       200:
 *         description: Detalhes do jogo encontrados com sucesso
 *       404:
 *         description: Jogo não encontrado
 *       500:
 *         description: Erro interno ao buscar detalhes do jogo
 */
jogosRoutes.get('/:id', JogoController.buscarPorId);

/**
 * @swagger
 * /api/jogos/{id}/manifesto:
 *   get:
 *     summary: Retorna e valida o manifesto de métricas de um jogo
 *     description: Obtém o manifesto_json do jogo e executa a verificação de conformidade das métricas suportadas.
 *     tags: [Jogos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identificador do jogo (ID numérico ou UUID)
 *     responses:
 *       200:
 *         description: Manifesto retornado com o relatório de conformidade
 *       404:
 *         description: Jogo não encontrado
 *       500:
 *         description: Erro interno ao consultar manifesto do jogo
 */
jogosRoutes.get('/:id/manifesto', JogoController.obterManifesto);

/**
 * @swagger
 * /api/jogos/{id}/validar-telemetria:
 *   post:
 *     summary: Valida evento de telemetria contra tipagem estrita de métricas
 *     description: Verifica se o evento de telemetria recebido do jogo está em conformidade com o manifesto antes da gravação no prontuário. Rejeita métricas sem tipagem estrita.
 *     tags: [Jogos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identificador do jogo (ID numérico ou UUID)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token_sessao
 *               - data_hora
 *               - tipo_evento
 *               - dados
 *             properties:
 *               token_sessao:
 *                 type: string
 *                 example: "sessao-token-xyz-123"
 *               data_hora:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-09-23T15:30:00Z"
 *               tipo_evento:
 *                 type: string
 *                 example: "coleta_metrica"
 *               dados:
 *                 type: object
 *                 required:
 *                   - id_metrica
 *                   - valor
 *                 properties:
 *                   id_metrica:
 *                     type: string
 *                     example: "tempo_resposta"
 *                   valor:
 *                     oneOf:
 *                       - type: number
 *                         example: 3.45
 *                       - type: string
 *                         example: "medio"
 *     responses:
 *       200:
 *         description: Evento de telemetria homologado para gravação
 *       404:
 *         description: Jogo não encontrado
 *       422:
 *         description: Métrica não homologada ou tipagem estrita violada
 *       500:
 *         description: Erro interno ao processar validação de telemetria
 */
jogosRoutes.post('/:id/validar-telemetria', JogoController.validarTelemetria);
