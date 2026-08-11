import React from 'react';
import Architecture from '../sections/Architecture';
import Scope from '../sections/Scope';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const TechnologyPage: React.FC = () => {
  return (
    <div>
      {/* Page Header */}
      <div className="border-b border-borderLine py-20 px-8 md:px-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <span className="text-[10px] font-mono tracking-widest text-olive uppercase block mb-4">Engineering</span>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase leading-none mb-6">
            The Technology<br />
            <span className="text-faded">Behind FitMind.</span>
          </h1>
          <p className="text-xl text-charcoal font-medium max-w-xl leading-relaxed">
            The architecture that enables persistent memory, deterministic calculations, and AI-powered coaching.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <span className="text-[10px] font-mono text-faded uppercase tracking-widest">Stack:</span>
            {['React', 'FastAPI', 'PostgreSQL', 'OpenAI', 'RAG'].map(t => (
              <span key={t} className="text-[9px] font-mono border border-borderLine px-3 py-1 text-charcoal uppercase tracking-widest">{t}</span>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Core principle callout */}
      <div className="border-b border-borderLine px-8 md:px-16 py-12 bg-graphite text-bone">
        <div className="max-w-3xl">
          <span className="text-[9px] font-mono text-olive uppercase tracking-widest block mb-4">Core Principle</span>
          <p className="text-3xl md:text-4xl font-bold tracking-tighter italic leading-snug">
            "Deterministic calculations stay in the backend. AI is used strictly for reasoning, explanation, and personalization."
          </p>
        </div>
      </div>

      {/* Reuse existing technical sections */}
      <Architecture />
      <Scope />

      {/* Bottom CTA */}
      <div className="border-t border-borderLine py-16 px-8 md:px-16 bg-bone flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-bold tracking-tighter uppercase mb-2">See it in action.</h3>
          <p className="text-charcoal font-medium">Experience the product built on this architecture.</p>
        </div>
        <Link
          to="/signup"
          className="px-8 py-4 bg-graphite text-bone font-bold tracking-widest uppercase text-xs hover:bg-charcoal transition-colors"
        >
          Start Your Journey
        </Link>
      </div>
    </div>
  );
};

export default TechnologyPage;
