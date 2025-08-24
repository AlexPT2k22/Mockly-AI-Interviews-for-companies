import OpenAI from "openai";
import { env, isMockMode } from "./env.js";

export const openai = !isMockMode
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

export async function generateQuestion(category) {
  if (isMockMode) {
    return `Mock question for ${category}: Describe a challenging scenario you handled.`;
  }
  const prompt = `Generate one interview question (concise) for category: ${category}.`;
  const resp = await openai.chat.completions.create({
    model: env.AI_MODEL_QA,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 120,
  });
  return (
    (resp.choices[0].message?.content || "").trim() ||
    "Describe a recent technical challenge you solved."
  );
}

export async function analyzeAnswer(answer) {
  if (isMockMode) {
    const len = answer.length;
    const base = Math.min(90, 40 + (len % 50));
    return {
      scores: {
        clarity: base,
        depth: base - 5,
        structure: base - 3,
        relevance: base - 2,
      },
      feedback: [
        "Mock feedback: add more concrete metrics.",
        "Mock feedback: tighten structure in the middle.",
        "Mock feedback: highlight impact earlier.",
      ],
    };
  }
  const prompt = `Assess this interview answer. Provide JSON with keys: scores{clarity,depth,structure,relevance 0-100}, feedback array of 3 concise improvement tips. Answer: "${answer.replace(
    /"/g,
    '"'
  )}"`;
  const resp = await openai.chat.completions.create({
    model: env.AI_MODEL_QA,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 300,
  });
  const raw = resp.choices[0].message?.content || "";
  try {
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    return JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
  } catch (e) {
    return {
      scores: { clarity: 70, depth: 65, structure: 68, relevance: 72 },
      feedback: [
        "Provide more detail.",
        "Clarify main point earlier.",
        "Improve logical flow.",
      ],
    };
  }
}

export async function transcribeAudio(buffer, mimetype) {
  if (isMockMode) {
    return { text: "Mock transcription of provided audio sample." };
  }
  // TODO: Implement real transcription call
  return { text: "Transcription (not implemented)." };
}

export async function synthesizeSpeech(text) {
  if (isMockMode) {
    const silentWav = Buffer.from(
      "UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAABAAAAACAAAASGFuZ2ZpcmU=",
      "base64"
    );
    return { audioBase64: silentWav.toString("base64"), mime: "audio/wav" };
  }
  // TODO: Implement real TTS
  return {
    audioBase64: "",
    mime: "audio/mpeg",
    note: "TTS not fully implemented yet.",
  };
}
