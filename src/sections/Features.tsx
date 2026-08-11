import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const Features: React.FC = () => {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  return (
    <section className="py-32 bg-bone text-graphite border-b border-borderLine" id="features" ref={containerRef}>
      
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        
        {/* Fitness Score */}
        <div className="mb-40 flex flex-col items-center">
          <div className="text-center mb-16 max-w-2xl">
            <span className="text-xs font-mono tracking-widest text-olive uppercase block mb-4">06 / Performance</span>
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase mb-6 leading-none">
              One Score.<br />
              <span className="text-faded">Explained.</span>
            </h2>
            <div className="h-px w-24 bg-graphite mx-auto mb-6"></div>
            <p className="text-lg text-charcoal font-medium">
              The backend deterministically calculates your fitness score based on adherence, nutrition, and consistency. The AI interprets the score for you.
            </p>
          </div>

          <motion.div 
            className="flex flex-col md:flex-row items-center md:items-end gap-12 md:gap-24"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-baseline border-b-4 border-graphite pb-4">
              <span className="text-[12rem] leading-none font-bold tracking-tighter text-graphite">84</span>
              <span className="text-4xl font-bold text-faded ml-4 tracking-tighter">/100</span>
            </div>
            
            <div className="flex flex-col gap-4 font-mono text-sm tracking-widest uppercase">
              <div className="flex items-center gap-4">
                <span className="w-12 text-right text-olive font-bold">+ 6</span>
                <span className="border-b border-borderLine pb-1 w-32">Consistency</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-12 text-right text-graphite font-bold">+ 4</span>
                <span className="border-b border-borderLine pb-1 w-32">Protein</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-12 text-right text-charcoal/50 font-bold">- 2</span>
                <span className="border-b border-borderLine pb-1 w-32">Sleep</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-12 text-right text-charcoal/50 font-bold">- 3</span>
                <span className="border-b border-borderLine pb-1 w-32">Recovery</span>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-24">
          
          {/* Editorial Workout Sheet */}
          <div>
            <div className="mb-12">
               <h3 className="text-3xl font-bold tracking-tighter uppercase mb-4">Workout Evolution</h3>
               <p className="text-charcoal font-medium">
                 FitMind AI selects biomechanically appropriate exercises from a structured database based on your goal, equipment, and history.
               </p>
            </div>

            <motion.div 
              className="border border-graphite bg-bone p-8 relative"
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <span className="text-6xl font-bold tracking-tighter">W12</span>
              </div>
              
              <div className="flex items-center justify-between border-b-2 border-graphite pb-4 mb-6">
                <span className="text-xs font-mono tracking-widest uppercase font-bold text-graphite">Monday / Upper</span>
                <span className="text-xs font-mono tracking-widest uppercase text-faded">Sheet 01</span>
              </div>

              <div className="space-y-6">
                {[
                  { num: '01', name: 'BENCH PRESS', sets: '3 × 8', weight: '42.5 KG', next: '45.0 KG' },
                  { num: '02', name: 'INCLINE DB PRESS', sets: '3 × 10', weight: '16.0 KG', next: '18.0 KG' },
                  { num: '03', name: 'LATERAL RAISE', sets: '3 × 12', weight: '7.5 KG', next: '7.5 KG' },
                ].map(ex => (
                  <div key={ex.num} className="grid grid-cols-[auto_1fr_auto] gap-4 items-end border-b border-borderLine pb-2">
                    <span className="text-xs font-mono text-faded mb-1">{ex.num}</span>
                    <div>
                      <span className="block text-sm font-bold tracking-tight uppercase">{ex.name}</span>
                      <span className="text-xs font-mono text-faded uppercase tracking-widest">{ex.sets}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-mono text-faded line-through">{ex.weight}</span>
                      <span className="block text-lg font-bold tracking-tighter italic text-olive">{ex.next}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Editorial Nutrition Journal */}
          <div>
            <div className="mb-12">
               <h3 className="text-3xl font-bold tracking-tighter uppercase mb-4">Nutrition Journal</h3>
               <p className="text-charcoal font-medium">
                 Log meals using natural language. The system extracts structured nutrition data for precise calculations and contextual feedback.
               </p>
            </div>

            <motion.div 
              className="bg-graphite text-bone p-8 border border-graphite"
              initial={{ opacity: 0, x: 20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="flex items-center justify-between border-b border-charcoal pb-4 mb-6">
                <span className="text-xs font-mono tracking-widest uppercase font-bold text-bone">Today's Log</span>
                <span className="text-xs font-mono tracking-widest uppercase text-olive">*NLP Parsed</span>
              </div>

              <div className="space-y-6 font-mono text-sm tracking-wide uppercase mb-12">
                <div className="flex gap-4">
                  <span className="text-faded w-20">Breakfast</span>
                  <span className="text-bone">2 EGGS + 2 ROTIS</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-faded w-20">Lunch</span>
                  <span className="text-bone">CHICKEN + RICE + SALAD</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-faded w-20">Dinner</span>
                  <span className="text-bone">PANEER + ROTI</span>
                </div>
              </div>

              <div className="border-t-2 border-bone pt-6 grid grid-cols-2 gap-8">
                <div>
                  <span className="block text-4xl font-bold tracking-tighter mb-1">1,984</span>
                  <span className="text-xs font-mono tracking-widest uppercase text-faded">KCAL TOTAL</span>
                </div>
                <div>
                  <span className="block text-4xl font-bold tracking-tighter mb-1 text-olive">96G</span>
                  <span className="text-xs font-mono tracking-widest uppercase text-faded">PROTEIN</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-charcoal">
                <span className="block text-[10px] font-mono tracking-widest text-olive uppercase mb-2">AI INSIGHT</span>
                <p className="font-sans text-sm font-medium leading-relaxed italic text-bone/80 border-l-2 border-olive pl-4">
                  "Protein target likely to be missed by ~12g. Consider a casein shake before bed."
                </p>
              </div>

            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Features;
