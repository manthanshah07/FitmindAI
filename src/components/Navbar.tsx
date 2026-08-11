import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Product', to: '/' },
  { label: 'How It Works', to: '/how-it-works' },
  { label: 'Technology', to: '/technology' },
  { label: 'About', to: '/about' },
];

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-bone/95 backdrop-blur-sm border-b border-borderLine' : 'bg-bone border-b border-borderLine'
      }`}
    >
      <div className="max-w-[1600px] mx-auto flex items-center justify-between px-6 md:px-12 h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <span className="text-base font-bold tracking-tighter uppercase text-graphite group-hover:text-charcoal transition-colors">
            FitMind AI
          </span>
          <div className="h-3 w-px bg-borderLine" />
          <span className="text-[9px] font-mono tracking-widest text-olive uppercase hidden sm:block">
            AI Fitness Coach
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(link => (
            <Link
              key={link.label}
              to={link.to}
              className={`px-4 py-2 text-[10px] font-mono tracking-widest uppercase transition-colors ${
                location.pathname === link.to
                  ? 'text-graphite font-bold'
                  : 'text-charcoal hover:text-graphite'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-[10px] font-mono tracking-widest uppercase text-charcoal hover:text-graphite transition-colors"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="px-5 py-2.5 bg-graphite text-bone font-bold tracking-widest uppercase text-[10px] hover:bg-charcoal transition-colors"
          >
            Start Your Journey
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-graphite"
          onClick={() => setMenuOpen(v => !v)}
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
            className="md:hidden border-t border-borderLine bg-bone overflow-hidden"
          >
            <div className="px-6 py-4 space-y-1">
              {navLinks.map(link => (
                <Link
                  key={link.label}
                  to={link.to}
                  className={`block py-3 border-b border-borderLine text-[10px] font-mono tracking-widest uppercase ${
                    location.pathname === link.to ? 'text-graphite font-bold' : 'text-charcoal'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 space-y-3">
                <Link to="/login" className="block py-3 text-center border border-borderLine text-[10px] font-mono tracking-widest uppercase text-charcoal">
                  Log In
                </Link>
                <Link to="/signup" className="block py-3 text-center bg-graphite text-bone text-[10px] font-bold tracking-widest uppercase">
                  Start Your Journey
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
