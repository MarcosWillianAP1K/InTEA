import { Router } from 'express';
import { exemploRoutes } from './exemplo/routes/exemplo.routes.js';
import { pacienteRoutes } from './paciente/routes/paciente.routes.js';

export const apiRouter = Router();

// Registra rotas das features da API
apiRouter.use('/exemplo', exemploRoutes);
apiRouter.use('/paciente', pacienteRoutes);
