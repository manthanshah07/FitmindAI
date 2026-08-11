import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="py-24 bg-graphite text-bone relative overflow-hidden border-t border-charcoal">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12">
        {/* Top row: tagline + CTA */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-16 mb-16 pb-16 border-b border-charcoal">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none mb-8">
              Fitness tracking<br />
              <span className="text-charcoal italic">tells you where you are.</span><br />
              FitMind AI helps you<br />
              <span className="text-olive italic">decide what to do next.</span>
            </h2>
            <Link
              to="/signup"
              className="px-8 py-4 bg-bone text-graphite font-bold tracking-widest uppercase text-xs hover:bg-accent transition-colors inline-block"
            >
              Start Your Journey
            </Link>
          </div>

          <div className="text-right">
            <span className="block text-xl font-bold tracking-tighter uppercase mb-2 text-bone">FitMind AI</span>
            <span className="block text-xs font-mono tracking-widest uppercase text-faded">
              Final Year Engineering Project<br />
              Personalized AI Fitness Coach
            </span>
          </div>
        </div>

        {/* Bottom row: nav links */}
        <div className="flex flex-wrap gap-8 justify-between items-center">
          <div className="flex flex-wrap gap-6">
            {[
              { label: 'Product', to: '/' },
              { label: 'How It Works', to: '/how-it-works' },
              { label: 'Technology', to: '/technology' },
              { label: 'About', to: '/about' },
            ].map(link => (
              <Link
                key={link.label}
                to={link.to}
                className="text-[9px] font-mono tracking-widest text-faded uppercase hover:text-bone transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <span className="text-[9px] font-mono tracking-widest text-faded uppercase">
            © 2026 FitMind AI
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

