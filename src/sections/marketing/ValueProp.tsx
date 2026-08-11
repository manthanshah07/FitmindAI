import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const ValueProp: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="border-b border-borderLine" ref={ref}>
      <div className="flex flex-col md:flex-row">
        {/* Left: headline */}
        <div className="flex-1 p-8 md:p-16 flex flex-col justify-center border-b md:border-b-0 md:border-r border-borderLine">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <span className="text-[10px] font-mono tracking-widest text-olive uppercase block mb-6">The Difference</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-none uppercase mb-6">
              Not another<br />
              <span className="text-olive italic">fitness tracker.</span>
            </h2>
            <p className="text-lg text-charcoal font-medium max-w-md leading-relaxed">
              Most apps record what you did.
              FitMind helps you understand what to do next.
            </p>
          </motion.div>
        </div>

        {/* Right: Tracking vs Coaching contrast */}
        <div className="flex-1 grid grid-cols-2">
          {/* TRACKING */}
          <motion.div
            className="p-8 md:p-12 border-r border-borderLine flex flex-col gap-6"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="text-[10px] font-mono tracking-widest text-faded uppercase">Tracking</span>
            <div className="space-y-4">
              {['Weight', 'Calories', 'Workouts', 'Meals'].map(item => (
                <div key={item} className="border-b border-borderLine pb-2">
                  <span className="text-lg font-medium tracking-tight text-charcoal">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-xs font-mono text-faded tracking-widest uppercase">Records history</p>
          </motion.div>

          {/* COACHING */}
          <motion.div
            className="p-8 md:p-12 bg-graphite text-bone flex flex-col gap-6"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <span className="text-[10px] font-mono tracking-widest text-olive uppercase">FitMind Coaching</span>
            <div className="space-y-4">
              {['Understand', 'Adapt', 'Recommend', 'Improve'].map(item => (
                <div key={item} className="border-b border-charcoal pb-2">
                  <span className="text-lg font-bold tracking-tighter italic text-olive">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-xs font-mono text-faded tracking-widest uppercase">Drives results</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ValueProp;
