import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import MarketingPage from './pages/MarketingPage';
import HowItWorksPage from './pages/HowItWorksPage';
import TechnologyPage from './pages/TechnologyPage';
import AboutPage from './pages/AboutPage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import Footer from './sections/Footer';

function App() {
  return (
    <div className="bg-bone text-graphite min-h-screen font-sans selection:bg-graphite selection:text-bone">
      <ScrollToTop />
      <div className="noise-bg" />
      <Navbar />
      <main className="pt-16 border-x border-borderLine max-w-[1600px] mx-auto">
        <Routes>
          <Route path="/" element={<MarketingPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/technology" element={<TechnologyPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/onboarding/*"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8 bg-bone">
                  <div className="text-center border border-borderLine p-16 max-w-md w-full">
                    <span className="text-[9px] font-mono text-olive uppercase tracking-widest block mb-4">
                      Phase 2 Destination
                    </span>
                    <h2 className="text-3xl font-bold tracking-tighter uppercase mb-4">
                      Dashboard
                    </h2>
                    <p className="text-charcoal text-sm font-medium">
                      Onboarding complete. Personalized Dashboard is ready for Phase 2 implementation.
                    </p>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
