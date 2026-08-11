import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const WorkoutPreview: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="border-b border-borderLine py-24 bg-bone" ref={ref}>
      <div className="max-w-[1400px] mx-auto px-8 md:px-16 flex flex-col lg:flex-row gap-16 items-center">
        {/* Left: copy */}
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <span className="text-[10px] font-mono tracking-widest text-olive uppercase block mb-4">Workouts</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter uppercase leading-none mb-6">
              A workout plan<br />
              <span className="text-olive italic">that adapts with you.</span>
            </h2>
            <div className="h-px w-24 bg-graphite mb-6" />
            <p className="text-lg text-charcoal font-medium leading-relaxed max-w-md mb-8">
              Your plan evolves using your goals, training history, available equipment, and weekly progress.
            </p>
            <div className="border border-borderLine p-6 inline-block">
              <span className="text-[9px] font-mono text-faded uppercase tracking-widest block mb-1">Bench Press Progression</span>
              <div className="flex items-end gap-3 mt-2">
                {['40.0', '42.5', '45.0', '47.5'].map((w, i, arr) => (
                  <React.Fragment key={w}>
                    <div className="text-center">
                      <div
                        className="bg-graphite/10 mx-auto mb-1"
                        style={{ width: 32, height: 24 + i * 8 }}
                      />
                      <span className="text-[9px] font-mono text-charcoal">{w}</span>
                    </div>
                    {i < arr.length - 1 && <span className="text-xs font-mono text-faded mb-4">→</span>}
                  </React.Fragment>
                ))}
              </div>
              <span className="block text-[9px] font-mono text-olive uppercase tracking-widest mt-2">KG — 6 Week Progression</span>
            </div>
          </motion.div>
        </div>

        {/* Right: workout sheet */}
        <motion.div
          className="flex-1 border border-graphite bg-bone"
          initial={{ opacity: 0, x: 20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="border-b border-graphite flex justify-between items-center px-6 py-4">
            <span className="text-[9px] font-mono uppercase tracking-widest font-bold">Monday / Upper Body</span>
            <span className="text-[9px] font-mono text-faded uppercase">Week 06</span>
          </div>
          <div className="divide-y divide-borderLine">
            {[
              { num: '01', name: 'Bench Press', sets: '3 × 8', prev: '40.0 KG', curr: '42.5 KG' },
              { num: '02', name: 'Incline DB Press', sets: '3 × 10', prev: '14.0 KG', curr: '16.0 KG' },
              { num: '03', name: 'Lateral Raise', sets: '3 × 12', prev: '7.5 KG', curr: '7.5 KG' },
              { num: '04', name: 'Face Pull', sets: '3 × 15', prev: '12.5 KG', curr: '15.0 KG' },
            ].map(ex => (
              <div key={ex.num} className="grid grid-cols-[auto_1fr_auto] gap-4 items-end px-6 py-4">
                <span className="text-[9px] font-mono text-faded">{ex.num}</span>
                <div>
                  <span className="block text-sm font-bold tracking-tight uppercase">{ex.name}</span>
                  <span className="text-[9px] font-mono text-faded uppercase tracking-widest">{ex.sets}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[9px] font-mono text-faded line-through">{ex.prev}</span>
                  <span className="block text-base font-bold tracking-tighter italic text-olive">{ex.curr}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-borderLine px-6 py-4">
            <span className="text-[9px] font-mono text-olive uppercase tracking-widest">↑ Weights updated based on last session</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default WorkoutPreview;
