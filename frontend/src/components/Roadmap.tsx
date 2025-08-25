import React, { useEffect, useMemo } from "react";
import {
  Rocket,
  Smartphone,
  FileText,
  Briefcase,
  Sparkles,
  CheckCircle2,
  Clock,
} from "lucide-react";

interface RoadmapItemBase {
  id: string;
  quarter: string;
  status: "feito" | "em_progresso" | "planeado";
  icon: React.ComponentType<any>;
  highlight?: boolean;
  i18n: {
    pt: { titulo: string; descricao: string };
    en: { title: string; description: string };
  };
}

const baseItems: RoadmapItemBase[] = [
  {
    id: "alpha",
    quarter: "Q3 2025",
    status: "em_progresso",
    icon: Rocket,
    i18n: {
      pt: {
        titulo: "Lançamento Alpha Web",
        descricao:
          "Primeira versão funcional com entrevistas simuladas, perguntas geradas por IA, análise básica e modo voz.",
      },
      en: {
        title: "Alpha Web Launch",
        description:
          "First functional release with simulated interviews, AI-generated questions, basic analysis & voice mode.",
      },
    },
  },
  {
    id: "cv_tool",
    quarter: "Q3 2025",
    status: "planeado",
    icon: FileText,
    highlight: false,
    i18n: {
      pt: {
        titulo: "Ferramenta de CV Inteligente",
        descricao:
          "Sugestões de melhoria, extração de pontos fortes e ajuste automático para a vaga.",
      },
      en: {
        title: "Smart CV Tool",
        description:
          "Improvement suggestions, strengths extraction and automatic tailoring to job posting.",
      },
    },
  },
  {
    id: "job_import",
    quarter: "Q4 2025",
    status: "planeado",
    icon: Briefcase,
    i18n: {
      pt: {
        titulo: "Importação de Vagas",
        descricao:
          "Cola a descrição da vaga ou faz upload e geramos entrevistas adaptadas e métricas de alinhamento.",
      },
      en: {
        title: "Job Description Import",
        description:
          "Paste or upload job description; we generate tailored interviews and alignment metrics.",
      },
    },
  },
  {
    id: "deep_analysis",
    quarter: "Q4 2025",
    status: "planeado",
    icon: Sparkles,
    i18n: {
      pt: {
        titulo: "Análise Avançada de Respostas",
        descricao:
          "Feedback multi-dimensão: comunicação, profundidade técnica, storytelling e impacto.",
      },
      en: {
        title: "Advanced Answer Analysis",
        description:
          "Multi-dimension feedback: communication, technical depth, storytelling & impact.",
      },
    },
  },
  {
    id: "full_launch",
    quarter: "Q4 2025",
    status: "planeado",
    icon: Rocket,
    i18n: {
      pt: {
        titulo: "Lançamento Completo",
        descricao:
          "Plano Pro, dashboards, coaching contínuo e integração de calendários.",
      },
      en: {
        title: "Full Launch",
        description:
          "Pro plan, advanced dashboards, continuous coaching & calendar integrations.",
      },
    },
  },
  {
    id: "mobile_app",
    quarter: "Q1 2026",
    status: "planeado",
    icon: Smartphone,
    i18n: {
      pt: {
        titulo: "App Mobile (iOS & Android)",
        descricao:
          "Praticar em movimento com sessões rápidas, modo offline e notificações.",
      },
      en: {
        title: "Mobile App (iOS & Android)",
        description:
          "Practice on the go: quick sessions, offline mode & smart notifications.",
      },
    },
  },
];

const statusStyles: Record<RoadmapItemBase["status"], string> = {
  feito: "bg-green-100 text-green-700 border-green-200",
  em_progresso: "bg-amber-100 text-amber-700 border-amber-200",
  planeado: "bg-gray-100 text-gray-700 border-gray-200",
};

const statusLabel = {
  pt: {
    feito: "Concluído",
    em_progresso: "Em progresso",
    planeado: "Planeado",
  },
  en: {
    feito: "Done",
    em_progresso: "In Progress",
    planeado: "Planned",
  },
};

const sectionCopy = {
  pt: {
    heading: "Roadmap",
    sub: "Transparência sobre o que já está feito e o que vem aí. Ajuda-nos com feedback e priorização!",
    currentPriority: "Prioridade Atual",
  },
  en: {
    heading: "Roadmap",
    sub: "Transparency on what is done and what is coming next.",
    currentPriority: "Current Priority",
  },
};

const Roadmap: React.FC = () => {
  const copy = sectionCopy.en;
  const items = useMemo(() => baseItems, []);
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
    <section id="roadmap" className="bg-white pt-28 pb-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="animate-on-scroll opacity-0 translate-y-8 transition-all duration-1000 ease-out">
            <div className="flex flex-col items-center gap-6">
              <h2 className="font-semibold text-4xl md:text-6xl text-gray-900 tracking-tight">
                {copy.heading}
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
                {copy.sub}
              </p>
              {/* Language toggle moved to Header; removed here */}
            </div>
          </div>
        </div>

        <div className="relative border-l border-gray-200 ml-4">
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-gray-300 via-gray-200 to-transparent" />
          <div className="space-y-14">
            {items.map((item, idx) => {
              const Icon = item.icon;
              const localizedTitle = item.i18n.en.title;
              const localizedDesc = item.i18n.en.description;
              return (
                <div
                  key={item.id}
                  className="animate-on-scroll opacity-0 translate-y-8 transition-all duration-700 ease-out flex gap-6 group"
                  style={{ transitionDelay: `${idx * 80}ms` }}
                >
                  <div className="flex flex-col items-center -ml-4 mr-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center bg-white border ${
                        item.highlight ? "ring-4 ring-gray-900/10" : ""
                      }`}
                    >
                      <Icon className="w-4 h-4 text-gray-700" />
                    </div>
                    <div className="flex-1 w-px bg-gray-200" />
                  </div>
                  <div
                    className={`flex-1 bg-white/70 backdrop-blur-xl border border-gray-100/50 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:shadow-gray-100/60 transition-all duration-300 ${
                      item.highlight ? "border-gray-300" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <span className="text-sm font-semibold text-gray-900 tracking-tight">
                        {item.quarter}
                      </span>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                          statusStyles[item.status]
                        }`}
                      >
                        {statusLabel.en[item.status]}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      {localizedTitle}
                      {item.status === "feito" && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                      {item.status === "em_progresso" && (
                        <Clock className="w-4 h-4 text-amber-500" />
                      )}
                    </h3>
                    <p className="text-gray-600 leading-relaxed font-light mb-4">
                      {localizedDesc}
                    </p>
                    {/* Progress bar removed as per updated requirements */}
                    {item.highlight && (
                      <div className="text-xs inline-block px-3 py-1 rounded-full bg-gray-900 text-white font-medium tracking-wide">
                        {copy.currentPriority}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Roadmap;
