import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { apiRouter } from "../api/index.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

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
  res.json({ message: "InTEA API está rodando", status: "online" });
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

app.listen(port, () => {
  console.log(`[Backend] Servidor rodando na porta ${port}`);
  console.log(`[Backend] Swagger: http://localhost:${port}/api/docs`);
  console.log(`[Backend] CORS_ORIGIN: ${process.env.CORS_ORIGIN}`);
  console.log(`REZE PARA FUNCIONAR`);
});
