// ==============================================================================
// InTEA: Rotas da Feature de Sessão e Pareamento Remoto
// ==============================================================================

import { Router } from 'express';
import { SessaoController } from '../controllers/sessao.controller.js';
import { SessaoExportarService } from '../services/sessao-exportar.service.js';

// Middlewares de autenticação JWT e validação de vínculo clínico (RN04)
import { authMiddleware } from '../../../core/middlewares/auth.middleware.js';
import { verificarVisibilidadePaciente } from '../../../core/middlewares/visibilidade.middleware.js';

export const sessaoRoutes = Router();

// =============================================================================
// ROTAS ESTÁTICAS (devem vir ANTES das rotas com parâmetros dinâmicos /:id)
// =============================================================================

/**
 * @swagger
 * /api/sessao/gerarCodigoPareamento:
 *   get:
 *     summary: Gera um código legível único de pareamento remoto (PIN)
 *     description: Gera um código alfanumérico único de pareamento (ex. '4M5S-8U7B') para ser inserido no game externo pelo paciente, verificando unicidade contra sessões existentes.
 *     tags: [Sessão]
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Token JWT ausente ou inválido
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
sessaoRoutes.get('/gerarCodigoPareamento', authMiddleware, SessaoController.gerarCodigoPareamento);

/**
 * @swagger
 * /api/sessao/iniciar:
 *   post:
 *     summary: Inicia uma nova sessão clínica ou em modo livre (emite token de pareamento)
 *     description: Cria uma nova sessão no banco de dados com status 'aguardando_pareamento', associa o código único de pareamento (PIN) com TTL de 15 minutos e vincula o contexto DDA pré-sessão para a IA (RN03).
 *     tags: [Sessão]
 *     security:
 *       - bearerAuth: []
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
 *                     session_id:
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
 *                     paciente_id:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     expira_em:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Dados incompletos ou violação da regra RN01
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "O paciente_id é obrigatório para sessões clínicas (RN01)"
 *       401:
 *         description: Token JWT ausente ou inválido
 *       403:
 *         description: Acesso negado — terapeuta sem vínculo ativo com o paciente (RN04) ou de clínica divergente
 *       500:
 *         description: Erro interno ao criar sessão
 */
sessaoRoutes.post('/iniciar', authMiddleware, verificarVisibilidadePaciente, SessaoController.iniciar);

/**
 * @swagger
 * /api/sessao/parear:
 *   post:
 *     summary: Handshake de pareamento remoto (jogo externo confirma conexão)
 *     description: |
 *       Endpoint consumido pelo jogo externo no tablet/dispositivo do paciente.
 *       Recebe o `session_token`, valida existência e TTL, e realiza a transição
 *       atômica de `aguardando_pareamento` → `conectado`.
 *
 *       **Verificação de jogo (opcional):** se `jogo_id` for enviado no body,
 *       o backend verifica se corresponde ao jogo selecionado pelo terapeuta.
 *       Divergência retorna **409 Conflict**.
 *
 *       Token expirado retorna **410 Gone**.
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
 *                 example: "4M5S-8U7B"
 *                 description: Código de pareamento exibido na tela do terapeuta e digitado no jogo externo
 *               jogo_id:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 example: "22222222-2222-2222-2222-222222222222"
 *                 description: (Opcional) UUID do jogo que está se conectando. Se informado, será verificado contra o jogo selecionado pelo terapeuta.
 *     responses:
 *       200:
 *         description: Pareamento realizado com sucesso — sessão passou para status 'conectado'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     session_id:
 *                       type: string
 *                       format: uuid
 *                     session_token:
 *                       type: string
 *                       example: "4M5S-8U7B"
 *                     status_sessao:
 *                       type: string
 *                       example: "conectado"
 *                     jogo_id:
 *                       type: string
 *                       format: uuid
 *                     paciente_id:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     contexto_dda_json:
 *                       type: object
 *                       description: Parâmetros DDA para o Agente de IA (RN03)
 *       400:
 *         description: session_token ausente ou sessão não está em 'aguardando_pareamento'
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Pareamento inválido: a sessão está no status 'conectado'."
 *       404:
 *         description: Token de sessão inválido ou não encontrado
 *       409:
 *         description: jogo_id enviado pelo launcher não corresponde ao jogo selecionado pelo terapeuta
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "O jogo informado não corresponde ao jogo selecionado pelo terapeuta para esta sessão."
 *       410:
 *         description: Token de pareamento expirado (TTL de 15 minutos esgotado)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Token de pareamento expirado. Solicite um novo código ao terapeuta."
 *       500:
 *         description: Erro interno ao realizar pareamento
 */
sessaoRoutes.post('/parear', SessaoController.parear);

// =============================================================================
// ROTAS COM PARÂMETROS DINÂMICOS
// REGRA: /buscarPorToken/:token ANTES de /:id — o Express avalia rotas em ordem de registro.
// Se /:id vier primeiro, a string "buscarPorToken" seria capturada como valor de :id.
// =============================================================================

/**
 * @swagger
 * /api/sessao/buscarPorToken/{token}:
 *   get:
 *     summary: Busca uma sessão pelo código/token de pareamento (PIN)
 *     description: Consulta os dados de uma sessão ativa a partir do código alfanumérico de pareamento digitado. Retorna a sessão completa incluindo status e configurações.
 *     tags: [Sessão]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Código de pareamento (ex. "4M5S-8U7B")
 *         example: "4M5S-8U7B"
 *     responses:
 *       200:
 *         description: Sessão encontrada pelo token de pareamento
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
 *                     jogo_id:
 *                       type: string
 *                       format: uuid
 *                     terapeuta_id:
 *                       type: string
 *                       format: uuid
 *                     paciente_id:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     expira_em:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Token JWT ausente ou inválido
 *       404:
 *         description: Sessão não encontrada para o token informado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Código de sessão inválido ou expirado"
 *       500:
 *         description: Erro interno ao buscar sessão por token
 */
sessaoRoutes.get('/buscarPorToken/:token', authMiddleware, SessaoController.buscarPorToken);

/**
 * @swagger
 * /api/sessao/{token}/status:
 *   get:
 *     summary: Consulta o status atual de pareamento da sessão (RF10, Card 2.3)
 *     description: Permite polling do status da sessão e presença do dispositivo via session_token.
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

/**
 * @swagger
 * /api/sessao/{id}:
 *   get:
 *     summary: Busca uma sessão pelo seu ID interno
 *     description: Retorna os dados completos de uma sessão pelo UUID interno. Utilizado pelo painel do terapeuta para acompanhar o estado da sessão em andamento.
 *     tags: [Sessão]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID interno da sessão
 *         example: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
 *     responses:
 *       200:
 *         description: Sessão encontrada com sucesso
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
 *                       example: "em_andamento"
 *                     modo_sessao:
 *                       type: string
 *                       example: "sessao_clinica"
 *                     jogo_id:
 *                       type: string
 *                       format: uuid
 *                     terapeuta_id:
 *                       type: string
 *                       format: uuid
 *                     paciente_id:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     expira_em:
 *                       type: string
 *                       format: date-time
 *                     data_hora_inicio:
 *                       type: string
 *                       format: date-time
 *                     data_hora_fim:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       401:
 *         description: Token JWT ausente ou inválido
 *       404:
 *         description: Sessão não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Sessão não encontrada"
 *       500:
 *         description: Erro interno ao buscar sessão
 */
sessaoRoutes.get('/:id', authMiddleware, SessaoController.buscarPorId);

/**
 * @swagger
 * /api/sessao/{id}/exportar:
 *   get:
 *     summary: Emite e exporta laudo clínico estruturado da sessão (RF20 / RNF06)
 *     description: |
 *       Gera payload estruturado e sanitizado para impressão e emissão de laudo médico formal,
 *       reunindo dados da clínica, registro profissional do terapeuta, identificação do paciente
 *       com CPF mascarado (LGPD), tabela consolidada de desempenho, parecer da IA e área formal para assinatura.
 *     tags: [Sessão]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID da sessão clínica finalizada
 *     responses:
 *       200:
 *         description: Laudo clínico estruturado retornado com sucesso para exportação
 *       400:
 *         description: Sessão não está finalizada ou identificador inválido
 *       401:
 *         description: Token JWT ausente ou inválido
 *       403:
 *         description: Acesso negado por falta de vínculo institucional ativo (RN04)
 *       404:
 *         description: Sessão ou paciente não encontrado
 *       500:
 *         description: Erro interno ao emitir laudo para exportação
 */
sessaoRoutes.get('/:id/exportar', authMiddleware, SessaoExportarService.handlerExportarHttp);


/**
 * @swagger
 * /api/sessao/{id}/finalizar:
 *   patch:
 *     summary: Finaliza uma sessão clínica em andamento
 *     description: Atualiza o status da sessão para 'finalizada', registrando o encerramento formal da intervenção terapêutica. Deve ser chamado pelo painel do terapeuta ao término da sessão.
 *     tags: [Sessão]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID da sessão a finalizar
 *     responses:
 *       200:
 *         description: Sessão finalizada com sucesso
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
 *                       example: "finalizada"
 *                     data_hora_fim:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       401:
 *         description: Token JWT ausente ou inválido
 *       404:
 *         description: Sessão não encontrada para finalização
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Sessão não encontrada para finalização"
 *       500:
 *         description: Erro interno ao finalizar sessão
 */
sessaoRoutes.patch('/:id/finalizar', authMiddleware, SessaoController.finalizar);

/**
 * @swagger
 * /api/sessao/{id}/cancelar:
 *   delete:
 *     summary: Cancela antecipadamente uma sessão pendente (pelo terapeuta)
 *     description: Permite ao terapeuta cancelar uma sessão que ainda não foi concluída. Sessões com status 'finalizada', 'expirada' ou 'cancelada' não podem ser canceladas novamente (retorna 400). Previne conexões indevidas de jogos remotos.
 *     tags: [Sessão]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID da sessão a cancelar
 *     responses:
 *       200:
 *         description: Sessão cancelada com sucesso
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
 *                       example: "cancelada"
 *       400:
 *         description: Sessão já está em status terminal (finalizada, expirada ou cancelada)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "A sessão já está no status 'finalizada' e não pode ser cancelada."
 *       401:
 *         description: Token JWT ausente ou inválido
 *       404:
 *         description: Sessão não encontrada
 *       500:
 *         description: Erro interno ao cancelar sessão
 */
sessaoRoutes.delete('/:id/cancelar', authMiddleware, SessaoController.cancelar);

/**
 * @swagger
 * /api/sessao/{id}/status:
 *   patch:
 *     summary: Atualiza o status da máquina de estados de uma sessão
 *     description: Permite transicionar a sessão para um dos estados válidos ('aguardando_pareamento', 'conectado', 'em_andamento', 'finalizada', 'expirada', 'cancelada').
 *     tags: [Sessão]
 *     security:
 *       - bearerAuth: []
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
sessaoRoutes.patch('/:id/status', authMiddleware, SessaoController.atualizarStatus);
