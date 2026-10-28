// ==============================================================================
// InTEA: Rotas da Trilha de Auditoria Clínica de Sessão (Sprint 9 - Task 1.3)
// ==============================================================================
// Conformidade: RF13, RNF06 (LGPD / Segurança), RN04, RN05, RF21, RF07, RF08
// Padrão Arquitetural: Envelope Pattern Categorizado Estrito ({ data: { ... }, message })
// ==============================================================================

import { Router } from 'express';
import { AuditoriaController } from '../controllers/auditoria.controller.js';
import { authMiddleware } from '../../../core/middlewares/auth.middleware.js';

export const auditoriaRoutes = Router();

/**
 * @openapi
 * /api/auditoria/estatisticas:
 *   get:
 *     tags:
 *       - Auditoria
 *     summary: Obtém estatísticas consolidadas de conformidade para auditoria (RF07, RF08)
 *     description: Retorna contadores agregados para os cartões de conformidade e governança clínica.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estatísticas consolidadas recuperadas com sucesso
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro interno ao obter estatísticas
 */
/**
 * @openapi
 * /api/auditoria/prontuario:
 *   get:
 *     tags:
 *       - Auditoria
 *     summary: Consulta registros de auditoria de acessos ao prontuário médico (RF08, RNF06)
 *     description: Retorna acessos a dados de pacientes filtráveis por período e por terapeuta com status 200.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: terapeuta_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por UUID do terapeuta
 *       - in: query
 *         name: paciente_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por UUID do paciente
 *       - in: query
 *         name: periodo
 *         schema:
 *           type: string
 *           enum: [hoje, 7d, 30d]
 *         description: Janela temporal pré-definida
 *       - in: query
 *         name: data_inicio
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data inicial do período
 *       - in: query
 *         name: data_fim
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Data final do período
 *     responses:
 *       200:
 *         description: Registros de auditoria recuperados com sucesso
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro interno ao consultar auditoria de prontuário
 */
auditoriaRoutes.get(
  '/prontuario',
  authMiddleware,
  AuditoriaController.consultarAcessosProntuario
);

auditoriaRoutes.get(
  '/estatisticas',
  authMiddleware,
  AuditoriaController.obterEstatisticas
);

/**
 * @openapi
 * /api/auditoria/sessao/{sessaoId}:
 *   get:
 *     tags:
 *       - Auditoria
 *     summary: Consulta a linha do tempo cronológica da sessão clínica (RF13, RNF06, RN04, RN05)
 *     description: >
 *       Retorna a lista de registros imutáveis de auditoria gerados durante o ciclo de vida
 *       da intervenção clínica (pareamento, finalização, cancelamento, intervenções).
 *       Acesso estritamente restrito aos terapeutas vinculados à sessão clínica (RN04) ou SuperAdmins.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessaoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID da sessão clínica a ser consultada
 *         example: "11111111-1111-4111-a111-111111111111"
 *     responses:
 *       200:
 *         description: Linha do tempo recuperada com sucesso em Envelope Pattern Categorizado
 *       400:
 *         description: Parâmetro sessaoId inválido ou ausente
 *       401:
 *         description: Token de autenticação ausente ou inválido
 *       403:
 *         description: Acesso negado - terapeuta sem vínculo institucional com a sessão clínica (RN04)
 *       404:
 *         description: Sessão clínica não encontrada
 *       500:
 *         description: Erro interno no servidor ao consultar trilha de auditoria
 */
auditoriaRoutes.get(
  '/sessao/:sessaoId',
  authMiddleware,
  AuditoriaController.consultarLinhaDoTempo
);

/**
 * @openapi
 * /api/auditoria:
 *   get:
 *     tags:
 *       - Auditoria
 *     summary: Lista eventos de auditoria com suporte a busca, filtros e paginação (RF07, RF08, RNF06)
 *     description: Retorna lista paginada de eventos imutáveis para fiscalização institucional.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Página da listagem (padrão 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Quantidade por página (padrão 10)
 *       - in: query
 *         name: busca
 *         schema:
 *           type: string
 *         description: Termo de busca textual
 *       - in: query
 *         name: tipoAcao
 *         schema:
 *           type: string
 *         description: Filtro de ação clínica
 *     responses:
 *       200:
 *         description: Lista de eventos de auditoria retornada com sucesso
 *       401:
 *         description: Não autenticado
 *       500:
 *         description: Erro interno ao listar eventos
 */
auditoriaRoutes.get(
  '/',
  authMiddleware,
  AuditoriaController.listar
);

/**
 * @openapi
 * /api/auditoria:
 *   post:
 *     tags:
 *       - Auditoria
 *     summary: Registra evento imutável na trilha de auditoria clínica (RF13, RNF06, RN04, RN05, RF21)
 *     description: >
 *       Grava formalmente uma ação clínica ou intervenção na tabela de auditoria forense da sessão.
 *       Garante autoria pelo JWT (RF21) e vínculo com a sessão clínica (RN04).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessao_id
 *               - origem
 *               - acao
 *             properties:
 *               sessao_id:
 *                 type: string
 *                 format: uuid
 *                 example: "11111111-1111-4111-a111-111111111111"
 *               origem:
 *                 type: string
 *                 example: "terapeuta_web"
 *               acao:
 *                 type: string
 *                 example: "intervencao_dda"
 *               detalhes_json:
 *                 type: object
 *                 example: { "dificuldade_ajustada": "media" }
 *     responses:
 *       201:
 *         description: Evento de auditoria registrado com sucesso
 *       400:
 *         description: Dados de entrada ausentes ou inválidos
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem vínculo clínico (RN04) ou tentativa de spoofing (RF21)
 *       500:
 *         description: Erro interno de persistência
 */
auditoriaRoutes.post(
  '/',
  authMiddleware,
  AuditoriaController.registrarEvento
);

auditoriaRoutes.post(
  '/evento',
  authMiddleware,
  AuditoriaController.registrarEvento
);
