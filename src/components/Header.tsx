import React from "react";
import { track } from "../lib/analytics";
import { User, Menu, X } from "lucide-react";

interface HeaderProps {
  onWaitlistClick?: () => void;
  onDemoClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onWaitlistClick, onDemoClick }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-xl shadow-sm sticky top-0 z-50 border-b border-gray-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center shadow-sm">
              <User className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">Mockly</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <a
              href="#features"
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium"
            >
              Features
            </a>
            <a
              href="#"
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium"
            >
              About
            </a>
            <a
              href="#"
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium"
            >
              Contact
            </a>
            <div className="h-6 w-px bg-gray-200"></div>

            <button
              onClick={(e) => {
                track("cta_click", { location: "header", action: "open_demo" });
                onDemoClick?.();
              }}
              className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium"
            >
              Try Demo
            </button>
            <button
              onClick={() => {
                track("cta_click", {
                  location: "header",
                  action: "open_waitlist",
                });
                onWaitlistClick?.();
              }}
              className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2.5 rounded-xl transition-all duration-200 shadow-sm font-medium"
            >
              Join Waitlist
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-100 py-4">
            <nav className="flex flex-col space-y-4">
              <a
                href="#features"
                className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium px-2 py-1"
              >
                Features
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium px-2 py-1"
              >
                About
              </a>
              <a
                href="#"
                className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium px-2 py-1"
              >
                Contact
              </a>
              <div className="border-t border-gray-100 pt-4 mt-4">
                <button
                  onClick={() => {
                    track("cta_click", {
                      location: "header_mobile",
                      action: "open_demo",
                    });
                    onDemoClick?.();
                  }}
                  className="text-gray-600 hover:text-gray-900 transition-colors duration-200 font-medium px-2 py-1 block mb-3 w-full text-left"
                >
                  Try Demo
                </button>
                <button
                  onClick={() => {
                    track("cta_click", {
                      location: "header_mobile",
                      action: "open_waitlist",
                    });
                    onWaitlistClick?.();
                  }}
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-sm font-medium"
                >
                  Join Waitlist
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
