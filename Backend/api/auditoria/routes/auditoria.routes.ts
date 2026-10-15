// ==============================================================================
// InTEA: Rotas da Trilha de Auditoria Clínica de Sessão (Sprint 9 - Task 1.3)
// ==============================================================================

import { Router } from 'express';
import { AuditoriaController } from '../controllers/auditoria.controller.js';
import { authMiddleware } from '../../../core/middlewares/auth.middleware.js';

export const auditoriaRoutes = Router();

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
 *         description: Linha do tempo recuperada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 - id: "22222222-2222-4222-a222-222222222222"
 *                   sessao_id: "11111111-1111-4111-a111-111111111111"
 *                   terapeuta_id: "33333333-3333-4333-a333-333333333333"
 *                   origem: "dispositivo_jogo"
 *                   acao: "dispositivo_pareado"
 *                   detalhes_json: {}
 *                   ip: "127.0.0.1"
 *                   user_agent: "InTEA Game Engine 1.0"
 *                   created_at: "2026-09-01T15:30:25Z"
 *               meta:
 *                 total: 1
 *               total: 1
 *       400:
 *         description: Parâmetro sessaoId inválido ou ausente
 *         content:
 *           application/json:
 *             example:
 *               error: "Parâmetro sessaoId ausente ou inválido"
 *       401:
 *         description: Token de autenticação ausente ou inválido
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado - terapeuta sem vínculo institucional com a sessão clínica (RN04)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado: você não possui vínculo com esta sessão (RN04)."
 *       404:
 *         description: Sessão clínica não encontrada
 *         content:
 *           application/json:
 *             example:
 *               error: "Sessão não encontrada"
 *       500:
 *         description: Erro interno no servidor ao consultar trilha de auditoria
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao consultar trilha de auditoria"
 */
auditoriaRoutes.get(
  '/sessao/:sessaoId',
  authMiddleware,
  AuditoriaController.consultarLinhaDoTempo
);
