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
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));

const PageLoadingFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center p-8 bg-bone">
    <span className="font-mono text-xs text-olive uppercase tracking-widest animate-pulse font-bold">
      Loading...
    </span>
  </div>
);

export function App() {
  return (
    <div className="min-h-screen bg-bone text-graphite font-sans antialiased selection:bg-olive selection:text-white">
      <ScrollToTop />
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          {/* Public Marketing Layout Routes */}
          <Route
            element={
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-grow">
                  <Outlet />
                </main>
                <Footer />
              </div>
            }
          >
            <Route path="/" element={<MarketingPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/technology" element={<TechnologyPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>

          {/* Protected Onboarding Flow */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Authenticated Dashboard AppShell Layout Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
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
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/*" element={<ReportsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;
