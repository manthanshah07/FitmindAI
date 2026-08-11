import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ScrollToTop from './components/ScrollToTop';
import MarketingPage from './pages/MarketingPage';
import HowItWorksPage from './pages/HowItWorksPage';
import TechnologyPage from './pages/TechnologyPage';
import AboutPage from './pages/AboutPage';
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
          {/* Auth routes — placeholder until Phase 1 */}
          <Route path="/login" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center border border-borderLine p-16">
                <span className="text-[9px] font-mono text-olive uppercase tracking-widest block mb-4">Coming in Phase 1</span>
                <h2 className="text-4xl font-bold tracking-tighter uppercase mb-4">Login</h2>
                <p className="text-charcoal font-medium">Authentication is in active development.</p>
              </div>
            </div>
          } />
          <Route path="/signup" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center border border-borderLine p-16">
                <span className="text-[9px] font-mono text-olive uppercase tracking-widest block mb-4">Coming in Phase 1</span>
                <h2 className="text-4xl font-bold tracking-tighter uppercase mb-4">Sign Up</h2>
                <p className="text-charcoal font-medium">Registration is in active development.</p>
              </div>
            </div>
          } />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
