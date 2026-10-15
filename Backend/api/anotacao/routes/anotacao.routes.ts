// ==============================================================================
// InTEA: Routes for the Clinical Notes Module (Patient Record and Session)
// ==============================================================================
// Compliance: RF16 (Notes), RF21 (JWT Authorship), RN04 (Institutional Link), RN05 (Soft Delete)
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
// PATIENT GENERAL NOTES ROUTES (/api/anotacao/paciente)
// ==============================================================================

/**
 * @swagger
 * /api/anotacao/paciente:
 *   post:
 *     summary: Records a general clinical note for a patient
 *     description: Creates a new note linked exclusively to the patient (sessao_id = null). Authorship (terapeuta_id) is extracted from the JWT token (RF21). Requires an active institutional link (RN04).
 *     tags: [Clinical Notes]
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
 *                 example: "Patient demonstrated excellent emotional regulation during the session."
 *               terapeuta_id:
 *                 type: string
 *                 format: uuid
 *                 description: (Optional) If provided, must match the authenticated token. Mismatches return 403.
 *     responses:
 *       201:
 *         description: Note created successfully
 *       400:
 *         description: Missing or invalid required fields
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: No institutional link with patient (RN04) or mismatched therapist (anti-spoofing)
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
 *     summary: Lists general clinical notes for a patient
 *     description: Returns the history of general notes for the patient (sessao_id = null), ordered by descending date.
 *     tags: [Clinical Notes]
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
 *         description: Note list returned successfully
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: No institutional permission (RN04)
 *       404:
 *         description: Patient not found
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
 *     summary: "[DEV/TESTS] Permanent hard delete of a patient note"
 *     tags: [Clinical Notes]
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
 *         description: Hard deleted successfully
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Restricted to administrators
 *       404:
 *         description: Note not found
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
 *     summary: Edits the content of a patient clinical note
 *     description: Allows changing only the note text. Restricted to the therapist who authored the note.
 *     tags: [Clinical Notes]
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
 *         description: Note updated successfully
 *       400:
 *         description: Empty or invalid content
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: User is not the note author
 *       404:
 *         description: Note not found in this scope
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
 *     summary: Logical deletion (soft delete) of a patient note
 *     description: Sets soft_delete = true, preserving the immutability of the clinical history (RN05). Restricted to the note author.
 *     tags: [Clinical Notes]
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
 *         description: Note deactivated successfully
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: User is not the note author
 *       404:
 *         description: Note not found in this scope
 */
anotacaoRoutes.delete(
  '/paciente/:id',
  authMiddleware,
  resolverContextoPaciente,
  verificarVisibilidadePaciente,
  AnotacaoPacienteController.deletar
);

// ==============================================================================
// SESSION-LINKED NOTES ROUTES (/api/anotacao/sessao)
// ==============================================================================

/**
 * @swagger
 * /api/anotacao/sessao:
 *   post:
 *     summary: Records a clinical note associated with a session
 *     description: Links the note to the session and the corresponding patient. A cancelled session returns 400. Authorship via JWT (RF21).
 *     tags: [Clinical Notes]
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
 *         description: Session note created successfully
 *       400:
 *         description: Cancelled session, free mode, or invalid data
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: No institutional permission (RN04) or mismatched therapist
 *       404:
 *         description: Session not found
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
 *     summary: Lists clinical notes linked to a specific session
 *     tags: [Clinical Notes]
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
 *         description: Session notes list
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: No institutional permission (RN04)
 *       404:
 *         description: Session not found
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
 *     summary: "[DEV/TESTS] Permanent hard delete of a session note"
 *     tags: [Clinical Notes]
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
 *         description: Hard deleted successfully
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Restricted to administrators
 *       404:
 *         description: Note not found
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
 *     summary: Edits the content of a session clinical note
 *     description: Allows changing only the note text. Restricted to the therapist who authored the note.
 *     tags: [Clinical Notes]
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
 *         description: Note updated successfully
 *       400:
 *         description: Empty or invalid content
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: User is not the note author
 *       404:
 *         description: Note not found in this scope
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
 *     summary: Logical deletion (soft delete) of a session note
 *     description: Sets soft_delete = true, preserving clinical immutability (RN05). Restricted to the note author.
 *     tags: [Clinical Notes]
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
 *         description: Note deactivated successfully
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: User is not the note author
 *       404:
 *         description: Note not found in this scope
 */
anotacaoRoutes.delete(
  '/sessao/:id',
  authMiddleware,
  resolverContextoSessao,
  verificarVisibilidadePaciente,
  AnotacaoSessaoController.deletar
);
