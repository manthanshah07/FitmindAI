import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import Footer from './sections/Footer';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';

// Lazy-loaded page components for route-level code splitting
const MarketingPage = lazy(() => import('./pages/MarketingPage'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const TechnologyPage = lazy(() => import('./pages/TechnologyPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/auth/SignupPage').then((m) => ({ default: m.SignupPage })));
const OnboardingPage = lazy(() => import('./pages/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const WorkoutOverviewPage = lazy(() => import('./pages/workout/WorkoutOverviewPage').then((m) => ({ default: m.WorkoutOverviewPage })));
const WorkoutSessionPage = lazy(() => import('./pages/workout/WorkoutSessionPage').then((m) => ({ default: m.WorkoutSessionPage })));
const WorkoutHistoryPage = lazy(() => import('./pages/workout/WorkoutHistoryPage').then((m) => ({ default: m.WorkoutHistoryPage })));
const ExerciseDetailPage = lazy(() => import('./pages/workout/ExerciseDetailPage').then((m) => ({ default: m.ExerciseDetailPage })));
const NutritionOverviewPage = lazy(() => import('./pages/nutrition/NutritionOverviewPage').then((m) => ({ default: m.NutritionOverviewPage })));
const FoodLoggerPage = lazy(() => import('./pages/nutrition/FoodLoggerPage').then((m) => ({ default: m.FoodLoggerPage })));
const NutritionHistoryPage = lazy(() => import('./pages/nutrition/NutritionHistoryPage').then((m) => ({ default: m.NutritionHistoryPage })));
const ProgressOverviewPage = lazy(() => import('./pages/progress/ProgressOverviewPage').then((m) => ({ default: m.ProgressOverviewPage })));
const CoachPage = lazy(() => import('./pages/coach/CoachPage').then((m) => ({ default: m.CoachPage })));

const PageLoadingFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center p-8 bg-bone">
    <span className="font-mono text-xs text-olive uppercase tracking-widest animate-pulse font-bold">
      Loading...
    </span>
  </div>
);

// Public marketing layout with Navbar & Footer
const PublicLayout = () => (
  <>
    <Navbar />
    <main className="pt-16 border-x border-borderLine max-w-[1600px] mx-auto min-h-[calc(100vh-4rem)]">
      <Outlet />
    </main>
    <Footer />
  </>
);

// Authenticated application layout using AppShell (NO marketing Navbar or Footer)
const AuthenticatedAppLayout = () => (
  <ProtectedRoute>
    <AppShell>
      <Outlet />
    </AppShell>
  </ProtectedRoute>
);

function App() {
  return (
    <div className="bg-bone text-graphite min-h-screen font-sans selection:bg-graphite selection:text-bone">
      <ScrollToTop />
      <div className="noise-bg" />
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          {/* Public Marketing Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<MarketingPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/technology" element={<TechnologyPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/register" element={<Navigate to="/signup" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Authenticated Onboarding Flow (Standalone Protected View without Sidebar) */}
          <Route
            path="/onboarding/*"
            element={
              <ProtectedRoute>
                <main className="min-h-screen max-w-[1600px] mx-auto">
                  <OnboardingPage />
                </main>
              </ProtectedRoute>
            }
          />

          {/* Authenticated Dashboard & Feature Routes (inside AppShell) */}
          <Route element={<AuthenticatedAppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/workout" element={<WorkoutOverviewPage />} />
            <Route path="/workout/session" element={<WorkoutSessionPage />} />
            <Route path="/workout/history" element={<WorkoutHistoryPage />} />
            <Route path="/workout/exercise/:id" element={<ExerciseDetailPage />} />
            <Route path="/workout/catalog/:id" element={<ExerciseDetailPage />} />
            <Route path="/nutrition" element={<NutritionOverviewPage />} />
            <Route path="/nutrition/log" element={<FoodLoggerPage />} />
            <Route path="/nutrition/history" element={<NutritionHistoryPage />} />
            <Route path="/progress" element={<ProgressOverviewPage />} />
            <Route path="/progress/measurements" element={<ProgressOverviewPage />} />
            <Route path="/coach" element={<CoachPage />} />
            <Route
              path="/reports/*"
              element={
                <div className="border border-borderLine p-8 text-center bg-bone">
                  <span className="font-mono text-xs text-olive uppercase tracking-widest block mb-2">Analytics & Summaries</span>
                  <h2 className="text-2xl font-bold uppercase tracking-tighter">Reports Archive</h2>
                  <p className="text-sm text-charcoal mt-2">Weekly and monthly fitness summaries will be archived here.</p>
                </div>
              }
            />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
