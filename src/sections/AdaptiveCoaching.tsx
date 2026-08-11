import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const AdaptiveCoaching: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-32 relative border-b border-borderLine bg-graphite text-bone" id="adaptation" ref={ref}>
      <div className="absolute top-12 left-12">
        <span className="text-xs font-mono tracking-widest text-olive uppercase">05 / Adaptation System</span>
      </div>

      <div className="max-w-[1000px] mx-auto px-6 md:px-12 flex flex-col md:flex-row gap-16 md:gap-32">
        
        {/* Left Side: Editorial Typography */}
        <div className="flex-1 md:sticky top-32 h-fit">
           <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase mb-6 leading-none">
              The Plan<br />
              <span className="text-olive italic">Evolves.</span>
            </h2>
            <div className="h-px w-full bg-charcoal mb-8"></div>
            <p className="text-lg text-faded font-medium leading-relaxed">
              FitMind AI continuously evaluates your physiological data and adapts future recommendations. It operates as a continuous feedback loop.
            </p>
          </motion.div>
        </div>

        {/* Right Side: The Vertical Decision Timeline */}
        <div className="flex-1 relative">
          {/* Vertical Line */}
          <div className="absolute left-[39px] top-0 bottom-0 w-px bg-charcoal z-0"></div>

          <div className="space-y-16 relative z-10">
            
            {/* DATA POINTS */}
            <motion.div 
              className="flex items-start gap-8"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="w-20 pt-1 text-right flex-shrink-0">
                <span className="text-xs font-mono text-faded uppercase tracking-widest block">Week 01</span>
              </div>
              <div className="border border-borderLine bg-graphite px-6 py-4">
                <span className="text-2xl font-bold tracking-tight">52.0 KG</span>
              </div>
            </motion.div>

            <motion.div 
              className="flex items-start gap-8"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="w-20 pt-1 text-right flex-shrink-0">
                <span className="text-xs font-mono text-faded uppercase tracking-widest block">Week 03</span>
              </div>
              <div className="border border-borderLine bg-graphite px-6 py-4">
                <span className="text-2xl font-bold tracking-tight">52.1 KG</span>
              </div>
            </motion.div>

            <motion.div 
              className="flex items-start gap-8"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="w-20 pt-1 text-right flex-shrink-0">
                <span className="text-xs font-mono text-faded uppercase tracking-widest block">Week 05</span>
              </div>
              <div className="border border-charcoal bg-charcoal px-6 py-4 text-bone opacity-70">
                <span className="text-2xl font-bold tracking-tight">52.0 KG</span>
              </div>
            </motion.div>

            {/* DETECTION */}
            <motion.div 
              className="flex items-start gap-8"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div className="w-20 pt-1 text-right flex-shrink-0">
                <span className="text-[10px] font-mono text-olive uppercase tracking-widest block mt-4">Detect</span>
              </div>
              <div className="border-l-4 border-olive pl-6 py-2 bg-graphite">
                <span className="text-lg font-bold tracking-tighter uppercase text-olive">Plateau Detected</span>
                <p className="text-xs font-mono text-faded uppercase tracking-widest mt-1">Weight stagnated for 3 weeks</p>
              </div>
            </motion.div>

            {/* DECISION */}
            <motion.div 
              className="flex items-start gap-8"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="w-20 pt-1 text-right flex-shrink-0">
                <span className="text-[10px] font-mono text-bone uppercase tracking-widest block mt-2">Adapt</span>
              </div>
              <div className="border border-bone p-6 bg-bone text-graphite inline-block">
                <span className="text-xs font-mono text-graphite/60 uppercase tracking-widest block mb-2">Calorie Target</span>
                <span className="text-3xl font-bold tracking-tighter italic">+ 180 KCAL</span>
              </div>
            </motion.div>

            {/* RESULT */}
            <motion.div 
              className="flex items-start gap-8"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              <div className="w-20 pt-1 text-right flex-shrink-0">
                <span className="text-xs font-mono text-faded uppercase tracking-widest block mt-2">Week 07</span>
              </div>
              <div className="border-l-4 border-bone pl-6 py-2 bg-graphite">
                <span className="text-3xl font-bold tracking-tight text-bone">53.2 KG</span>
                <p className="text-xs font-mono text-olive uppercase tracking-widest mt-1 italic">Trend Resumed</p>
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default AdaptiveCoaching;
