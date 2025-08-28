import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { env } from "./lib/env.js";
import { corsMiddleware } from "./middleware/cors.js";
import aiRoutes from "./routes/ai.js";
import waitlistRoutes from "./routes/waitlist.js";
import betaRoutes from "./routes/beta.js";
import { errorHandler } from "./middleware/errorHandler.js";

import { DeepgramStreamer } from "./lib/deepgram-stream.js";

const app = express();
const server = createServer(app);
app.use(express.json({ limit: "1mb" }));
app.use(corsMiddleware);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", mock: !env.OPENAI_API_KEY });
});

app.use("/api/ai", aiRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/beta", betaRoutes);
app.use(errorHandler);

// WebSocket for real-time transcription
const wss = new WebSocketServer({ server, path: "/ws/transcribe" });
wss.on("connection", (ws) => {
  console.log("[ws] client connected");
  const streamer = new DeepgramStreamer(ws);

  ws.on("message", (data) => {
    // data may arrive as Buffer or ArrayBuffer
    let buf;
    if (data instanceof Buffer) buf = data;
    else if (data instanceof ArrayBuffer) buf = Buffer.from(data);
    else if (Array.isArray(data)) buf = Buffer.from(data);
    if (buf) streamer.sendAudio(buf);
  });

  ws.on("close", () => {
    streamer.close();
    console.log("[ws] client disconnected");
  });
  ws.on("error", () => streamer.close());
});

server.listen(env.PORT, () => {
  console.log(`[server] listening on :${env.PORT} (mockMode=${!env.OPENAI_API_KEY})`);
  console.log(`[ws] realtime endpoint ws://localhost:${env.PORT}/ws/transcribe`);
});
