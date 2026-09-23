import { Router } from 'express';
import { authRoutes } from './auth/routes/auth.routes.js';
import { exemploRoutes } from './exemplo/routes/exemplo.routes.js';
import { pacienteRoutes } from './paciente/routes/paciente.routes.js';
import { terapeutaRoutes } from './terapeuta/routes/terapeuta.routes.js';

export const apiRouter = Router();

// Registra rotas das features da API
apiRouter.use('/auth', authRoutes);
apiRouter.use('/paciente', pacienteRoutes);
apiRouter.use('/terapeuta', terapeutaRoutes);
apiRouter.use('/exemplo', exemploRoutes);
