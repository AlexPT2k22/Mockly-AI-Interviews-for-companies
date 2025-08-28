import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { env } from './env.js';
import WebSocket from 'ws';

// Events sent to client:
// { type: 'connected' }
// { type: 'transcript', text, isFinal, confidence, words: [{word,start,end,confidence}] }
// { type: 'marker', phrase, feedback, severity, suggestion }
// { type: 'error', message }
// { type: 'closed' }

export class DeepgramStreamer {
  constructor(clientWs) {
    this.clientWs = clientWs;
    this.live = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnect = 3;
    this.currentTranscript = '';
    this.fillerWords = new Set(['uh','um','like','so','you know','ah','er','hmm']);

    if (!env.DEEPGRAM_API_KEY) {
      this.sendToClient({ type: 'error', message: 'Deepgram not configured' });
      return;
    }
    this.client = createClient(env.DEEPGRAM_API_KEY);
    this.connect();
  }

  connect() {
    try {
      this.live = this.client.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
        uttterance_end_ms: 1000,
        vad_events: true,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1
      });
      this.bindEvents();
    } catch (e) {
      console.error('[DeepgramStreamer] connect error', e);
      this.sendToClient({ type: 'error', message: 'Failed connecting Deepgram' });
    }
  }

  bindEvents() {
    this.live.addListener(LiveTranscriptionEvents.Open, () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.sendToClient({ type: 'connected' });
    });

    this.live.addListener(LiveTranscriptionEvents.Transcript, (data) => {
      try { this.handleTranscript(data); } catch (e) { console.error(e); }
    });

    this.live.addListener(LiveTranscriptionEvents.UtteranceEnd, () => {});

    this.live.addListener(LiveTranscriptionEvents.Error, (err) => {
      console.error('[DeepgramStreamer] error', err);
      this.sendToClient({ type: 'error', message: err?.message || 'transcription error' });
    });

    this.live.addListener(LiveTranscriptionEvents.Close, () => {
      this.isConnected = false;
      this.sendToClient({ type: 'closed' });
      if (this.reconnectAttempts < this.maxReconnect) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), 800 * this.reconnectAttempts);
      }
    });
  }

  handleTranscript(payload) {
    const alt = payload?.channel?.alternatives?.[0];
    if (!alt) return;
    const transcript = alt.transcript || '';
    const isFinal = payload.is_final || false;
    const confidence = alt.confidence || 0;
    const words = alt.words || [];
    if (transcript.trim()) {
      this.sendToClient({
        type: 'transcript',
        text: transcript,
        isFinal,
        confidence,
        words: words.map(w => ({ word: w.word, start: w.start, end: w.end, confidence: w.confidence }))
      });
      if (isFinal) {
        this.currentTranscript += ' ' + transcript;
        this.emitMarkers(words);
      }
    }
  }

  emitMarkers(words) {
    const markers = [];
    // filler
    words.forEach(w => {
      if (this.fillerWords.has(w.word.toLowerCase())) {
        markers.push({ phrase: w.word, feedback: 'Filler – pausa breve em vez disso.', severity: 'mild', suggestion: 'Respira e continua.' });
      }
    });
    // pauses
    for (let i=1;i<words.length;i++) {
      const gap = words[i].start - words[i-1].end;
      if (gap > 2.2) {
        markers.push({ phrase: '(pause)', feedback: `Pausa longa ~${gap.toFixed(1)}s – mantém o ritmo.`, severity: 'moderate', suggestion: 'Usa transição curta.' });
      }
    }
    // repetition (recent 25 words)
    const recent = words.slice(-25).map(w=>w.word.toLowerCase());
    const freq = {};
    recent.forEach(w=>{ if (w.length>2 && !this.fillerWords.has(w)) freq[w]=(freq[w]||0)+1; });
    Object.entries(freq).forEach(([w,c]) => {
      if (c>=3) markers.push({ phrase: w, feedback: `Repetiste '${w}' ${c}x – varia a linguagem.`, severity: 'mild', suggestion: 'Usa sinónimo.' });
    });
    // dedupe
    const sent = new Set();
    markers.forEach(m => {
      const key = m.phrase + '|' + m.severity;
      if (sent.has(key)) return;
      sent.add(key);
      this.sendToClient({ type: 'marker', ...m });
    });
  }

  sendToClient(obj) {
    if (this.clientWs.readyState === WebSocket.OPEN) {
      this.clientWs.send(JSON.stringify(obj));
    }
  }

  sendAudio(buf) {
    if (this.isConnected && this.live) {
      try { this.live.send(buf); } catch (e) { console.error('send audio err', e); }
    }
  }

  close() {
    try { this.live?.finish(); } catch (e) {}
  }
}
