import "dotenv/config";
import { createServer } from "node:http";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";
import { isSupabaseConfigured, supabase } from "./config/supabase.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_request, response) => {
  return response.status(200).send("Server is running");
});

app.get("/health/supabase", async (_request, response) => {
  if (!isSupabaseConfigured) {
    return response.status(503).json({
      status: "error",
      message: "Supabase environment variables are not configured",
    });
  }

  const { error } = await supabase
    .from("jogos")
    .select("id_jogo", { head: true, count: "exact" })
    .limit(1);

  if (error) {
    return response.status(500).json({
      status: "error",
      message: "Unable to connect to Supabase",
      details: error.message,
    });
  }

  return response.status(200).json({ status: "ok" });
});

const httpServer = createServer(app);

new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

httpServer.listen(3000, () => {
  console.log("Server is running on port 3000");
});
