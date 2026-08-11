import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const KnowsYou: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const profile = [
    { label: 'Goal', value: 'Build Muscle', highlight: true },
    { label: 'Weight', value: '72 KG' },
    { label: 'Training', value: '5 Days / Week', highlight: true },
    { label: 'Protein Target', value: '140 G' },
    { label: 'Equipment', value: 'Full Gym' },
    { label: 'Preference', value: 'No Broccoli' },
    { label: 'Recent Trend', value: 'Protein ↓', highlight: true },
  ];

  return (
    <section className="border-b border-borderLine py-24" ref={ref}>
      <div className="max-w-[1400px] mx-auto px-8 md:px-16">
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <span className="text-[10px] font-mono tracking-widest text-olive uppercase block mb-4">Personalization</span>
          <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter uppercase leading-none">
            Your coach should know<br />
            <span className="text-faded">more than your weight.</span>
          </h2>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-12 items-stretch lg:items-start">
          {/* User Profile Dossier */}
          <motion.div
            className="flex-1 w-full border border-borderLine"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="border-b border-borderLine px-6 py-4 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-faded uppercase">Your Profile</span>
              <span className="text-[10px] font-mono text-olive uppercase tracking-widest">Active Context</span>
            </div>
            <div className="divide-y divide-borderLine">
              {profile.map(item => (
                <div key={item.label} className="px-6 py-4 flex justify-between items-center">
                  <span className="text-[10px] font-mono tracking-widest text-faded uppercase">{item.label}</span>
                  <span className={`text-base font-bold tracking-tighter ${item.highlight ? 'text-olive italic' : 'text-graphite'}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Resulting Guidance */}
          <motion.div
            className="flex-1 w-full flex flex-col gap-6"
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="bg-graphite text-bone p-8 border border-graphite">
              <span className="block text-[9px] font-mono text-olive uppercase tracking-widest mb-4">FitMind AI</span>
              <p className="text-xl md:text-2xl font-medium leading-snug">
                "Your protein intake has been below target for four days. Let's adjust today's meals."
              </p>
            </div>

            <div className="border border-borderLine p-6">
              <span className="block text-[9px] font-mono text-faded uppercase tracking-widest mb-4">Context Used</span>
              <div className="space-y-3">
                {['Goal: Muscle Gain', 'Target Protein: 140g', 'Protein Trend: ↓ 4 days', 'Training Frequency: 5x/week'].map(c => (
                  <div key={c} className="flex items-center gap-3">
                    <span className="w-1 h-1 rounded-full bg-olive flex-shrink-0" />
                    <span className="text-sm font-mono text-charcoal">{c}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-sm text-charcoal font-medium leading-relaxed border-l-4 border-graphite pl-4">
              FitMind builds a complete picture of your journey — not just today's numbers.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default KnowsYou;
