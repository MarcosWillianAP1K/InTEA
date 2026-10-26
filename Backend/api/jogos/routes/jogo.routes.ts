import { Router } from 'express';
import { JogoController } from '../controllers/jogo.controller.js';
import { authMiddleware } from '../../../core/middlewares/auth.middleware.js';
import { adminMiddleware } from '../../../core/middlewares/admin.middleware.js';

// ==============================================================================
// ROTAS: /api/jogos (Catálogo de Jogos, Manifestos e Telemetria)
// ==============================================================================

export const jogosRoutes = Router();

/**
 * @swagger
 * /api/jogos:
 *   get:
 *     summary: Lista o catálogo de jogos com suporte a filtros e paginação
 *     description: Retorna a biblioteca de jogos terapêuticos com suporte a filtro por objetivo clínico, status operacional e paginação de resultados.
 *     tags: [Jogos]
 *     parameters:
 *       - in: query
 *         name: objetivo
 *         schema:
 *           type: string
 *         description: "Filtrar por objetivo clínico (ex: foco_atencional, regulacao_emocional, desenvolvimento_linguagem)"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ativo, desativado, manutencao, em_breve]
 *         description: "Filtrar por status operacional do jogo"
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
 *         description: Catálogo de jogos retornado com sucesso no Envelope Pattern
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 jogos:
 *                   - id: "1"
 *                     nome: "Aventura das Cores"
 *                     descricao: "Estimula atenção compartilhada e reconhecimento facial."
 *                     versao: "1.2.0"
 *                     status_jogo: "ativo"
 *                 meta:
 *                   total: 3
 *                   pagina: 1
 *                   limite: 10
 *                   total_paginas: 1
 *               message: "Catálogo de jogos recuperado com sucesso."
 *       400:
 *         description: Parâmetro de busca ou status inválido
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
 * /api/jogos:
 *   post:
 *     summary: Cadastra um novo jogo terapêutico no catálogo (Restrito a Administradores)
 *     description: Cadastra um novo jogo com validação estrita de manifesto e geração automatizada de slug técnico (id_jogo). Exige autenticação e privilégios de super admin.
 *     tags: [Jogos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - descricao
 *               - versao
 *               - objetivo_clinico
 *               - metricas_suportadas
 *             properties:
 *               nome:
 *                 type: string
 *                 example: "Super Memória Musical"
 *               descricao:
 *                 type: string
 *                 example: "Estimula memória de trabalho e discriminação auditiva."
 *               versao:
 *                 type: string
 *                 example: "1.0.0"
 *               status:
 *                 type: string
 *                 enum: [ativo, desativado, manutencao, em_breve]
 *                 example: "ativo"
 *               objetivo_clinico:
 *                 type: string
 *                 example: "desenvolvimento_linguagem"
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
 *                       example: "tempo_memorizacao"
 *                     tipo_metrica:
 *                       type: string
 *                       enum: [numerica, categorica]
 *                       example: "numerica"
 *                     unidade:
 *                       type: string
 *                       example: "segundos"
 *     responses:
 *       201:
 *         description: Jogo cadastrado com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 jogo:
 *                   id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *                   id_jogo: "super-memoria-musical"
 *                   nome: "Super Memória Musical"
 *                   descricao: "Estimula memória de trabalho e discriminação auditiva."
 *                   versao: "1.0.0"
 *                   status_jogo: "ativo"
 *                 manifesto:
 *                   id_jogo: "super-memoria-musical"
 *                   nome: "Super Memória Musical"
 *                   versao: "1.0.0"
 *                   objetivo_clinico: "desenvolvimento_linguagem"
 *                   metricas_suportadas:
 *                     - id_metrica: "tempo_memorizacao"
 *                       tipo_metrica: "numerica"
 *                       unidade: "segundos"
 *                   validacao:
 *                     valido: true
 *                     erros: []
 *               message: "Jogo cadastrado com sucesso."
 *       400:
 *         description: Dados incompletos, status ou manifesto inválido
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado (requer privilégios de administrador)
 *       409:
 *         description: Conflito (já existe jogo cadastrado com o mesmo slug)
 *       422:
 *         description: Incompatibilidade de tipo clínico no manifesto (RN02)
 *       500:
 *         description: Erro interno ao cadastrar jogo
 */
jogosRoutes.post('/', authMiddleware, adminMiddleware, JogoController.cadastrar);

/**
 * @swagger
 * /api/jogos/validar-manifesto:
 *   post:
 *     summary: Valida a conformidade de um manifesto de jogo
 *     description: Valida a estrutura JSON de um manifesto contra o Contrato 1 de integração de jogos terapêuticos. Exige autenticação de terapeuta/dev.
 *     tags: [Jogos]
 *     security:
 *       - bearerAuth: []
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
 *               data:
 *                 manifesto:
 *                   id_jogo: "aventura-das-cores"
 *                   nome: "Aventura das Cores"
 *                   versao: "1.2.0"
 *                   objetivo_clinico: "foco_atencional"
 *                   metricas_suportadas:
 *                     - id_metrica: "tempo_resposta"
 *                       tipo_metrica: "numerica"
 *                       unidade: "segundos"
 *                 validacao:
 *                   valido: true
 *                   erros: []
 *               message: "Manifesto clínico do jogo validado com sucesso."
 *       400:
 *         description: Manifesto inválido ou com campos estruturais faltantes
 *         content:
 *           application/json:
 *             example:
 *               error: "Manifesto do jogo inválido"
 *               erros:
 *                 - "O campo 'nome' é obrigatório e deve ser uma string não vazia."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       422:
 *         description: Incompatibilidade de tipo clínico no manifesto (RN02)
 *         content:
 *           application/json:
 *             example:
 *               error: "Incompatibilidade de tipo clínico no manifesto (RN02)."
 *               regraViolada: "RN02 - Fallback de Métrica Proibido"
 *       500:
 *         description: Erro interno ao processar validação
 */
jogosRoutes.post('/validar-manifesto', authMiddleware, JogoController.validarManifesto);

/**
 * @swagger
 * /api/jogos/{id}:
 *   get:
 *     summary: Consulta detalhes completos e manifesto clínico de um jogo pelo ID
 *     description: Retorna as informações do jogo unificadas com seu manifesto clínico de métricas e laudo de conformidade (RF09, RNF02). Exige autenticação.
 *     tags: [Jogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identificador do jogo (ID numérico, UUID ou slug)
 *     responses:
 *       200:
 *         description: Detalhes do jogo e manifesto retornados com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 jogo:
 *                   id: 1
 *                   id_jogo: "aventura-das-cores"
 *                   nome: "Aventura das Cores"
 *                   descricao: "Estimula atenção compartilhada e reconhecimento facial através de interação cromática."
 *                   versao: "1.2.0"
 *                   status_jogo: "ativo"
 *                 manifesto:
 *                   id_jogo: "aventura-das-cores"
 *                   nome: "Aventura das Cores"
 *                   versao: "1.2.0"
 *                   objetivo_clinico: "foco_atencional"
 *                   metricas_suportadas:
 *                     - id_metrica: "tempo_resposta"
 *                       tipo_metrica: "numerica"
 *                       unidade: "segundos"
 *                     - id_metrica: "nivel_frustracao"
 *                       tipo_metrica: "categorica"
 *                       valores: ["baixo", "medio", "alto"]
 *                   validacao:
 *                     valido: true
 *                     erros: []
 *               message: "Detalhes do jogo e manifesto clínico recuperados com sucesso."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       404:
 *         description: Jogo não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Jogo não encontrado"
 *       500:
 *         description: Erro interno ao buscar detalhes do jogo
 */
jogosRoutes.get('/:id', authMiddleware, JogoController.buscarPorId);

/**
 * @swagger
 * /api/jogos/{id}:
 *   patch:
 *     summary: Atualiza os dados cadastrais ou o status operacional de um jogo (Restrito a Administradores)
 *     description: Permite atualizar nome, descrição, versão, métricas e/ou alterar o status do jogo ('ativo', 'desativado', 'manutencao', 'em_breve'). Exige autenticação e privilégios de super admin.
 *     tags: [Jogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identificador do jogo (ID numérico, UUID ou slug)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ativo, desativado, manutencao, em_breve]
 *                 example: "manutencao"
 *               nome:
 *                 type: string
 *                 example: "Aventura das Cores Remaster"
 *               descricao:
 *                 type: string
 *                 example: "Versão aprimorada com novas fases cromáticas."
 *               versao:
 *                 type: string
 *                 example: "1.3.0"
 *     responses:
 *       200:
 *         description: Jogo atualizado com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 jogo:
 *                   id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *                   id_jogo: "aventura-das-cores"
 *                   nome: "Aventura das Cores Remaster"
 *                   descricao: "Versão aprimorada com novas fases cromáticas."
 *                   versao: "1.3.0"
 *                   status_jogo: "manutencao"
 *                 manifesto:
 *                   id_jogo: "aventura-das-cores"
 *                   nome: "Aventura das Cores Remaster"
 *                   versao: "1.3.0"
 *                   validacao:
 *                     valido: true
 *                     erros: []
 *               message: "Jogo atualizado com sucesso."
 *       400:
 *         description: Status ou dados inválidos
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado (requer privilégios de administrador)
 *       404:
 *         description: Jogo não encontrado
 *       422:
 *         description: Incompatibilidade de tipo clínico no manifesto (RN02)
 *       500:
 *         description: Erro interno ao atualizar jogo
 *   put:
 *     summary: Substitui ou atualiza os dados do jogo (Restrito a Administradores)
 *     description: Atualização completa ou parcial de atributos do jogo. Exige autenticação e privilégios de super admin.
 *     tags: [Jogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identificador do jogo (ID numérico, UUID ou slug)
 *     responses:
 *       200:
 *         description: Jogo atualizado com sucesso
 *       400:
 *         description: Status ou dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Jogo não encontrado
 *       500:
 *         description: Erro interno ao atualizar jogo
 *   delete:
 *     summary: Executa hard delete de um jogo do catálogo (Restrito a Administradores)
 *     description: Remove permanentemente o jogo da base de dados. Caso existam sessões clínicas vinculadas, a exclusão é rejeitada por integridade referencial com status 409. Exige privilégios de super admin.
 *     tags: [Jogos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Identificador do jogo (ID numérico, UUID ou slug)
 *     responses:
 *       200:
 *         description: Jogo excluído com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 jogo:
 *                   id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *               message: "Jogo excluído com sucesso."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado (requer privilégios de administrador)
 *       404:
 *         description: Jogo não encontrado
 *       409:
 *         description: Conflito de integridade referencial (jogo vinculado a sessões clínicas)
 *         content:
 *           application/json:
 *             example:
 *               error: "Não é possível excluir o jogo pois existem sessões clínicas vinculadas a ele. Recomenda-se desativá-lo alterando seu status para 'desativado'."
 *       500:
 *         description: Erro interno ao excluir jogo
 */
jogosRoutes.patch('/:id', authMiddleware, adminMiddleware, JogoController.atualizar);
jogosRoutes.put('/:id', authMiddleware, adminMiddleware, JogoController.atualizar);
jogosRoutes.delete('/:id', authMiddleware, adminMiddleware, JogoController.excluir);

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
 *               data:
 *                 validacao:
 *                   pode_gravar: true
 *                   tipo_detectado: "numerica"
 *                 metrica:
 *                   id_metrica: "tempo_resposta"
 *                   tipo_metrica: "numerica"
 *                   unidade: "segundos"
 *               message: "Evento de telemetria homologado para gravação clínica no prontuário."
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
 *               error: "Valor da métrica 'tempo_resposta' deve ser numérico"
 *               regraViolada: "RN02 - Fallback de Métrica Proibido"
 *       500:
 *         description: Erro interno ao processar validação de telemetria
 */
jogosRoutes.post('/:id/validar-telemetria', JogoController.validarTelemetria);
