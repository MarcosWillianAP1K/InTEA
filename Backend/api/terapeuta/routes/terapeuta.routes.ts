import { Router } from 'express';
import { TerapeutaController } from '../controllers/terapeuta.controller.js';
import { authMiddleware } from '../../../core/middlewares/auth.middleware.js';
import { adminMiddleware } from '../../../core/middlewares/admin.middleware.js';
import { meMiddleware } from '../../../core/middlewares/me.middleware.js';

// ==============================================================================
// ROTAS: /api/terapeuta
// Conformidade: RF04 (Perfil), RF21 (Autoria), RN04 (Vínculo), RN05 (Soft Delete)
// Envelope Pattern: { data: { <categoria>: ... }, message: "..." }
// ==============================================================================

export const terapeutaRoutes = Router();

// ------------------------------------------------------------------------------
// 1. Consultas (Leitura)
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/terapeuta:
 *   get:
 *     summary: Lista terapeutas ativos (escopo de clínica para usuários comuns ou todos para SuperAdmin)
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: incluirInativos
 *         schema:
 *           type: boolean
 *         description: Se true, inclui terapeutas inativados (soft delete)
 *     responses:
 *       200:
 *         description: Lista de terapeutas retornada com sucesso no padrão envelope categorizado
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 terapeutas:
 *                   - id: "a9849163-613f-4492-90cf-89985902d16e"
 *                     nome: "Dra. Mariana Costa"
 *                     email: "mariana.costa@intea.com.br"
 *                     telefone: "+55 (11) 98765-4321"
 *                     registro_profissional: "CREFITO-3/12345-TO"
 *                     crefito: "CREFITO-3/12345-TO"
 *                     especialidade: "Terapia Ocupacional e Integração Sensorial"
 *                     tempo_experiencia_anos: 5
 *                     status_ativo: true
 *                     clinica_id: null
 *                     areas_foco: []
 *                     created_at: "2026-09-27T21:41:27.762Z"
 *                     updated_at: "2026-10-15T17:48:17.033Z"
 *                 meta:
 *                   total: 1
 *                   incluir_inativos: false
 *               message: "Terapeutas listados com sucesso."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao listar terapeutas."
 */
terapeutaRoutes.get('/', authMiddleware, TerapeutaController.listar);

/**
 * @swagger
 * /api/terapeuta/perfil:
 *   get:
 *     summary: Retorna o perfil completo do terapeuta autenticado (terapeuta, clinica e areas_foco)
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil completo do terapeuta retornado com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 terapeuta:
 *                   id: "a9849163-613f-4492-90cf-89985902d16e"
 *                   nome: "Dra. Mariana Costa"
 *                   email: "mariana.costa@intea.com.br"
 *                   telefone: "+55 (11) 98765-4321"
 *                   registro_profissional: "CREFITO-3/12345-TO"
 *                   crefito: "CREFITO-3/12345-TO"
 *                   especialidade: "Terapia Ocupacional e Integração Sensorial"
 *                   tempo_experiencia_anos: 5
 *                   clinica_id: "f28b49b7-7f91-4e78-8384-25010629ec0b"
 *                   is_super_admin: false
 *                   status_ativo: true
 *                   created_at: "2026-09-27T21:41:27.762Z"
 *                   updated_at: "2026-10-15T17:48:17.033Z"
 *                 clinica:
 *                   id: "f28b49b7-7f91-4e78-8384-25010629ec0b"
 *                   nome: "Clínica Integrar"
 *                   cnpj: "12.345.678/0001-90"
 *                 areas_foco:
 *                   - id: "c1a01b22-839e-4e4b-9e48-693db5f00123"
 *                     nome: "Integração Sensorial"
 *                     descricao: "Modulação sensorial"
 *               message: "Perfil do terapeuta recuperado com sucesso."
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Perfil não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.get('/perfil', authMiddleware, TerapeutaController.obterPerfil);

/**
 * @swagger
 * /api/terapeuta/pacientes:
 *   get:
 *     summary: Lista pacientes vinculados ao terapeuta autenticado
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de vínculos retornada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 vinculos:
 *                   - terapeuta_id: "a9849163-613f-4492-90cf-89985902d16e"
 *                     paciente_id: "b1849163-613f-4492-90cf-89985902d888"
 *                     created_at: "2026-10-01T10:00:00.000Z"
 *                     paciente:
 *                       id: "b1849163-613f-4492-90cf-89985902d888"
 *                       nome: "Enzo Gabriel"
 *                 meta:
 *                   total: 1
 *               message: "Pacientes vinculados listados com sucesso."
 */
terapeutaRoutes.get('/pacientes', authMiddleware, TerapeutaController.listarPacientesVinculados);

/**
 * @swagger
 * /api/terapeuta/{id}/pacientes:
 *   get:
 *     summary: Lista pacientes vinculados a um terapeuta específico (RN04)
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do terapeuta
 *     responses:
 *       200:
 *         description: Lista de vínculos de pacientes retornada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 vinculos:
 *                   - terapeuta_id: "a9849163-613f-4492-90cf-89985902d16e"
 *                     paciente_id: "b1849163-613f-4492-90cf-89985902d888"
 *                     created_at: "2026-10-01T10:00:00.000Z"
 *                 meta:
 *                   total: 1
 *               message: "Pacientes vinculados listados com sucesso."
 *       400:
 *         description: UUID inválido
 *       403:
 *         description: Acesso negado (outra clínica - RN04)
 *       404:
 *         description: Terapeuta não encontrado
 */
terapeutaRoutes.get('/:id/pacientes', authMiddleware, TerapeutaController.listarPacientesVinculados);

/**
 * @swagger
 * /api/terapeuta/{id}:
 *   get:
 *     summary: Busca dados de um terapeuta pelo ID (UUID)
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do terapeuta
 *     responses:
 *       200:
 *         description: Terapeuta encontrado
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 terapeuta:
 *                   id: "a9849163-613f-4492-90cf-89985902d16e"
 *                   nome: "Dra. Mariana Costa"
 *                   email: "mariana.costa@intea.com.br"
 *                   telefone: "+55 (11) 98765-4321"
 *                   registro_profissional: "CREFITO-3/12345-TO"
 *                   crefito: "CREFITO-3/12345-TO"
 *                   especialidade: "Terapia Ocupacional e Integração Sensorial"
 *                   tempo_experiencia_anos: 5
 *                   status_ativo: true
 *                   clinica_id: null
 *                   areas_foco: []
 *                   created_at: "2026-09-27T21:41:27.762Z"
 *                   updated_at: "2026-10-15T17:48:17.033Z"
 *               message: "Terapeuta recuperado com sucesso."
 *       400:
 *         description: Identificador UUID inválido ou ausente
 *         content:
 *           application/json:
 *             example:
 *               error: "Identificador de terapeuta inválido: deve ser um UUID válido."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado (o terapeuta pertence a uma instituição clínica diferente - RN04)
 *       404:
 *         description: Terapeuta não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.get('/:id', authMiddleware, TerapeutaController.buscarPorId);

// ------------------------------------------------------------------------------
// 2. Persistência (Criação e Edição)
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/terapeuta:
 *   post:
 *     summary: Cadastra um novo terapeuta e cria conta de login (Exclusivo SuperAdmin)
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nome: "Dra. Mariana Costa"
 *             email: "mariana.costa@intea.com.br"
 *             password: "senhaSegura123"
 *             telefone: "+55 (11) 98765-4321"
 *             crefito: "CREFITO-3/12345-TO"
 *             especialidade: "Terapia Ocupacional e Integração Sensorial"
 *             tempo_experiencia_anos: 5
 *     responses:
 *       201:
 *         description: Terapeuta cadastrado e conta criada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 terapeuta:
 *                   id: "a9849163-613f-4492-90cf-89985902d16e"
 *                   nome: "Dra. Mariana Costa"
 *                   email: "mariana.costa@intea.com.br"
 *                   telefone: "+55 (11) 98765-4321"
 *                   registro_profissional: "CREFITO-3/12345-TO"
 *                   especialidade: "Terapia Ocupacional e Integração Sensorial"
 *                   status_ativo: true
 *               message: "Terapeuta cadastrado e conta de acesso criada com sucesso."
 *       400:
 *         description: Campos obrigatórios ausentes ou senha curta (< 6 caracteres)
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       403:
 *         description: Acesso negado (operação restrita a administradores ativos)
 *       409:
 *         description: E-mail já cadastrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.post('/', authMiddleware, adminMiddleware, TerapeutaController.criar);

/**
 * @swagger
 * /api/terapeuta/{id}:
 *   put:
 *     summary: Atualiza dados cadastrais de um terapeuta (auto-gestão ou SuperAdmin)
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do terapeuta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             nome: "Dra. Mariana Costa Silva"
 *             telefone: "+55 (11) 91111-2222"
 *             especialidade: "Terapia Ocupacional e ABA"
 *             tempo_experiencia_anos: 6
 *     responses:
 *       200:
 *         description: Terapeuta atualizado com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 terapeuta:
 *                   id: "a9849163-613f-4492-90cf-89985902d16e"
 *                   nome: "Dra. Mariana Costa Silva"
 *                   email: "mariana.costa@intea.com.br"
 *                   telefone: "+55 (11) 91111-2222"
 *                   registro_profissional: "CREFITO-3/12345-TO"
 *                   crefito: "CREFITO-3/12345-TO"
 *                   especialidade: "Terapia Ocupacional e ABA"
 *                   tempo_experiencia_anos: 6
 *                   status_ativo: true
 *               message: "Terapeuta atualizado com sucesso."
 *       400:
 *         description: Dados de atualização inválidos
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado (anti-IDOR)
 *       404:
 *         description: Terapeuta não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.put('/:id', authMiddleware, meMiddleware({ allowAdmin: true }), TerapeutaController.atualizar);

/**
 * @swagger
 * /api/terapeuta/{id}:
 *   patch:
 *     summary: Atualiza parcialmente dados cadastrais de um terapeuta (auto-gestão ou SuperAdmin)
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do terapeuta
 *     responses:
 *       200:
 *         description: Terapeuta atualizado com sucesso
 */
terapeutaRoutes.patch('/:id', authMiddleware, meMiddleware({ allowAdmin: true }), TerapeutaController.atualizar);

// ------------------------------------------------------------------------------
// 3. Exclusão e Reativação
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/terapeuta/{id}/hard:
 *   delete:
 *     summary: "[DEV/TESTES] Exclusão física permanente do terapeuta"
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do terapeuta
 *     responses:
 *       204:
 *         description: Terapeuta e credenciais removidos fisicamente sem corpo de retorno
 *       400:
 *         description: Identificador UUID inválido
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado (SuperAdmin obrigatório)
 *       404:
 *         description: Terapeuta não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.delete('/:id/hard', authMiddleware, adminMiddleware, TerapeutaController.deletarHard);

/**
 * @swagger
 * /api/terapeuta/{id}:
 *   delete:
 *     summary: Soft Delete — Inativa o cadastro do terapeuta (auto-inativação ou SuperAdmin - RN05)
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do terapeuta
 *     responses:
 *       200:
 *         description: Terapeuta desativado com sucesso (soft delete)
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 terapeuta:
 *                   id: "a9849163-613f-4492-90cf-89985902d16e"
 *                   nome: "Dra. Mariana Costa"
 *                   status_ativo: false
 *               message: "Terapeuta desativado com sucesso (soft delete aplicado)."
 *       400:
 *         description: Identificador UUID inválido
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado (anti-IDOR)
 *       404:
 *         description: Terapeuta não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.delete('/:id', authMiddleware, meMiddleware({ allowAdmin: true }), TerapeutaController.desativar);

/**
 * @swagger
 * /api/terapeuta/{id}/reativar:
 *   patch:
 *     summary: Reativa o cadastro de um terapeuta (Exclusivo SuperAdmin)
 *     tags: [Terapeuta]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do terapeuta
 *     responses:
 *       200:
 *         description: Terapeuta reativado com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 terapeuta:
 *                   id: "a9849163-613f-4492-90cf-89985902d16e"
 *                   nome: "Dra. Mariana Costa"
 *                   status_ativo: true
 *               message: "Terapeuta reativado com sucesso."
 *       400:
 *         description: Identificador UUID inválido
 *       401:
 *         description: Não autorizado
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Terapeuta não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
terapeutaRoutes.patch('/:id/reativar', authMiddleware, adminMiddleware, TerapeutaController.reativar);
