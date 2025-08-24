import Header from "../Header";
import Footer from "../Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50/30">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-semibold text-gray-900 mb-6">
          Privacy Policy
        </h1>
        <p className="text-gray-600 leading-relaxed mb-4">
          This Privacy Policy explains how we collect, use, and safeguard your
          information when you use Mockly.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          1. Data We Collect
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Account details, usage metrics, and interview practice data you
          provide.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          2. How We Use Data
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          To deliver personalized mock interviews, improve features, and
          communicate updates.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          3. Sharing
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          We do not sell your data. Limited sharing may occur with trusted
          processors for infrastructure and analytics.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          4. Security
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          We employ encryption in transit and at rest; no system is 100% secure.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          5. Your Rights
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          You may request access, correction, or deletion of your personal data,
          subject to legal obligations.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          6. Cookies & Tracking
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          See our Cookie Policy for granular details. You can control cookies
          via browser settings.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          7. Changes
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          We may update this Policy; material changes will be communicated.
        </p>
        <p className="text-gray-500 text-sm mt-12">
          Last updated: {new Date().toISOString().split("T")[0]}
        </p>
      </main>
      <Footer />
    </div>
  );
}
