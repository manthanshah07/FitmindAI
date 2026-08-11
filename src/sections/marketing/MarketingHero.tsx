import React, { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import { Link } from 'react-router-dom';

const MarketingHero: React.FC = () => {
  const { scrollY } = useScroll();
  const panelY = useTransform(scrollY, [0, 600], [0, 80]);
  const [mounted, setMounted] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleMouse = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      mouseX.set(((e.clientX - rect.left) / rect.width - 0.5) * 30);
      mouseY.set(((e.clientY - rect.top) / rect.height - 0.5) * 15);
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, [mouseX, mouseY]);

  return (
    <section className="relative min-h-[92vh] flex flex-col md:flex-row items-stretch border-b border-borderLine overflow-hidden" ref={heroRef}>
      {/* ── Left: Headline + CTA ── */}
      <div className="flex-1 p-8 md:p-16 flex flex-col justify-center border-b md:border-b-0 md:border-r border-borderLine">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }}>
          <div className="flex items-center gap-4 mb-10">
            <span className="text-[10px] font-mono tracking-widest text-olive uppercase">AI Fitness Coach</span>
            <div className="h-px w-12 bg-olive/40" />
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-[7.5rem] lg:text-[9rem] font-bold tracking-tighter leading-[0.85] mb-10 uppercase break-words">
            Your<br />Fitness<br />Journey.<br />
            <span className="text-olive italic">Finally<br />Personalized.</span>
          </h1>

          <p className="text-xl md:text-2xl text-charcoal max-w-lg leading-snug font-medium border-l-4 border-graphite pl-6 mb-12">
            FitMind learns your goals, habits, workouts, and nutrition — then continuously adapts your guidance as you evolve.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              to="/signup"
              className="px-8 py-4 bg-graphite text-bone font-bold tracking-widest uppercase text-xs hover:bg-charcoal transition-colors text-center"
            >
              Start Your Journey
            </Link>
            <Link
              to="/how-it-works"
              className="px-8 py-4 border border-borderLine text-graphite font-bold tracking-widest uppercase text-xs hover:border-graphite transition-colors text-center"
            >
              See How It Works
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ── Right: Product UI Preview ── */}
      <div className="w-full md:w-[420px] lg:w-[520px] bg-graphite relative overflow-hidden flex flex-col justify-center px-6 py-16 md:p-10 min-h-[600px] md:min-h-0">
        <div className="absolute top-0 right-0 p-5 text-[10px] font-mono text-bone/20 uppercase tracking-widest">
          Live Context
        </div>

        {mounted && (
          <motion.div
            style={{ x: springX, y: springY }}
            className="w-full space-y-0 text-bone"
          >
            {/* Product Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              style={{ y: panelY }}
              className="border border-charcoal bg-graphite"
            >
              {/* Header row */}
              <div className="border-b border-charcoal flex items-center justify-between px-5 py-3">
                <span className="text-[10px] font-mono tracking-widest text-faded uppercase">FitMind Dashboard</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-olive/60" />
                  <span className="text-[10px] font-mono text-olive uppercase tracking-widest">Active</span>
                </div>
              </div>

              {/* Score + Goal row */}
              <div className="grid grid-cols-2 border-b border-charcoal">
                <div className="p-5 border-r border-charcoal">
                  <span className="block text-[9px] font-mono text-faded uppercase tracking-widest mb-1">Fitness Score</span>
                  <span className="block text-5xl font-bold tracking-tighter text-bone">84</span>
                  <span className="text-[9px] font-mono text-olive uppercase tracking-widest">/ 100</span>
                </div>
                <div className="p-5">
                  <span className="block text-[9px] font-mono text-faded uppercase tracking-widest mb-1">Goal</span>
                  <span className="block text-2xl font-bold tracking-tighter italic text-olive">Lean Bulk</span>
                  <span className="block text-[9px] font-mono text-faded mt-1">Week 6</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 border-b border-charcoal">
                {[
                  { label: 'Calories', value: '1,920', unit: 'kcal' },
                  { label: 'Protein', value: '103G', unit: 'today' },
                  { label: 'Streak', value: '18', unit: 'days' },
                ].map(s => (
                  <div key={s.label} className="p-4 border-r border-charcoal last:border-r-0">
                    <span className="block text-[8px] font-mono text-faded uppercase tracking-widest mb-1">{s.label}</span>
                    <span className="block text-xl font-bold tracking-tighter">{s.value}</span>
                    <span className="block text-[8px] font-mono text-faded">{s.unit}</span>
                  </div>
                ))}
              </div>

              {/* Today's workout */}
              <div className="p-5 border-b border-charcoal">
                <span className="block text-[9px] font-mono text-faded uppercase tracking-widest mb-3">Today's Workout — Upper Body</span>
                <div className="space-y-2">
                  {[
                    { name: 'Bench Press', sets: '3 × 8', kg: '42.5' },
                    { name: 'Lateral Raise', sets: '3 × 12', kg: '7.5' },
                  ].map(ex => (
                    <div key={ex.name} className="flex justify-between items-center">
                      <span className="text-xs font-medium">{ex.name}</span>
                      <div className="text-right">
                        <span className="text-[9px] font-mono text-faded">{ex.sets} · </span>
                        <span className="text-[9px] font-mono text-olive font-bold">{ex.kg} KG</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insight */}
              <div className="p-5">
                <span className="block text-[9px] font-mono text-olive uppercase tracking-widest mb-2">AI Insight</span>
                <p className="text-xs font-medium leading-relaxed text-bone/80 italic border-l-2 border-olive pl-3">
                  "Your protein intake has been below target for 4 days. Let's adjust today's meals."
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default MarketingHero;
