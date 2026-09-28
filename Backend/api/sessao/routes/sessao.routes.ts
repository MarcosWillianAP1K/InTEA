// ==============================================================================
// InTEA: Rotas da Feature de Sessão e Pareamento Remoto
// ==============================================================================

import { Router } from 'express';
import { SessaoController } from '../controllers/sessao.controller.js';

export const sessaoRoutes = Router();

// Iniciar sessão (Sessão Clínica ou Modo Livre)
sessaoRoutes.post('/', SessaoController.iniciar);

// Buscar sessão por ID interno
sessaoRoutes.get('/:id', SessaoController.buscarPorId);

// Buscar sessão por código/token de pareamento (Jogo Externo)
sessaoRoutes.get('/token/:token', SessaoController.buscarPorToken);

// Finalizar sessão
sessaoRoutes.patch('/:id/finalizar', SessaoController.finalizar);
