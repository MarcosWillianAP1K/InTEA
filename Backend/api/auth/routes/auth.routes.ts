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
 *         description: Login realizado com sucesso (retorna access_token JWT)
 *       400:
 *         description: E-mail ou senha não informados
 *       401:
 *         description: Credenciais incorretas ou conta inativa
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
 *       400:
 *         description: E-mail não informado
 *       500:
 *         description: Erro interno do servidor
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
 *         description: Dados da sessão e perfil do usuário logado
 *       401:
 *         description: Não autorizado (token JWT ausente ou inválido)
 *       500:
 *         description: Erro interno do servidor
 */
authRoutes.get('/me', authMiddleware, AuthController.me);
