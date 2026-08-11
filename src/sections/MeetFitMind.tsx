import React from 'react';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

const MeetFitMind: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-32 relative border-b border-borderLine" id="coaching" ref={ref}>
      <div className="absolute top-12 left-12">
        <span className="text-xs font-mono tracking-widest text-olive uppercase">03 / The Coach</span>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 md:px-12 flex flex-col lg:flex-row gap-20">
        
        {/* Left Typography */}
        <div className="flex-1 pt-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-none uppercase text-graphite">
              Not just a tracker.<br />
              <span className="text-olive italic">A coach that remembers.</span>
            </h2>
            <div className="h-px w-24 bg-charcoal mb-8"></div>
            <p className="text-xl text-charcoal font-medium leading-relaxed max-w-lg">
              FitMind AI combines structured fitness tracking with persistent memory. It doesn't just log data; it understands your context, restrictions, and history to give you genuinely personalized guidance.
            </p>
          </motion.div>
        </div>

        {/* Right Editorial Conversation */}
        <div className="flex-1 relative">
          <motion.div 
            className="border-l border-borderLine pl-8 py-8"
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Conversation Thread */}
            <div className="space-y-12">
              
              {/* User Input */}
              <div className="relative">
                <span className="absolute -left-12 top-1 text-xs font-mono text-faded uppercase transform -rotate-90 origin-top-right">Input</span>
                <p className="text-2xl font-bold tracking-tight text-graphite">
                  "I want to gain muscle, but I don't have much time to train this month."
                </p>
              </div>

              {/* System Process */}
              <div className="pl-6 border-l-2 border-olive">
                <span className="block text-xs font-mono text-olive uppercase tracking-widest mb-2">System Processing</span>
                <div className="flex items-center gap-4 text-xs font-mono text-graphite bg-white border border-borderLine p-2 inline-flex">
                  <span className="uppercase font-bold">Action</span>
                  <span className="text-faded">Update profile &rarr; Muscle Gain</span>
                  <span className="text-faded">Shift plan &rarr; 30m HIIT</span>
                </div>
              </div>

              {/* AI Output */}
              <div className="relative bg-graphite text-bone p-8">
                <span className="absolute -left-12 top-8 text-xs font-mono text-olive uppercase transform -rotate-90 origin-top-right">Output</span>
                <p className="text-xl font-medium leading-snug">
                  "I'll update your profile to prioritize muscle gain while shifting your plan to efficient 30-minute high-intensity sessions."
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MeetFitMind;
