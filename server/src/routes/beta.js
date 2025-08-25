import express from "express";
import { z } from "zod";
import { upsertBetaFeedback, getBetaFeedbackSummary } from "../lib/supabase.js";

const router = express.Router();

const feedbackSchema = z.object({
  email: z.string().email(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
  context: z.string().max(120).optional(),
});

router.post("/feedback", async (req, res) => {
  try {
    const data = feedbackSchema.parse(req.body);
    const result = await upsertBetaFeedback(data);
    res.json({ success: true, updated: true, mock: !!result.mock });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid data",
          errors: error.errors,
        });
    }
    console.error("[BETA] feedback error", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/summary", async (_req, res) => {
  try {
    const summary = await getBetaFeedbackSummary();
    res.json(summary);
  } catch (error) {
    console.error("[BETA] summary error", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
