import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  User,
  Briefcase,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { track } from "../lib/analytics";
import { BetaRating } from "./BetaRating";

interface WaitlistModalProps {
  onClose: () => void;
}

const WaitlistModal: React.FC<WaitlistModalProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    company: "",
    experience: "",
    interests: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const experienceLevels = [
    "Entry Level (0-2 years)",
    "Mid Level (3-5 years)",
    "Senior Level (6-10 years)",
    "Lead/Principal (10+ years)",
  ];

  const interestOptions = [
    "Technical Interviews",
    "Behavioral Interviews",
    "System Design",
    "Coding Challenges",
    "Leadership Interviews",
    "Case Studies",
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
    track("waitlist_interest_toggle", {
      interest,
      selected: !formData.interests.includes(interest),
    });
  };

  // Prefill email from inline form (localStorage)
  useEffect(() => {
    try {
      const pref = localStorage.getItem("prefill_waitlist_email");
      if (pref && !formData.email) {
        setFormData((f) => ({ ...f, email: pref }));
        track("waitlist_prefill_email");
      }
    } catch {}
  }, [formData.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    track("waitlist_submit_attempt");
    setError(null);

    try {
      let refSource: string | null = null;
      try {
        refSource = localStorage.getItem("mockly_ref_source");
      } catch {}

      const payload: any = {
        email: formData.email.trim().toLowerCase(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        role: formData.role.trim() || undefined,
        company: formData.company.trim() || undefined,
        experienceLevel: formData.experience || undefined,
        interests: formData.interests,
      };
      if (refSource) payload.ref = refSource;

      // Submit to backend which handles email sending
      const response = await fetch(
        "https://mocklyalpha.onrender.com/api/waitlist",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to join waitlist");
      }

      // Backend now handles both email sending and Supabase insertion
      setSuccess(true);
      track("waitlist_submit_success", {
        interests: formData.interests.length,
        experience: formData.experience,
        discountCode: result.discountCode,
        duplicate: result.duplicate || false,
      });
    } catch (err) {
      console.error("Waitlist submission error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      track("waitlist_submit_error");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-xl p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              You're on the list!
            </h3>
            <p className="text-gray-600 mb-6">
              Thanks for joining our waitlist! We've sent you a welcome email
              with a special 20% discount code for when we launch.
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-700">
            <p className="font-medium mb-1">What's next?</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Check your email for your discount code</li>
              <li>Get exclusive updates on our progress</li>
              <li>Early access to beta features</li>
              <li>Special launch pricing with your discount</li>
            </ul>
          </div>
          <div className="mb-6">
            <BetaRating
              email={formData.email}
              onSubmitted={() => track("beta_rating_widget_submitted")}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => {
                track("waitlist_success_close");
                onClose();
              }}
              className="px-6 h-11 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              Join the Waitlist
            </h3>
            <p className="text-gray-600 mt-1">
              Be the first to experience AI-powered interview training
            </p>
          </div>
          <button
            onClick={() => {
              track("waitlist_modal_close");
              onClose();
            }}
            className="w-10 h-10 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                First Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                  placeholder="John"
                  required
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Last Name *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                placeholder="Doe"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                placeholder="john@company.com"
                required
              />
            </div>
          </div>

          {/* Role and Company */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Current Role
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                  placeholder="Software Engineer"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="company"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Company
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200"
                placeholder="Acme Corp"
              />
            </div>
          </div>

          {/* Experience Level */}
          <div>
            <label
              htmlFor="experience"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Experience Level
            </label>
            <select
              id="experience"
              name="experience"
              value={formData.experience}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 bg-white"
            >
              <option value="">Select your experience level</option>
              {experienceLevels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              What are you most interested in? (Select all that apply)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {interestOptions.map((interest) => (
                <label key={interest} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.interests.includes(interest)}
                    onChange={() => handleInterestToggle(interest)}
                    className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                  />
                  <span className="ml-2 text-sm text-gray-700">{interest}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 group"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Joining...</span>
              </div>
            ) : (
              <>
                <span>Join Waitlist</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </>
            )}
          </button>

          {/* Privacy Note */}
          <p className="text-xs text-gray-500 text-center">
            By joining our waitlist, you agree to receive updates about Mockly.
            We respect your privacy and won't spam you.
          </p>
        </form>
      </div>
    </div>
  );
};

export default WaitlistModal;
