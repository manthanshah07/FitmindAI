import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const milestones = [
  {
    label: 'Day 1',
    title: 'You tell FitMind who you are.',
    items: ['Goal', 'Weight', 'Experience', 'Preferences', 'Equipment'],
    bg: false,
  },
  {
    label: 'Week 2',
    title: 'FitMind learns your patterns.',
    items: ['Workout consistency', 'Meal habits', 'Sleep trends', 'Preferred rest days'],
    bg: false,
  },
  {
    label: 'Week 6',
    title: 'FitMind understands your body.',
    items: ['Strength progression', 'Nutrition trends', 'Recovery patterns', 'Progress pace'],
    bg: true,
  },
  {
    label: 'Week 12',
    title: 'Your guidance becomes truly yours.',
    items: ['Highly personalized plans', 'Proactive adaptation', 'Context-aware coaching', 'Relevant memory'],
    bg: true,
  },
];

const MemoryDifference: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="border-b border-borderLine py-24 bg-bone" ref={ref}>
      <div className="max-w-[1400px] mx-auto px-8 md:px-16">
        <motion.div
          className="mb-20 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <span className="text-[10px] font-mono tracking-widest text-olive uppercase block mb-4">Persistent Memory</span>
          <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter uppercase leading-none">
            The longer you use FitMind,<br />
            <span className="text-faded">the better it understands you.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-borderLine">
          {milestones.map((m, i) => (
            <motion.div
              key={m.label}
              className={`p-8 ${i < milestones.length - 1 ? 'border-b lg:border-b-0 lg:border-r border-borderLine' : ''} ${m.bg ? 'bg-graphite text-bone' : 'bg-bone text-graphite'} flex flex-col justify-between min-h-[320px]`}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.12 }}
            >
              <div>
                <span className={`text-[9px] font-mono tracking-widest uppercase block mb-2 ${m.bg ? 'text-olive' : 'text-faded'}`}>
                  {m.label}
                </span>
                <h3 className="text-xl font-bold tracking-tighter leading-tight mb-6">{m.title}</h3>
                <ul className="space-y-2">
                  {m.items.map(item => (
                    <li key={item} className={`text-sm font-medium ${m.bg ? 'text-bone/70' : 'text-charcoal'}`}>
                      — {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`mt-8 text-4xl font-bold tracking-tighter ${m.bg ? 'text-olive/30' : 'text-graphite/10'}`}>
                {String(i + 1).padStart(2, '0')}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MemoryDifference;
