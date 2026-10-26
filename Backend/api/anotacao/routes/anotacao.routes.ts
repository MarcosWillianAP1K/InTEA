// ==============================================================================
// InTEA: Rotas do Módulo de Anotações Clínicas (Prontuário e Sessão)
// ==============================================================================
// Conformidade: RF16 (Anotações), RF21 (Autoria JWT), RN04 (Vínculo), RN05 (Soft Delete)
// ==============================================================================

import { Router } from 'express';
import { AnotacaoPacienteController } from '../controllers/anotacao-paciente.controller.js';
import { AnotacaoSessaoController } from '../controllers/anotacao-sessao.controller.js';
import { authMiddleware, AuthenticatedRequest } from '../../../core/middlewares/auth.middleware.js';
import { adminMiddleware } from '../../../core/middlewares/admin.middleware.js';
import { verificarVisibilidadePaciente } from '../../../core/middlewares/visibilidade.middleware.js';
import {
  resolverContextoPaciente,
  resolverContextoSessao,
  resolverContextoAnotacaoUnificada,
  resolverContextoAnotacaoPorId,
} from '../middlewares/anotacao-contexto.middleware.js';

export const anotacaoRoutes = Router();

// ==============================================================================
// 1. ROTAS CANÔNICAS UNIFICADAS (/api/anotacao) - Consumidas pelo Frontend
// ==============================================================================

/**
 * @swagger
 * /api/anotacao:
 *   post:
 *     summary: Registra uma anotação clínica (vinculada a sessão ou paciente)
 *     description: Endpoint unificado consumido pelo painel do terapeuta. Se informado sessao_id, vincula à sessão clínica; caso contrário, vincula diretamente ao prontuário geral do paciente.
 *     tags: [Anotações Clínicas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conteudo
 *             properties:
 *               sessao_id:
 *                 type: string
 *                 format: uuid
 *                 example: "11111111-1111-1111-1111-111111111111"
 *                 description: UUID da sessão clínica (opcional)
 *               paciente_id:
 *                 type: string
 *                 format: uuid
 *                 example: "22222222-2222-2222-2222-222222222222"
 *                 description: UUID do paciente
 *               conteudo:
 *                 type: string
 *                 example: "Paciente demonstrou excelente autorregulação sensorial durante a atividade."
 *     responses:
 *       201:
 *         description: Anotação clínica registrada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 anotacao:
 *                   id: "33333333-3333-3333-3333-333333333333"
 *                   terapeuta_id: "44444444-4444-4444-4444-444444444444"
 *                   paciente_id: "22222222-2222-2222-2222-222222222222"
 *                   sessao_id: "11111111-1111-1111-1111-111111111111"
 *                   conteudo: "Paciente demonstrou excelente autorregulação sensorial durante a atividade."
 *                   created_at: "2026-10-15T18:00:00Z"
 *                   updated_at: "2026-10-15T18:00:00Z"
 *               message: "Anotação clínica registrada com sucesso."
 *       400:
 *         description: Dados obrigatórios ausentes ou inválidos
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado por falta de vínculo institucional ativo (RN04)
 *       404:
 *         description: Sessão ou paciente não encontrado
 */
anotacaoRoutes.post(
  '/',
  authMiddleware,
  (req, res, next) => resolverContextoAnotacaoUnificada(req as AuthenticatedRequest, res, next),
  verificarVisibilidadePaciente,
  async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    if (authReq.body?.sessao_id) {
      return AnotacaoSessaoController.criar(authReq, res);
    }
    return AnotacaoPacienteController.criar(authReq, res);
  }
);

/**
 * @swagger
 * /api/anotacao/{id}:
 *   get:
 *     summary: Consulta uma anotação clínica pelo ID (UUID)
 *     description: Retorna os dados da anotação clínica. Requer vínculo institucional ativo com o paciente (RN04).
 *     tags: [Anotações Clínicas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID da anotação clínica
 *     responses:
 *       200:
 *         description: Anotação clínica encontrada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 anotacao:
 *                   id: "33333333-3333-3333-3333-333333333333"
 *                   terapeuta_id: "44444444-4444-4444-4444-444444444444"
 *                   paciente_id: "22222222-2222-2222-2222-222222222222"
 *                   sessao_id: null
 *                   conteudo: "Paciente demonstrou excelente autorregulação sensorial."
 *                   created_at: "2026-10-15T18:00:00Z"
 *                   updated_at: "2026-10-15T18:00:00Z"
 *               message: "Anotação clínica consultada com sucesso."
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado por falta de vínculo ativo ou clínica divergente (RN04)
 *       404:
 *         description: Anotação clínica não encontrada
 *       500:
 *         description: Erro interno ao consultar anotação clínica
 */
anotacaoRoutes.get(
  '/:id',
  authMiddleware,
  resolverContextoAnotacaoPorId,
  verificarVisibilidadePaciente,
  AnotacaoPacienteController.buscarPorId
);

/**
 * @swagger
 * /api/anotacao/{id}:
 *   patch:
 *     summary: Atualiza o conteúdo de uma anotação clínica existente
 *     description: Permite alterar exclusivamente o texto da anotação. Acesso restrito ao terapeuta autor da nota (RF21) com vínculo ativo (RN04).
 *     tags: [Anotações Clínicas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID da anotação clínica
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conteudo
 *             properties:
 *               conteudo:
 *                 type: string
 *                 example: "Conteúdo clínico revisado com novas observações."
 *     responses:
 *       200:
 *         description: Anotação atualizada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 anotacao:
 *                   id: "33333333-3333-3333-3333-333333333333"
 *                   conteudo: "Conteúdo clínico revisado com novas observações."
 *                   updated_at: "2026-10-15T18:05:00Z"
 *               message: "Anotação clínica atualizada com sucesso."
 *       400:
 *         description: Conteúdo vazio ou inválido
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Usuário não é o autor da anotação ou sem vínculo ativo (RN04)
 *       404:
 *         description: Anotação não encontrada
 */
anotacaoRoutes.patch(
  '/:id',
  authMiddleware,
  resolverContextoAnotacaoPorId,
  verificarVisibilidadePaciente,
  AnotacaoPacienteController.atualizar
);

/**
 * @swagger
 * /api/anotacao/{id}/hard:
 *   delete:
 *     summary: "[DEV/TESTES] Exclusão física permanente de anotação clínica"
 *     description: Remove fisicamente o registro do banco de dados. Exclusivo para SuperAdmin.
 *     tags: [Anotações Clínicas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID da anotação clínica
 *     responses:
 *       204:
 *         description: Anotação excluída fisicamente com sucesso
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado (restrito a administradores e requer vínculo ativo)
 *       404:
 *         description: Anotação não encontrada
 *       500:
 *         description: Erro interno ao executar exclusão física
 */
anotacaoRoutes.delete(
  '/:id/hard',
  authMiddleware,
  adminMiddleware,
  resolverContextoAnotacaoPorId,
  verificarVisibilidadePaciente,
  AnotacaoPacienteController.deletarHard
);

/**
 * @swagger
 * /api/anotacao/{id}:
 *   delete:
 *     summary: Exclusão lógica (soft delete) de anotação clínica
 *     description: Inativa a anotação clínica preservando o histórico imutável (RN05). Restrito ao terapeuta autor da anotação (RF21) com vínculo ativo (RN04).
 *     tags: [Anotações Clínicas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID da anotação clínica
 *     responses:
 *       200:
 *         description: Anotação clínica desativada com sucesso (soft delete aplicado)
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 anotacao:
 *                   id: "33333333-3333-3333-3333-333333333333"
 *                   soft_delete: true
 *                   updated_at: "2026-10-15T18:05:00Z"
 *               message: "Anotação clínica desativada com sucesso (soft delete aplicado)."
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado — apenas o autor com vínculo ativo pode inativar a anotação (RF21, RN04)
 *       404:
 *         description: Anotação não encontrada
 *       500:
 *         description: Erro interno ao desativar anotação clínica
 */
anotacaoRoutes.delete(
  '/:id',
  authMiddleware,
  resolverContextoAnotacaoPorId,
  verificarVisibilidadePaciente,
  AnotacaoPacienteController.deletar
);

// ==============================================================================
// 2. ROTAS DE ANOTAÇÕES GERAIS DE PACIENTE (/api/anotacao/paciente)
// ==============================================================================

/**
 * @swagger
 * /api/anotacao/paciente:
 *   post:
 *     summary: Registra anotação clínica geral para o paciente
 *     description: Cria uma nota vinculada exclusivamente ao prontuário do paciente (sessao_id = null). Autoria obtida do token JWT (RF21). Requer vínculo ativo (RN04).
 *     tags: [Anotações Clínicas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paciente_id
 *               - conteudo
 *             properties:
 *               paciente_id:
 *                 type: string
 *                 format: uuid
 *                 example: "11111111-1111-1111-1111-111111111111"
 *               conteudo:
 *                 type: string
 *                 example: "Paciente demonstrou excelente autorregulação emocional durante o atendimento."
 *     responses:
 *       201:
 *         description: Anotação criada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 anotacao:
 *                   id: "33333333-3333-3333-3333-333333333333"
 *                   terapeuta_id: "44444444-4444-4444-4444-444444444444"
 *                   paciente_id: "11111111-1111-1111-1111-111111111111"
 *                   sessao_id: null
 *                   conteudo: "Paciente demonstrou excelente autorregulação emocional durante o atendimento."
 *                   created_at: "2026-10-15T18:00:00Z"
 *                   updated_at: "2026-10-15T18:00:00Z"
 *               message: "Anotação clínica registrada com sucesso."
 *       400:
 *         description: Campos obrigatórios ausentes ou inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Sem vínculo com o paciente (RN04)
 */
anotacaoRoutes.post(
  '/paciente',
  authMiddleware,
  resolverContextoPaciente,
  verificarVisibilidadePaciente,
  AnotacaoPacienteController.criar
);

/**
 * @swagger
 * /api/anotacao/paciente/{pacienteId}:
 *   get:
 *     summary: Lista anotações clínicas gerais do paciente
 *     description: Retorna o histórico de anotações do prontuário do paciente (sessao_id = null) em ordem cronológica decrescente.
 *     tags: [Anotações Clínicas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pacienteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID do paciente
 *     responses:
 *       200:
 *         description: Lista de anotações retornada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 anotacoes:
 *                   - id: "33333333-3333-3333-3333-333333333333"
 *                     terapeuta_id: "44444444-4444-4444-4444-444444444444"
 *                     paciente_id: "11111111-1111-1111-1111-111111111111"
 *                     sessao_id: null
 *                     conteudo: "Paciente demonstrou excelente autorregulação emocional."
 *                     created_at: "2026-10-15T18:00:00Z"
 *                     updated_at: "2026-10-15T18:00:00Z"
 *                 meta:
 *                   total: 1
 *                   pagina: 1
 *                   limite: 10
 *               message: "Anotações clínicas do paciente listadas com sucesso."
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Sem vínculo ativo (RN04)
 *       404:
 *         description: Paciente não encontrado
 */
anotacaoRoutes.get(
  '/paciente/:pacienteId',
  authMiddleware,
  resolverContextoPaciente,
  verificarVisibilidadePaciente,
  AnotacaoPacienteController.listarPorPaciente
);

/**
 * @swagger
 * /api/anotacao/paciente/{id}:
 *   patch:
 *     summary: Edita o conteúdo de uma anotação de paciente
 *     tags: [Anotações Clínicas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID da anotação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conteudo
 *             properties:
 *               conteudo:
 *                 type: string
 *                 example: "Texto clínico atualizado."
 *     responses:
 *       200:
 *         description: Anotação atualizada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 anotacao:
 *                   id: "33333333-3333-3333-3333-333333333333"
 *                   conteudo: "Texto clínico atualizado."
 *                   updated_at: "2026-10-15T18:05:00Z"
 *               message: "Anotação clínica atualizada com sucesso."
 *       400:
 *         description: Conteúdo vazio ou inválido
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Usuário não é o autor da anotação
 *       404:
 *         description: Anotação não encontrada
 */
anotacaoRoutes.patch(
  '/paciente/:id',
  authMiddleware,
  resolverContextoPaciente,
  verificarVisibilidadePaciente,
  AnotacaoPacienteController.atualizar
);

/**
 * @swagger
 * /api/anotacao/paciente/{id}:
 *   delete:
 *     summary: Exclusão lógica (soft delete) de anotação de paciente
 *     description: Marca a anotação como inativa, preservando a imutabilidade do histórico clínico (RN05). Restrito ao autor.
 *     tags: [Anotações Clínicas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID da anotação
 *     responses:
 *       200:
 *         description: Anotação desativada com sucesso (soft delete aplicado)
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 anotacao:
 *                   id: "33333333-3333-3333-3333-333333333333"
 *                   soft_delete: true
 *                   updated_at: "2026-10-15T18:05:00Z"
 *               message: "Anotação clínica desativada com sucesso (soft delete aplicado)."
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Apenas o autor pode excluir
 *       404:
 *         description: Anotação não encontrada
 */
anotacaoRoutes.delete(
  '/paciente/:id',
  authMiddleware,
  resolverContextoPaciente,
  verificarVisibilidadePaciente,
  AnotacaoPacienteController.deletar
);

/**
 * @swagger
 * /api/anotacao/paciente/{id}/hard:
 *   delete:
 *     summary: "[DEV/TESTES] Exclusão física permanente de anotação de paciente"
 *     tags: [Anotações Clínicas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Anotação excluída fisicamente
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Restrito a administradores
 *       404:
 *         description: Anotação não encontrada
 */
anotacaoRoutes.delete(
  '/paciente/:id/hard',
  authMiddleware,
  adminMiddleware,
  resolverContextoPaciente,
  verificarVisibilidadePaciente,
  AnotacaoPacienteController.deletarHard
);

// ==============================================================================
// 3. ROTAS DE ANOTAÇÕES VINCULADAS A SESSÃO (/api/anotacao/sessao)
// ==============================================================================

/**
 * @swagger
 * /api/anotacao/sessao:
 *   post:
 *     summary: Registra anotação clínica associada a uma sessão
 *     description: Vincula a nota à sessão e ao paciente correspondente. Sessão cancelada retorna 400. Autoria via JWT (RF21).
 *     tags: [Anotações Clínicas]
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
 *               - conteudo
 *             properties:
 *               sessao_id:
 *                 type: string
 *                 format: uuid
 *                 example: "11111111-1111-1111-1111-111111111111"
 *               conteudo:
 *                 type: string
 *                 example: "Excelente foco atencional nos primeiros 10 minutos de partida."
 *     responses:
 *       201:
 *         description: Anotação de sessão criada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 anotacao:
 *                   id: "33333333-3333-3333-3333-333333333333"
 *                   terapeuta_id: "44444444-4444-4444-4444-444444444444"
 *                   paciente_id: "22222222-2222-2222-2222-222222222222"
 *                   sessao_id: "11111111-1111-1111-1111-111111111111"
 *                   conteudo: "Excelente foco atencional nos primeiros 10 minutos de partida."
 *                   created_at: "2026-10-15T18:00:00Z"
 *                   updated_at: "2026-10-15T18:00:00Z"
 *               message: "Anotação clínica da sessão registrada com sucesso."
 *       400:
 *         description: Sessão cancelada, modo livre ou dados inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Sem permissão institucional (RN04)
 *       404:
 *         description: Sessão não encontrada
 */
anotacaoRoutes.post(
  '/sessao',
  authMiddleware,
  resolverContextoSessao,
  verificarVisibilidadePaciente,
  AnotacaoSessaoController.criar
);

/**
 * @swagger
 * /api/anotacao/sessao/{sessaoId}:
 *   get:
 *     summary: Lista anotações clínicas de uma sessão específica
 *     tags: [Anotações Clínicas]
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
 *         description: Lista de anotações da sessão
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 anotacoes:
 *                   - id: "33333333-3333-3333-3333-333333333333"
 *                     terapeuta_id: "44444444-4444-4444-4444-444444444444"
 *                     paciente_id: "22222222-2222-2222-2222-222222222222"
 *                     sessao_id: "11111111-1111-1111-1111-111111111111"
 *                     conteudo: "Excelente foco atencional nos primeiros 10 minutos."
 *                     created_at: "2026-10-15T18:00:00Z"
 *                     updated_at: "2026-10-15T18:00:00Z"
 *                 meta:
 *                   total: 1
 *                   pagina: 1
 *                   limite: 10
 *               message: "Anotações clínicas da sessão listadas com sucesso."
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Sem permissão institucional (RN04)
 *       404:
 *         description: Sessão não encontrada
 */
anotacaoRoutes.get(
  '/sessao/:sessaoId',
  authMiddleware,
  resolverContextoSessao,
  verificarVisibilidadePaciente,
  AnotacaoSessaoController.listarPorSessao
);

/**
 * @swagger
 * /api/anotacao/sessao/{id}:
 *   patch:
 *     summary: Edita o conteúdo de uma anotação de sessão
 *     tags: [Anotações Clínicas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conteudo
 *             properties:
 *               conteudo:
 *                 type: string
 *                 example: "Anotação de sessão atualizada."
 *     responses:
 *       200:
 *         description: Anotação atualizada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 anotacao:
 *                   id: "33333333-3333-3333-3333-333333333333"
 *                   conteudo: "Anotação de sessão atualizada."
 *                   updated_at: "2026-10-15T18:05:00Z"
 *               message: "Anotação clínica da sessão atualizada com sucesso."
 *       400:
 *         description: Conteúdo vazio ou inválido
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Usuário não é o autor
 *       404:
 *         description: Anotação não encontrada
 */
anotacaoRoutes.patch(
  '/sessao/:id',
  authMiddleware,
  resolverContextoSessao,
  verificarVisibilidadePaciente,
  AnotacaoSessaoController.atualizar
);

/**
 * @swagger
 * /api/anotacao/sessao/{id}:
 *   delete:
 *     summary: Exclusão lógica (soft delete) de anotação de sessão
 *     tags: [Anotações Clínicas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Anotação desativada com sucesso (soft delete aplicado)
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 anotacao:
 *                   id: "33333333-3333-3333-3333-333333333333"
 *                   soft_delete: true
 *                   updated_at: "2026-10-15T18:05:00Z"
 *               message: "Anotação clínica da sessão desativada com sucesso (soft delete aplicado)."
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Usuário não é o autor
 *       404:
 *         description: Anotação não encontrada
 */
anotacaoRoutes.delete(
  '/sessao/:id',
  authMiddleware,
  resolverContextoSessao,
  verificarVisibilidadePaciente,
  AnotacaoSessaoController.deletar
);

/**
 * @swagger
 * /api/anotacao/sessao/{id}/hard:
 *   delete:
 *     summary: "[DEV/TESTES] Exclusão física permanente de anotação de sessão"
 *     tags: [Anotações Clínicas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Anotação excluída fisicamente
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Restrito a administradores
 *       404:
 *         description: Anotação não encontrada
 */
anotacaoRoutes.delete(
  '/sessao/:id/hard',
  authMiddleware,
  adminMiddleware,
  resolverContextoSessao,
  verificarVisibilidadePaciente,
  AnotacaoSessaoController.deletarHard
);
