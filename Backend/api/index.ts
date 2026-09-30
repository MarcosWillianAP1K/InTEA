import { Router } from 'express';
import { authRoutes } from './auth/routes/auth.routes.js';
import { exemploRoutes } from './exemplo/routes/exemplo.routes.js';
<<<<<<< HEAD
<<<<<<< HEAD
import { jogosRoutes } from './jogos/routes/jogo.routes.js';
=======
<<<<<<< HEAD
>>>>>>> 344a4d4 (feat: implement games catalog feature with server setup, MVC architecture, and unit tests)
=======
>>>>>>> 6296a4521e302191b50e8b217744faf91969530f
import { pacienteRoutes } from './paciente/routes/paciente.routes.js';
import { terapeutaRoutes } from './terapeuta/routes/terapeuta.routes.js';
=======
import { jogosRoutes } from './jogos/routes/jogo.routes.js';
>>>>>>> 6870a2a (feat: implement games catalog feature with server setup, MVC architecture, and unit tests)

export const apiRouter = Router();

// Registra rotas das features da API
apiRouter.use('/auth', authRoutes);
apiRouter.use('/paciente', pacienteRoutes);
apiRouter.use('/terapeuta', terapeutaRoutes);
apiRouter.use('/exemplo', exemploRoutes);
apiRouter.use('/jogos', jogosRoutes);
