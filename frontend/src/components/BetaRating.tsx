import React, { useState, useEffect } from "react";
import { track } from "../lib/analytics";

interface BetaRatingProps {
  email: string; // email já capturado na waitlist
  onSubmitted?: () => void;
}

const Star: React.FC<{
  filled: boolean;
  hover: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
  index: number;
}> = ({ filled, hover, onEnter, onLeave, onClick, index }) => {
  return (
    <button
      type="button"
      aria-label={`${index} star`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      className="w-9 h-9 flex items-center justify-center focus:outline-none focus-visible:ring ring-offset-1 rounded group"
    >
      <svg
        viewBox="0 0 24 24"
        className={`w-7 h-7 transition-colors ${
          filled || hover
            ? "text-yellow-400 fill-yellow-400"
            : "text-zinc-500 fill-transparent"
        } group-active:scale-95`}
        strokeWidth={1.2}
        stroke="currentColor"
      >
        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    </button>
  );
};

export const BetaRating: React.FC<BetaRatingProps> = ({
  email,
  onSubmitted,
}) => {
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track("beta_rating_view");
  }, []);

  const submit = async () => {
    if (!rating) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/beta/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Erro ao enviar");
      track("beta_rating_submitted", { rating });
      setSubmitted(true);
      onSubmitted?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 border border-zinc-800 rounded-xl bg-gradient-to-b from-zinc-900/70 to-black shadow-inner">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-medium tracking-wide text-zinc-300">
          Avalie sua expectativa
        </h3>
      </div>
      <div
        className="flex items-center gap-1 mb-3"
        onMouseLeave={() => setHover(0)}
      >
        {Array.from({ length: 5 }).map((_, i) => {
          const idx = i + 1;
          return (
            <Star
              key={idx}
              index={idx}
              filled={idx <= rating}
              hover={hover >= idx && !submitted}
              onEnter={() => !submitted && setHover(idx)}
              onLeave={() => !submitted && setHover(0)}
              onClick={() => !submitted && setRating(idx)}
            />
          );
        })}
      </div>
      <textarea
        value={comment}
        disabled={submitted}
        placeholder="Opcional: deixe um comentário (feedback, expectativa, dúvida)"
        onChange={(e) => setComment(e.target.value)}
        className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-2 text-sm resize-y min-h-[80px] placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 disabled:opacity-60"
        maxLength={1000}
      />
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-zinc-500">{comment.length}/1000</span>
        {!submitted ? (
          <button
            onClick={submit}
            disabled={!rating || submitting}
            className="px-4 h-9 text-sm font-medium rounded-lg bg-yellow-400 text-black disabled:opacity-40 disabled:cursor-not-allowed hover:bg-yellow-300 transition"
          >
            {submitting ? "Enviando..." : "Enviar"}
          </button>
        ) : (
          <span className="text-sm text-green-400">
            Obrigado pelo feedback!
          </span>
        )}
      </div>
      {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
    </div>
  );
};
