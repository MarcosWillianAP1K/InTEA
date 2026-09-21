import { Router } from 'express';
import { JogoController } from '../controllers/jogo.controller.js';

export const jogosRoutes = Router();

// Endpoints do Catálogo de Jogos (RF09)
jogosRoutes.get('/', JogoController.listar);
jogosRoutes.post('/validar-manifesto', JogoController.validarManifesto);
jogosRoutes.get('/:id', JogoController.buscarPorId);
jogosRoutes.get('/:id/manifesto', JogoController.obterManifesto);
jogosRoutes.post('/:id/validar-telemetria', JogoController.validarTelemetria);
