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
      className="w-10 h-10 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 rounded-lg group transition-all duration-200"
    >
      <svg
        viewBox="0 0 24 24"
        className={`w-8 h-8 transition-all duration-200 ${
          filled || hover
            ? "text-yellow-400 fill-yellow-400 scale-110"
            : "text-gray-300 fill-transparent hover:text-gray-400 hover:scale-105"
        } group-active:scale-95`}
        strokeWidth={1.5}
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
      const res = await fetch("https://mocklyalpha.onrender.com/api/beta/feedback", {
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
    <div className="bg-gray-50/50 border border-gray-200 rounded-xl p-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Rate your excitement
        </h3>
        <p className="text-sm text-gray-600">
          Help us understand how you feel about Mockly
        </p>
      </div>
      <div
        className="flex items-center justify-center gap-2 mb-6"
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
        placeholder="Optional: Share your thoughts, expectations, or questions..."
        onChange={(e) => setComment(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm resize-y min-h-[80px] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-60 disabled:bg-gray-50 transition-all duration-200"
        maxLength={1000}
      />
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-gray-500">{comment.length}/1000</span>
        {!submitted ? (
          <button
            onClick={submit}
            disabled={!rating || submitting}
            className="px-6 py-2 text-sm font-medium rounded-xl bg-gray-900 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {submitting ? "Submitting..." : "Submit Rating"}
          </button>
        ) : (
          <span className="text-sm text-green-600 font-medium">
            Thank you for your feedback!
          </span>
        )}
      </div>
      {error && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
};
