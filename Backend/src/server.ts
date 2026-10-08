import http from "node:http";
import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { apiRouter } from "../api/index.js";
import { SessaoGateway } from "../core/websocket/sessao.gateway.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const httpServer = http.createServer(app);

// Inicialização do WebSocket (Socket.IO) integrado ao servidor HTTP
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  },
});

// Inicializa o Gateway WebSocket de Sessões (/sessao)
SessaoGateway.inicializar(io);

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
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Insira o token JWT gerado no endpoint /api/terapeuta/login",
        },
      },
    },
  },
  apis: [
    "./dist/api/**/*.routes.js",
    "./api/**/*.routes.ts",
  ],
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  })
);
app.use(express.json());

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

httpServer.listen(port, () => {
  console.log(`[Backend] Servidor rodando na porta ${port}`);
  console.log(`[Backend] Swagger: http://localhost:${port}/api/docs`);
  console.log(`[Backend] WebSocket namespace: /sessao`);
  console.log(`[Backend] CORS_ORIGIN: ${process.env.CORS_ORIGIN}`);
});

