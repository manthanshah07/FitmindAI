import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const Timeline: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const steps = [
    { num: '01', title: 'Understand', desc: 'System parses personal info, fitness goals, baseline measurements, and dietary constraints.' },
    { num: '02', title: 'Analyze', desc: 'Deterministic backend creates an initial fitness assessment based on structured metrics.' },
    { num: '03', title: 'Plan', desc: 'AI generates personalized workout and nutrition guidance mapped to the assessment.' },
    { num: '04', title: 'Track', desc: 'User logs structured inputs: meals, sets, reps, weight, and biometrics over time.' },
    { num: '05', title: 'Remember', desc: 'Extracted insights automatically flow into the long-term contextual memory layer.' },
    { num: '06', title: 'Adapt', desc: 'System modifies future variables based on variance between expected and actual progress.' },
  ];

  return (
    <section className="py-32 relative border-b border-borderLine bg-bone" id="how-it-works" ref={ref}>
      <div className="absolute top-12 left-12">
        <span className="text-xs font-mono tracking-widest text-olive uppercase">05 / The Process</span>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="text-center mb-24">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase mb-6 leading-none">
            System Workflow.
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-16 gap-x-12">
          {steps.map((step, index) => (
            <motion.div 
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="border-t-2 border-graphite pt-6 relative"
            >
              <span className="absolute top-0 right-0 -mt-10 text-6xl font-bold tracking-tighter text-borderLine/50">{step.num}</span>
              <h3 className="text-2xl font-bold tracking-tighter uppercase mb-4 text-graphite">{step.title}</h3>
              <p className="text-charcoal font-medium leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Timeline;
