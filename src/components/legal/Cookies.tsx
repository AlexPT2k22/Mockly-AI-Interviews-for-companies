import Header from "../Header";
import Footer from "../Footer";

export default function Cookies() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50/30">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-semibold text-gray-900 mb-6">
          Cookie Policy
        </h1>
        <p className="text-gray-600 leading-relaxed mb-4">
          This Cookie Policy explains how Mockly uses cookies and similar
          technologies.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          1. What Are Cookies
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          Small text files stored on your device used to remember preferences
          and improve performance.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          2. Types We Use
        </h2>
        <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-1">
          <li>Essential: Required for core functionality.</li>
          <li>Analytics: Help us understand usage and improve UX.</li>
          <li>Preference: Remember your settings.</li>
        </ul>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          3. Managing Cookies
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          You can disable non-essential cookies via browser settings; essential
          cookies are required for service operation.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          4. Updates
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          We may revise this Cookie Policy as we add or change tooling.
        </p>
        <p className="text-gray-500 text-sm mt-12">
          Last updated: {new Date().toISOString().split("T")[0]}
        </p>
      </main>
      <Footer />
    </div>
  );
}
