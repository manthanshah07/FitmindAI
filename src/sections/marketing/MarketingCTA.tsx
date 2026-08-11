import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';

const MarketingCTA: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="py-32 bg-graphite text-bone border-b border-charcoal" ref={ref}>
      <div className="max-w-[1400px] mx-auto px-8 md:px-16">
        <div className="flex flex-col md:flex-row gap-16 items-end justify-between">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter uppercase leading-none mb-6">
              Ready to build a plan<br />
              <span className="text-olive italic">that knows you?</span>
            </h2>
            <p className="text-xl text-bone/60 font-medium max-w-lg leading-relaxed mb-10">
              Start with your goals. Let FitMind learn the rest.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link
                to="/signup"
                className="px-8 py-5 bg-bone text-graphite font-bold tracking-widest uppercase text-xs hover:bg-accent transition-colors text-center w-full sm:w-auto"
              >
                Start Your Journey
              </Link>
              <Link
                to="/how-it-works"
                className="px-8 py-5 border border-charcoal text-bone font-bold tracking-widest uppercase text-xs hover:border-bone transition-colors text-center w-full sm:w-auto"
              >
                Explore How It Works
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="text-right"
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="block text-xl font-bold tracking-tighter uppercase mb-2">FitMind AI</span>
            <span className="block text-[9px] font-mono text-faded uppercase tracking-widest leading-relaxed">
              Personalized AI Fitness Coach<br />
              Final Year Engineering Project
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MarketingCTA;
