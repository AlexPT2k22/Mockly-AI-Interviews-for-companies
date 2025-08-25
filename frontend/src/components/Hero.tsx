import React, { useEffect, useRef, useState } from "react";
import { track } from "../lib/analytics";
import { Play, ArrowRight, Users, Star } from "lucide-react";
import { useWaitlistCount } from "../hooks/useWaitlistCount";

interface HeroProps {
  onJoinWaitlist?: () => void;
  onTryDemo?: () => void;
}

const Hero: React.FC<HeroProps> = ({ onJoinWaitlist, onTryDemo }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const { display: waitlistDisplay } = useWaitlistCount();
  const [betaAvg, setBetaAvg] = useState<number | null>(null);
  const [betaTotal, setBetaTotal] = useState<number | null>(null);

  useEffect(() => {
    let aborted = false;
    const KEY = "beta_summary_cache_v1";
    const TTL_MS = 5 * 60 * 1000; // 5 minutos

    const hydrateFromCache = () => {
      try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return false;
        if (Date.now() - parsed.timestamp > TTL_MS) return false;
        if (typeof parsed.average === "number") setBetaAvg(parsed.average);
        if (typeof parsed.total === "number") setBetaTotal(parsed.total);
        return true;
      } catch {
        return false;
      }
    };

    const fetchAndCache = async () => {
      try {
        const res = await fetch("https://mocklyalpha.onrender.com/api/beta/summary");
        const json = await res.json();
        if (aborted) return;
        if (json && json.success !== false) {
          if (typeof json.average === "number") setBetaAvg(json.average);
          if (typeof json.total === "number") setBetaTotal(json.total);
          try {
            localStorage.setItem(
              KEY,
              JSON.stringify({
                average: json.average,
                total: json.total,
                timestamp: Date.now(),
              })
            );
          } catch {}
        }
      } catch {
        // silencioso
      }
    };

    const hadCache = hydrateFromCache();
    if (!hadCache) fetchAndCache();
    const interval = setInterval(fetchAndCache, 60000);
    return () => {
      aborted = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll(".animate-on-scroll");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="min-h-screen bg-gray-50/30 flex items-start justify-center px-4 sm:px-6 lg:px-8 pt-10 pb-8"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gray-100/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gray-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto text-center">
        {/* Badge */}
        <div className="animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-xl rounded-full border border-gray-100/50 shadow-sm">
            <span className="text-gray-600 font-medium text-sm tracking-wide">
              🚀 Coming Soon - Be the first to know
            </span>
          </div>
        </div>

        {/* Main Headline */}
        <h1 className="animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out font-semibold text-5xl md:text-7xl lg:text-8xl text-gray-900 mb-8 leading-tight tracking-tight">
          Level Up Your
          <span className="block text-gray-700">Interview Game</span>
        </h1>

        {/* Subheadline */}
        <p
          className="animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-12 leading-relaxed font-light"
          style={{ transitionDelay: "0.2s" }}
        >
          Mockly gives you adaptive AI mock interviews, instant coaching, and
          performance insights so you walk into every real interview prepared,
          calm, and sharp.
        </p>

        {/* CTAs */}
        <div
          className="animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out flex flex-col sm:flex-row gap-6 justify-center items-center mb-20"
          style={{ transitionDelay: "0.4s" }}
        >
          <button
            data-waitlist
            onClick={() => {
              track("cta_click", { location: "hero", action: "open_waitlist" });
              onJoinWaitlist?.();
            }}
            className="group bg-gray-900 hover:bg-gray-800 text-white font-medium px-8 py-4 rounded-xl text-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center space-x-2"
          >
            <span>Join the Waitlist</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
          </button>

          <button
            onClick={() => {
              track("cta_click", { location: "hero", action: "open_demo" });
              onTryDemo?.();
            }}
            className="group border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 font-medium px-8 py-4 rounded-xl text-lg transition-all duration-200 flex items-center space-x-2"
          >
            <Play className="w-5 h-5" />
            <span>Try Live Demo</span>
          </button>
        </div>

        {/* Trust Indicators & Social Proof */}
        <div className="space-y-10">
          <div
            className="animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-12 text-gray-500"
            style={{ transitionDelay: "0.6s" }}
          >
            <div className="flex items-center space-x-3">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 bg-gray-300 rounded-full border-2 border-white shadow-sm"
                  ></div>
                ))}
              </div>
              <span className="font-medium text-sm">
                {waitlistDisplay}+ early professionals waiting
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((i) => {
                  const active = betaAvg ? i <= Math.round(betaAvg) : false;
                  return (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        active
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                      } transition-colors`}
                    />
                  );
                })}
              </div>
              <span className="font-medium text-sm">
                {betaAvg ? `${betaAvg.toFixed(1)}` : "—"}
                {betaTotal !== null ? ` (${betaTotal})` : ""} beta rating
              </span>
            </div>
          </div>
          <div
            className="animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out"
            style={{ transitionDelay: "0.8s" }}
          >
            <p className="uppercase tracking-wider text-xs font-medium text-gray-500 mb-4">
              Practice like you already work there
            </p>
            <div className="flex items-center justify-center gap-10 opacity-70 grayscale hover:grayscale-0 transition-all duration-300 flex-wrap">
              {["google", "apple", "microsoft", "amazon"].map((brand) => (
                <img
                  key={brand}
                  src={`/${brand}.png`}
                  alt={brand}
                  className="h-8 w-auto"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
