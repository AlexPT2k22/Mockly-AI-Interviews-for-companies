import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import {
  generateQuestion,
  analyzeAnswer,
  transcribeAudio,
  synthesizeSpeech,
  analyzeTranscriptChunk,
  evaluateRelevance,
  evaluateCoherence,
} from "../lib/openai.js";
import { env } from "../lib/env.js";

const upload = multer({ limits: { fileSize: env.MAX_AUDIO_BYTES } });
const router = Router();

router.post("/question", async (req, res, next) => {
  try {
    const schema = z.object({
      category: z.string().min(2).max(40),
      language: z.enum(["en", "pt"]).optional(),
    });
    const { category, language } = schema.parse(req.body);
    const q = await generateQuestion(category, language || "en");
    res.json({ question: q, language: language || "en" });
  } catch (e) {
    next(e);
  }
});

router.post("/analyze", async (req, res, next) => {
  try {
    const schema = z.object({ answer: z.string().min(10).max(4000) });
    const { answer } = schema.parse(req.body);
    const result = await analyzeAnswer(answer);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post("/analyze-transcript", async (req, res, next) => {
  try {
    const schema = z.object({ transcript: z.string().min(1).max(8000) });
    const { transcript } = schema.parse(req.body);
    const result = await analyzeTranscriptChunk(transcript);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post("/transcribe", upload.single("audio"), async (req, res, next) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "audio file required" });
    const { buffer, mimetype, size } = req.file;
    if (size > env.MAX_AUDIO_BYTES)
      return res.status(413).json({ error: "file too large" });
    const result = await transcribeAudio(buffer, mimetype);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post("/tts", async (req, res, next) => {
  try {
    const schema = z.object({ text: z.string().min(1).max(500) });
    const { text } = schema.parse(req.body);
    const result = await synthesizeSpeech(text);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

export default router;
