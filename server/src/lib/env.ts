import 'dotenv/config';

function req(name: string, fallback?: string) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback ?? '';
  return v;
}

export const env = {
  PORT: parseInt(req('PORT', '8787'), 10),
  OPENAI_API_KEY: req('OPENAI_API_KEY'),
  AI_MODEL_QA: req('AI_MODEL_QA', 'gpt-4o-mini'),
  AI_MODEL_TTS: req('AI_MODEL_TTS', 'gpt-4o-mini-tts'),
  ALLOWED_ORIGIN: req('ALLOWED_ORIGIN', 'http://localhost:5173'),
  MAX_AUDIO_BYTES: parseInt(req('MAX_AUDIO_BYTES', '5000000'), 10)
};

export const isMockMode = !env.OPENAI_API_KEY;
