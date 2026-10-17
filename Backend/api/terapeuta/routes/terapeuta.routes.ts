import { Router } from 'express';
import { TerapeutaController } from '../controllers/terapeuta.controller.js';
import { authMiddleware } from '../../../core/middlewares/auth.middleware.js';
import { adminMiddleware } from '../../../core/middlewares/admin.middleware.js';
import { meMiddleware } from '../../../core/middlewares/me.middleware.js';

// ==============================================================================
// ROTAS: /api/terapeuta
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
 *         description: Lista de terapeutas retornada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 - id: "a9849163-613f-4492-90cf-89985902d16e"
 *                   nome: "Dra. Mariana Costa"
 *                   email: "mariana.costa@intea.com.br"
 *                   telefone: "(11) 98765-4321"
 *                   registro_profissional: "CREFITO-3/12345-TO"
 *                   crefito: "CREFITO-3/12345-TO"
 *                   especialidade: "Terapia Ocupacional e Integração Sensorial"
 *                   tempo_experiencia_anos: 5
 *                   status_ativo: true
 *                   clinica_id: null
 *                   areas_foco: []
 *                   created_at: "2026-09-27T21:41:27.762Z"
 *                   updated_at: "2026-10-15T17:48:17.033Z"
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
 *               error: "Erro interno ao listar terapeutas"
 */
terapeutaRoutes.get('/', authMiddleware, TerapeutaController.listar);

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
 *                 id: "a9849163-613f-4492-90cf-89985902d16e"
 *                 nome: "Dra. Mariana Costa"
 *                 email: "mariana.costa@intea.com.br"
 *                 telefone: "(11) 98765-4321"
 *                 registro_profissional: "CREFITO-3/12345-TO"
 *                 crefito: "CREFITO-3/12345-TO"
 *                 especialidade: "Terapia Ocupacional e Integração Sensorial"
 *                 tempo_experiencia_anos: 5
 *                 status_ativo: true
 *                 clinica_id: null
 *                 areas_foco: []
 *                 created_at: "2026-09-27T21:41:27.762Z"
 *                 updated_at: "2026-10-15T17:48:17.033Z"
 *       400:
 *         description: Identificador UUID inválido ou ausente
 *         content:
 *           application/json:
 *             example:
 *               error: "ID inválido. Forneça um UUID válido."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado (o terapeuta pertence a uma instituição clínica diferente - RN04)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado: o terapeuta pertence a uma instituição clínica diferente."
 *       404:
 *         description: Terapeuta não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Terapeuta não encontrado"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao buscar terapeuta"
 */
terapeutaRoutes.get('/:id', authMiddleware, TerapeutaController.buscarPorId);

// ------------------------------------------------------------------------------
// 3. Persistência (Criação e Edição)
// ------------------------------------------------------------------------------

/**
 * @swagger
 * /api/terapeuta:
 *   post:
 *     summary: Cadastra um novo terapeuta e cria conta de login
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
 *             telefone: "(11) 98765-4321"
 *             crefito: "CREFITO-3/12345-TO"
 *             especialidade: "Terapia Ocupacional e Integração Sensorial"
 *             tempo_experiencia_anos: 5
 *     responses:
 *       201:
 *         description: Terapeuta cadastrado e conta criada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               message: "Terapeuta criado com sucesso."
 *               data:
 *                 id: "a9849163-613f-4492-90cf-89985902d16e"
 *                 nome: "Dra. Mariana Costa"
 *                 email: "mariana.costa@intea.com.br"
 *                 telefone: "(11) 98765-4321"
 *                 registro_profissional: "CREFITO-3/12345-TO"
 *                 especialidade: "Terapia Ocupacional e Integração Sensorial"
 *                 status_ativo: true
 *       400:
 *         description: Campos obrigatórios ausentes ou senha curta (< 6 caracteres)
 *         content:
 *           application/json:
 *             example:
 *               error: "Os campos 'nome', 'email', 'password' e 'crefito' são obrigatórios."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado (operação restrita a administradores ativos)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado. Perfil de administrador ativo obrigatório."
 *       409:
 *         description: E-mail já cadastrado
 *         content:
 *           application/json:
 *             example:
 *               error: "E-mail já cadastrado no sistema."
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao cadastrar terapeuta"
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
 *             telefone: "(11) 91111-2222"
 *             especialidade: "Terapia Ocupacional e ABA"
 *             tempo_experiencia_anos: 6
 *     responses:
 *       200:
 *         description: Terapeuta atualizado com sucesso
 *         content:
 *           application/json:
 *             example:
 *               message: "Terapeuta atualizado com sucesso."
 *               data:
 *                 id: "a9849163-613f-4492-90cf-89985902d16e"
 *                 nome: "Dra. Mariana Costa Silva"
 *                 email: "mariana.costa@intea.com.br"
 *                 telefone: "(11) 91111-2222"
 *                 registro_profissional: "CREFITO-3/12345-TO"
 *                 crefito: "CREFITO-3/12345-TO"
 *                 especialidade: "Terapia Ocupacional e ABA"
 *                 tempo_experiencia_anos: 6
 *                 status_ativo: true
 *       400:
 *         description: Dados de atualização inválidos
 *         content:
 *           application/json:
 *             example:
 *               error: "ID inválido. Forneça um UUID válido."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado (tentativa de atualizar outro usuário ou alterar campos protegidos sem ser SuperAdmin)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado: você não tem permissão para alterar ou acessar recursos de outro usuário."
 *       404:
 *         description: Terapeuta não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Terapeuta não encontrado"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao atualizar dados do terapeuta"
 */
terapeutaRoutes.put('/:id', authMiddleware, meMiddleware({ allowAdmin: true }), TerapeutaController.atualizar);

// ------------------------------------------------------------------------------
// 4. Exclusão e Reativação
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
 *       200:
 *         description: Terapeuta e credenciais removidos fisicamente
 *         content:
 *           application/json:
 *             example:
 *               message: "Terapeuta e credenciais de acesso excluídos com sucesso (Hard Delete)."
 *       400:
 *         description: Identificador UUID inválido
 *         content:
 *           application/json:
 *             example:
 *               error: "ID inválido. Forneça um UUID válido."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado (operação restrita a administradores ativos)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado. Perfil de administrador ativo obrigatório."
 *       404:
 *         description: Terapeuta não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Terapeuta não encontrado"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao excluir terapeuta permanentemente"
 */
terapeutaRoutes.delete('/:id/hard', authMiddleware, adminMiddleware, TerapeutaController.deletarHard);

/**
 * @swagger
 * /api/terapeuta/{id}:
 *   delete:
 *     summary: Soft Delete — Inativa o cadastro do terapeuta (auto-inativação ou SuperAdmin)
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
 *               message: "Terapeuta desativado com sucesso (Soft Delete)."
 *               data:
 *                 id: "a9849163-613f-4492-90cf-89985902d16e"
 *                 nome: "Dra. Mariana Costa"
 *                 status_ativo: false
 *       400:
 *         description: Identificador UUID inválido
 *         content:
 *           application/json:
 *             example:
 *               error: "ID inválido. Forneça um UUID válido."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado (tentativa de inativar outro usuário sem ser SuperAdmin)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado: você não tem permissão para alterar ou acessar recursos de outro usuário."
 *       404:
 *         description: Terapeuta não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Terapeuta não encontrado"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao desativar terapeuta"
 */
terapeutaRoutes.delete('/:id', authMiddleware, meMiddleware({ allowAdmin: true }), TerapeutaController.desativar);

/**
 * @swagger
 * /api/terapeuta/{id}/reativar:
 *   patch:
 *     summary: Reativa o cadastro de um terapeuta
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
 *               message: "Terapeuta reativado com sucesso."
 *               data:
 *                 id: "a9849163-613f-4492-90cf-89985902d16e"
 *                 nome: "Dra. Mariana Costa"
 *                 status_ativo: true
 *       400:
 *         description: Identificador UUID inválido
 *         content:
 *           application/json:
 *             example:
 *               error: "ID inválido. Forneça um UUID válido."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *         content:
 *           application/json:
 *             example:
 *               error: "Token JWT não fornecido"
 *       403:
 *         description: Acesso negado (operação restrita a administradores ativos)
 *         content:
 *           application/json:
 *             example:
 *               error: "Acesso negado. Perfil de administrador ativo obrigatório."
 *       404:
 *         description: Terapeuta não encontrado
 *         content:
 *           application/json:
 *             example:
 *               error: "Terapeuta não encontrado"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao reativar terapeuta"
 */
terapeutaRoutes.patch('/:id/reativar', authMiddleware, adminMiddleware, TerapeutaController.reativar);
