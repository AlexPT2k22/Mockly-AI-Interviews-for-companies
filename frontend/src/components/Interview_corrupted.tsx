import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, RefreshCw, ArrowLeft, Bot, Loader2 } from "lucide-react";
import { track } from "../lib/analytics";
import { Link } from "react-router-dom";

// Lightweight placeholder for an interactive interview practice page.
// This can later integrate real AI streaming + recording.

const DEMO_MAX = 3; // demo version limit
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || "https://mocklyalpha.onrender.com";

interface TranscriptEntry {
  q: string;
  a: string;
  confidence: number; // 0-10
  strengths: string[];
  improvements: string[];
}

inte                        <span className="flex-1 text-gray-900 break-words">
                          "{displayText}" {hesitation}
                          {line.note && (
                            <span className="ml-2 text-[10px] italic text-blue-600">
                              Note: {line.note}
                            </span>
                          )}
                        </span>anscriptMarker {
  phrase: string;
  offset: number;
  feedback: string;
  severity: "mild" | "moderate" | "severe";
  suggestion: string;
}

interface TranscriptLine {
  id: string;
  speaker: "Alexandre" | "AI";
  text: string;
  timestamp: number;
  pauses?: number[];
  flagged?: boolean;
  note?: string;
}

const Interview: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  // Removed manual draft (mic only)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [showFeedback, setShowFeedback] = useState<null | {
    entry: TranscriptEntry;
    id: number;
  }>(null);
  const [feedbackCounter, setFeedbackCounter] = useState(0);
  const [showRecap, setShowRecap] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [search, setSearch] = useState("");
  const [lockScroll, setLockScroll] = useState(false);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  
  // Marker analysis state
  const [markers, setMarkers] = useState<TranscriptMarker[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const analyzeAbortRef = useRef<AbortController | null>(null);

  const [questions, setQuestions] = useState<string[]>([]);
  const question = questions[currentIndex] || "Generating question...";

  // ---- Real-time transcript analysis ----
  useEffect(() => {
    if (showRecap) return;
    if (!lines.length) {
      setMarkers([]);
      return;
    }
    
    // Get the full transcript text from all lines
    const fullTranscript = lines
      .filter(line => line.speaker === "Alexandre")
      .map(line => line.text)
      .join(" ");
    
    if (!fullTranscript.trim()) {
      setMarkers([]);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        analyzeAbortRef.current?.abort();
        const ctrl = new AbortController();
        analyzeAbortRef.current = ctrl;
        setAnalyzing(true);
        
        const analysisPrompt = `You are an advanced interview coach AI. Analyze the transcript in real-time and identify areas for improvement, focusing on:
- Fillers and verbal crutches (e.g., 'uh', 'um', 'like', 'so').
- Unnecessary repetitions.
- Vague language (e.g., 'things', 'maybe', 'more or less').

Rules:
- Feedback must be constructive and positive.
- For each occurrence, provide JSON output with:
  - phrase: the detected word or expression.
  - offset: start position in the transcript (0-indexed).
  - feedback: a short, actionable improvement suggestion.
  - severity: 'mild' (yellow), 'moderate' (orange), 'severe' (red).
  - suggestion: an alternative word, phrase, or sentence rephrasing to improve clarity and confidence.

The output must always be valid JSON only, with no extra commentary.

Now analyze the following transcript in real-time:
${fullTranscript}`;

        const res = await fetch(`${API_BASE}/api/ai/analyze-transcript`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: analysisPrompt }),
          signal: ctrl.signal,
        });
        
        if (!res.ok) throw new Error("bad status");
        const json = await res.json();
        if (json && Array.isArray(json.markers)) {
          setMarkers(json.markers);
        }
      } catch (e) {
        if ((e as any).name === "AbortError") return;
        // ignore other errors
      } finally {
        setAnalyzing(false);
      }
    }, 1000); // 1 second debounce
    
    return () => clearTimeout(handle);
  }, [lines, showRecap]);

  // ---- Persistence (load) ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem("interview_state_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.questions)) setQuestions(parsed.questions);
        if (Array.isArray(parsed.transcript)) setTranscript(parsed.transcript);
        if (Array.isArray(parsed.lines)) setLines(parsed.lines);
        if (typeof parsed.currentIndex === "number")
          setCurrentIndex(parsed.currentIndex);
        if (parsed.showRecap) setShowRecap(true);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  // ---- Persistence (save) ----
  useEffect(() => {
    const state = {
      questions,
      transcript,
      lines,
      currentIndex,
      showRecap,
    };
    try {
      localStorage.setItem("interview_state_v1", JSON.stringify(state));
    } catch (_) {
      // ignore
    }
  }, [questions, transcript, lines, currentIndex, showRecap]);

  // ---- AI Question Fetching ----
  const fetchingRef = useRef(false);
  useEffect(() => {
    if (showRecap) return;
    if (currentIndex >= DEMO_MAX) return;
    if (questions[currentIndex]) return; // already have
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const categories = ["behavioral", "technical", "leadership"];
        const category = categories[currentIndex % categories.length];
        const res = await fetch(`${API_BASE}/api/ai/question`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category }),
        });
        if (!res.ok) throw new Error("bad status");
        const json = await res.json();
        const q = json.question || json.q || json?.data?.question;
        if (!cancelled && q) {
          setQuestions((qs) => {
            const clone = [...qs];
            clone[currentIndex] = q;
            return clone;
          });
        }
      } catch (_) {
        if (!cancelled) {
          const fallback =
            [
              "Tell me about a recent project where you had significant impact.",
              "Describe a difficult technical challenge and how you overcame it.", 
              "How do you prioritize tasks when everything seems urgent?",
            ][currentIndex] || "Tell me something you're proud of.";
          setQuestions((qs) => {
            const clone = [...qs];
            clone[currentIndex] = fallback;
            return clone;
          });
        }
      } finally {
        fetchingRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentIndex, questions, showRecap]);

  async function startRecording() {
    setRecordingError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await handleTranscription(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
      track("interview_record_toggle", { recording: true, idx: currentIndex });
    } catch (e: any) {
      setRecordingError("Microphone permission denied or unavailable.");
    }
  }

  function stopRecording() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    track("interview_record_toggle", { recording: false, idx: currentIndex });
  }

  async function handleTranscription(blob: Blob) {
    setIsTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("audio", blob, "answer.webm");
      const res = await fetch(`${API_BASE}/api/ai/transcribe`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      const answerText = (json.text || "").trim();
      commitAnswer(answerText);
    } catch (e) {
      // Fallback commit manual draft if exists
      // ignore if fails
    } finally {
      setIsTranscribing(false);
    }
  }

  function commitAnswer(answer: string) {
    if (!answer) return;
    const confidence = +(6 + Math.random() * 4).toFixed(1);
    const entry: TranscriptEntry = {
      q: question,
      a: answer,
      confidence,
      strengths: ["Boa estrutura (STAR)"],
      improvements: ["Adicionar métricas/quantificação"],
    };
    setTranscript((t) => [...t, entry]);
    const id = feedbackCounter + 1;
    setFeedbackCounter(id);
    setShowFeedback({ entry, id });
    setTimeout(() => {
      setShowFeedback((f) => (f && f.id === id ? null : f));
    }, 6000);
    const nextIndex = currentIndex + 1;
    if (nextIndex >= DEMO_MAX) {
      setTimeout(() => setShowRecap(true), 400);
    } else {
      setCurrentIndex(nextIndex);
    }
    // generate structured lines
    const baseTimestamp = (Date.now() - startTimeRef.current) / 1000;
    const sentenceRegex = /[^.!?\n]+[.!?]?/g;
    const segments = answer.match(sentenceRegex) || [answer];
    let incremental = 0;
    const newLines: TranscriptLine[] = segments
      .map((seg, idx) => {
        const clean = seg.trim();
        if (!clean) return null as any;
        const pauses: number[] = clean.includes("...")
          ? [incremental + 2.5]
          : [];
        const line: TranscriptLine = {
          id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          speaker: "Alexandre",
          text: clean,
          timestamp: baseTimestamp + incremental,
          pauses,
        };
        incremental += Math.max(2, Math.min(8, Math.ceil(clean.length / 45)));
        return line;
      })
      .filter(Boolean);
    setLines((l) => [...l, ...newLines]);
  }

  function toggleRecord() {
    if (showRecap || currentIndex >= DEMO_MAX || !questions[currentIndex])
      return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function reset() {
    setCurrentIndex(0);
    setTranscript([]);
    setIsRecording(false);
    setShowFeedback(null);
    setShowRecap(false);
    setLines([]);
    setQuestions([]);
    track("interview_reset", {});
  }

  const avgConfidence = transcript.length
    ? (
        transcript.reduce((acc, e) => acc + e.confidence, 0) / transcript.length
      ).toFixed(1)
    : null;

  useEffect(() => {
    if (!showFeedback) return;
  }, [showFeedback]);

  function confidenceBadgeColor(score: number) {
    if (score >= 8.5) return "bg-green-100 text-green-700 border-green-200";
    if (score >= 7) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-red-100 text-red-700 border-red-200";
  }

  // Removed draft marker highlighting system for mic-only flow.

  // Marker analysis functions
  function severityClasses(sev: TranscriptMarker["severity"]) {
    switch (sev) {
      case "mild":
        return "bg-yellow-100/70 hover:bg-yellow-100 border-yellow-200 text-yellow-800";
      case "moderate":
        return "bg-orange-100/70 hover:bg-orange-100 border-orange-200 text-orange-800";
      case "severe":
        return "bg-red-100/70 hover:bg-red-100 border-red-200 text-red-800";
      default:
        return "bg-gray-100 border-gray-200";
    }
  }

  function renderHighlighted(text: string) {
    if (!markers.length) return <span>{text}</span>;
    const ordered = [...markers].sort((a, b) => a.offset - b.offset);
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    ordered.forEach((m, idx) => {
      const start = m.offset;
      const end = m.offset + m.phrase.length;
      if (start > cursor) {
        nodes.push(
          <span key={`plain-${idx}-${cursor}`}>
            {text.slice(cursor, start)}
          </span>
        );
      }
      const phraseActual = text.slice(start, end);
      nodes.push(
        <span
          key={`marker-${idx}-${start}`}
          className={`relative inline-block px-0.5 rounded border underline decoration-dotted cursor-help transition-colors ${severityClasses(
            m.severity
          )}`}
          title={`${m.feedback} → Suggestion: ${m.suggestion}`}
        >
          <span>{phraseActual}</span>
        </span>
      );
      cursor = end;
    });
    if (cursor < text.length)
      nodes.push(<span key={`tail-${cursor}`}>{text.slice(cursor)}</span>);
    return (
      <span className="group/hl leading-relaxed break-words">{nodes}</span>
    );
  }

  // filler highlight + utilities
  const FILLERS = ["uh", "um", "like", "so", "hmm", "ah", "you know"];
  const fillerRegex = useRef<RegExp>(
    new RegExp(`\\b(${FILLERS.join("|")})\\b`, "gi")
  );
  function highlightFillers(text: string) {
    const parts: React.ReactNode[] = [];
    let last = 0;
    const r = fillerRegex.current;
    r.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = r.exec(text))) {
      const s = m.index,
        e = s + m[0].length;
      if (s > last) parts.push(<span key={last}>{text.slice(last, s)}</span>);
      parts.push(
        <span
          key={s}
          className="bg-yellow-200/70 text-gray-900 px-0.5 rounded-sm underline decoration-dotted"
          title="Filler"
        >
          {text.slice(s, e)}
        </span>
      );
      last = e;
    }
    if (last < text.length)
      parts.push(<span key={last}>{text.slice(last)}</span>);
    return parts;
  }
  function formatTime(sec: number) {
    const s = Math.max(0, Math.floor(sec));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }
  useEffect(() => {
    if (lockScroll) return;
    const el = transcriptScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, lockScroll]);
  function toggleFlag(id: string) {
    setLines((ls) =>
      ls.map((l) => (l.id === id ? { ...l, flagged: !l.flagged } : l))
    );
  }
  function addNote(id: string) {
    const note = prompt("Add note:");
    if (note)
      setLines((ls) => ls.map((l) => (l.id === id ? { ...l, note } : l)));
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <div className="h-5 w-px bg-gray-200" />
          <h1 className="font-semibold text-lg">Interview Practice</h1>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={reset}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10">
        <div className="space-y-8">
          {/* Dual Rectangles */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative h-60 md:h-72 rounded-2xl border border-gray-200 bg-white shadow-sm flex items-center justify-center overflow-hidden">
              <div className="w-40 h-40 rounded-full border-4 border-white shadow ring-4 ring-gray-900/5 bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">
                You
              </div>
            </div>
            <div className="relative h-60 md:h-72 rounded-2xl border border-gray-200 bg-white shadow-sm flex items-center justify-center overflow-hidden">
              <div className="w-40 h-40 rounded-full border-4 border-white shadow ring-4 ring-gray-900/5 bg-gray-900 flex items-center justify-center text-white">
                <Bot className="w-16 h-16" />
              </div>
            </div>
          </div>

          {/* Active Question & Answer Draft */}
          {!showRecap && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <p className="uppercase tracking-wide text-xs font-medium text-gray-500 mb-3">
                Question {currentIndex + 1} / {DEMO_MAX}{" "}
                <span className="text-gray-400">(Demo)</span>
              </p>
              <h2 className="text-2xl font-semibold leading-snug mb-4">
                {question}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Answer by speaking. Questions are AI-generated. Demo version
                limited to {DEMO_MAX} questions.
              </p>

              {/* Manual input removed */}

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button
                  disabled={
                    isTranscribing || showRecap || currentIndex >= DEMO_MAX
                  }
                  onClick={toggleRecord}
                  className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium shadow-sm transition border disabled:opacity-50 ${
                    isRecording
                      ? "bg-red-600 text-white border-red-600 hover:bg-red-500"
                      : "bg-gray-900 text-white border-gray-900 hover:bg-gray-800"
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-4 h-4" />
                  ) : isTranscribing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}{" "}
                  {isRecording
                    ? "Stop"
                    : isTranscribing
                    ? "Processing"
                    : "Record"}
                </button>
                {/* Removed manual submit */}
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Restart
                </button>
                {currentIndex >= DEMO_MAX && !showRecap && (
                  <span className="text-[11px] text-gray-500 ml-1">
                    Demo limit reached
                  </span>
                )}
              </div>
              {recordingError && (
                <p className="mt-3 text-xs text-red-600">{recordingError}</p>
              )}
              {isTranscribing && (
                <p className="mt-3 text-xs text-gray-500 animate-pulse">
                  Transcribing audio...
                </p>
              )}
            </div>
          )}

          {/* Structured Transcript Viewer */}
          {transcript.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Transcript</h3>
              <div className="mb-3 flex flex-wrap gap-3 items-center text-xs">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="px-2 py-1.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                />
                <label className="flex items-center gap-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={lockScroll}
                    onChange={(e) => setLockScroll(e.target.checked)}
                    className="rounded"
                  />
                  <span>Lock scroll</span>
                </label>
                <span className="text-gray-400">Lines: {lines.length}</span>
                {analyzing && (
                  <span className="text-[10px] text-blue-500 animate-pulse">
                    Analyzing speech patterns...
                  </span>
                )}
              </div>
              <div
                ref={transcriptScrollRef}
                className="h-[160px] md:h-[210px] overflow-auto rounded-lg border border-gray-100 bg-gray-50/50 p-3 font-mono text-[11px] leading-relaxed relative"
              >
                {lines
                  .filter(
                    (l) =>
                      !search ||
                      l.text.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((line) => {
                    const hesitation = line.pauses?.map((p, i) => (
                      <span key={i} className="ml-2 text-[10px] text-gray-500">
                        • (Hesitation at {formatTime(line.timestamp + p)})
                      </span>
                    ));
                    
                    // Get full transcript text up to this point for marker offset calculation
                    const transcriptUpToThis = lines
                      .slice(0, lines.indexOf(line) + 1)
                      .filter(l => l.speaker === "Alexandre")
                      .map(l => l.text)
                      .join(" ");
                    
                    // Apply marker highlighting if this is user speech
                    const displayText = line.speaker === "Alexandre" 
                      ? renderHighlighted(line.text)
                      : highlightFillers(line.text);
                    return (
                      <div
                        key={line.id}
                        className="group flex items-start gap-2 py-1 px-1 rounded hover:bg-white/70 border border-transparent hover:border-gray-200"
                      >
                        <span className="text-gray-500 shrink-0 w-[52px]">
                          [{formatTime(line.timestamp)}]
                        </span>
                        <span className="font-semibold text-gray-700 shrink-0">
                          {line.speaker}:
                        </span>
                        <span className="flex-1 text-gray-900 break-words">
                          “{highlightFillers(line.text)}” {hesitation}
                          {line.note && (
                            <span className="ml-2 text-[10px] italic text-blue-600">
                              Nota: {line.note}
                            </span>
                          )}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition flex gap-1 ml-2">
                          <button
                            title="Play clip"
                            className="px-1.5 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px]"
                          >
                            ▶
                          </button>
                          <button
                            onClick={() => toggleFlag(line.id)}
                            title={line.flagged ? "Desmarcar" : "Marcar"}
                            className={`px-1.5 py-1 rounded ${
                              line.flagged
                                ? "bg-yellow-400 hover:bg-yellow-500"
                                : "bg-gray-200 hover:bg-gray-300"
                            } text-gray-700 text-[10px]`}
                          >
                            ★
                          </button>
                          <button
                            onClick={() => addNote(line.id)}
                            title="Adicionar nota"
                            className="px-1.5 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px]"
                          >
                            ✚
                          </button>
                        </div>
                      </div>
                    );
                  })}
                {lines.length === 0 && (
                  <div className="text-gray-400 italic">
                    Sem linhas ainda — grava ou submete uma resposta.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recap */}
          {showRecap && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Recap da Entrevista</h3>
              <p className="text-sm text-gray-600 mb-4">
                Resumo positivo para orientar o teu próximo treino.
              </p>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                {avgConfidence && (
                  <div
                    className={`text-sm px-3 py-2 rounded-xl border ${confidenceBadgeColor(
                      parseFloat(avgConfidence)
                    )}`}
                  >
                    Média de confiança {avgConfidence} / 10
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  {transcript.length} respostas analisadas
                </div>
              </div>
              <div className="space-y-4 mb-6">
                {transcript.map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 text-xs text-gray-500">Q{i + 1}</div>
                    <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          t.confidence >= 8.5
                            ? "bg-green-500"
                            : t.confidence >= 7
                            ? "bg-yellow-400"
                            : "bg-red-500"
                        }`}
                        style={{ width: `${(t.confidence / 10) * 100}%` }}
                      />
                    </div>
                    <div className="w-12 text-xs text-gray-600 text-right">
                      {t.confidence.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={reset}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition"
                >
                  Refazer agora
                </button>
                <button
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                  className="px-4 py-2.5 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  Ver exemplo ideal
                </button>
              </div>
            </div>
          )}

          <div className="text-center text-xs text-gray-500 pt-4">
            This is a 
          </div>
        </div>
      </main>

      {/* Mini Feedback Toast/Card */}
      {showFeedback && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[min(480px,90%)] z-50">
          <div className="animate-fade-in shadow-lg border border-gray-200 bg-white rounded-2xl p-5 flex flex-col gap-3 relative overflow-hidden">
            <button
              onClick={() => setShowFeedback(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xs"
            >
              ×
            </button>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-1 rounded-full border ${confidenceBadgeColor(
                  showFeedback.entry.confidence
                )}`}
              >
                Confiança {showFeedback.entry.confidence.toFixed(1)} / 10
              </span>
              <span className="text-[10px] uppercase tracking-wide text-gray-400">
                Feedback rápido
              </span>
            </div>
            <ul className="list-disc list-inside text-xs space-y-1 text-gray-700">
              <li>
                <span className="font-medium">Ponto forte:</span>{" "}
                {showFeedback.entry.strengths[0]}
              </li>
              <li>
                <span className="font-medium">Melhorar:</span>{" "}
                {showFeedback.entry.improvements[0]}
              </li>
            </ul>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  setShowFeedback(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
              >
                Ver exemplo ideal
              </button>
              <button
                onClick={() => {
                  setShowFeedback(null);
                  reset();
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                Refazer agora
              </button>
            </div>
            <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top_left,#000,transparent_70%)]" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Interview;
