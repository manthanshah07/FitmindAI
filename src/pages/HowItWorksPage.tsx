import React from 'react';
import MeetFitMind from '../sections/MeetFitMind';
import Memory from '../sections/Memory';
import Timeline from '../sections/Timeline';
import AdaptiveCoaching from '../sections/AdaptiveCoaching';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const HowItWorksPage: React.FC = () => {
  return (
    <div>
      {/* Page Header */}
      <div className="border-b border-borderLine py-20 px-8 md:px-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <span className="text-[10px] font-mono tracking-widest text-olive uppercase block mb-4">Deep Dive</span>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase leading-none mb-6">
            How FitMind<br />
            <span className="text-faded">Works.</span>
          </h1>
          <p className="text-xl text-charcoal font-medium max-w-xl leading-relaxed">
            A detailed walkthrough of the FitMind coaching system — from understanding your goals to adapting your guidance over time.
          </p>
        </motion.div>
      </div>

      {/* Reuse existing detailed sections */}
      <MeetFitMind />
      <Memory />
      <Timeline />
      <AdaptiveCoaching />

      {/* Bottom CTA */}
      <div className="border-t border-borderLine py-16 px-8 md:px-16 bg-bone flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-bold tracking-tighter uppercase mb-2">Ready to get started?</h3>
          <p className="text-charcoal font-medium">Start your personalized fitness journey today.</p>
        </div>
        <div className="flex gap-4">
          <Link
            to="/signup"
            className="px-8 py-4 bg-graphite text-bone font-bold tracking-widest uppercase text-xs hover:bg-charcoal transition-colors"
          >
            Start Your Journey
          </Link>
          <Link
            to="/technology"
            className="px-8 py-4 border border-borderLine text-graphite font-bold tracking-widest uppercase text-xs hover:border-graphite transition-colors"
          >
            View Technology
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;
