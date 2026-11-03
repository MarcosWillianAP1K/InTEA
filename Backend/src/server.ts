import http from "node:http";
import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { apiRouter } from "../api/index.js";
import { SessaoGateway } from "../core/websocket/sessao.gateway.js";
import { TelemetriaService } from "../api/telemetria/services/telemetria.service.js";
import { inicializarAuditoriaListeners } from "../api/auditoria/listeners/auditoria.listener.js";
import {
  securityHeadersMiddleware,
  corsMiddleware,
  corsErrorHandler,
  validarOrigemCORS,
  obterOrigensAutorizadas,
} from "../core/middlewares/security-headers.middleware.js";

dotenv.config();

// Inicializa ouvintes assíncronos de eventos de domínio (Auditoria e rastreabilidade forense)
inicializarAuditoriaListeners();

const app = express();
const port = process.env.PORT || 3000;
const httpServer = http.createServer(app);

// Inicialização do WebSocket (Socket.IO) integrado ao servidor HTTP com validação estrita de CORS
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (validarOrigemCORS(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS não autorizado para WebSocket"));
      }
    },
    credentials: true,
  },
});

// Inicializa o Gateway WebSocket de Sessões (/sessao)
SessaoGateway.inicializar(io);

// Conecta o hook assíncrono de persistência contínua de telemetria no PostgreSQL (RF12 / RN01)
SessaoGateway.registrarCallbackTelemetria(async (sessionToken, evento) => {
  try {
    await TelemetriaService.persistirEvento(sessionToken, {
      tipo_evento: evento.tipo_evento,
      dados: evento.dados,
      data_hora: evento.data_hora,
    });
  } catch (erroTelemetria) {
    console.error("[server.ts] Erro assíncrono ao persistir telemetria via WebSocket:", erroTelemetria);
  }
});

// Swagger UI — documentação interativa em /api/docs
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "InTEA API",
      version: "1.0.0",
      description: "Documentação da API REST do InTEA",
    },
    servers: [{ url: `http://localhost:${port}` }],
    tags: [
      { name: "Autenticação", description: "Endpoints de login, sessão e recuperação de senha" },
      { name: "Terapeuta", description: "Gerenciamento cadastral de terapeutas" },
      { name: "Paciente", description: "Gerenciamento clínico de pacientes" },
      { name: "Jogos", description: "Catálogo de jogos terapêuticos, manifestos e telemetria" },
      { name: "Sessão", description: "Gerenciamento de sessões clínicas e pareamento remoto" },
      { name: "Telemetria", description: "Ingestão e consulta de telemetria contínua da sessão" },
      { name: "Auditoria", description: "Trilha de auditoria clínica e conformidade LGPD da sessão" },
      { name: "Anotações Clínicas", description: "Prontuário clínico e anotações vinculadas a pacientes e sessões" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Insira o token JWT gerado no endpoint /api/auth/login",
        },
      },
    },
  },
  apis: import.meta.url.includes("/dist/")
    ? ["./dist/api/**/*.routes.js"]
    : ["./api/**/*.routes.ts"],
});

// Headers de segurança HTTP e bloqueio de clickjacking / CSP / HSTS (RNF03)
app.use(securityHeadersMiddleware);

// Middleware CORS estrito com validação de origens confiáveis
app.use(corsMiddleware);
app.use(express.json());

// Middleware de observabilidade HTTP — registra todas as requisições recebidas no terminal
app.use((req: Request, res: Response, next: NextFunction) => {
  const inicio = Date.now();
  res.on("finish", () => {
    // Evita poluir logs com o healthcheck periódico do Docker na rota raiz "/"
    if (req.originalUrl === "/" && req.method === "GET") return;
    const duracaoMs = Date.now() - inicio;
    console.log(
      `[Backend HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duracaoMs}ms)`
    );
  });
  next();
});

// Rota raiz — health check
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "InTEA API está rodando", status: "online", websocket: "/sessao" });
});

// Swagger UI
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      defaultModelsExpandDepth: -1,
    },
  })
);

// Rotas da API (features MVC)
app.use("/api", apiRouter);

// Tratamento seguro de rejeições de CORS (HTTP 403 Forbidden)
app.use(corsErrorHandler);

httpServer.listen(port, () => {
  console.log(`[Backend] Servidor rodando na porta ${port}`);
  console.log(`[Backend] Swagger: http://localhost:${port}/api/docs`);
  console.log(`[Backend] WebSocket namespace: /sessao`);
  console.log(`[Backend] Origens CORS autorizadas:`, obterOrigensAutorizadas());
});
