import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Mic,
  MicOff,
  Type,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Brain,
} from "lucide-react";
import { track } from "../lib/analytics";

interface DemoModalProps {
  onClose: () => void;
}

type Step = "category" | "question" | "answer" | "analyzing" | "results";

const CATEGORIES = [
  {
    key: "frontend",
    label: "Frontend",
    sample:
      "Explain how the virtual DOM improves performance in modern frameworks.",
  },
  {
    key: "backend",
    label: "Backend",
    sample: "How would you design a rate limiter for a public API?",
  },
  {
    key: "system",
    label: "System Design",
    sample: "Design a scalable notification service for millions of users.",
  },
  {
    key: "behavioral",
    label: "Behavioral",
    sample:
      "Tell me about a time you navigated conflicting stakeholder priorities.",
  },
];

const DemoModal: React.FC<DemoModalProps> = ({ onClose }) => {
  // State Machine
  const [step, setStep] = useState<Step>("category");
  const [category, setCategory] = useState<string | null>(null);
  const [question, setQuestion] = useState<string>("");
  const [mode, setMode] = useState<"voice" | "text" | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState<string>("");
  const [analysis, setAnalysis] = useState<{
    scores: Record<string, number>;
    feedback: string[];
  } | null>(null);
  const [voiceSupported, setVoiceSupported] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const answerRef = useRef<HTMLTextAreaElement | null>(null);
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  // Detect voice (Web Speech API)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onresult = (e: any) => {
        let finalTranscript = "";
        let interimTranscript = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          const transcript = res[0].transcript;
          if (res.isFinal) finalTranscript += transcript;
          else interimTranscript += transcript;
        }
        if (finalTranscript) {
          setAnswer((prev) => (prev + (prev ? " " : "") + finalTranscript).trim());
        }
        setInterim(interimTranscript.trim());
        if (interimTranscript) {
          track("demo_answer_record_interim", { chars: interimTranscript.length });
        }
      };
      rec.onend = () => {
        setRecording(false);
        track("demo_answer_record_stop");
        setInterim("");
      };
      rec.onerror = (err: any) => {
        track("demo_answer_record_error", { error: err.error || "unknown" });
        setRecording(false);
      };
      rec.onstart = () => {
        track("demo_answer_record_start");
      };
      recognitionRef.current = rec;
    }
  }, []);

  // Focus management on step change
  useEffect(() => {
    if (step === "answer" && answerRef.current) answerRef.current.focus();
    if (liveRegionRef.current)
      liveRegionRef.current.textContent = `Step changed to ${step}`;
  }, [step]);

  const selectCategory = (c: (typeof CATEGORIES)[number]) => {
    setCategory(c.key);
    setQuestion(c.sample);
    track("demo_category_select", { category: c.key });
    setStep("question");
  };

  const chooseMode = (m: "voice" | "text") => {
    setMode(m);
    track("demo_answer_mode_select", { mode: m });
    setStep("answer");
  };

  const toggleRecording = () => {
    if (!voiceSupported) return;
    if (!recording) {
      try {
  setInterim("");
  recognitionRef.current?.start();
  setRecording(true);
      } catch (e) {
        // ignore start errors
      }
    } else {
      recognitionRef.current?.stop();
      // onend handler will setRecording(false)
    }
  };

  const submitAnswer = () => {
    if (recording) {
      // auto stop and wait a moment for final result
      recognitionRef.current?.stop();
      return;
    }
    track("demo_answer_submit", { length: answer.length, mode });
    setStep("analyzing");
    track("demo_analysis_begin");
    // Simulate analysis (~2.5s)
    setTimeout(() => {
      const scores = generateScores(answer);
      const feedback = buildFeedback(scores, answer);
      setAnalysis({ scores, feedback });
      setStep("results");
      track("demo_analysis_complete");
    }, 2500);
  };

  const generateScores = (text: string) => {
    const base = Math.min(90, 40 + Math.floor(text.length % 120));
    const rand = (seed: number) => (Math.sin(seed + text.length) + 1) / 2; // 0..1
    return {
      Clarity: Math.round(base + rand(1) * 10),
      Depth: Math.round(base - 5 + rand(2) * 15),
      Structure: Math.round(base - 3 + rand(3) * 12),
      Relevance: Math.round(base + rand(4) * 8),
    };
  };

  const buildFeedback = (scores: Record<string, number>, text: string) => {
    const tips: string[] = [];
    if (scores.Structure < 70)
      tips.push("Improve logical sequencing of your points.");
    if (scores.Depth < 70) tips.push("Add more concrete examples or metrics.");
    if (scores.Clarity < 70)
      tips.push("Simplify sentences for clearer delivery.");
    if (scores.Relevance < 70)
      tips.push("Align answer more tightly to the question context.");
    if (!tips.length)
      tips.push("Strong answer foundation. Fine-tune details for excellence.");
    if (text.split(/\s+/).length < 15)
      tips.push("Consider elaborating a bit more for richer assessment.");
    return tips.slice(0, 3);
  };

  const close = () => {
    track("demo_close");
    onClose();
  };

  const joinWaitlist = () => {
    track("demo_join_waitlist");
    onClose();
    setTimeout(() => {
      const btn = document.querySelector(
        "[data-waitlist]"
      ) as HTMLButtonElement | null;
      btn?.click();
    }, 100);
  };

  // Render helpers
  const CategoryStep = () => (
    <div className="space-y-8">
      <div>
        <h4 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gray-600" />
          Choose an Interview Focus
        </h4>
        <p className="text-gray-600 mt-2">
          Select a category to see how Mockly generates targeted questions.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => selectCategory(c)}
            className="group text-left p-5 rounded-xl border border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-gray-900">{c.label}</span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 transition-colors" />
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">{c.sample}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const QuestionStep = () => (
    <div className="space-y-8">
      <div>
        <h4 className="text-xl font-semibold text-gray-900">
          Sample {category} question
        </h4>
        <p className="text-gray-700 mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
          {question}
        </p>
      </div>
      <div>
        <p className="text-gray-600 font-medium mb-3">
          How would you like to answer?
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => chooseMode("voice")}
            disabled={!voiceSupported}
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
            className="flex-1 p-4 rounded-xl border border-gray-200 hover:border-gray-900 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <Type className="w-4 h-4" /> Text
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Type a concise answer (no time pressure).
            </p>
          </button>
        </div>
      </div>
    </div>
  );

  const AnswerStep = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-xl font-semibold text-gray-900 mb-2">
          Your Answer ({mode === "voice" ? "Voice" : "Text"})
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Question: <span className="text-gray-800">{question}</span>
        </p>
        {mode === "text" && (
          <textarea
            ref={answerRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            maxLength={500}
            rows={6}
            className="w-full resize-none rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-900 focus:border-transparent p-4 font-medium text-gray-800"
            placeholder="Type your answer here..."
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
                {recording
                  ? "Listening... speak naturally."
                  : "Click to begin recording."}
              </p>
            </div>
            <div className="min-h-[140px] p-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap">
              {(answer + (interim ? (answer ? " " : "") + interim : "")).trim() || "Transcription will appear here..."}
            </div>
            <div>
              <button
                type="button"
                onClick={() => { recognitionRef.current?.stop(); setMode("text"); setStep("answer"); }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Switch to text input
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
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
          {recording ? 'Stop Recording First' : 'Analyze'} <Brain className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const AnalyzingStep = () => (
    <div className="flex flex-col items-center justify-center space-y-6 py-16">
      <Loader2 className="w-10 h-10 text-gray-900 animate-spin" />
      <p className="text-gray-700 font-medium">
        Analyzing your answer with AI signals...
      </p>
      <p className="text-sm text-gray-500">
        Evaluating clarity, depth, structure & relevance
      </p>
    </div>
  );

  const ResultsStep = () => (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h4 className="text-xl font-semibold text-gray-900">
            Preliminary Insights
          </h4>
          <p className="text-sm text-gray-600">
            Here’s a snapshot of how Mockly breaks down responses.
          </p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {analysis &&
          Object.entries(analysis.scores).map(([k, v]) => (
            <div
              key={k}
              className="p-4 rounded-xl border border-gray-200 bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{k}</span>
                <span className="text-sm font-semibold text-gray-900">{v}</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, v)}%` }}
                  className="h-full bg-gray-900 rounded-full"
                />
              </div>
            </div>
          ))}
      </div>
      <div className="space-y-3">
        {analysis?.feedback.map((f, i) => (
          <div
            key={i}
            className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700"
          >
            {f}
          </div>
        ))}
      </div>
      <div className="p-5 rounded-xl bg-gray-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="font-semibold">
            Unlock full AI coaching & deeper analytics
          </p>
          <p className="text-sm text-gray-300">
            Join the waitlist to access real-time adaptive interviews.
          </p>
        </div>
        <button
          onClick={joinWaitlist}
          data-demo-waitlist
          className="px-6 py-3 rounded-xl bg-white text-gray-900 font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          Join Waitlist <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Mockly interactive demo"
    >
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-y-auto focus:outline-none">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white/80 backdrop-blur-xl z-10">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Mockly Live Demo
            </h3>
            <p className="text-gray-600 mt-1">
              Experience a slice of AI-powered interview coaching.
            </p>
          </div>
          <button
            onClick={close}
            className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            aria-label="Close demo"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Live region for step changes */}
        <div ref={liveRegionRef} className="sr-only" aria-live="polite" />

        {/* Content */}
        <div className="p-6 space-y-10">
          {step === "category" && <CategoryStep />}
          {step === "question" && <QuestionStep />}
          {step === "answer" && <AnswerStep />}
          {step === "analyzing" && <AnalyzingStep />}
          {step === "results" && <ResultsStep />}
        </div>

        {/* Footer minimal except results card CTA */}
        <div className="border-t border-gray-200 p-4 flex items-center justify-end gap-3 bg-gray-50">
          {step !== "results" && (
            <button
              onClick={close}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
            >
              Close
            </button>
          )}
          {step === "question" && (
            <button
              onClick={() => setStep("category")}
              className="px-4 py-2 rounded-xl text-gray-600 hover:text-gray-900 text-sm"
            >
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemoModal;
