import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../../../core/middlewares/auth.middleware.js';

// ==============================================================================
// ROTAS: /api/auth
// ==============================================================================

export const authRoutes = Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Autenticação de usuário (gera token JWT)
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             email: "terapeuta@intea.com.br"
 *             password: "senhaSegura123"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso (retorna tokens de autenticação)
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 access_token: "eyJhbGciOiJFUzI1NiIs..."
 *                 refresh_token: "v1.bW9ja19yZWZyZXNo..."
 *                 token_type: "Bearer"
 *                 expires_in: 3600
 *               message: "Login realizado com sucesso."
 *       400:
 *         description: E-mail ou senha não informados
 *         content:
 *           application/json:
 *             example:
 *               error: "Os campos 'email' e 'password' são obrigatórios."
 *       401:
 *         description: Credenciais incorretas ou conta inativa
 *         content:
 *           application/json:
 *             example:
 *               error: "Credenciais inválidas. Verifique seu e-mail e senha."
 */
authRoutes.post('/login', AuthController.login);

/**
 * @swagger
 * /api/auth/recuperar-senha:
 *   post:
 *     summary: "[EXEMPLO] Solicita recuperação de senha por e-mail (simulado)"
 *     description: "Endpoint mantido como exemplo ilustrativo para integração futura com serviço de e-mail."
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             email: "terapeuta@intea.com.br"
 *     responses:
 *       200:
 *         description: Resposta simulada de exemplo retornada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               message: "[EXEMPLO] Solicitação recebida para o e-mail: terapeuta@intea.com.br. O envio de e-mails será ativado futuramente."
 *               exemplo: true
 *       400:
 *         description: E-mail não informado
 *         content:
 *           application/json:
 *             example:
 *               error: "O campo \"email\" é obrigatório."
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             example:
 *               error: "Erro interno ao processar recuperação de senha."
 */
authRoutes.post('/recuperar-senha', AuthController.recuperarSenha);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Retorna o perfil do usuário logado via token JWT
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do perfil e metadados do usuário logado
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 perfil:
 *                   id: "a9849163-613f-4492-90cf-89985902d16e"
 *                   nome: "Dra. Mariana Costa"
 *                   email: "mariana.costa@intea.com.br"
 *                   telefone: "(11) 98765-4321"
 *                   registro_profissional: "CREFITO-3/12345-TO"
 *                   especialidade: "Terapia Ocupacional e Integração Sensorial"
 *                   crefito: "CREFITO-3/12345-TO"
 *                   tempo_experiencia_anos: 5
 *                   clinica_id: null
 *                   areas_foco: []
 *                 metadados:
 *                   is_admin: false
 *                   autenticado: true
 *                   email_confirmado: true
 *                   telefone_confirmado: false
 *                   status_ativo: true
 *                   last_sign_in_at: "2026-10-15T17:33:30.829Z"
 *                   created_at: "2026-09-27T21:41:27.762Z"
 *                   updated_at: "2026-09-27T21:41:27.762Z"
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       404:
 *         description: Perfil de terapeuta associado ao token não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
authRoutes.get('/me', authMiddleware, AuthController.me);
authRoutes.post('/refresh', AuthController.refresh);
authRoutes.post('/logout', AuthController.logout);
