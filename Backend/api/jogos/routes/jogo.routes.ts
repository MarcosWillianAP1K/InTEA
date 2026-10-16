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
 *             example:
 *               data:
 *                 - id: "1"
 *                   nome: "Aventura das Cores"
 *                   descricao: "Estimula atenção compartilhada e reconhecimento facial."
 *                   versao: "1.2.0"
 *               meta:
 *                 total: 3
 *                 page: 1
 *                 limit: 10
 *                 totalPages: 1
 *       500:
 *         description: Erro interno ao listar catálogo de jogos
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro ao listar catálogo de jogos"
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
 *         content:
 *           application/json:
 *             example:
 *               valido: true
 *               data:
 *                 id_jogo: "aventura-das-cores"
 *                 nome: "Aventura das Cores"
 *                 versao: "1.2.0"
 *                 objetivo_clinico: "foco_atencional"
 *                 metricas_suportadas:
 *                   - id_metrica: "tempo_resposta"
 *                     tipo_metrica: "numerica"
 *                     unidade: "segundos"
 *       400:
 *         description: Manifesto inválido ou com campos faltantes
 *         content:
 *           application/json:
 *             example:
 *               valido: false
 *               error: "Manifesto do jogo inválido"
 *               erros:
 *                 - "Campo 'nome' é obrigatório"
 *       500:
 *         description: Erro interno ao processar validação
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao validar manifesto"
 */
jogosRoutes.post('/validar-manifesto', JogoController.validarManifesto);

/**
 * @swagger
 * /api/jogos/{id}:
 *   get:
 *     summary: Consulta detalhes completos e manifesto clínico de um jogo pelo ID
 *     description: Retorna as informações do jogo unificadas com seu manifesto clínico de métricas e laudo de conformidade (RF09, RNF02).
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
 *         description: Detalhes do jogo e manifesto retornados com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 id: 1
 *                 id_jogo: "aventura-das-cores"
 *                 nome: "Aventura das Cores"
 *                 descricao: "Estimula atenção compartilhada e reconhecimento facial através de interação cromática."
 *                 versao: "1.2.0"
 *                 objetivo_clinico: "foco_atencional"
 *                 metricas_suportadas:
 *                   - id_metrica: "tempo_resposta"
 *                     tipo_metrica: "numerica"
 *                     unidade: "segundos"
 *                   - id_metrica: "nivel_frustracao"
 *                     tipo_metrica: "categorica"
 *                     valores: ["baixo", "medio", "alto"]
 *               validacao:
 *                 valido: true
 *                 erros: []
 *       404:
 *         description: Jogo não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Jogo não encontrado"
 *       500:
 *         description: Erro interno ao buscar detalhes do jogo
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro ao buscar detalhes do jogo"
 */
jogosRoutes.get('/:id', JogoController.buscarPorId);

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
 *         content:
 *           application/json:
 *             example:
 *               podeGravar: true
 *               tipoDetectado: "numerica"
 *               metricaHomologada: true
 *               data:
 *                 podeGravar: true
 *                 tipoDetectado: "numerica"
 *                 metricaHomologada: true
 *       404:
 *         description: Jogo não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Jogo não encontrado"
 *       422:
 *         description: Métrica não homologada ou tipagem estrita violada
 *         content:
 *           application/json:
 *             example:
 *               podeGravar: false
 *               error: "Valor da métrica 'tempo_resposta' deve ser numérico"
 *               regraViolada: "RN02 - Fallback de Métrica Proibido"
 *       500:
 *         description: Erro interno ao processar validação de telemetria
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao processar validação de telemetria"
 */
jogosRoutes.post('/:id/validar-telemetria', JogoController.validarTelemetria);
