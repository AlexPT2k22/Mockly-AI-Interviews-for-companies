import OpenAI from "openai";
import { env, isMockMode } from "./env.js";

export const openai = !isMockMode
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

export async function generateQuestion(category, language = "en") {
  if (isMockMode) {
    if (language === "pt") {
      return `Pergunta fictícia para ${category}: Descreve um cenário desafiante que tenhas gerido.`;
    }
    return `Mock question for ${category}: Describe a challenging scenario you handled.`;
  }

  const localized = {
    en: {
      system:
        "You generate concise, challenging technical interview questions. Only output the question text.",
      template: (cat) =>
        `Generate one challenging technical interview question for the ${cat} category. The question must be specific, practical, and suitable for a mid/senior engineer. Real-world scenario focus. Output only the question.`,
      fallback:
        "Describe a recent technical challenge you solved and how you approached it.",
    },
    pt: {
      system:
        "Gerar perguntas concisas e desafiantes para entrevistas técnicas. Apenas devolve o texto da pergunta.",
      template: (cat) =>
        `Gera uma pergunta técnica desafiadora (apenas a pergunta) para a categoria ${cat}. Deve ser específica, prática e adequada a um engenheiro de nível intermédio/sénior. Foco em cenários reais.`,
      fallback:
        "Descreve um desafio técnico recente que tenhas resolvido e a abordagem utilizada.",
    },
  };

  const pack = localized[language] || localized.en;

  try {
    const prompt = pack.template(category);
    const resp = await openai.chat.completions.create({
      model: env.AI_MODEL_QA,
      messages: [
        { role: "system", content: pack.system },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });
    const question = resp.choices[0].message?.content?.trim();
    return question && question.length > 3 ? question : pack.fallback;
  } catch (error) {
    console.error("OpenAI question generation error:", error);
    return localized[language]?.fallback || localized.en.fallback;
  }
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

  try {
    const prompt = `You are an expert technical interviewer. Analyze this interview answer and provide detailed feedback.

Answer: "${answer.replace(/"/g, '\\"')}"

Please provide your assessment in JSON format with:
1. "scores" object with ratings 0-100 for: clarity, depth, structure, relevance
2. "feedback" array with exactly 3 specific, actionable improvement suggestions as plain strings

Focus on technical accuracy, communication clarity, problem-solving approach, and real-world applicability. Be constructive and specific.

Example format:
{
  "scores": {"clarity": 85, "depth": 70, "structure": 80, "relevance": 90},
  "feedback": ["First improvement suggestion...", "Second improvement suggestion...", "Third improvement suggestion..."]
}`;

    const resp = await openai.chat.completions.create({
      model: env.AI_MODEL_QA,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 550,
    });

    const raw = resp.choices[0].message?.content || "";

    try {
      // Try to extract JSON from the response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // Validate the structure
        if (
          parsed.scores &&
          parsed.feedback &&
          Array.isArray(parsed.feedback)
        ) {
          // Normalize feedback to array of strings
          const normalizedFeedback = parsed.feedback.map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object" && item.suggestion)
              return item.suggestion;
            return String(item);
          });

          return {
            scores: parsed.scores,
            feedback: normalizedFeedback,
          };
        }
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
    }

    // Fallback if parsing fails
    return {
      scores: { clarity: 75, depth: 70, structure: 72, relevance: 74 },
      feedback: [
        "Consider providing more specific examples to support your points.",
        "Structure your response with a clear beginning, middle, and end.",
        "Ensure your answer directly addresses all aspects of the question.",
      ],
    };
  } catch (error) {
    console.error("OpenAI analysis error:", error);
    return {
      scores: { clarity: 70, depth: 65, structure: 68, relevance: 72 },
      feedback: [
        "Unable to analyze due to technical issues. Please try again.",
        "Focus on clear communication and specific examples.",
        "Ensure your answer is well-structured and relevant.",
      ],
    };
  }
}

export async function transcribeAudio(buffer, mimetype) {
  if (isMockMode) {
    return { text: "Mock transcription of provided audio sample." };
  }

  try {
    // Create a File-like object for OpenAI API
    const file = new File([buffer], "audio.webm", { type: mimetype });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
    });

    return { text: transcription.text };
  } catch (error) {
    console.error("OpenAI transcription error:", error);
    return { text: "Transcription failed. Please try again." };
  }
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

export async function analyzeTranscriptChunk(transcript) {
  if (isMockMode) {
    // Simple mock: mark first occurrence of 'challenge' or length-based marker
    const markers = [];
    const idx = transcript.toLowerCase().indexOf("challenge");
    if (idx >= 0) {
      markers.push({
        phrase: transcript.slice(idx, idx + 9),
        offset: idx,
        feedback:
          "Bom uso de palavra-chave técnica, podes quantificar impacto.",
        severity: "mild",
      });
    }
    if (transcript.length > 120) {
      markers.push({
        phrase: transcript.slice(0, 12),
        offset: 0,
        feedback:
          "Introdução longa – considera chegar ao ponto principal mais cedo.",
        severity: "moderate",
      });
    }
    return { markers };
  }

  const prompt = `You receive a partial or full interview answer transcript and must return JSON with an array named markers. Each marker flags an opportunity for constructive, positive micro-feedback. Avoid punitive tone.

Transcript:\n"""${transcript.replace(/`/g, "`")}"""

Rules:
- Up to 6 markers.
- Each marker: phrase (exact substring), offset (0-based index), feedback (<=90 chars, positive coaching), severity in [mild, moderate, severe]. Use severe only for critical clarity issues.
- Focus on structure, clarity, missing metrics, overuse of filler, vague impact.
Return ONLY valid JSON like: {"markers":[{"phrase":"...","offset":10,"feedback":"...","severity":"mild"}]}`;

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a concise constructive interview answer coach returning ONLY JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 400,
    });
    const raw = resp.choices[0].message?.content || "{}";
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed.markers)) {
        // Basic validation
        const cleaned = parsed.markers
          .filter(
            (m) =>
              typeof m.phrase === "string" &&
              typeof m.offset === "number" &&
              typeof m.feedback === "string" &&
              ["mild", "moderate", "severe"].includes(m.severity)
          )
          .slice(0, 6);
        return { markers: cleaned };
      }
    }
  } catch (e) {
    console.error("analyzeTranscriptChunk error", e);
  }
  return { markers: [] };
}
