import React, { useEffect } from "react";
import { track } from "../lib/analytics";
import { Brain, Target, BarChart3, Shield, Zap, Award } from "lucide-react";

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
      icon: Brain,
      title: "AI-Powered Analysis",
      description:
        "Advanced machine learning algorithms analyze your responses and provide personalized feedback for continuous improvement.",
    },
    {
      icon: Target,
      title: "Industry-Specific Training",
      description:
        "Tailored interview scenarios for your specific role and industry, from tech to finance to healthcare.",
    },
    {
      icon: BarChart3,
      title: "Performance Analytics",
      description:
        "Detailed insights into your interview performance with actionable recommendations for improvement.",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description:
        "Your practice sessions and data are encrypted and secure. We never share your information.",
    },
    {
      icon: Zap,
      title: "Real-time Feedback",
      description:
        "Get instant feedback on your answers, body language, and speaking pace during practice sessions.",
    },
    {
      icon: Award,
      title: "Proven Results",
      description:
        "Join thousands of professionals who have successfully landed their dream jobs using our platform.",
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
              Why Mockly?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
              Mockly blends adaptive AI coaching with realistic practice so you
              ship confident interview performance faster.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
