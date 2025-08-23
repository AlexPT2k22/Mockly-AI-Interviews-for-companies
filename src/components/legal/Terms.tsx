import Header from "../Header";
import Footer from "../Footer";

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50/30">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-semibold text-gray-900 mb-6">
          Terms of Service
        </h1>
        <p className="text-gray-600 leading-relaxed mb-4">
          These Terms of Service ("Terms") govern your access to and use of
          Mockly. By accessing or using the product you agree to be bound by
          these Terms.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          1. Use of the Service
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          You may use the Service only in compliance with these Terms and all
          applicable laws. We may suspend or terminate access if you misuse the
          platform.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          2. Accounts
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          You are responsible for safeguarding your account credentials and for
          any activity under your account.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          3. Intellectual Property
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          All platform content, trademarks, and logos are the property of Mockly
          or its licensors.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          4. Disclaimer
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          The Service is provided "as is" without warranties of any kind. We do
          not guarantee interview outcomes.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          5. Limitation of Liability
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          To the maximum extent permitted by law, Mockly shall not be liable for
          indirect or consequential damages.
        </p>
        <h2 className="text-2xl font-semibold text-gray-900 mt-10 mb-4">
          6. Changes
        </h2>
        <p className="text-gray-600 leading-relaxed mb-4">
          We may update these Terms; continued use constitutes acceptance of the
          revised Terms.
        </p>
        <p className="text-gray-500 text-sm mt-12">
          Last updated: {new Date().toISOString().split("T")[0]}
        </p>
      </main>
      <Footer />
    </div>
  );
}
