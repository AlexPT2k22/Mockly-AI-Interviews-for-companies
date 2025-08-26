import OpenAI from 'openai';
import { env, isMockMode } from './env.js';

export const openai = !isMockMode ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

export async function generateQuestion(category: string) {
  if (isMockMode) {
    return `Mock question for ${category}: Describe a challenging scenario you handled.`;
  }
  const prompt = `Generate one interview question (concise) for category: ${category}.`;
  const resp = await openai!.chat.completions.create({
    model: env.AI_MODEL_QA,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 400
  });
  return resp.choices[0].message?.content?.trim() || 'Describe a recent technical challenge you solved.';
}

export async function analyzeAnswer(answer: string) {
  if (isMockMode) {
    const len = answer.length;
    const base = Math.min(90, 40 + (len % 50));
    return {
      scores: {
        clarity: base,
        depth: base - 5,
        structure: base - 3,
        relevance: base - 2
      },
      feedback: [
        'Mock feedback: add more concrete metrics.',
        'Mock feedback: tighten structure in the middle.',
        'Mock feedback: highlight impact earlier.'
      ]
    };
  }
  const prompt = `Assess this interview answer. Provide JSON with keys: scores{clarity,depth,structure,relevance 0-100}, feedback array of 3 concise improvement tips. Answer: "${answer.replace(/"/g, '\"')}"`;
  const resp = await openai!.chat.completions.create({
    model: env.AI_MODEL_QA,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 400
  });
  const raw = resp.choices[0].message?.content || '';
  try {
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    return parsed;
  } catch {
    return {
      scores: { clarity: 70, depth: 65, structure: 68, relevance: 72 },
      feedback: ['Provide more detail.', 'Clarify main point earlier.', 'Improve logical flow.']
    };
  }
}

export async function transcribeAudio(buffer: Buffer, mimetype: string) {
  if (isMockMode) {
    return { text: 'Mock transcription of provided audio sample.' };
  }
  try {
    // Use FormData style upload via SDK fallback
    const blob = new Blob([new Uint8Array(buffer)], { type: mimetype || 'audio/webm' });
    const file: any = new File([blob], 'audio.webm', { type: blob.type });
    const resp: any = await (openai as any).audio.transcriptions.create({
      file,
      model: 'whisper-1',
      temperature: 0,
      response_format: 'json'
    });
    const text = resp.text || resp.data?.text || '';
    return { text: text.trim() };
  } catch (e: any) {
    console.error('Transcription error', e?.response?.data || e?.message || e);
    return { text: '' };
  }
}

export async function synthesizeSpeech(text: string) {
  if (isMockMode) {
    // Return a short silent wav header (minimal) base64
    const silentWav = Buffer.from('UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAABAAAAACAAAASGFuZ2ZpcmU=','base64');
    return { audioBase64: silentWav.toString('base64'), mime: 'audio/wav' };
  }
  // Placeholder TTS (OpenAI TTS model invocation pseudocode)
  return { audioBase64: '', mime: 'audio/mpeg', note: 'TTS not fully implemented yet.' };
}

export interface TranscriptMarker {
  phrase: string;
  offset: number; // 0-based
  feedback: string;
  severity: 'mild' | 'moderate' | 'severe';
  suggestion?: string;
}

export async function analyzeTranscriptChunk(transcript: string): Promise<{ markers: TranscriptMarker[] }> {
  if (isMockMode) {
    const markers: TranscriptMarker[] = [];
    const idx = transcript.toLowerCase().indexOf('challenge');
    if (idx >= 0) {
      markers.push({
        phrase: transcript.slice(idx, idx + 9),
        offset: idx,
        feedback: 'Boa referência a um desafio – adiciona impacto quantificado.',
        severity: 'mild'
      });
    }
    if (transcript.length > 160) {
      markers.push({
        phrase: transcript.slice(0, 15),
        offset: 0,
        feedback: 'Introdução longa – poderias resumir o contexto.',
        severity: 'moderate'
      });
    }
    return { markers };
  }

  const prompt = `You are an advanced interview coach AI. Analyze the transcript in real-time and identify areas for improvement, focusing on:\n- Fillers and verbal crutches (e.g., 'uh', 'um', 'like', 'so').\n- Unnecessary repetitions.\n- Vague language (e.g., 'things', 'maybe', 'more or less').\nRules:\n- Feedback must be constructive and positive.\n- Return ONLY valid JSON: {\"markers\":[{phrase,offset,feedback,severity,suggestion}]}.\n- severity in (mild,moderate,severe).\nTranscript:\n<<<${transcript.replace(/`/g,'`')}>>>`;

  try {
    const resp = await openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Return ONLY strict JSON with markers.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.15,
      max_tokens: 600
    });
    const raw = resp.choices[0].message?.content || '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed.markers)) {
        const cleaned: TranscriptMarker[] = parsed.markers.filter((m: any) =>
          m && typeof m.phrase === 'string' && typeof m.offset === 'number' && typeof m.feedback === 'string' && ['mild','moderate','severe'].includes(m.severity)
        ).slice(0,6).map((m: any) => ({
          phrase: m.phrase.slice(0,30),
          offset: Math.max(0, m.offset),
          feedback: m.feedback.slice(0,120),
            severity: m.severity,
            suggestion: typeof m.suggestion === 'string' ? m.suggestion.slice(0,120) : undefined
        }));
        return { markers: cleaned };
      }
    }
  } catch (e) {
    console.error('analyzeTranscriptChunk TS error', e);
  }
  return { markers: [] };
}
