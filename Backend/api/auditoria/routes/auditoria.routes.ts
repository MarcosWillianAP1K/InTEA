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
 *                       terapeuta_id:
 *                         type: string
 *                         format: uuid
 *                         nullable: true
 *                       origem:
 *                         type: string
 *                         example: "dispositivo_jogo"
 *                       acao:
 *                         type: string
 *                         example: "dispositivo_pareado"
 *                       detalhes_json:
 *                         type: object
 *                       ip:
 *                         type: string
 *                         nullable: true
 *                       user_agent:
 *                         type: string
 *                         nullable: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *                   example: 2
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
