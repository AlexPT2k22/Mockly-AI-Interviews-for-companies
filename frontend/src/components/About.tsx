import React, { useEffect } from "react";
import { Compass, HeartHandshake, Layers, Sparkles } from "lucide-react";

const About: React.FC = () => {
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

  const pillars = [
    {
      icon: Compass,
      title: "Practice With Purpose",
      desc: "Every session is adaptive: your strengths are reinforced and your weak points become targeted drills.",
    },
    {
      icon: Layers,
      title: "Real-World Fidelity",
      desc: "Context-aware AI creates scenario depth so you rehearse like it's the real interview, not a flashcard set.",
    },
    {
      icon: HeartHandshake,
      title: "Human-Centric Coaching",
      desc: "Feedback tone is constructive, specific, and growth‑oriented like a mentor who actually cares.",
    },
    {
      icon: Sparkles,
      title: "Compounding Improvement",
      desc: "Micro-metrics and reflections stack over time, turning preparation into a sustainable habit.",
    },
  ];

  return (
    <section id="about" className="bg-white pt-28 pb-16 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <div className="animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out max-w-3xl mx-auto">
            <h2 className="font-semibold text-4xl md:text-6xl text-gray-900 tracking-tight mb-6">
              About Mockly
            </h2>
            <p className="text-xl text-gray-600 font-light leading-relaxed">
              We're building the most intentional way to master interviews. Not
              noisy question banks—focused deliberate practice that compounds.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out bg-white/70 backdrop-blur-xl border border-gray-100/60 rounded-2xl p-8 shadow-sm hover:shadow-lg hover:shadow-gray-100/60 hover:-translate-y-2 transition-all duration-300"
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div className="w-12 h-12 mb-6 rounded-xl bg-gray-50 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="font-semibold text-lg text-gray-900 mb-3">
                  {p.title}
                </h3>
                <p className="text-gray-600 font-light leading-relaxed text-sm">
                  {p.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div className="animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out max-w-4xl mx-auto">
          <div className="bg-gray-900 text-white rounded-3xl p-10 md:p-14 relative overflow-hidden border border-gray-800/60">
            <div className="absolute inset-0 bg-gray-900" />
            <div className="relative">
              <h3 className="text-2xl md:text-3xl font-semibold mb-6 tracking-tight">
                Why we started
              </h3>
              <p className="text-gray-300 leading-relaxed font-light mb-6">
                Interview practice today is fragmented: scattered blogs, generic
                flashcards, and rigid mock scripts. We wanted a system that
                feels like a coach watching your evolution not judging a single
                answer. Mockly is that system: adaptive, contextual, reflective.
              </p>
              <p className="text-gray-300 leading-relaxed font-light">
                Our mission is simple: reduce the confidence gap. Whether you're
                switching careers, aiming for top-tier roles, or re-entering the
                market, we help you build repeatable excellence one focused
                session at a time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
