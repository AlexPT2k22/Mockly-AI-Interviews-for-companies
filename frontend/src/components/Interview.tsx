import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, RefreshCw, ArrowLeft, Bot, Loader2 } from "lucide-react";
import { track } from "../lib/analytics";
import { Link } from "react-router-dom";

const DEMO_MAX = 3; // demo version limit
const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || "https://landingpagewaitlistinterview.onrender.com";

interface TranscriptEntry {
  q: string;
  a: string;
  confidence: number; // 0-10
  strengths: string[];
  improvements: string[];
  relevanceScore?: number;
  relevanceNote?: string;
}

interface TranscriptMarker {
  phrase: string;
  offset?: number; // no longer required; kept for backward compatibility
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
  // --- Streaming (WebSocket) State ---
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [streamingError, setStreamingError] = useState<string | null>(null);
  const liveAnswerRef = useRef<string>("");
  const interimRef = useRef<string>("");
  const [liveInterim, setLiveInterim] = useState("");
  const streamingMode = useRef<boolean>(false); // toggled off on first failure
  const finalizingRef = useRef(false);

  // Additional core state (restored)
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [search] = useState("");
  const [lockScroll] = useState(false);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const [markers, setMarkers] = useState<TranscriptMarker[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const question = questions[currentIndex] || "Generating question...";
  // --- OpenAI TTS State ---
  const [ttsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioQueueRef = useRef<string[]>([]); // array de textos pendentes
  const playingRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);

  async function fetchTTS(text: string): Promise<Blob | null> {
    try {
      const ctrl = new AbortController();
      ttsAbortRef.current = ctrl;
      const res = await fetch(`${API_BASE}/api/ai/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: ctrl.signal,
      });
      if (!res.ok) return null;
      return await res.blob();
    } catch (_) {
      return null;
    }
  }

  function enqueueSpeak(text: string) {
    if (!ttsEnabled || !text) return;
    audioQueueRef.current.push(text);
    if (!isSpeaking) {
      processQueue();
    }
  }

  async function processQueue() {
    if (isSpeaking) return;
    const next = audioQueueRef.current.shift();
    if (!next) return;
    setIsSpeaking(true);
    const blob = await fetchTTS(next);
    if (!blob) {
      setIsSpeaking(false);
      return processQueue();
    }
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    playingRef.current = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      setIsSpeaking(false);
      processQueue();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      setIsSpeaking(false);
      processQueue();
    };
    audio.play().catch(() => {
      URL.revokeObjectURL(url);
      setIsSpeaking(false);
      processQueue();
    });
  }

  function cancelTTS() {
    audioQueueRef.current = [];
    try {
      ttsAbortRef.current?.abort();
    } catch {}
    if (playingRef.current) {
      playingRef.current.pause();
      playingRef.current.src = "";
    }
    setIsSpeaking(false);
  }

  // removed old speechSynthesis-based speak()

  // Remove continuous debounce analysis; we'll analyze per answer.

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
      markers,
      currentIndex,
      showRecap,
    };
    try {
      localStorage.setItem("interview_state_v1", JSON.stringify(state));
    } catch (_) {
      // ignore
    }
  }, [questions, transcript, lines, markers, currentIndex, showRecap]);

  // ---- AI Question Fetching ----
  const fetchingRef = useRef(false);
  useEffect(() => {
    if (!hasStarted) return; // only fetch after Start
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
          setTimeout(() => enqueueSpeak(q), 150);
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
          setTimeout(() => enqueueSpeak(fallback), 150);
        }
      } finally {
        fetchingRef.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasStarted, currentIndex, questions, showRecap]);

  async function startRecording() {
    setRecordingError(null);
    setStreamingError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];

      // If streaming is enabled, we send chunks directly; else accumulate for batch upload.
      mr.ondataavailable = async (e) => {
        if (e.data.size === 0) return;
        if (streamingMode.current && wsRef.current && wsConnected) {
          try {
            const buf = await e.data.arrayBuffer();
            wsRef.current.send(buf);
          } catch (_) {
            // fallback to batch mode silently
          }
        } else {
          chunksRef.current.push(e.data);
        }
      };
      mr.onstop = async () => {
        try {
          // Allow a brief window for final transcripts if streaming
          if (streamingMode.current && wsRef.current) {
            await new Promise((r) => setTimeout(r, 600));
            finalizeStreamingAnswer();
          } else {
            const blob = new Blob(chunksRef.current, { type: "audio/webm" });
            await handleTranscription(blob);
          }
        } finally {
          stream.getTracks().forEach((t) => t.stop());
        }
      };
      mediaRecorderRef.current = mr;
      // Use small timeslice for near real-time chunking
      mr.start(350);
      if (streamingMode.current) ensureWebSocket();
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
  // Mark we are finalizing to avoid duplicate finalize events
  finalizingRef.current = true;
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
      await commitAnswer(answerText);
    } catch (e) {
      // ignore if fails
    } finally {
      setIsTranscribing(false);
    }
  }

  async function commitAnswer(answer: string) {
    if (!answer) return;
    const initialConfidence = +(6 + Math.random() * 4).toFixed(1);
    const baseEntry: TranscriptEntry = {
      q: question,
      a: answer,
      confidence: initialConfidence,
      strengths: ["Good structure (STAR)"],
      improvements: ["Add metrics/quantification"],
    };
    setTranscript((t) => [...t, baseEntry]);
    const entryIndex = transcript.length;

    // Quick feedback fetch
    try {
      const resp = await fetch(`${API_BASE}/api/ai/quick-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setTranscript((t) => {
          const copy = [...t];
          if (copy[entryIndex]) {
            copy[entryIndex] = {
              ...copy[entryIndex],
              confidence: data.confidence ?? copy[entryIndex].confidence,
              strengths: data.strengths?.length
                ? data.strengths
                : copy[entryIndex].strengths,
              improvements: data.improvements?.length
                ? data.improvements
                : copy[entryIndex].improvements,
            };
          }
          return copy;
        });
        const id = feedbackCounter + 1;
        setFeedbackCounter(id);
        setShowFeedback({
          entry: {
            ...baseEntry,
            confidence: data.confidence ?? baseEntry.confidence,
            strengths: data.strengths?.length
              ? data.strengths
              : baseEntry.strengths,
            improvements: data.improvements?.length
              ? data.improvements
              : baseEntry.improvements,
          },
          id,
        });
        // speak concise feedback
        const strengthsLine = data.strengths?.[0]
          ? `Strength: ${data.strengths[0]}.`
          : "";
        const improveLine = data.improvements?.[0]
          ? `Improve: ${data.improvements[0]}.`
          : "";
        enqueueSpeak(
          `Feedback. Confidence ${
            Math.round((data.confidence ?? baseEntry.confidence) * 10) / 10
          } out of ten. ${strengthsLine} ${improveLine}`
        );
        setTimeout(() => {
          setShowFeedback((f) => (f && f.id === id ? null : f));
        }, 6000);
      }
    } catch (_) {
      // silent
    }

    // Immediate speech pattern analysis for this single answer
    try {
      analyzeAbortRef.current?.abort();
      const ctrl = new AbortController();
      analyzeAbortRef.current = ctrl;
      setAnalyzing(true);
      const res = await fetch(`${API_BASE}/api/ai/analyze-transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: answer }),
        signal: ctrl.signal,
      });
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.markers)) {
          const enriched = json.markers
            .map((m: any) => ({
              phrase: (m.phrase || m.word || "").trim(),
              feedback: m.feedback || m.note || "",
              severity: (m.severity as any) || "mild",
              suggestion: m.suggestion || m.rewrite || "",
            }))
            .filter((m: any) => m.phrase.length > 0);
          setMarkers((prev) => {
            const dedup = new Map<string, TranscriptMarker>();
            [...prev, ...enriched].forEach((m) => {
              const key = m.phrase.toLowerCase() + "|" + m.severity;
              if (!dedup.has(key)) dedup.set(key, m);
            });
            return Array.from(dedup.values());
          });
        }
      }
    } catch (e) {
      if ((e as any).name !== "AbortError") {
        // ignore others
      }
    } finally {
      setAnalyzing(false);
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex >= DEMO_MAX) {
      setTimeout(() => setShowRecap(true), 400);
      // final spoken CTA
      setTimeout(
        () =>
          enqueueSpeak(
            "Demo complete. Please rate your experience and join the waitlist to get early access."
          ),
        800
      );
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

  // --- Streaming Logic ---
  function ensureWebSocket() {
    if (wsRef.current && (wsRef.current.readyState === 0 || wsRef.current.readyState === 1)) return;
    try {
      const base = API_BASE.replace(/\/$/, "");
      const wsUrl = base.replace(/^http/, "ws") + "/ws/transcribe";
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setWsConnected(false);
      ws.onopen = () => {
        setWsConnected(true);
        liveAnswerRef.current = "";
        interimRef.current = "";
        setLiveInterim("");
      };
      ws.onerror = () => {
        if (!wsConnected) {
          streamingMode.current = false; // fallback
          setStreamingError("Streaming unavailable — using batch mode.");
        }
      };
      ws.onclose = () => {
        setWsConnected(false);
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (!msg || typeof msg !== "object") return;
          switch (msg.type) {
            case "connected":
              break;
            case "transcript": {
              const text = msg.text || msg.transcript || msg.data?.text || "";
              const isFinal = msg.is_final || msg.final || msg.data?.is_final;
              if (!text) break;
              if (isFinal) {
                // Commit the final segment
                liveAnswerRef.current = (liveAnswerRef.current + " " + text).trim();
                interimRef.current = "";
                setLiveInterim("");
              } else {
                interimRef.current = text;
                setLiveInterim(text);
              }
              break;
            }
            case "marker": {
              const mk = msg.marker || msg.data || msg;
              if (!mk || !mk.phrase) break;
              setMarkers((prev) => {
                const dedup = new Map<string, TranscriptMarker>();
                [...prev, mk].forEach((m: any) => {
                  const phrase = (m.phrase || m.word || "").trim();
                  if (!phrase) return;
                  const key = phrase.toLowerCase() + "|" + (m.severity || "mild");
                  if (!dedup.has(key)) {
                    dedup.set(key, {
                      phrase,
                      feedback: m.feedback || m.note || "",
                      severity: (m.severity as any) || "mild",
                      suggestion: m.suggestion || m.rewrite || "",
                    });
                  }
                });
                return Array.from(dedup.values());
              });
              break;
            }
            case "error": {
              setStreamingError(msg.error || "Streaming error");
              break;
            }
            default:
              break;
          }
        } catch (_) {
          // ignore parse errors
        }
      };
    } catch (e) {
      streamingMode.current = false;
      setStreamingError("Streaming init failed — fallback to batch.");
    }
  }

  function finalizeStreamingAnswer() {
    if (!streamingMode.current) return;
    if (finalizingRef.current) finalizingRef.current = false;
    // Close ws (we create a new one per answer for simplicity)
    try { wsRef.current?.close(); } catch {}
    const answer = (liveAnswerRef.current + (interimRef.current ? " " + interimRef.current : "")).trim();
    liveAnswerRef.current = "";
    interimRef.current = "";
    setLiveInterim("");
    if (answer) commitAnswer(answer);
  }

  function toggleRecord() {
    if (!hasStarted) return;
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
    setMarkers([]);
    setHasStarted(false);
    cancelTTS();
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
    if (!markers.length || !text) return <span>{text}</span>;
    const lower = text.toLowerCase();
    const rawMatches: {
      start: number;
      end: number;
      marker: TranscriptMarker;
    }[] = [];
    markers.forEach((mk) => {
      const phrase = mk.phrase.trim();
      if (!phrase) return;
      const pLower = phrase.toLowerCase();
      let from = 0;
      while (from < lower.length) {
        const idx = lower.indexOf(pLower, from);
        if (idx === -1) break;
        rawMatches.push({ start: idx, end: idx + pLower.length, marker: mk });
        from = idx + pLower.length;
      }
    });
    if (!rawMatches.length) return <span>{text}</span>;
    rawMatches.sort((a, b) => a.start - b.start || a.end - b.end);
    const matches: typeof rawMatches = [];
    let lastEnd = -1;
    for (const rm of rawMatches) {
      if (rm.start < lastEnd) continue;
      matches.push(rm);
      lastEnd = rm.end;
    }
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    matches.forEach((m, i) => {
      if (m.start > cursor)
        nodes.push(
          <span key={`t-${cursor}`}>{text.slice(cursor, m.start)}</span>
        );
      const frag = text.slice(m.start, m.end);
      nodes.push(
        <span
          key={`m-${m.start}-${i}`}
          className={`relative inline-block px-0.5 rounded border underline decoration-dotted cursor-help transition-colors ${severityClasses(
            m.marker.severity
          )}`}
          title={`${m.marker.feedback}${
            m.marker.suggestion ? " → " + m.marker.suggestion : ""
          }`}
        >
          {frag}
        </span>
      );
      cursor = m.end;
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
              {hasStarted ? (
                <h2 className="text-2xl font-semibold leading-snug mb-4">
                  {question}
                </h2>
              ) : (
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold leading-snug mb-2">
                    Ready to practice?
                  </h2>
                  <p className="text-sm text-gray-500">
                    Click Start to generate your first AI interview question.
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-500 mb-6">
                Answer by speaking. Questions are AI-generated. Demo version
                limited to {DEMO_MAX} questions.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                {!hasStarted && (
                  <button
                    onClick={() => setHasStarted(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium shadow-sm transition border bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500"
                  >
                    Start
                  </button>
                )}

                {hasStarted && questions[currentIndex] && (
                  <button
                    type="button"
                    onClick={() => enqueueSpeak(questions[currentIndex])}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50"
                  >
                    Replay Question
                  </button>
                )}
                <button
                  disabled={
                    !hasStarted ||
                    isTranscribing ||
                    showRecap ||
                    currentIndex >= DEMO_MAX
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
              {isRecording && streamingMode.current && (
                <div className="mt-4 p-3 rounded-lg border border-indigo-100 bg-indigo-50 text-[11px] font-mono text-indigo-700 min-h-[42px]">
                  <span className="block text-[10px] uppercase tracking-wide text-indigo-400 mb-1">Live Transcript</span>
                  {liveInterim || liveAnswerRef.current ? (
                    <span>
                      {(liveAnswerRef.current + (liveInterim ? " " + liveInterim : "")).trim() || <em>Listening...</em>}
                    </span>
                  ) : (
                    <em>Listening...</em>
                  )}
                </div>
              )}
              {recordingError && (
                <p className="mt-3 text-xs text-red-600">{recordingError}</p>
              )}
              {streamingError && (
                <p className="mt-3 text-xs text-orange-600">{streamingError}</p>
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

                    // Apply marker highlighting if this is user speech
                    const displayText =
                      line.speaker === "Alexandre"
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
                          "{displayText}" {hesitation}
                          {line.note && (
                            <span className="ml-2 text-[10px] italic text-blue-600">
                              Note: {line.note}
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
                            title={line.flagged ? "Unflag" : "Flag"}
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
                            title="Add note"
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
                    No lines yet — record or submit an answer.
                  </div>
                )}
              </div>
              <p className="mt-2 text-[10px] text-gray-400">
                Example: [00:24] Alexandre: "In my last project, I implemented
                an API that..." • (Hesitation at 00:29)
              </p>

              {/* Marker Summary */}
              {markers.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">
                    Speech Analysis ({markers.length} suggestions)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {markers.map((m, i) => (
                      <span
                        key={i}
                        className={`text-[10px] px-2 py-1 rounded-full border ${severityClasses(
                          m.severity
                        )} whitespace-nowrap cursor-help`}
                        title={`"${m.phrase}" → ${m.suggestion}`}
                      >
                        {m.severity === "mild"
                          ? "Suggestion"
                          : m.severity === "moderate"
                          ? "Improve"
                          : "Priority"}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recap */}
          {showRecap && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Interview Recap</h3>
              <p className="text-sm text-gray-600 mb-4">
                Positive summary to guide your next practice session.
              </p>
              <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-xs text-indigo-800">
                Demo finished. Rate your experience below and join the waitlist
                for full access, unlimited questions, advanced coaching and
                personalized roadmaps.
              </div>
              <div className="flex flex-wrap items-center gap-4 mb-6">
                {avgConfidence && (
                  <div
                    className={`text-sm px-3 py-2 rounded-xl border ${confidenceBadgeColor(
                      parseFloat(avgConfidence)
                    )}`}
                  >
                    Average confidence {avgConfidence} / 10
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  {transcript.length} answers analyzed
                </div>
              </div>
              <RatingCTA onSpeak={ttsEnabled ? enqueueSpeak : undefined} />
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
                  Practice again
                </button>
              </div>
            </div>
          )}

          <div className="text-center text-xs text-gray-500 pt-4">
            This is an interactive preview. The final version will have dynamic
            adaptation, semantic analysis and structured coaching.
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
                Confidence {showFeedback.entry.confidence.toFixed(1)} / 10
              </span>
              <span className="text-[10px] uppercase tracking-wide text-gray-400">
                Quick feedback
              </span>
            </div>
            <ul className="list-disc list-inside text-xs space-y-1 text-gray-700">
              <li>
                <span className="font-medium">Strength:</span>{" "}
                {showFeedback.entry.strengths[0]}
              </li>
              <li>
                <span className="font-medium">Improve:</span>{" "}
                {showFeedback.entry.improvements[0]}
              </li>
            </ul>
            <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top_left,#000,transparent_70%)]" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Interview;

// Inline rating component for recap CTA
const starsBase = [1, 2, 3, 4, 5];
interface RatingCTAProps {
  onSpeak?: (text: string) => void;
}
const RatingCTA: React.FC<RatingCTAProps> = ({ onSpeak }) => {
  const [rating, setRating] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");
  function submit() {
    setSubmitted(true);
    if (onSpeak) onSpeak("Thank you. Join the waitlist to get early access.");
  }
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm font-medium text-gray-700">
          Rate this demo:
        </span>
        <div className="flex">
          {starsBase.map((s) => (
            <button
              key={s}
              onClick={() => setRating(s)}
              className={`w-7 h-7 text-lg transition ${
                rating && s <= rating
                  ? "text-yellow-500"
                  : "text-gray-300 hover:text-gray-400"
              }`}
              aria-label={`Rate ${s}`}
            >
              ★
            </button>
          ))}
        </div>
        {rating && <span className="text-xs text-gray-500">{rating}/5</span>}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="email"
          placeholder="Email for early access"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
        />
        <button
          disabled={!rating || !email || submitted}
          onClick={submit}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500"
        >
          {submitted ? "Saved" : "Submit & Join Waitlist"}
        </button>
      </div>
      {submitted && (
        <p className="text-xs text-indigo-600 mt-2">
          We will notify you—thanks for the feedback!
        </p>
      )}
    </div>
  );
};
