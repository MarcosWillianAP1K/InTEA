import { createServer } from "node:http";
import { Server } from "socket.io";
import express from "express";
import cors from "cors";

const server = createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });

  return response.end("Server is running");
});


server.listen(3000, () => {
  console.log("Server is running on port 3000");
});
