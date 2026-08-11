import React from 'react';
import Problem from '../sections/Problem';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const AboutPage: React.FC = () => {
  return (
    <div>
      {/* Page Header */}
      <div className="border-b border-borderLine py-20 px-8 md:px-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <span className="text-[10px] font-mono tracking-widest text-olive uppercase block mb-4">About FitMind AI</span>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase leading-none mb-6">
            The Problem<br />
            <span className="text-faded">We're Solving.</span>
          </h1>
          <p className="text-xl text-charcoal font-medium max-w-xl leading-relaxed">
            Most fitness apps specialize in one domain. FitMind unifies them into a single experience centered around an AI coach that actually remembers you.
          </p>
        </motion.div>
      </div>

      {/* Reuse existing Problem section */}
      <Problem />

      {/* Vision statement */}
      <div className="border-b border-borderLine py-24 px-8 md:px-16 bg-graphite text-bone">
        <div className="max-w-[800px]">
          <span className="text-[9px] font-mono text-olive uppercase tracking-widest block mb-6">Project Vision</span>
          <p className="text-3xl md:text-4xl font-bold tracking-tighter leading-snug mb-8">
            FitMind AI is a final-year engineering project exploring how persistent AI memory can transform fitness coaching from reactive tracking into proactive, personalized guidance.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/how-it-works"
              className="px-8 py-4 bg-bone text-graphite font-bold tracking-widest uppercase text-xs hover:bg-accent transition-colors text-center"
            >
              How It Works
            </Link>
            <Link
              to="/technology"
              className="px-8 py-4 border border-charcoal text-bone font-bold tracking-widest uppercase text-xs hover:border-bone transition-colors text-center"
            >
              View Technology
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
