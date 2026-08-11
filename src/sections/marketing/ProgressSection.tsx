import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

type Metric = { label: string; from: string; to: string; unit: string; up: boolean };

const metrics: Metric[] = [
  { label: 'Weight', from: '52', to: '54', unit: 'KG', up: true },
  { label: 'Protein', from: '72', to: '103', unit: 'G/day', up: true },
  { label: 'Workout adherence', from: '64', to: '91', unit: '%', up: true },
  { label: 'Fitness Score', from: '71', to: '84', unit: '/ 100', up: true },
];

const ProgressSection: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="border-b border-borderLine py-24 bg-bone" ref={ref}>
      <div className="max-w-[1400px] mx-auto px-8 md:px-16">
        <motion.div
          className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div>
            <span className="text-[10px] font-mono tracking-widest text-olive uppercase block mb-4">Progress</span>
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter uppercase leading-none">
              Don't just track progress.<br />
              <span className="text-faded">Understand it.</span>
            </h2>
          </div>
          <p className="text-lg text-charcoal font-medium max-w-sm leading-relaxed">
            FitMind turns raw fitness data into understandable trends and actionable guidance.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-borderLine">
          {metrics.map((m, i) => (
            <motion.div
              key={m.label}
              className={`p-8 flex flex-col justify-between ${i < metrics.length - 1 ? 'border-b lg:border-b-0 lg:border-r border-borderLine' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <span className="text-[9px] font-mono text-faded uppercase tracking-widest block mb-4">{m.label}</span>
              <div className="flex items-end gap-4">
                <div>
                  <span className="block text-2xl font-medium text-faded tracking-tighter line-through">{m.from}</span>
                  <span className="block text-5xl font-bold tracking-tighter text-graphite">{m.to}</span>
                  <span className="block text-[9px] font-mono text-olive uppercase tracking-widest mt-1">{m.unit}</span>
                </div>
                <span className="text-3xl font-bold text-olive mb-2">↑</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProgressSection;
