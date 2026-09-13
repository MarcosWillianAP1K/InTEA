import { Router } from 'express';
import { ExemploController } from '../controllers/exemplo.controller.js';

// Routes: Define os endpoints e mapeia para os métodos do Controller
export const exemploRoutes = Router();

exemploRoutes.get('/', ExemploController.listar);
exemploRoutes.get('/:id', ExemploController.buscarPorId);
exemploRoutes.post('/', ExemploController.criar);
