import { Router } from 'express';
import { JogoController } from '../controllers/jogo.controller.js';

export const jogosRoutes = Router();

// Endpoints do Catálogo de Jogos (RF09)
jogosRoutes.get('/', JogoController.listar);
jogosRoutes.get('/:id', JogoController.buscarPorId);
