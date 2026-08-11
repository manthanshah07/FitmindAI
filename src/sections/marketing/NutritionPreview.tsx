import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const NutritionPreview: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="border-b border-borderLine py-24 bg-graphite text-bone" ref={ref}>
      <div className="max-w-[1400px] mx-auto px-8 md:px-16 flex flex-col-reverse lg:flex-row gap-16 lg:items-center">

        {/* Left: Nutrition journal */}
        <motion.div
          className="flex-1 border border-charcoal"
          initial={{ opacity: 0, x: -20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="border-b border-charcoal flex justify-between items-center px-6 py-4">
            <span className="text-[9px] font-mono text-bone uppercase tracking-widest font-bold">Today's Log</span>
            <span className="text-[9px] font-mono text-olive uppercase tracking-widest">NLP Parsed</span>
          </div>

          {/* User input */}
          <div className="px-6 py-5 border-b border-charcoal">
            <span className="text-[9px] font-mono text-faded uppercase tracking-widest block mb-2">You typed</span>
            <p className="text-base italic font-medium text-bone/80">
              "2 rotis, chicken curry and buttermilk"
            </p>
          </div>

          {/* Parsed results */}
          <div className="px-6 py-4 border-b border-charcoal space-y-3">
            {[
              { food: '2 Rotis', cal: '240 kcal', p: '8g' },
              { food: 'Chicken Curry (200g)', cal: '320 kcal', p: '28g' },
              { food: 'Buttermilk (250ml)', cal: '45 kcal', p: '4g' },
            ].map(item => (
              <div key={item.food} className="flex justify-between items-center">
                <span className="text-sm font-medium">{item.food}</span>
                <div className="text-right">
                  <span className="text-[9px] font-mono text-faded">{item.cal} · </span>
                  <span className="text-[9px] font-mono text-olive font-bold">P: {item.p}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 border-b border-charcoal">
            <div className="px-6 py-4 border-r border-charcoal">
              <span className="block text-[9px] font-mono text-faded uppercase tracking-widest mb-1">Total Calories</span>
              <span className="block text-3xl font-bold tracking-tighter">1,984</span>
            </div>
            <div className="px-6 py-4">
              <span className="block text-[9px] font-mono text-faded uppercase tracking-widest mb-1">Protein</span>
              <span className="block text-3xl font-bold tracking-tighter text-olive">96G</span>
            </div>
          </div>

          {/* AI Insight */}
          <div className="px-6 py-5">
            <span className="block text-[9px] font-mono text-olive uppercase tracking-widest mb-2">AI Insight</span>
            <p className="text-sm font-medium leading-relaxed text-bone/80 italic border-l-2 border-olive pl-3">
              "You're close to your calorie target, but you're still short on protein today. A casein shake before bed would close the gap."
            </p>
          </div>
        </motion.div>

        {/* Right: Copy */}
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <span className="text-[10px] font-mono tracking-widest text-olive uppercase block mb-4">Nutrition</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter uppercase leading-none mb-6">
              Log your meals.<br />
              <span className="text-faded">Know what to change.</span>
            </h2>
            <div className="h-px w-24 bg-bone mb-6" />
            <p className="text-lg text-bone/70 font-medium leading-relaxed max-w-md">
              Type your meal in plain language. FitMind extracts the nutrition data and tells you exactly what your numbers mean for today.
            </p>

            <div className="mt-10 p-6 border border-charcoal">
              <span className="block text-[9px] font-mono text-faded uppercase tracking-widest mb-4">Future Capability</span>
              <p className="text-sm text-bone/50 italic">AI food image recognition — coming soon. Log by photo, not just text.</p>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default NutritionPreview;
