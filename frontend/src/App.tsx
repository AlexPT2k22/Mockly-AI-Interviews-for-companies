import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Features from "./components/Features";
import About from "./components/About";
import Roadmap from "./components/Roadmap";
import Footer from "./components/Footer";
import WaitlistModal from "./components/WaitlistModal";
import DemoModal from "./components/DemoModal";
import Terms from "./components/legal/Terms";
import Privacy from "./components/legal/Privacy";
import Cookies from "./components/legal/Cookies";
import "./animations.css";

function App() {
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  // Language toggle removed; roadmap fixed to English.

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="min-h-screen bg-gray-50/30">
            <Header
              onWaitlistClick={() => setShowWaitlist(true)}
              onDemoClick={() => setShowDemo(true)}
            />
            <Hero
              onJoinWaitlist={() => setShowWaitlist(true)}
              onTryDemo={() => setShowDemo(true)}
            />
            <Features />
            <About />
            <Roadmap />
            <Footer />

            {/* Modals */}
            {showWaitlist && (
              <WaitlistModal onClose={() => setShowWaitlist(false)} />
            )}
            {showDemo && <DemoModal onClose={() => setShowDemo(false)} />}
          </div>
        }
      />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/cookies" element={<Cookies />} />
      {/* Fallback */}
      <Route path="*" element={<div className="p-6">Not Found</div>} />
    </Routes>
  );
}

export default App;
