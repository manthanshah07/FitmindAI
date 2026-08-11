import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const steps = [
  { num: '01', title: 'Tell FitMind about yourself.', desc: 'Your goal, experience, equipment, and dietary preferences.' },
  { num: '02', title: 'Get your personalized starting plan.', desc: 'A workout plan and nutrition targets built for where you are right now.' },
  { num: '03', title: 'Log workouts, meals, and progress.', desc: 'Track your journey the way you naturally would.' },
  { num: '04', title: 'FitMind learns from your journey.', desc: 'Every session teaches FitMind more about your habits and patterns.' },
  { num: '05', title: 'Your guidance adapts.', desc: 'Plans, targets, and coaching evolve automatically as you do.' },
];

const HowItWorksSimple: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="border-b border-borderLine py-24 bg-bone" ref={ref}>
      <div className="max-w-[1400px] mx-auto px-8 md:px-16">
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <span className="text-[10px] font-mono tracking-widest text-olive uppercase block mb-4">How It Works</span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter uppercase leading-none">
            Simple to start.<br />
            <span className="text-faded">Powerful over time.</span>
          </h2>
        </motion.div>

        <div className="space-y-0 border border-borderLine">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              className={`flex flex-col md:flex-row md:items-center gap-6 p-8 ${i < steps.length - 1 ? 'border-b border-borderLine' : ''} group hover:bg-graphite hover:text-bone transition-colors duration-300`}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <span className="text-4xl md:text-5xl font-bold tracking-tighter text-graphite/10 group-hover:text-bone/20 transition-colors w-20 flex-shrink-0">{step.num}</span>
              <div className="flex-1">
                <h3 className="text-xl md:text-2xl font-bold tracking-tighter mb-2">{step.title}</h3>
                <p className="text-sm text-charcoal group-hover:text-bone/60 font-medium transition-colors">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSimple;
