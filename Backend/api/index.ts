import { Router } from 'express';
import { exemploRoutes } from './exemplo/routes/exemplo.routes.js';

export const apiRouter = Router();

// Registra rotas das features da API
apiRouter.use('/exemplo', exemploRoutes);
