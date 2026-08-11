import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const Problem: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"]
  });

  const x1 = useTransform(scrollYProgress, [0, 1], [-200, 0]);
  const x2 = useTransform(scrollYProgress, [0, 1], [200, 0]);
  const y1 = useTransform(scrollYProgress, [0, 1], [-150, 0]);
  const y2 = useTransform(scrollYProgress, [0, 1], [150, 0]);
  const opacity = useTransform(scrollYProgress, [0.8, 1], [0, 1]);

  return (
    <section className="min-h-screen flex items-center justify-center border-b border-borderLine relative bg-graphite text-bone" ref={containerRef}>
      
      <div className="absolute top-12 left-12">
        <span className="text-xs font-mono tracking-widest text-olive uppercase">02 / The Problem</span>
      </div>

      <div className="text-center w-full max-w-5xl px-6 relative h-[600px] flex items-center justify-center">
        
        {/* Scattered elements that converge */}
        <motion.div style={{ x: x1, y: y1 }} className="absolute top-20 left-20">
          <span className="text-2xl font-bold tracking-tighter opacity-50">72 KG</span>
        </motion.div>
        
        <motion.div style={{ x: x2, y: y1 }} className="absolute top-32 right-32">
          <span className="text-3xl font-bold tracking-tighter text-olive">PROTEIN</span>
        </motion.div>

        <motion.div style={{ x: x1, y: y2 }} className="absolute bottom-40 left-32">
          <span className="text-4xl font-bold tracking-tighter italic opacity-30">5 DAYS</span>
        </motion.div>

        <motion.div style={{ x: x2, y: y2 }} className="absolute bottom-20 right-40">
          <span className="text-2xl font-bold tracking-tighter opacity-70">SLEEP</span>
        </motion.div>

        <motion.div style={{ x: x1, y: 0 }} className="absolute top-1/2 left-10 -translate-y-1/2">
          <span className="text-xl font-bold tracking-widest opacity-40">CALORIES</span>
        </motion.div>

        <motion.div style={{ x: x2, y: 0 }} className="absolute top-1/2 right-10 -translate-y-1/2">
          <span className="text-xl font-bold tracking-tighter text-olive">PR 102.5</span>
        </motion.div>

        {/* Central convergence text */}
        <motion.div style={{ opacity }} className="relative z-10 flex flex-col items-center">
          <div className="border border-bone p-8 bg-graphite">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase mb-2">
              Unified<br />Context.
            </h2>
            <div className="h-px w-full bg-bone/30 my-4"></div>
            <p className="text-sm font-mono tracking-widest text-olive uppercase">
              FitMind AI / Core Principle
            </p>
          </div>
          <p className="text-lg md:text-xl text-faded max-w-lg mx-auto mt-12 font-medium">
            Fitness data is naturally fragmented across multiple domains. Instead of tracking data points in isolation, the system organizes them into a single, cohesive profile.
          </p>
        </motion.div>

      </div>
    </section>
  );
};

export default Problem;
