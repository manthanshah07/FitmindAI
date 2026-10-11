import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Activity, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const navLinks = [
  { label: 'Features', to: '/#features' },
  { label: 'Workouts', to: '/how-it-works' },
  { label: 'AI Coach', to: '/technology' },
  { label: 'Pricing', to: '/about' },
];

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#080C1E]/90 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
          : 'bg-[#080C1E]/75 backdrop-blur-md border-b border-white/[0.06]'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Calibrated FitMind AI Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400/20 to-cyan-500/20 border border-emerald-400/30 flex items-center justify-center shadow-[0_0_16px_rgba(16,185,129,0.2)] group-hover:border-emerald-400/60 transition-colors">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold tracking-tight text-slate-50 group-hover:text-white transition-colors">
              FitMind <span className="text-emerald-400">AI</span>
            </span>
            <div className="h-3.5 w-px bg-white/10 hidden sm:block" />
            <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase hidden sm:block">
              Adaptive Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links with underline hover states */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive =
              link.to === '/'
                ? location.pathname === '/'
                : location.pathname === link.to;
            return (
              <Link
                key={link.label}
                to={link.to}
                className={`relative px-3.5 py-2 text-xs font-medium tracking-wide transition-colors after:content-[''] after:absolute after:bottom-1 after:left-3.5 after:right-3.5 after:h-[2px] after:rounded-full after:bg-gradient-to-r after:from-emerald-400 after:to-cyan-400 after:transition-transform after:duration-300 ${
                  isActive
                    ? 'text-slate-50 after:scale-x-100'
                    : 'text-slate-300 hover:text-white after:scale-x-0 hover:after:scale-x-100'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={handleLogout}
                className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                Log Out
              </button>
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-semibold text-xs hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                Go To Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                aria-label="Log In"
                className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                aria-label="Start Your Journey"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-950 font-semibold text-xs hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-slate-200 hover:text-white hover:bg-white/5 transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/[0.08] bg-[#0B122F]/98 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-5 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className={`block py-2.5 border-b border-white/[0.06] text-xs font-medium ${
                    location.pathname === link.to ? 'text-emerald-400 font-semibold' : 'text-slate-300'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 space-y-2.5">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="block py-2.5 rounded-lg text-center bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-950 text-xs font-semibold"
                    >
                      Go To Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full py-2.5 rounded-lg text-center border border-white/15 text-xs font-medium text-slate-300"
                    >
                      Log Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      aria-label="Log In"
                      className="block py-2.5 rounded-lg text-center border border-white/15 text-xs font-medium text-slate-200"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/signup"
                      aria-label="Start Your Journey"
                      className="block py-2.5 rounded-lg text-center bg-gradient-to-r from-emerald-500 to-cyan-400 text-slate-950 text-xs font-semibold"
                    >
                      Get Started Free
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
