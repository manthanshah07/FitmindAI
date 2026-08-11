import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'System', href: '#architecture' },
    { name: 'Memory', href: '#memory' },
    { name: 'Coaching', href: '#coaching' },
    { name: 'Scope', href: '#scope' },
  ];

  return (
    <nav
      className={`fixed top-0 w-full z-40 transition-all duration-300 border-b border-borderLine bg-bone ${
        scrolled ? 'py-4' : 'py-6'
      }`}
    >
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="text-xl font-bold tracking-tighter uppercase text-graphite">
            FitMind AI
          </span>
          <span className="hidden md:block text-xs font-mono text-faded uppercase tracking-widest border-l border-borderLine pl-4">
            Project Case Study
          </span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-12">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-xs font-mono font-medium text-charcoal hover:text-olive transition-colors uppercase tracking-widest"
            >
              {link.name}
            </a>
          ))}
          <a
            href="#explore"
            className="px-6 py-3 text-xs font-bold font-mono tracking-widest uppercase bg-graphite text-bone hover:bg-charcoal transition-colors"
          >
            Explore System
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden text-graphite"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 w-full bg-bone border-b border-borderLine p-6 md:hidden flex flex-col gap-6"
          >
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-2xl font-bold tracking-tight text-graphite hover:text-olive transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
