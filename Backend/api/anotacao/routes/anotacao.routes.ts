// ==============================================================================
// InTEA: Rotas do Módulo de Anotações Clínicas (Prontuário Paciente e Sessão)
// ==============================================================================
// Conformidade: RF16 (Anotações), RF21 (Autoria JWT), RN04 (Vínculo/Clínica), RN05 (Soft Delete)
// ==============================================================================
import { Router } from 'express';
import { AnotacaoPacienteController } from '../controllers/anotacao-paciente.controller.js';
import { AnotacaoSessaoController } from '../controllers/anotacao-sessao.controller.js';
import { authMiddleware } from '../../../core/middlewares/auth.middleware.js';
import { adminMiddleware } from '../../../core/middlewares/admin.middleware.js';
import { verificarVisibilidadePaciente } from '../../../core/middlewares/visibilidade.middleware.js';
import {
  resolverContextoPaciente,
  resolverContextoSessao,
} from '../middlewares/anotacao-contexto.middleware.js';

export const anotacaoRoutes = Router();

// ==============================================================================
// ROTAS DE ANOTAÇÕES GERAIS DE PACIENTE (/api/anotacao/paciente)
// ==============================================================================

/**
 * @swagger
 * /api/anotacao/paciente:
 *   post:
 *     summary: Registra um parecer/anotação clínica geral para o paciente
 *     description: Cria uma nova anotação vinculada exclusivamente ao paciente (sessao_id = null). A autoria (terapeuta_id) é extraída do token JWT (RF21). Requer vínculo ativo (RN04).
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
 *                 example: "Paciente demonstrou excelente regulação emocional durante o atendimento."
 *               terapeuta_id:
 *                 type: string
 *                 format: uuid
 *                 description: (Opcional) Se informado, deve coincidir com o token autenticado. Divergências retornam 403.
 *     responses:
 *       201:
 *         description: Anotação criada com sucesso
 *       400:
 *         description: Dados obrigatórios ausentes ou inválidos
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem vínculo com o paciente (RN04) ou terapeuta divergente (anti-spoofing)
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
 *     summary: Lista anotações clínicas gerais de um paciente
 *     description: Retorna o histórico de pareceres gerais do paciente (sessao_id = null), ordenados por data decrescente.
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
 *     responses:
 *       200:
 *         description: Lista de anotações retornada com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão institucional (RN04)
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
 *         description: Excluído fisicamente com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Exclusivo para administradores
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

/**
 * @swagger
 * /api/anotacao/paciente/{id}:
 *   patch:
 *     summary: Edita o conteúdo de uma anotação clínica de paciente
 *     description: Permite alterar exclusivamente o texto da anotação. Exclusivo do terapeuta autor da anotação.
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
 *     responses:
 *       200:
 *         description: Anotação atualizada com sucesso
 *       400:
 *         description: Conteúdo vazio ou inválido
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Usuário não é o autor da anotação
 *       404:
 *         description: Anotação não encontrada neste escopo
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
 *     description: Marca soft_delete = true mantendo a inalterabilidade do histórico clínico (RN05). Exclusivo do autor.
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
 *         description: Anotação inativada com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Usuário não é o autor da anotação
 *       404:
 *         description: Anotação não encontrada neste escopo
 */
anotacaoRoutes.delete(
  '/paciente/:id',
  authMiddleware,
  resolverContextoPaciente,
  verificarVisibilidadePaciente,
  AnotacaoPacienteController.deletar
);

// ==============================================================================
// ROTAS DE ANOTAÇÕES VINCULADAS À SESSÃO (/api/anotacao/sessao)
// ==============================================================================

/**
 * @swagger
 * /api/anotacao/sessao:
 *   post:
 *     summary: Registra uma anotação clínica associada a uma sessão
 *     description: Associa a anotação à sessão e ao paciente correspondente. Sessão cancelada retorna 400. Autoria via JWT (RF21).
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
 *               conteudo:
 *                 type: string
 *               terapeuta_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Anotação de sessão criada com sucesso
 *       400:
 *         description: Sessão cancelada, em modo livre ou dados inválidos
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Sem permissão institucional (RN04) ou terapeuta divergente
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
 *     summary: Lista anotações clínicas vinculadas a uma sessão específica
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
 *     responses:
 *       200:
 *         description: Lista de anotações da sessão
 *       401:
 *         description: Não autenticado
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
 *         description: Excluído fisicamente com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Exclusivo para administradores
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

/**
 * @swagger
 * /api/anotacao/sessao/{id}:
 *   patch:
 *     summary: Edita o conteúdo de uma anotação clínica de sessão
 *     description: Permite alterar exclusivamente o texto da anotação. Exclusivo do terapeuta autor.
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
 *     responses:
 *       200:
 *         description: Anotação atualizada com sucesso
 *       400:
 *         description: Conteúdo vazio ou inválido
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Usuário não é o autor da anotação
 *       404:
 *         description: Anotação não encontrada neste escopo
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
 *     description: Marca soft_delete = true mantendo a inalterabilidade clínica (RN05). Exclusivo do autor.
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
 *         description: Anotação inativada com sucesso
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Usuário não é o autor da anotação
 *       404:
 *         description: Anotação não encontrada neste escopo
 */
anotacaoRoutes.delete(
  '/sessao/:id',
  authMiddleware,
  resolverContextoSessao,
  verificarVisibilidadePaciente,
  AnotacaoSessaoController.deletar
);
