import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { apiRouter } from "../api/index.js";
import { jogosRoutes } from "../api/jogos/routes/jogo.routes.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rota raiz
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "InTEA API está rodando", status: "online" });
});

// Rotas da API (features MVC)
app.use("/api", apiRouter);
app.use("/jogos", jogosRoutes);

app.listen(port, () => {
  console.log(`[Backend] Servidor rodando na porta ${port}`);
});
