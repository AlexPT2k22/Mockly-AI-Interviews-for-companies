import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, RefreshCw, ArrowLeft, Bot, Loader2 } from "lucide-react";
import { track } from "../lib/analytics";
import { Link } from "react-router-dom";

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

interface TranscriptMarker {
  phrase: string;
  offset?: number; // may be absent; no longer relied upon
  feedback: string;
  severity: "mild" | "moderate" | "severe";
  suggestion?: string;
  questionIndex?: number; // which answer this marker belongs to
}

interface TranscriptLine {
  id: string;
  speaker: "User" | "AI";
  text: string;
  timestamp: number;
  questionIndex: number; // Track which question this line belongs to
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
  const [questionLoading, setQuestionLoading] = useState(false); // novo estado
  const question = questions[currentIndex] || "Generating question...";

  // ---- Immediate per-answer analysis helper ----
  async function runAnalysisForAnswer(answer: string, qIdx: number) {
    if (showRecap) return;
    const trimmed = answer.trim();
    if (!trimmed) return;
    try {
      analyzeAbortRef.current?.abort();
      const ctrl = new AbortController();
      analyzeAbortRef.current = ctrl;
      setAnalyzing(true);
      const res = await fetch(`${API_BASE}/api/ai/analyze-transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: trimmed }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error("bad status");
      const json = await res.json();
      if (json && Array.isArray(json.markers)) {
        setMarkers((prev) => {
          const filteredPrev = prev.filter((m) => m.questionIndex !== qIdx);
          const enriched = json.markers.map((m: any) => ({
            ...m,
            questionIndex: qIdx,
          }));
          const combined = [...filteredPrev, ...enriched];
          const seen = new Set<string>();
          return combined.filter((m) => {
            const key = `${m.questionIndex}|${m.phrase.toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        });
      }
    } catch (e) {
      if ((e as any).name === "AbortError") return;
    } finally {
      setAnalyzing(false);
    }
  }

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
        if (Array.isArray(parsed.markers)) setMarkers(parsed.markers);
        if (typeof parsed.currentIndex === "number")
          setCurrentIndex(parsed.currentIndex);
        if (parsed.showRecap) setShowRecap(true);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  // ---- Force initial question load ----
  useEffect(() => {
    // Trigger question fetching on component mount if no question exists
    if (!questions[0] && currentIndex === 0 && !showRecap) {
      // This will trigger the AI Question Fetching effect
      setQuestions([]); // Force re-trigger if empty
    }
  }, []); // Run only once on mount

  // ---- Persistence (save) ----
  useEffect(() => {
    const state = {
      questions,
      transcript,
      lines,
      currentIndex,
      showRecap,
      markers,
    };
    try {
      localStorage.setItem("interview_state_v1", JSON.stringify(state));
    } catch (_) {
      // ignore
    }
  }, [questions, transcript, lines, currentIndex, showRecap, markers]);

  // ---- AI Question Fetching ----
  const fetchingRef = useRef(false);
  useEffect(() => {
    if (showRecap) return;
    if (currentIndex >= DEMO_MAX) return;
    if (questions[currentIndex]) {
      setQuestionLoading(false);
      return; // already have
    }
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    setQuestionLoading(true);
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
      } catch (error) {
        console.warn("Question fetch failed:", error);
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
        setQuestionLoading(false); // para loading
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
      // ignore if fails
    } finally {
      setIsTranscribing(false);
    }
  }

  async function commitAnswer(answer: string) {
    if (!answer) return;
    const thisQuestionIndex = currentIndex; // capture before increment
    // Placeholder while fetching quick feedback
    let entry: TranscriptEntry = {
      q: question,
      a: answer,
      confidence: 0,
      strengths: ["…"],
      improvements: ["…"],
    };
    setTranscript((t) => [...t, entry]);
    // Fetch quick feedback
    try {
      const res = await fetch(`${API_BASE}/api/ai/quick-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      if (res.ok) {
        const json = await res.json();
        entry = {
          q: question,
            a: answer,
            confidence: json.confidence ?? 0,
            strengths: json.strengths?.length ? json.strengths : ["Good structure"],
            improvements: json.improvements?.length ? json.improvements : ["Add impact"],
        };
        // Update last transcript entry (just appended)
        setTranscript((t) => {
          const copy = [...t];
          copy[copy.length - 1] = entry;
          return copy;
        });
        const id = feedbackCounter + 1;
        setFeedbackCounter(id);
        setShowFeedback({ entry, id });
        setTimeout(() => {
          setShowFeedback((f) => (f && f.id === id ? null : f));
        }, 6000);
      }
    } catch (_) {
      // ignore quick feedback errors
    }
    // Run analysis immediately for this answer
    runAnalysisForAnswer(answer, thisQuestionIndex);

    const nextIndex = thisQuestionIndex + 1;
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
          speaker: "User",
          text: clean,
          timestamp: baseTimestamp + incremental,
          questionIndex: currentIndex, // Track which question this belongs to
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
    setMarkers([]);
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

  function renderHighlighted(text: string, questionIndex: number) {
    if (!markers.length) return <span>{text}</span>;
    const applicable = markers.filter(
      (m) => m.questionIndex === questionIndex && !!m.phrase
    );
    if (!applicable.length) return <span>{text}</span>;
    const matches: { start: number; end: number; marker: TranscriptMarker }[] =
      [];
    const lower = text.toLowerCase();
    for (const m of applicable) {
      const phraseLower = m.phrase.toLowerCase();
      if (!phraseLower) continue;
      let from = 0;
      while (from < lower.length) {
        const idx = lower.indexOf(phraseLower, from);
        if (idx === -1) break;
        matches.push({ start: idx, end: idx + phraseLower.length, marker: m });
        from = idx + phraseLower.length; // non-overlapping occurrences
      }
    }
    if (!matches.length) return <span>{text}</span>;
    matches.sort((a, b) => a.start - b.start || a.end - b.end);
    const simplified: typeof matches = [];
    let lastEnd = -1;
    for (const m of matches) {
      if (m.start < lastEnd) continue; // skip overlap
      simplified.push(m);
      lastEnd = m.end;
    }
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    simplified.forEach((m) => {
      if (m.start > cursor) {
        nodes.push(
          <span key={`plain-${cursor}`}>{text.slice(cursor, m.start)}</span>
        );
      }
      const phraseActual = text.slice(m.start, m.end);
      nodes.push(
        <span
          key={`m-${m.start}`}
          className={`relative inline-block px-0.5 rounded border underline decoration-dotted cursor-help transition-colors ${severityClasses(
            m.marker.severity
          )}`}
          title={`${m.marker.feedback}${
            m.marker.suggestion ? ` → ${m.marker.suggestion}` : ""
          }`}
        >
          <span>{phraseActual}</span>
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

  // Precompute base offsets for lines of the last answer to map global marker offsets -> per-line
  // (Offsets no longer used; markers are matched by phrase per questionIndex)

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
                {questionLoading ? "Generating question..." : question}
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Answer by speaking. Questions are AI-generated. Demo version
                limited to {DEMO_MAX} questions.
              </p>

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

                    // Apply marker highlighting if this is user speech
                    const displayText =
                      line.speaker === "User"
                        ? renderHighlighted(line.text, line.questionIndex)
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

              {/* Marker Summary */}
              {markers.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-medium text-gray-700 mb-2">
                    Speech Analysis ({markers.length} suggestions)
                  </h4>
                  {/* Historical markers grouped by question */}
                  <div className="mt-4 space-y-3">
                    {Array.from(
                      markers
                        .reduce((map, m) => {
                          const q = m.questionIndex ?? -1;
                          if (!map.has(q)) map.set(q, [] as TranscriptMarker[]);
                          map.get(q)!.push(m);
                          return map;
                        }, new Map<number, TranscriptMarker[]>())
                        .entries()
                    )
                      .sort((a, b) => a[0] - b[0])
                      .map(([qIdx, list]) => (
                        <div
                          key={qIdx}
                          className="border border-gray-100 rounded-lg p-2 bg-gray-50/50"
                        >
                          <div className="text-[10px] font-semibold text-gray-600 mb-1 flex items-center justify-between">
                            <span>
                              Q{qIdx + 1} Markers ({list.length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {list.map((m, i) => (
                              <span
                                key={i}
                                className={`text-[10px] px-2 py-0.5 rounded border ${severityClasses(
                                  m.severity
                                )} cursor-help`}
                                title={`${m.phrase} → ${m.feedback}${
                                  m.suggestion ? ` | ${m.suggestion}` : ""
                                }`}
                              >
                                {m.phrase.length > 18
                                  ? m.phrase.slice(0, 15) + "…"
                                  : m.phrase}
                              </span>
                            ))}
                          </div>
                        </div>
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
                <button
                  onClick={() =>
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }
                  className="px-4 py-2.5 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                >
                  See ideal example
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
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  setShowFeedback(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
              >
                See ideal example
              </button>
              <button
                onClick={() => {
                  setShowFeedback(null);
                  reset();
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                Practice again
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
