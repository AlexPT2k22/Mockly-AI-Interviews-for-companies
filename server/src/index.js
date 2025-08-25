import express from "express";
import { env } from "./lib/env.js";
import { corsMiddleware } from "./middleware/cors.js";
import aiRoutes from "./routes/ai.js";
import waitlistRoutes from "./routes/waitlist.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(corsMiddleware);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", mock: !env.OPENAI_API_KEY });
});

app.use("/api/ai", aiRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(
    `[server] listening on :${env.PORT} (mockMode=${!env.OPENAI_API_KEY})`
  );
});
