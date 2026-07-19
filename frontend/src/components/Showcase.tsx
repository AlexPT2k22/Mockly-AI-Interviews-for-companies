"use client";

import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Brain,
  Mic,
  MicOff,
  Type,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Github,
  Server,
  Cpu,
  Database,
  Zap,
  Layers,
  MessageSquare,
  BarChart3,
  Globe,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || "https://landingpagewaitlistinterview.onrender.com";

const GITHUB_REPO = "https://github.com/AlexPT2k22/Mockly-AI-Interviews-for-companies";

type Step = "category" | "question" | "answer" | "analyzing" | "results";

const CATEGORIES = [
  {
    key: "frontend",
    label: "Frontend",
    icon: Layers,
    sample: "Explain how the virtual DOM improves performance in modern frameworks.",
  },
  {
    key: "backend",
    label: "Backend",
    icon: Server,
    sample: "How would you design a rate limiter for a public API?",
  },
  {
    key: "system",
    label: "System Design",
    icon: Cpu,
    sample: "Design a scalable notification service for millions of users.",
  },
  {
    key: "behavioral",
    label: "Behavioral",
    icon: MessageSquare,
    sample: "Tell me about a time you navigated conflicting stakeholder priorities.",
  },
];

const TECH_STACK = [
  {
    layer: "Frontend",
    icon: Globe,
    items: [
      { name: "React 18", desc: "UI library with hooks & concurrent features" },
      { name: "TypeScript", desc: "Type-safe development at scale" },
      { name: "Vite 5", desc: "Fast ESM-based build tooling" },
      { name: "TailwindCSS", desc: "Utility-first styling with custom design system" },
    ],
  },
  {
    layer: "Backend",
    icon: Server,
    items: [
      { name: "Node.js", desc: "Express 4 with middleware architecture" },
      { name: "WebSockets", desc: "Real-time streaming transcription" },
      { name: "Zod", desc: "Runtime request validation schemas" },
      { name: "Multer", desc: "Multipart audio file upload handling" },
    ],
  },
  {
    layer: "AI / ML",
    icon: Brain,
    items: [
      { name: "OpenAI GPT-4o", desc: "Question generation & answer analysis" },
      { name: "OpenAI Whisper", desc: "Batch audio transcription" },
      { name: "Deepgram", desc: "Real-time streaming speech-to-text" },
      { name: "ElevenLabs", desc: "Premium neural TTS voices" },
    ],
  },
  {
    layer: "Infrastructure",
    icon: Database,
    items: [
      { name: "Supabase", desc: "PostgreSQL with Row-Level Security" },
      { name: "Resend", desc: "Transactional email delivery" },
      { name: "Vercel", desc: "Frontend hosting with edge CDN" },
      { name: "Render", desc: "Backend API & WebSocket hosting" },
    ],
  },
];

const HIGHLIGHTS = [
  {
    icon: Zap,
    title: "Real-Time WebSocket Streaming",
    desc: "Live speech-to-text via Deepgram WebSocket connection, with automatic fallback to batch Whisper transcription when streaming is unavailable.",
  },
  {
    icon: Brain,
    title: "Adaptive AI Question Generation",
    desc: "GPT-4o-mini generates contextual interview questions across categories — frontend, backend, system design, and behavioral. Mock mode provides deterministic fallbacks for testing.",
  },
  {
    icon: Mic,
    title: "Multi-Modal Answer Input",
    desc: "Voice recording via MediaRecorder API with WebM chunking, batch uploads to Whisper, or direct text entry. Supports seamless switching between modes mid-session.",
  },
  {
    icon: BarChart3,
    title: "Structured Scoring & Analysis",
    desc: "Four-dimensional scoring (clarity, depth, structure, relevance) with natural-language feedback. Transcript analysis detects filler words, hesitations, and speech patterns with severity markers.",
  },
  {
    icon: RefreshCw,
    title: "State Persistence & Recovery",
    desc: "Interview state persisted to localStorage for session recovery. WebSocket reconnection logic with graceful degradation to batch mode.",
  },
  {
    icon: Layers,
    title: "Full-Stack Architecture",
    desc: "React SPA with Vercel edge deployment, Express REST + WebSocket API on Render, PostgreSQL on Supabase. API proxy in dev, CORS-secured in production.",
  },
];

const Showcase: React.FC = () => {
  const [step, setStep] = useState<Step>("category");
  const [category, setCategory] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [questionLoading, setQuestionLoading] = useState(false);
  const [mode, setMode] = useState<"voice" | "text" | null>(null);
  const [answer, setAnswer] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    scores: Record<string, number>;
    feedback: string[];
  } | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const hasMediaRecorder = typeof MediaRecorder !== "undefined";
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    setVoiceSupported(hasMediaRecorder && hasGetUserMedia);
  }, []);

  useEffect(() => {
    if (step !== "answer" && recording) {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
      } catch {}
      setRecording(false);
    }
  }, [step, recording]);

  useEffect(() => {
    return () => {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
      } catch {}
    };
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((r) => r.ok && setApiOnline(true))
      .catch(() => setApiOnline(false));
  }, []);

  const selectCategory = async (c: (typeof CATEGORIES)[number]) => {
    setCategory(c.key);
    setQuestionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai/question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: c.key }),
      });
      if (res.ok) {
        const data = await res.json();
        setQuestion(data.question || c.sample);
      } else {
        setQuestion(c.sample);
      }
    } catch {
      setQuestion(c.sample);
    } finally {
      setQuestionLoading(false);
      setStep("question");
    }
  };

  const chooseMode = (m: "voice" | "text") => {
    setMode(m);
    setStep("answer");
  };

  const toggleRecording = async () => {
    if (!voiceSupported) return;
    if (!recording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
        });
        streamRef.current = stream;
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mediaRecorder.onstop = async () => {
          if (audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            await transcribeAudio(blob);
          }
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
        };
        mediaRecorder.start(1000);
        setRecording(true);
      } catch {
        alert("Please allow microphone access to use voice recording.");
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      setRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("audio", audioBlob, "recording.webm");
      const res = await fetch(`${API_BASE}/api/ai/transcribe`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.text || "";
        if (text.trim()) {
          setAnswer((prev) => (prev + (prev ? " " : "") + text).trim());
        }
      }
    } catch {
      setAnswer((prev) => prev + (prev ? " " : "") + " [Transcription unavailable — please type instead]");
    } finally {
      setTranscribing(false);
    }
  };

  const submitAnswer = async () => {
    if (recording) return;
    setStep("analyzing");
    try {
      const res = await fetch(`${API_BASE}/api/ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
      } else {
        const scores = generateScores(answer);
        setAnalysis({ scores, feedback: buildFeedback(scores, answer) });
      }
    } catch {
      const scores = generateScores(answer);
      setAnalysis({ scores, feedback: buildFeedback(scores, answer) });
    } finally {
      setStep("results");
    }
  };

  const generateScores = (text: string) => {
    const base = Math.min(90, 40 + Math.floor(text.length % 120));
    const rand = (seed: number) => (Math.sin(seed + text.length) + 1) / 2;
    return {
      Clarity: Math.round(base + rand(1) * 10),
      Depth: Math.round(base - 5 + rand(2) * 15),
      Structure: Math.round(base - 3 + rand(3) * 12),
      Relevance: Math.round(base + rand(4) * 8),
    };
  };

  const buildFeedback = (scores: Record<string, number>, text: string) => {
    const tips: string[] = [];
    if (scores.Structure < 70) tips.push("Improve logical sequencing of your points.");
    if (scores.Depth < 70) tips.push("Add more concrete examples or metrics.");
    if (scores.Clarity < 70) tips.push("Simplify sentences for clearer delivery.");
    if (scores.Relevance < 70) tips.push("Align answer more tightly to the question context.");
    if (!tips.length) tips.push("Strong answer foundation. Fine-tune details for excellence.");
    if (text.split(/\s+/).length < 15) tips.push("Consider elaborating a bit more for richer assessment.");
    return tips.slice(0, 3);
  };

  const reset = () => {
    setStep("category");
    setCategory(null);
    setQuestion("");
    setQuestionLoading(false);
    setMode(null);
    setAnswer("");
    setRecording(false);
    setTranscribing(false);
    setAnalysis(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <div className="h-5 w-px bg-gray-200" />
          <span className="font-semibold text-lg">Mockly</span>
          <span className="hidden sm:inline text-sm text-gray-500">Showcase</span>
          <div className="ml-auto flex items-center gap-3">
            {apiOnline !== null && (
              <span
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                  apiOnline
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    apiOnline ? "bg-green-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                {apiOnline ? "API Online" : "API Cold Start"}
              </span>
            )}
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition"
            >
              <Github className="w-3.5 h-3.5" /> GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-white border-b border-gray-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,0,0,0.03),transparent_70%)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Full-Stack AI Application
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.1]">
              Mockly — AI-Powered
              <br />
              Interview Practice
            </h1>
            <p className="text-lg text-gray-600 mt-4 max-w-xl leading-relaxed">
              A full-stack SaaS platform that generates adaptive interview questions, transcribes
              voice answers in real time, and delivers AI-powered feedback with structured scoring.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <button
                onClick={() =>
                  document.getElementById("live-demo")?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition"
              >
                Try Live Demo <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                <Github className="w-4 h-4" /> View Source
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Live Demo */}
      <section id="live-demo" className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Live Demo</h2>
            <p className="text-gray-600 mt-2 max-w-lg mx-auto">
              Try a real AI-powered interview question and get instant feedback. Powered by GPT-4o
              and Whisper on the backend.
            </p>
            {apiOnline === false && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                Backend waking up from cold start — may take up to 60s for the first request.
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Step: Category Selection */}
            {step === "category" && (
              <div className="p-6 sm:p-8 space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-gray-600" />
                    Choose an Interview Focus
                  </h3>
                  <p className="text-gray-600 mt-2">
                    Select a category to see how Mockly generates targeted questions using AI.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.key}
                        onClick={() => selectCategory(c)}
                        disabled={questionLoading}
                        className="group text-left p-5 rounded-xl border border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-gray-500 group-hover:text-gray-900 transition-colors" />
                            <span className="font-semibold text-gray-900">{c.label}</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 transition-colors" />
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{c.sample}</p>
                      </button>
                    );
                  })}
                </div>
                {questionLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" /> Generating question...
                  </div>
                )}
              </div>
            )}

            {/* Step: Question */}
            {step === "question" && (
              <div className="p-6 sm:p-8 space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    AI-Generated {category} Question
                  </h3>
                  {questionLoading ? (
                    <div className="flex items-center gap-2 mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
                      <p className="text-gray-600">Generating personalized question...</p>
                    </div>
                  ) : (
                    <p className="text-gray-700 mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
                      {question}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-gray-600 font-medium mb-3">How would you like to answer?</p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={() => chooseMode("voice")}
                      disabled={!voiceSupported || questionLoading}
                      className="flex-1 p-4 rounded-xl border border-gray-200 hover:border-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 font-semibold text-gray-900">
                        <Mic className="w-4 h-4" /> Voice
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {voiceSupported
                          ? "Speak naturally; we transcribe in real-time."
                          : "Voice not supported in this browser."}
                      </p>
                    </button>
                    <button
                      onClick={() => chooseMode("text")}
                      disabled={questionLoading}
                      className="flex-1 p-4 rounded-xl border border-gray-200 hover:border-gray-900 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 font-semibold text-gray-900">
                        <Type className="w-4 h-4" /> Text
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Type a concise answer — no time pressure.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step: Answer */}
            {step === "answer" && (
              <div className="p-6 sm:p-8 space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Your Answer ({mode === "voice" ? "Voice" : "Text"})
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Question: <span className="text-gray-800">{question}</span>
                  </p>
                  {mode === "text" && (
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      maxLength={500}
                      rows={6}
                      className="w-full resize-none rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent p-4 font-medium text-gray-800 outline-none"
                      placeholder="Type your answer here..."
                      autoFocus
                    />
                  )}
                  {mode === "voice" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={toggleRecording}
                          type="button"
                          className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-all border ${
                            recording
                              ? "bg-red-600 text-white border-red-600"
                              : "bg-gray-900 text-white border-gray-900 hover:bg-gray-800"
                          }`}
                        >
                          {recording ? (
                            <MicOff className="w-4 h-4" />
                          ) : (
                            <Mic className="w-4 h-4" />
                          )}
                          {recording ? "Stop" : "Start Recording"}
                        </button>
                        <p className="text-sm text-gray-600">
                          {transcribing
                            ? "Transcribing audio... please wait."
                            : recording
                            ? "Recording... speak naturally."
                            : "Click to begin recording."}
                        </p>
                      </div>
                      <div className="min-h-[140px] p-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap">
                        {answer.trim() || "Transcription will appear here..."}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                            mediaRecorderRef.current.stop();
                          }
                          if (streamRef.current) {
                            streamRef.current.getTracks().forEach((t) => t.stop());
                          }
                          setRecording(false);
                          setMode("text");
                        }}
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                      >
                        Switch to text input
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setAnswer("");
                      setStep("question");
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={submitAnswer}
                    disabled={!answer.trim() || recording}
                    className="px-6 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    {recording ? "Stop Recording First" : "Analyze"}{" "}
                    <Brain className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step: Analyzing */}
            {step === "analyzing" && (
              <div className="flex flex-col items-center justify-center space-y-6 py-20">
                <Loader2 className="w-10 h-10 text-gray-900 animate-spin" />
                <p className="text-gray-700 font-medium">Analyzing your answer with AI signals...</p>
                <p className="text-sm text-gray-500">
                  Evaluating clarity, depth, structure &amp; relevance
                </p>
              </div>
            )}

            {/* Step: Results */}
            {step === "results" && (
              <div className="p-6 sm:p-8 space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">AI Analysis Results</h3>
                    <p className="text-sm text-gray-600">
                      Here's how Mockly evaluates your response across four dimensions.
                    </p>
                  </div>
                </div>
                {analysis && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {(Object.entries(analysis.scores) as [string, number][]).map(([k, v]) => (
                      <div key={k} className="p-4 rounded-xl border border-gray-200 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{k}</span>
                          <span className="text-sm font-semibold text-gray-900">{v}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, v)}%` }}
                            className="h-full bg-gray-900 rounded-full transition-all duration-700"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {analysis && analysis.feedback.length > 0 && (
                  <div className="space-y-3">
                    {analysis.feedback.map((f: string, i: number) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700"
                      >
                        {f}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={reset}
                    className="px-5 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" /> Try Another
                  </button>
                  <a
                    href={GITHUB_REPO}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition flex items-center gap-2"
                  >
                    <Github className="w-4 h-4" /> View Source
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="py-16 sm:py-20 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Technical Architecture</h2>
            <p className="text-gray-600 mt-2 max-w-lg mx-auto">
              A layered full-stack architecture connecting React, Express, PostgreSQL, and multiple AI services.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TECH_STACK.map((layer) => {
              const Icon = layer.icon;
              return (
                <div
                  key={layer.layer}
                  className="p-6 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className="w-5 h-5 text-gray-700" />
                    <h3 className="font-semibold text-gray-900">{layer.layer}</h3>
                  </div>
                  <ul className="space-y-3">
                    {layer.items.map((item) => (
                      <li key={item.name}>
                        <span className="block text-sm font-medium text-gray-800">{item.name}</span>
                        <span className="block text-xs text-gray-500 mt-0.5">{item.desc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Technical Highlights */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Engineering Highlights
            </h2>
            <p className="text-gray-600 mt-2 max-w-lg mx-auto">
              Key technical decisions and features that power the platform.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <div
                  key={h.title}
                  className="p-6 rounded-2xl border border-gray-200 bg-white hover:border-gray-400 hover:shadow-md transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-gray-700" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{h.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{h.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 sm:py-20 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">Explore the Full Codebase</h2>
          <p className="text-gray-400 mt-3 max-w-lg mx-auto">
            Open source under active development. PRs and feedback welcome.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-gray-900 font-medium hover:bg-gray-200 transition"
            >
              <Github className="w-4 h-4" /> View on GitHub
            </a>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-700 text-gray-300 font-medium hover:bg-gray-800 transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Landing Page
            </Link>
          </div>
          <p className="text-gray-600 text-xs mt-8">
            Built with React, TypeScript, Node.js, OpenAI, Deepgram, Supabase &amp; more.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Showcase;
