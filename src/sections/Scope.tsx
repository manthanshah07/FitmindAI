import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const Scope: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const core = [
    'Authentication',
    'User profile',
    'Fitness assessment',
    'Workout planning',
    'Workout logging',
    'Food logging',
    'Nutrition analysis',
    'Progress tracking',
    'AI memory',
    'Adaptive coaching',
    'Fitness score',
    'Weekly/monthly reports'
  ];

  const future = [
    'AI food image recognition',
    'Barcode scanner',
    'Wearable integration',
    'Exercise form analysis',
    'Voice assistant',
    'Grocery recommendations'
  ];

  return (
    <section className="py-32 relative border-b border-borderLine bg-bone" id="scope" ref={ref}>
      <div className="absolute top-12 left-12">
        <span className="text-xs font-mono tracking-widest text-olive uppercase">08 / Project Bounds</span>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col md:flex-row gap-24">
        
        {/* Core Scope */}
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-2">Core Scope</h2>
            <div className="h-px w-full bg-graphite mb-12"></div>
            
            <ul className="space-y-4 font-mono text-sm tracking-widest uppercase">
              {core.map((item, index) => (
                <li key={item} className="flex items-center gap-6 border-b border-borderLine pb-2">
                  <span className="text-faded w-8">{(index + 1).toString().padStart(2, '0')}</span>
                  <span className="text-graphite font-bold">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Future Scope */}
        <div className="flex-1 opacity-60">
           <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase mb-2">Future Scope</h2>
            <div className="h-px w-full bg-charcoal mb-12"></div>
            
            <ul className="space-y-4 font-mono text-sm tracking-widest uppercase">
              {future.map((item, index) => (
                <li key={item} className="flex items-center gap-6 border-b border-borderLine pb-2">
                  <span className="text-borderLine w-8">{(index + 1).toString().padStart(2, '0')}</span>
                  <span className="text-charcoal line-through italic">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default Scope;
