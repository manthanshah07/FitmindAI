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
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
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
                <AppShell>
                  <DashboardPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach"
            element={
              <ProtectedRoute>
                <AppShell>
                  <div className="border border-borderLine p-8 text-center bg-bone">
                    <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-2">Phase 7 Module</span>
                    <h2 className="text-2xl font-bold uppercase tracking-tighter">AI Coach Engine</h2>
                    <p className="text-sm text-charcoal mt-2">Conversational AI and persistent user memory will launch in Phase 7.</p>
                  </div>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/workout/*"
            element={
              <ProtectedRoute>
                <AppShell>
                  <div className="border border-borderLine p-8 text-center bg-bone">
                    <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-2">Phase 3 Module</span>
                    <h2 className="text-2xl font-bold uppercase tracking-tighter">Workout Overview & Sessions</h2>
                    <p className="text-sm text-charcoal mt-2">Workout routine generation and exercise tracking will be built in Phase 3.</p>
                  </div>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/nutrition/*"
            element={
              <ProtectedRoute>
                <AppShell>
                  <div className="border border-borderLine p-8 text-center bg-bone">
                    <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-2">Phase 4 Module</span>
                    <h2 className="text-2xl font-bold uppercase tracking-tighter">Nutrition Dashboard & Logger</h2>
                    <p className="text-sm text-charcoal mt-2">Food logging, calorie tracking, and macro targets will be built in Phase 4.</p>
                  </div>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/progress/*"
            element={
              <ProtectedRoute>
                <AppShell>
                  <div className="border border-borderLine p-8 text-center bg-bone">
                    <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-2">Phase 5 Module</span>
                    <h2 className="text-2xl font-bold uppercase tracking-tighter">Progress & Measurement Tracking</h2>
                    <p className="text-sm text-charcoal mt-2">Weight history graphs and body measurement logs will be built in Phase 5.</p>
                  </div>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/*"
            element={
              <ProtectedRoute>
                <AppShell>
                  <div className="border border-borderLine p-8 text-center bg-bone">
                    <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-2">Phase 9 Module</span>
                    <h2 className="text-2xl font-bold uppercase tracking-tighter">Reports Archive</h2>
                    <p className="text-sm text-charcoal mt-2">Weekly and monthly fitness summaries will be archived here in Phase 9.</p>
                  </div>
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ProfilePage />
                </AppShell>
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
