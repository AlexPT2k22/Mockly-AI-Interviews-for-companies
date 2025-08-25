import React, { useEffect } from "react";
import { track } from "../lib/analytics";
import { RefreshCw, Sparkles, BarChart3, Mic } from "lucide-react";

const Features = () => {
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

  const features = [
    {
      icon: RefreshCw,
      title: "Adaptive Mock Interviews",
      description:
        "Questions evolve based on your previous answers so every session feels like a real, dynamic interviewer.",
    },
    {
      icon: Sparkles,
      title: "Instant AI Coaching",
      description:
        "Get immediate, actionable guidance on clarity, structure, depth and what to improve next.",
    },
    {
      icon: BarChart3,
      title: "Performance Metrics",
      description:
        "Track progress across signal areas: structure, relevance, confidence and growth over time.",
    },
    {
      icon: Mic,
      title: "Voice Practice Mode",
      description:
        "Simulate live interviews with spoken answers for realistic pacing, pressure and articulation training.",
    },
  ];

  return (
    <section className="bg-gray-50/30 pt-24 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <div className="animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out">
            <h2
              id="features"
              className="font-semibold text-4xl md:text-6xl text-gray-900 mb-6 tracking-tight"
            >
              Built For Real Growth
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
              Four focused pillars turn scattered practice into measurable
              interview improvement.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out bg-white/80 backdrop-blur-xl p-8 rounded-2xl border border-gray-100/50 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300 transform hover:-translate-y-2 group"
                style={{ transitionDelay: `${index * 100}ms` }}
                onClick={() =>
                  track("feature_card_click", { feature: feature.title, index })
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    track("feature_card_key_activate", {
                      feature: feature.title,
                      index,
                    });
                  }
                }}
              >
                <div className="mb-6">
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-gray-100 transition-colors duration-300">
                    <Icon className="w-6 h-6 text-gray-600" />
                  </div>
                </div>

                <h3 className="font-semibold text-xl text-gray-900 mb-4">
                  {feature.title}
                </h3>

                <p className="text-gray-600 leading-relaxed font-light">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
