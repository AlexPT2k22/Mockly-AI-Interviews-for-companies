import React, { useState, useEffect } from "react";
import { X, Play, Pause, Volume2, RotateCcw } from "lucide-react";
import { track } from "../lib/analytics";

interface DemoModalProps {
  onClose: () => void;
}

const DemoModal: React.FC<DemoModalProps> = ({ onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);

  const demoSteps = [
    {
      time: 0,
      title: "Welcome to Mockly",
      description:
        "Your AI coach introduces the mock session and calibrates difficulty.",
    },
    {
      time: 15,
      title: "Question Analysis",
      description:
        "AI analyzes your role and generates personalized interview questions.",
    },
    {
      time: 30,
      title: "Real-time Feedback",
      description:
        "Get instant feedback on your answers, tone, and body language.",
    },
    {
      time: 45,
      title: "Performance Insights",
      description:
        "Detailed analytics help you understand your strengths and areas for improvement.",
    },
  ];

  const totalDuration = 60; // 60 seconds demo

  const handlePlayPause = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    track("demo_play_toggle", { playing: next });

    if (!isPlaying) {
      // Simulate demo progression
      const interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            track("demo_completed", { duration: totalDuration });
            clearInterval(interval);
            return totalDuration;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    track("demo_restart");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getCurrentStep = () => {
    return demoSteps.reduce((current, step) => {
      return currentTime >= step.time ? step : current;
    }, demoSteps[0]);
  };

  const currentStep = getCurrentStep();

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Mockly Demo</h3>
            <p className="text-gray-600 mt-1">
              Experience adaptive AI mock interviews
            </p>
          </div>
          <button
            onClick={() => {
              track("demo_close");
              onClose();
            }}
            className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Demo Content */}
        <div className="p-6">
          {/* Video/Demo Area */}
          <div className="bg-gray-900 rounded-xl aspect-video mb-6 relative overflow-hidden">
            {/* Simulated Demo Interface */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
                </div>
                <h4 className="text-xl font-semibold mb-2">
                  {currentStep.title}
                </h4>
                <p className="text-gray-300 max-w-md">
                  {currentStep.description}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handlePlayPause}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors duration-200"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div
                      className="bg-white h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(currentTime / totalDuration) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <span className="text-white text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </span>

                <button
                  onClick={handleRestart}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors duration-200"
                >
                  <RotateCcw className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Demo Steps */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {demoSteps.map((step, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  currentTime >= step.time
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      currentTime >= step.time
                        ? "bg-gray-900 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900">
                      {step.title}
                    </h5>
                    <p className="text-sm text-gray-600">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-4">
              <Volume2 className="w-5 h-5 text-gray-600" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setVolume(v);
                  track("demo_volume_change", { volume: v });
                }}
                className="w-24 accent-gray-900"
              />
              <span className="text-sm text-gray-600">{volume}%</span>
            </div>

            <div className="text-sm text-gray-600">
              This is a preview of the Mockly experience
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Ready to experience the full version?
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  track("demo_close_footer");
                  onClose();
                }}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors duration-200"
              >
                Close Demo
              </button>
              <button
                onClick={() => {
                  track("demo_join_waitlist_click");
                  onClose();
                  setTimeout(() => {
                    const waitlistButton = document.querySelector(
                      "[data-waitlist]"
                    ) as HTMLButtonElement;
                    waitlistButton?.click();
                  }, 100);
                }}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors duration-200"
              >
                Join Waitlist
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoModal;
