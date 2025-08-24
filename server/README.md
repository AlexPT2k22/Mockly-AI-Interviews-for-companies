# Mockly Backend (AI / TTS / Transcription)

Endpoints (base: `/api`):

| Method | Path           | Body                    | Description                                   |
| ------ | -------------- | ----------------------- | --------------------------------------------- |
| GET    | /health        | -                       | Health & mock mode flag                       |
| POST   | /ai/question   | `{ category: string }`  | Generate interview question                   |
| POST   | /ai/analyze    | `{ answer: string }`    | Analyze answer (scores + feedback)            |
| POST   | /ai/transcribe | `FormData(audio: file)` | Transcribe audio (Whisper placeholder / mock) |
| POST   | /ai/tts        | `{ text: string }`      | Text-to-speech (placeholder / mock)           |

## Quick Start (JavaScript)

```bash
cd server
cp .env.example .env
# (optional) add OPENAI_API_KEY to enable real mode
npm install
npm run dev
```

Visit: http://localhost:8787/api/health

## Environment Variables

See `.env.example` for defaults.

| Variable        | Purpose                                | Required | Default               |
| --------------- | -------------------------------------- | -------- | --------------------- |
| PORT            | Server port                            | No       | 8787                  |
| ALLOWED_ORIGIN  | CORS allowed origins (comma separated) | No       | http://localhost:5173 |
| OPENAI_API_KEY  | OpenAI key (enables real mode)         | No       | (mock)                |
| AI_MODEL_QA     | Model for Q&A / analysis               | No       | gpt-4o-mini           |
| AI_MODEL_TTS    | Model for TTS                          | No       | gpt-4o-mini-tts       |
| MAX_AUDIO_BYTES | Max upload size bytes                  | No       | 5000000               |

## Mock Mode

If `OPENAI_API_KEY` not provided:

- Question: deterministic placeholder.
- Analyze: pseudo-metrics.
- Transcribe: returns canned text.
- TTS: returns a short silent WAV buffer.

## Future Enhancements

- Streaming SSE analysis
- Real Whisper transcription
- Real OpenAI TTS output
- Auth & rate limiting (API keys per user)

## Frontend Integration (planned)

Example fetch calls (pseudo):

```ts
// Generate question
await fetch("/api/ai/question", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ category: "frontend" }),
}).then((r) => r.json());

// Analyze answer
await fetch("/api/ai/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ answer }),
}).then((r) => r.json());

// Transcribe
const fd = new FormData();
fd.append("audio", file);
await fetch("/api/ai/transcribe", { method: "POST", body: fd }).then((r) =>
  r.json()
);

// TTS
await fetch("/api/ai/tts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text }),
}).then((r) => r.json());
```

## Scripts

- `npm run dev` nodemon (reload on changes)
- `npm start` run server (no transpile step)

## License

Internal / Proprietary (adjust as needed).
