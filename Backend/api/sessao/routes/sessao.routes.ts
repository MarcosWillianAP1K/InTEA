// ==============================================================================
// InTEA: Rotas da Feature de Sessão e Pareamento Remoto
// ==============================================================================

import { Router } from 'express';
import { SessaoController } from '../controllers/sessao.controller.js';
import { SessaoExportarService } from '../services/sessao-exportar.service.js';

// Middlewares de autenticação JWT e validação de vínculo clínico (RN04)
import { authMiddleware } from '../../../core/middlewares/auth.middleware.js';
import { verificarVisibilidadePaciente } from '../../../core/middlewares/visibilidade.middleware.js';
import { verificarSessaoMiddleware } from '../../../core/middlewares/sessao.middleware.js';
import { validarIntervaloHistorico } from '../../../core/middlewares/query-range.middleware.js';
import { parearRateLimiter } from '../../../core/middlewares/rate-limit.middleware.js';

export const sessaoRoutes = Router();

// =============================================================================
// ROTAS ESTÁTICAS (devem vir ANTES das rotas com parâmetros dinâmicos /:id)
// =============================================================================

/**
 * @swagger
 * /api/sessao/codigo-pareamento:
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
 *             example:
 *               message: "Código de pareamento gerado com sucesso."
 *               data:
 *                 token_pareamento:
 *                   codigo: "4M5S-8U7B"
 *       401:
 *         description: Token JWT ausente ou inválido
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       500:
 *         description: Erro ao gerar código de pareamento
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao gerar código de pareamento"
 */
/**
 * @swagger
 * /api/sessao:
 *   get:
 *     summary: Lista sessões clínicas e em modo livre com filtros e paginação
 *     description: Lista sessões terapêuticas aplicando filtros clínicos e controle estrito de visibilidade (RN04). Terapeutas comuns visualizam apenas sessões em que atuaram. Super administradores com all=true visualizam todo o ecossistema.
 *     tags: [Sessão]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número da página para paginação
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Quantidade máxima de registros por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filtro de status clínico (concluida, finalizada, pendente, cancelada, falha)
 *       - in: query
 *         name: data
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtro por data exata (YYYY-MM-DD)
 *       - in: query
 *         name: dataInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial do intervalo (YYYY-MM-DD)
 *       - in: query
 *         name: dataFim
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final do intervalo (YYYY-MM-DD)
 *       - in: query
 *         name: pacienteId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtro por paciente específico
 *       - in: query
 *         name: jogoId
 *         schema:
 *           type: string
 *         description: Filtro por jogo específico
 *       - in: query
 *         name: modo
 *         schema:
 *           type: string
 *           enum: [sessao_clinica, modo_livre]
 *         description: Modo da sessão
 *       - in: query
 *         name: all
 *         schema:
 *           type: boolean
 *         description: Permite a super administradores listar todas as sessões globais
 *     responses:
 *       200:
 *         description: Lista paginada de sessões retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro interno ao listar sessões
 */
sessaoRoutes.get('/', authMiddleware, validarIntervaloHistorico, SessaoController.listar);
sessaoRoutes.get('/codigo-pareamento', authMiddleware, SessaoController.gerarCodigoPareamento);

/**
 * @swagger
 * /api/sessao/contexto-sugerido/{pacienteId}:
 *   get:
 *     summary: Sugere contexto DDA pré-calibrado pela IA para início de sessão (RF14, RF17, RN03)
 *     description: Consulta dados estáticos da anamnese clínica e o último relatório analítico consolidado (Contrato 4) do paciente. Caso a última sessão tenha registrado alta intervenção de DDA ou recomendação de redução de estímulos sonoros/visuais, o endpoint retorna uma sugestão pré-calibrada de nível de estresse e gatilhos sensoriais a evitar com justificativa clínica para aprovação em 1 clique pelo terapeuta.
 *     tags: [Sessão]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pacienteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID do paciente alvo
 *         example: "33333333-3333-3333-3333-333333333333"
 *     responses:
 *       200:
 *         description: Contexto DDA sugerido pela IA retornado com sucesso
 *         content:
 *           application/json:
 *             example:
 *               message: "Contexto DDA sugerido pela IA recuperado com sucesso."
 *               data:
 *                 paciente_id: "33333333-3333-3333-3333-333333333333"
 *                 dados_anamnese:
 *                   diagnostico_base: "Transtorno do Espectro Autista (TEA)"
 *                   gatilhos_estaticos: ["Sons Altos ou Repentinos"]
 *                   observacoes_gerais: "Hipersensibilidade auditiva moderada"
 *                 ultima_sessao:
 *                   sessao_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
 *                   jogo_id: "22222222-2222-2222-2222-222222222222"
 *                   jogo_nome: "Jogo da Memória Sensorial"
 *                   data_hora_fim: "2026-10-15T18:00:00.000Z"
 *                   intervencoes_dda: 4
 *                   taxa_conclusao: 65
 *                 sugestao_ia:
 *                   nivel_estresse_sugerido: 3
 *                   gatilhos_recomendados: ["Sons Altos ou Repentinos", "Luzes Fortes ou Piscantes"]
 *                   justificativa_baseada_ultima_sessao: "A última sessão registrou alta taxa de intervenções..."
 *       400:
 *         description: UUID do paciente inválido ou ausente
 *       401:
 *         description: Token JWT ausente ou inválido
 *       403:
 *         description: Acesso negado — terapeuta sem vínculo ativo com o paciente (RN04)
 *       404:
 *         description: Paciente não encontrado
 *       500:
 *         description: Erro interno ao obter contexto DDA sugerido
 */
sessaoRoutes.get(
  '/contexto-sugerido/:pacienteId',
  authMiddleware,
  verificarVisibilidadePaciente,
  SessaoController.obterContextoSugerido
);

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
 *               - jogo_id
 *               - codigo_pareamento
 *             properties:
 *               terapeuta_id:
 *                 type: string
 *                 format: uuid
 *                 example: "11111111-1111-1111-1111-111111111111"
 *                 description: (Opcional) UUID do terapeuta responsável. Derivado primariamente do token JWT verificado (RF21). Se informado no body, deve coincidir com o usuário autenticado; divergências são bloqueadas com 403 Forbidden.
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
 *                 message:
 *                   type: string
 *                   example: "Sessão iniciada com sucesso."
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessao:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         status_sessao:
 *                           type: string
 *                           example: "aguardando_pareamento"
 *                         modo_sessao:
 *                           type: string
 *                           example: "sessao_clinica"
 *                         paciente_id:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                         terapeuta_id:
 *                           type: string
 *                           format: uuid
 *                         jogo_id:
 *                           type: string
 *                           format: uuid
 *                         data_hora_inicio:
 *                           type: string
 *                           format: date-time
 *                     token_pareamento:
 *                       type: object
 *                       properties:
 *                         token:
 *                           type: string
 *                           example: "4M5S-8U7B"
 *                         codigo:
 *                           type: string
 *                           example: "4M5S-8U7B"
 *                         expira_em:
 *                           type: string
 *                           format: date-time
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
 *         description: Token JWT ausente, inválido ou identificador do terapeuta não encontrado
 *       403:
 *         description: Acesso negado — terapeuta informado no body divergente do token autenticado (anti-spoofing), sem vínculo ativo com o paciente (RN04) ou de clínica divergente
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
 *                 message:
 *                   type: string
 *                   example: "Dispositivo pareado com sucesso."
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessao:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         session_token:
 *                           type: string
 *                           example: "4M5S-8U7B"
 *                         status_sessao:
 *                           type: string
 *                           example: "conectado"
 *                         modo_sessao:
 *                           type: string
 *                           example: "sessao_clinica"
 *                         jogo_id:
 *                           type: string
 *                           format: uuid
 *                         paciente_id:
 *                           type: string
 *                           format: uuid
 *                           nullable: true
 *                         contexto_dda:
 *                           type: object
 *                           description: Parâmetros DDA para o Agente de IA (RN03)
 *                     conexao:
 *                       type: object
 *                       properties:
 *                         url:
 *                           type: string
 *                         canal:
 *                           type: string
 *                         pareado_em:
 *                           type: string
 *                           format: date-time
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
sessaoRoutes.post('/parear', parearRateLimiter, SessaoController.parear);

// =============================================================================
// ROTAS COM PARÂMETROS DINÂMICOS
// REGRA: /token/:token ANTES de /:id — o Express avalia rotas em ordem de registro.
// Se /:id vier primeiro, a string "token" seria capturada como valor de :id.
// =============================================================================

/**
 * @swagger
 * /api/sessao/token/{token}:
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
 *                 message:
 *                   type: string
 *                   example: "Resultado consolidado da sessão consultado com sucesso."
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
 *       403:
 *         description: Acesso negado — terapeuta sem vínculo com paciente desta sessão (RN04) ou sessão em modo livre de outro autor (RN01)
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
sessaoRoutes.get('/token/:token', authMiddleware, verificarSessaoMiddleware, SessaoController.buscarPorToken);

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
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
 *                 session_token: "4M5S-8U7B"
 *                 status_sessao: "conectado"
 *                 modo_sessao: "sessao_clinica"
 *                 dispositivo_info: null
 *                 presenca_dispositivo: null
 *                 expira_em: "2026-10-15T18:00:00.000Z"
 *                 data_hora_inicio: "2026-10-15T17:45:00.000Z"
 *       400:
 *         description: Token não fornecido
 *         content:
 *           application/json:
 *             example:
 *               error: "Token não fornecido"
 *       404:
 *         description: Sessão não encontrada
 *         content:
 *           application/json:
 *             example:
 *               error: "Sessão não encontrada"
 *       500:
 *         description: Erro interno ao consultar status da sessão
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro ao consultar status da sessão"
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
 *                 message:
 *                   type: string
 *                   example: "Resultado consolidado da sessão consultado com sucesso."
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
 *       403:
 *         description: Acesso negado — terapeuta sem vínculo com paciente desta sessão (RN04) ou sessão em modo livre de outro autor (RN01)
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
sessaoRoutes.get('/:id', authMiddleware, verificarSessaoMiddleware, SessaoController.buscarPorId);

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
 *         content:
 *           application/json:
 *             example:
 *               message: "Laudo clínico emitido com sucesso para exportação."
 *               data:
 *                 laudo:
 *                   cabecalho:
 *                   instituicao: "Clínica Integrada InTEA"
 *                   cnpj_clinica: "12.345.678/0001-90"
 *                   emissao_em: "2026-10-15T18:00:00.000Z"
 *                   codigo_autenticidade: "LAUDO-4M5S-20261015"
 *                 paciente:
 *                   id: "33333333-3333-3333-3333-333333333333"
 *                   nome: "Pedro Henrique Silveira"
 *                   data_nascimento: "2018-06-15"
 *                   idade_anos: 8
 *                   cpf_mascarado: "***.982.247-**"
 *                   diagnostico_base: "Transtorno do Espectro Autista (TEA)"
 *                   responsavel_legal:
 *                     nome: "Juliana Silveira"
 *                     parentesco: "Mãe"
 *                     telefone: "(11) 99887-6655"
 *                 terapeuta:
 *                   id: "11111111-1111-1111-1111-111111111111"
 *                   nome: "Dra. Mariana Costa"
 *                   registro_profissional: "CREFITO-3/12345-TO"
 *                   especialidade: "Terapia Ocupacional e Integração Sensorial"
 *                   email_contato: "mariana.costa@intea.com.br"
 *                 sessao:
 *                   id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
 *                   token_pareamento: "4M5S-8U7B"
 *                   jogo:
 *                     nome: "Jogo da Memória Sensorial"
 *                     versao: "1.0.0"
 *                   data_hora_inicio: "2026-10-15T17:30:00.000Z"
 *                   data_hora_fim: "2026-10-15T17:50:00.000Z"
 *                   duracao_segundos: 1200
 *                   duracao_formatada: "20 min"
 *                   modo: "sessao_clinica"
 *                 metricas_tabela:
 *                   - indicador: "Tempo Médio de Resposta"
 *                     valor_obtido: "1.4s"
 *                     unidade: "segundos"
 *                     interpretacao_clinica: "Adequado"
 *                 analise_ia:
 *                   parecer_geral: "Paciente demonstrou excelente engajamento nas atividades sensoriais com foco atencional sustentado."
 *                   engajamento_estimado: "alto"
 *                   recomendacoes_clinicas:
 *                     - "Manter estímulos visuais de intensidade média"
 *                 assinatura:
 *                   terapeuta_nome: "Dra. Mariana Costa"
 *                   registro_profissional: "CREFITO-3/12345-TO"
 *                   data_assinatura: "2026-10-15"
 *       400:
 *         description: Sessão não está finalizada ou identificador inválido
 *         content:
 *           application/json:
 *             example:
 *               error: "A sessão precisa estar finalizada para exportação do laudo clínico."
 *       401:
 *         description: Token JWT ausente ou inválido
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado por falta de vínculo institucional ativo (RN04)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado: você não possui vínculo com este paciente (RN04)."
 *       404:
 *         description: Sessão ou paciente não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Sessão não encontrada"
 *       500:
 *         description: Erro interno ao emitir laudo para exportação
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao emitir laudo clínico para exportação."
 */
sessaoRoutes.get('/:id/exportar', authMiddleware, verificarSessaoMiddleware, SessaoController.exportar);


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
 *             example:
 *               message: "Sessão finalizada com sucesso."
 *               data:
 *                 sessao:
 *                   id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
 *                   status_sessao: "finalizada"
 *                   data_hora_fim: "2026-10-15T18:00:00.000Z"
 *                 relatorio:
 *                   token_sessao: "4M5S-8U7B"
 *                   duracao_segundos: 1200
 *       401:
 *         description: Token JWT ausente ou inválido
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado — terapeuta sem vínculo com paciente desta sessão (RN04) ou sessão em modo livre de outro autor (RN01)
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
sessaoRoutes.patch('/:id/finalizar', authMiddleware, verificarSessaoMiddleware, SessaoController.finalizar);

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
 *             example:
 *               message: "Sessão cancelada com sucesso."
 *               data:
 *                 sessao:
 *                   id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
 *                   status_sessao: "cancelada"
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
 *       403:
 *         description: Acesso negado — terapeuta sem vínculo com paciente desta sessão (RN04) ou sessão em modo livre de outro autor (RN01)
 *       404:
 *         description: Sessão não encontrada
 *       500:
 *         description: Erro interno ao cancelar sessão
 */
sessaoRoutes.delete('/:id/cancelar', authMiddleware, verificarSessaoMiddleware, SessaoController.cancelar);

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
 *                 message:
 *                   type: string
 *                   example: "Resultado consolidado da sessão consultado com sucesso."
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
 *       401:
 *         description: Token JWT ausente ou inválido
 *       403:
 *         description: Acesso negado — terapeuta sem vínculo com paciente desta sessão (RN04) ou sessão em modo livre de outro autor (RN01)
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
sessaoRoutes.patch('/:id/status', authMiddleware, verificarSessaoMiddleware, SessaoController.atualizarStatus);

/**
 * @swagger
 * /api/sessao/{id}/resultado:
 *   get:
 *     summary: Consulta consolidada dos resultados clínicos e analíticos da sessão (RF14)
 *     description: Retorna o consolidado completo de uma sessão finalizada, integrando metadados operacionais, dados do jogo, terapeuta, paciente, síntese do Agente de IA (Contrato 4) e anotações clínicas. Valida vínculo ativo e clínica (RN04) e suprime dados clínicos em Modo Livre (RN01).
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
 *         description: UUID da sessão finalizada
 *     responses:
 *       200:
 *         description: Resultados consolidados da sessão obtidos com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Resultado consolidado da sessão consultado com sucesso."
 *                 data:
 *                   type: object
 *                   properties:
 *                     sessao:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         session_token:
 *                           type: string
 *                         modo_sessao:
 *                           type: string
 *                           enum: [sessao_clinica, modo_livre]
 *                         status_sessao:
 *                           type: string
 *                           example: "finalizada"
 *                         data_hora_inicio:
 *                           type: string
 *                           format: date-time
 *                         data_hora_fim:
 *                           type: string
 *                           format: date-time
 *                         duracao_segundos:
 *                           type: integer
 *                           example: 1200
 *                     jogo:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                         nome:
 *                           type: string
 *                         versao:
 *                           type: string
 *                     terapeuta:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                         nome:
 *                           type: string
 *                         crefito:
 *                           type: string
 *                     paciente:
 *                       type: object
 *                       nullable: true
 *                       description: Nulo se a sessão for em Modo Livre (RN01)
 *                       properties:
 *                         id:
 *                           type: string
 *                         nome:
 *                           type: string
 *                     relatorio:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         conteudo:
 *                           type: string
 *                         dados_ia_json:
 *                           type: object
 *                           description: Dados analíticos conforme Contrato 4 da IA
 *                     cabecalho:
 *                       type: object
 *                       properties:
 *                         paciente:
 *                           type: object
 *                           nullable: true
 *                           description: Dados demográficos e clínicos do paciente (nulo em Modo Livre - RN01)
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             nome:
 *                               type: string
 *                             data_nascimento:
 *                               type: string
 *                               format: date
 *                             idade_anos:
 *                               type: integer
 *                             diagnostico:
 *                               type: string
 *                             gatilhos_evitar:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             nivel_estresse_inicial:
 *                               type: integer
 *                         terapeuta:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             nome:
 *                               type: string
 *                             registro_profissional:
 *                               type: string
 *                             crefito:
 *                               type: string
 *                             especialidade:
 *                               type: string
 *                         jogo:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             nome:
 *                               type: string
 *                             titulo:
 *                               type: string
 *                             versao:
 *                               type: string
 *                             descricao:
 *                               type: string
 *                     metricas_cards:
 *                       type: object
 *                       description: Indicadores quantitativos de desempenho copilados a partir da telemetria
 *                       properties:
 *                         pontuacao_geral:
 *                           type: number
 *                         taxa_conclusao:
 *                           type: number
 *                         total_toques:
 *                           type: integer
 *                         total_acertos:
 *                           type: integer
 *                         total_erros:
 *                           type: integer
 *                         taxa_precisao_percentual:
 *                           type: number
 *                         tempo_medio_resposta_ms:
 *                           type: integer
 *                         estabilidade_foco:
 *                           type: number
 *                         intervencoes_dda:
 *                           type: integer
 *                     insights_ia:
 *                       type: object
 *                       nullable: true
 *                       description: Síntese analítica do Agente de IA aderente ao Contrato 4
 *                     grafico_evolutivo:
 *                       type: object
 *                       description: Curva intra-sessão de tentativas e tempos de resposta
 *                       properties:
 *                         tipo:
 *                           type: string
 *                           example: "intra_sessao"
 *                         tempo_medio_referencia:
 *                           type: number
 *                         tentativas:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               tentativa:
 *                                 type: integer
 *                               segundo:
 *                                 type: integer
 *                               tempoFormatado:
 *                                 type: string
 *                               tempo_resposta_segundos:
 *                                 type: number
 *                               acerto:
 *                                 type: boolean
 *                               intervencaoDda:
 *                                 type: object
 *                                 nullable: true
 *                     anotacoes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           conteudo:
 *                             type: string
 *       400:
 *         description: Sessão não está finalizada ou identificador inválido
 *       401:
 *         description: Não autorizado (JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado por falta de vínculo ativo ou clínica divergente (RN04)
 *       404:
 *         description: Sessão não encontrada
 *       500:
 *         description: Erro interno ao consultar resultado consolidado
 */
sessaoRoutes.get('/:id/resultado', authMiddleware, verificarSessaoMiddleware, SessaoController.consultarResultado);

