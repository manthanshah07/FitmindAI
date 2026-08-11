import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const Hero: React.FC = () => {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, -200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, 150]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative min-h-[90vh] flex flex-col md:flex-row items-stretch border-b border-borderLine">
      {/* Left Typography Section */}
      <div className="flex-1 p-6 md:p-16 flex flex-col justify-center border-b md:border-b-0 md:border-r border-borderLine">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <span className="text-xs font-mono tracking-widest text-olive uppercase">FitMind AI / 01</span>
            <div className="h-px w-12 bg-olive/50"></div>
          </div>
          
          <h1 className="text-7xl md:text-[8rem] lg:text-[10rem] font-bold tracking-tighter leading-[0.85] text-graphite mb-12 uppercase">
            Your<br />
            Fitness<br />
            Journey<br />
            <span className="text-olive italic">Remembers.</span>
          </h1>

          <p className="text-xl md:text-2xl text-charcoal max-w-xl leading-snug font-medium border-l-4 border-graphite pl-6">
            FitMind AI is an experimental coaching system that builds a persistent memory of your habits, constraints, and progress to continuously adapt its guidance.
          </p>
        </motion.div>
      </div>

      {/* Right Data Stream Section */}
      <div className="w-full md:w-[400px] lg:w-[500px] bg-graphite text-bone relative overflow-hidden flex flex-col justify-center p-8 md:p-16">
        <div className="absolute top-0 right-0 p-6 text-xs font-mono text-bone/30 uppercase tracking-widest">
          Memory Archive
        </div>
        
        {mounted && (
          <div className="relative h-[600px] w-full">
            {/* Stream 1 - Scrolling UP */}
            <motion.div style={{ y: y1 }} className="absolute left-0 top-1/4 space-y-12 w-full">
              <div className="flex flex-col">
                <span className="text-xs font-mono text-faded uppercase tracking-widest mb-1">Bodyweight</span>
                <span className="text-5xl font-bold tracking-tighter">72.4 KG</span>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-xs font-mono text-faded uppercase tracking-widest mb-1">Current Goal</span>
                <span className="text-4xl font-bold tracking-tighter italic text-olive">LEAN BULK</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-mono text-faded uppercase tracking-widest mb-1">Frequency</span>
                <span className="text-5xl font-bold tracking-tighter">5 DAYS/WK</span>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-xs font-mono text-faded uppercase tracking-widest mb-1">Constraint</span>
                <span className="text-3xl font-bold tracking-tighter line-through text-bone/50">DAIRY</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-mono text-faded uppercase tracking-widest mb-1">Workout Streak</span>
                <span className="text-6xl font-bold tracking-tighter">18</span>
              </div>
            </motion.div>

            {/* Stream 2 - Scrolling DOWN (overlay/background) */}
            <motion.div style={{ y: y2 }} className="absolute right-0 bottom-1/4 space-y-16 opacity-30 pointer-events-none w-full text-right">
              <div className="flex flex-col">
                <span className="text-xs font-mono uppercase tracking-widest mb-1">Chest</span>
                <span className="text-4xl font-bold tracking-tighter">↑ 1.2 CM</span>
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="text-xs font-mono uppercase tracking-widest mb-1">Avg Sleep</span>
                <span className="text-5xl font-bold tracking-tighter">6H 12M</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-mono uppercase tracking-widest mb-1">Max PR</span>
                <span className="text-4xl font-bold tracking-tighter">102.5 KG</span>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Hero;
