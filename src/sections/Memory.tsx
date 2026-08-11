import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const Memory: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-32 relative border-b border-borderLine bg-bone" id="memory" ref={ref}>
      <div className="absolute top-12 left-12">
        <span className="text-xs font-mono tracking-widest text-olive uppercase">04 / Persistent Memory</span>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div className="text-center mb-24">
          <h2 className="text-6xl md:text-8xl font-bold tracking-tighter uppercase text-graphite mb-6">
            Every User<br />Gets a Memory.
          </h2>
          <p className="text-xl text-charcoal font-medium max-w-2xl mx-auto">
            The AI builds a comprehensive understanding of your journey using three distinct memory layers, acting as an evolving personal dossier.
          </p>
        </div>

        {/* Dossier Visualization */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-y border-borderLine">
          
          {/* Static Memory */}
          <motion.div 
            className="p-8 border-b md:border-b-0 md:border-r border-borderLine flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-between items-center mb-8">
              <span className="text-3xl font-bold tracking-tighter">Static.</span>
              <span className="text-xs font-mono text-faded uppercase tracking-widest border border-borderLine px-2 py-1">Layer 01</span>
            </div>
            
            <div className="space-y-6 flex-1">
              {[
                { label: 'HEIGHT', value: '182 CM' },
                { label: 'GOAL', value: 'MUSCLE GAIN', highlight: true },
                { label: 'EQUIPMENT', value: 'DUMBBELLS + GYM' },
                { label: 'PREFERENCE', value: 'HIGH PROTEIN' },
              ].map(item => (
                <div key={item.label} className="border-b border-borderLine pb-2">
                  <div className="text-[10px] font-mono text-faded uppercase tracking-widest mb-1">{item.label}</div>
                  <div className={`text-lg font-bold tracking-tight ${item.highlight ? 'text-olive italic' : 'text-graphite'}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Dynamic Memory */}
          <motion.div 
            className="p-8 border-b md:border-b-0 md:border-r border-borderLine flex flex-col bg-graphite text-bone"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="flex justify-between items-center mb-8">
              <span className="text-3xl font-bold tracking-tighter">Dynamic.</span>
              <span className="text-xs font-mono text-faded uppercase tracking-widest border border-charcoal px-2 py-1">Layer 02</span>
            </div>
            
            <div className="space-y-6 flex-1">
              {[
                { label: 'WEIGHT TREND', value: '72.0 → 72.4 KG' },
                { label: 'BENCH PRESS', value: '40.0 → 47.5 KG', highlight: true },
                { label: 'PROTEIN AVG', value: '72G → 103G' },
                { label: 'SCORE', value: '84 / 100' },
              ].map(item => (
                <div key={item.label} className="border-b border-charcoal pb-2">
                  <div className="text-[10px] font-mono text-faded uppercase tracking-widest mb-1">{item.label}</div>
                  <div className={`text-lg font-bold tracking-tight ${item.highlight ? 'text-olive italic' : 'text-bone'}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Conversational Memory */}
          <motion.div 
            className="p-8 flex flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex justify-between items-center mb-8">
              <span className="text-3xl font-bold tracking-tighter">Conversational.</span>
              <span className="text-xs font-mono text-faded uppercase tracking-widest border border-borderLine px-2 py-1">Layer 03</span>
            </div>
            
            <div className="space-y-6 flex-1">
               {[
                { label: 'DISLIKES', value: 'BROCCOLI' },
                { label: 'TIME CONSTRAINT', value: '30 MINS TUE/THU', highlight: true },
                { label: 'INJURY HIST.', value: 'MILD SHOULDER PAIN' },
                { label: 'HABITS', value: 'SKIPS BREAKFAST' },
              ].map(item => (
                <div key={item.label} className="border-b border-borderLine pb-2">
                  <div className="text-[10px] font-mono text-faded uppercase tracking-widest mb-1">{item.label}</div>
                  <div className={`text-lg font-bold tracking-tight ${item.highlight ? 'text-olive italic' : 'text-graphite'}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default Memory;
