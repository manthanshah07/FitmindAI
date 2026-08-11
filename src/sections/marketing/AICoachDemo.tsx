import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const AICoachDemo: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="border-b border-borderLine py-24 bg-graphite text-bone" ref={ref}>
      <div className="max-w-[1200px] mx-auto px-8 md:px-16">
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <span className="text-[10px] font-mono tracking-widest text-olive uppercase block mb-4">AI Coach</span>
          <h2 className="text-4xl md:text-5xl lg:text-7xl font-bold tracking-tighter uppercase leading-none">
            A coach that responds<br />
            <span className="text-olive italic">to your context.</span>
          </h2>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Conversation */}
          <div className="flex-1 space-y-4">
            {/* User message */}
            <motion.div
              className="flex justify-end"
              initial={{ opacity: 0, x: 20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-charcoal border border-charcoal p-5 max-w-sm">
                <span className="text-[9px] font-mono text-faded uppercase tracking-widest block mb-2">You</span>
                <p className="text-base font-medium leading-relaxed">
                  "I've been feeling tired lately. Should I train today?"
                </p>
              </div>
            </motion.div>

            {/* AI Response */}
            <motion.div
              className="flex justify-start"
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="bg-bone text-graphite p-6 max-w-sm border border-bone">
                <span className="text-[9px] font-mono text-olive uppercase tracking-widest block mb-3">FitMind AI</span>
                <p className="text-base font-medium leading-relaxed">
                  "Your recent logs show lower sleep and reduced workout recovery. I'd keep today's session lighter rather than pushing your usual volume."
                </p>
              </div>
            </motion.div>
          </div>

          {/* Context Used */}
          <motion.div
            className="lg:w-72 border border-charcoal flex flex-col"
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <div className="border-b border-charcoal px-5 py-3">
              <span className="text-[9px] font-mono text-faded uppercase tracking-widest">Context Retrieved</span>
            </div>
            <div className="flex-1 divide-y divide-charcoal">
              {[
                { label: 'Avg Sleep (7d)', value: '5.8 HRS', trend: '↓', bad: true },
                { label: 'Recovery Score', value: '61 / 100', trend: '↓', bad: true },
                { label: 'Training Load', value: 'High', trend: '↑', bad: false },
                { label: 'Streak', value: '18 days', trend: '', bad: false },
              ].map(item => (
                <div key={item.label} className="px-5 py-4 flex justify-between items-center">
                  <span className="text-[9px] font-mono text-faded uppercase tracking-widest">{item.label}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold tracking-tighter text-bone">{item.value}</span>
                    {item.trend && (
                      <span className={`text-[10px] font-mono ${item.bad ? 'text-error' : 'text-olive'}`}>{item.trend}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-charcoal px-5 py-4">
              <p className="text-[10px] font-mono text-faded leading-relaxed">
                AI responds using your real data — not generic advice.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AICoachDemo;
