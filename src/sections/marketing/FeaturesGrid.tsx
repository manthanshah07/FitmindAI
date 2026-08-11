import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const features = [
  { num: '01', title: 'AI Coach', desc: 'Personalized conversational guidance built around your actual data and history.' },
  { num: '02', title: 'Smart Workouts', desc: 'Adaptive plans based on your goals, equipment, and performance trends.' },
  { num: '03', title: 'Nutrition', desc: 'Natural-language meal logging with macro tracking and AI-powered feedback.' },
  { num: '04', title: 'Progress', desc: 'Visual trends that turn raw numbers into insight you can act on.' },
  { num: '05', title: 'Memory', desc: 'Your preferences, habits, and history stay relevant across every session.' },
  { num: '06', title: 'Adaptation', desc: 'Recommendations that automatically change as your habits evolve.' },
];

const FeaturesGrid: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="border-b border-borderLine py-24 bg-graphite text-bone" ref={ref}>
      <div className="max-w-[1400px] mx-auto px-8 md:px-16">
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <span className="text-[10px] font-mono tracking-widest text-olive uppercase block mb-4">Capabilities</span>
          <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter uppercase leading-none">
            Everything in one place.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 border border-charcoal">
          {features.map((f, i) => (
            <motion.div
              key={f.num}
              className={`p-8 border-b border-charcoal ${i % 3 !== 2 ? 'lg:border-r border-charcoal' : ''} ${Math.floor(i / 3) === Math.floor((features.length - 1) / 3) ? 'border-b-0' : ''} flex flex-col gap-4 group hover:bg-charcoal transition-colors duration-300`}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <span className="text-[9px] font-mono text-faded uppercase tracking-widest">{f.num}</span>
              <h3 className="text-2xl font-bold tracking-tighter uppercase group-hover:text-olive transition-colors duration-300">{f.title}</h3>
              <p className="text-sm text-bone/60 font-medium leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
