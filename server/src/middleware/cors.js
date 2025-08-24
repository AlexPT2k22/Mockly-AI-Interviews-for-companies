import cors from "cors";
import { env } from "../lib/env.js";

export const corsMiddleware = cors({
  origin: env.ALLOWED_ORIGIN.split(",").map((o) => o.trim()),
  credentials: false,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
