import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../../../core/middlewares/auth.middleware.js';
import { loginRateLimiter } from '../../../core/middlewares/rate-limit.middleware.js';

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
 *         description: Login realizado com sucesso (retorna tokens de autenticação sob data.token)
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 token:
 *                   access_token: "eyJhbGciOiJFUzI1NiIs..."
 *                   refresh_token: "v1.bW9ja19yZWZyZXNo..."
 *                   token_type: "Bearer"
 *                   expires_in: 3600
 *               message: "Login realizado com sucesso."
 *       400:
 *         description: E-mail ou senha não informados
 *         content:
 *           application/json:
 *             example:
 *               error: "Os campos 'email' e 'password' são obrigatórios."
 *       401:
 *         description: Credenciais incorretas
 *         content:
 *           application/json:
 *             example:
 *               error: "Credenciais inválidas. Verifique seu e-mail e senha."
 *       403:
 *         description: Conta inativada
 *         content:
 *           application/json:
 *             example:
 *               error: "Esta conta de terapeuta encontra-se inativada. Contate o administrador."
 */
authRoutes.post('/login', loginRateLimiter, AuthController.login);

/**
 * @swagger
 * /api/auth/recuperar-senha:
 *   post:
 *     summary: "[EXEMPLO] Solicita recuperação de senha por e-mail (simulado)"
 *     description: "Endpoint ilustrativo para integração com serviço de e-mail."
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             email: "terapeuta@intea.com.br"
 *     responses:
 *       200:
 *         description: Confirmação da solicitação de recuperação de senha
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 recuperacao:
 *                   email: "terapeuta@intea.com.br"
 *                   solicitado: true
 *               message: "[EXEMPLO] Solicitação recebida para o e-mail: terapeuta@intea.com.br. O envio de e-mails será ativado futuramente."
 *       400:
 *         description: E-mail não informado
 *         content:
 *           application/json:
 *             example:
 *               error: "O campo \"email\" é obrigatório."
 *       500:
 *         description: Erro interno do servidor
 */
authRoutes.post('/recuperar-senha', AuthController.recuperarSenha);

/**
 * @swagger
 * /api/auth/redefinir-senha:
 *   post:
 *     summary: Redefine a senha de acesso utilizando token efêmero de recuperação (RF01, RNF03)
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             token: "token-efemero-magic-link-123"
 *             novaSenha: "novaSenhaSegura123"
 *     responses:
 *       200:
 *         description: Senha redefinida com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data: null
 *               message: "Senha de acesso redefinida com sucesso."
 *       400:
 *         description: Token não informado ou senha menor que 6 caracteres
 *       410:
 *         description: Token expirado ou inválido (TTL de 30 minutos)
 *       500:
 *         description: Erro interno ao redefinir credenciais
 */
authRoutes.post('/redefinir-senha', AuthController.redefinirSenha);

/**
 * @swagger
 * /api/auth/alterar-senha:
 *   patch:
 *     summary: Atualiza a senha de acesso do usuário autenticado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             novaSenha: "novaSenhaSegura123"
 *     responses:
 *       200:
 *         description: Senha de acesso atualizada com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data: null
 *               message: "Senha de acesso atualizada com sucesso."
 *       400:
 *         description: Senha com menos de 6 caracteres
 *       401:
 *         description: Usuário não autenticado
 *       500:
 *         description: Erro interno ao alterar senha
 */
authRoutes.patch('/alterar-senha', authMiddleware, AuthController.alterarSenha);

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
 *         description: Dados do perfil e metadados categorizados sob data.user
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 user:
 *                   id: "3fa85f64-5717-4562-b3fc-2c963f66afa6"
 *                   nome: "Dra. Mariana Costa"
 *                   email: "mariana.costa@intea.com.br"
 *                   telefone: "(11) 98765-4321"
 *                   registro_profissional: "CREFITO-3/12345-TO"
 *                   especialidade: "Terapia Ocupacional e Integração Sensorial"
 *                   crefito: "CREFITO-3/12345-TO"
 *                   tempo_experiencia_anos: 5
 *                   clinica_id: null
 *                   areas_foco: []
 *                   is_admin: false
 *                   role: "terapeuta"
 *                   status_ativo: true
 *                   autenticado: true
 *                   email_confirmado: true
 *                   telefone_confirmado: false
 *                   last_sign_in_at: "2026-10-15T17:33:30.829Z"
 *                   created_at: "2026-09-27T21:41:27.762Z"
 *                   updated_at: "2026-09-27T21:41:27.762Z"
 *               message: "Dados do perfil do usuário autenticado recuperados com sucesso."
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       404:
 *         description: Perfil de terapeuta associado ao token não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
authRoutes.get('/me', authMiddleware, AuthController.me);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Renova access token JWT utilizando refresh_token
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             refresh_token: "v1.bW9ja19yZWZyZXNo..."
 *     responses:
 *       200:
 *         description: Token renovado com sucesso sob data.token
 *         content:
 *           application/json:
 *             example:
 *               data:
 *                 token:
 *                   access_token: "eyJhbGciOiJFUzI1NiIs..."
 *                   refresh_token: "v1.bW9ja19yZWZyZXNo..."
 *                   token_type: "Bearer"
 *                   expires_in: 3600
 *               message: "Token renovado com sucesso."
 *       400:
 *         description: refresh_token não informado
 *       401:
 *         description: Token inválido ou expirado
 */
authRoutes.post('/refresh', AuthController.refresh);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Encerra a sessão ativa do usuário
 *     tags: [Autenticação]
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *         content:
 *           application/json:
 *             example:
 *               data: null
 *               message: "Logout realizado com sucesso."
 */
authRoutes.post('/logout', AuthController.logout);

// ------------------------------------------------------------------------------
// Gestão de Sessões Ativas e Logout Remoto (RF02)
// ------------------------------------------------------------------------------
authRoutes.get('/sessoes', authMiddleware, AuthController.listarSessoes);
authRoutes.post('/logout-all', authMiddleware, AuthController.logoutAll);
authRoutes.delete('/sessoes/:id', authMiddleware, AuthController.revogarSessao);

