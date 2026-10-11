import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Check,
  TrendingUp,
  Flame,
  Beef,
  Dumbbell,
  MessageSquare,
  ShieldCheck,
  Activity,
  Target,
  Zap,
  Play,
} from 'lucide-react';

type CoachPromptKey = 'progress' | 'protein' | 'workout';
type LandingPaceKey = 'conservative' | 'optimal' | 'aggressive';

const COACH_PROMPTS: Record<
  CoachPromptKey,
  {
    question: string;
    answer: string;
    facts: string[];
    recommendation: string;
  }
> = {
  progress: {
    question: 'How is my progress toward 84.0 kg looking this month?',
    answer:
      'Your weight has trended up cleanly from 79.5 kg to 80.8 kg over the past 4 weeks (+0.3 kg/week). At your 2,976 kcal average intake and 4 weekly sessions, you are right on pace for your 84.0 kg goal.',
    facts: ['Current: 80.8 kg', 'Pace: +0.3 kg/wk', 'Adherence: 84%'],
    recommendation: 'Keep daily intake near 3,000 kcal and maintain 4 hypertrophy sessions.',
  },
  protein: {
    question: 'Am I hitting my daily protein target consistently?',
    answer:
      'Across your 5 logged days this week, you averaged 185 g/day against your 225 g active plan target (within your 129 g – 178 g evidence-based 1.6–2.2 g/kg baseline, with extra headroom for lean mass gain).',
    facts: ['Target: 225 g', '7d Avg: 185 g', 'Range: 129–178 g'],
    recommendation: 'Add 1 scoop of whey or 150 g Greek yogurt post-workout to close the 40 g gap.',
  },
  workout: {
    question: 'What should I focus on in today’s Upper Body session?',
    answer:
      'You completed 4×8 Barbell Bench Press at 73.0 kg last session at RPE 8. Today, aim for 75.0 kg across all 4 working sets while keeping 90–120s rest intervals.',
    facts: ['Last Bench: 73.0 kg × 8', 'Target: 75.0 kg × 8', 'Split: 4-Day Upper/Lower'],
    recommendation: 'Log each working set live so your 30-day strength score updates automatically.',
  },
};

const PACE_CONFIG: Record<
  LandingPaceKey,
  {
    label: string;
    rateLabel: string;
    calories: number;
    protein: number;
    surplusLabel: string;
    day28Weight: number;
    etaLabel: string;
    curveEndY: number;
  }
> = {
  conservative: {
    label: 'Conservative',
    rateLabel: '+0.15 kg/wk',
    calories: 2850,
    protein: 220,
    surplusLabel: '+130 kcal surplus',
    day28Weight: 81.4,
    etaLabel: 'Mar 14',
    curveEndY: 66,
  },
  optimal: {
    label: 'Optimal',
    rateLabel: '+0.25 kg/wk',
    calories: 3000,
    protein: 225,
    surplusLabel: '+200 kcal surplus',
    day28Weight: 81.8,
    etaLabel: 'Jan 28',
    curveEndY: 52,
  },
  aggressive: {
    label: 'Aggressive',
    rateLabel: '+0.40 kg/wk',
    calories: 3200,
    protein: 235,
    surplusLabel: '+400 kcal surplus',
    day28Weight: 82.4,
    etaLabel: 'Dec 19',
    curveEndY: 36,
  },
};

const INITIAL_WORKOUT_ITEMS = [
  { id: 'w1', name: 'Barbell Bench Press', detail: '4 sets × 8 reps @ 75.0 kg', done: true },
  { id: 'w2', name: 'Barbell Bent-Over Row', detail: '4 sets × 8 reps @ 70.0 kg', done: true },
  { id: 'w3', name: 'Overhead Barbell Press', detail: '3 sets × 10 reps @ 47.5 kg', done: true },
  { id: 'w4', name: 'Weighted Pull-Up', detail: '3 sets × 8 reps @ +10.0 kg', done: false },
];

const MarketingPage: React.FC = () => {
  const [activePrompt, setActivePrompt] = useState<CoachPromptKey>('progress');
  const [selectedPace, setSelectedPace] = useState<LandingPaceKey>('optimal');
  const [workoutItems, setWorkoutItems] = useState(INITIAL_WORKOUT_ITEMS);

  const activeCoach = COACH_PROMPTS[activePrompt];
  const activePace = PACE_CONFIG[selectedPace];

  const completedCount = workoutItems.filter((item) => item.done).length;
  const workoutPct = Math.round((completedCount / workoutItems.length) * 100);

  const toggleWorkoutItem = (id: string) => {
    setWorkoutItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)),
    );
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden bg-[#080C1E] text-slate-50 selection:bg-emerald-500 selection:text-slate-950">
      {/* =====================================================================
          HERO SECTION + INTERACTIVE SHOWPIECE
      ===================================================================== */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden border-b border-white/[0.07]">
        {/* Subtle CSS Grid Pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_25%,#000_65%,transparent_100%)]"
        />

        {/* Ambient Background Blobs (Indigo & Mint-Teal) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[560px] sm:w-[760px] h-[380px] rounded-full bg-gradient-to-tr from-[#172554]/55 via-emerald-500/12 to-cyan-500/12 blur-[110px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-72 -left-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-[100px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-64 -right-24 w-80 h-80 rounded-full bg-cyan-500/10 blur-[110px]"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Centered Hero Copy */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="max-w-3xl mx-auto text-center space-y-6"
          >
            {/* Introducing Badge with Micro-Pulsing Emerald Ring */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#111C35]/90 border border-emerald-400/25 shadow-[0_0_24px_rgba(16,185,129,0.12)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-emerald-300 font-semibold">
                INTRODUCING PROGRESS FORECASTS &amp; COACH
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold tracking-tight text-[#F8FAFC] leading-[1.06]">
              Your Fitness, Understood.{' '}
              <span className="block mt-1">
                Your Goals, Accelerated with{' '}
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  AI Coach &amp; Analytics
                </span>
                .
              </span>
            </h1>

            {/* Core Subtext */}
            <p className="text-base sm:text-lg md:text-xl text-slate-300/90 max-w-2xl mx-auto leading-relaxed font-normal">
              No more guesswork. Get personalized, adaptive AI coaching that updates your
              workouts, nutrition, and progress forecasts in real-time based on your natural
              data.
            </p>

            {/* Primary & Secondary Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                to="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 font-semibold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_28px_rgba(16,185,129,0.38)]"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#interactive-showcase"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-white/15 bg-[#111C35]/70 hover:bg-[#172554]/60 hover:border-emerald-400/40 text-slate-100 font-semibold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                <span>Watch the Demo</span>
              </a>
            </div>

            {/* Subtle Trust Telemetry Strip */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Deterministic BMR &amp; TDEE Engine
              </span>
              <span className="hidden sm:inline text-white/15">•</span>
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                30-Day Weight Trajectory
              </span>
              <span className="hidden sm:inline text-white/15">•</span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Grounded Gemini Coach
              </span>
            </div>
          </motion.div>

          {/* =================================================================
              THE SHOWPIECE PANEL: 3 Interactive Live Application Panels
          ================================================================= */}
          <div
            id="interactive-showcase"
            className="mt-14 md:mt-16 lg:[perspective:1400px] w-full max-w-full min-w-0"
          >
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.15, ease: 'easeOut' }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch lg: transition-transform duration-700"
            >
              {/* -------------------------------------------------------------
                  PANEL 1: Chat with Coach (Interactive Grounded Conversation)
              ------------------------------------------------------------- */}
              <div className="lg:col-span-4 rounded-2xl bg-[#111C35]/85 backdrop-blur-xl border border-white/[0.09] hover:border-emerald-400/35 transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.45)] min-w-0 overflow-hidden">
                <div className="space-y-4 min-w-0">
                  {/* Panel Header */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-semibold text-white truncate">
                            Chat with Coach
                          </h2>
                          <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-emerald-500/15 text-emerald-300 border border-emerald-400/25">
                            Grounded
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          Zero hallucinated math • Cites your logs
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Prompt Switcher */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                      Try asking your coach:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { key: 'progress', label: 'How is my progress?' },
                          { key: 'protein', label: 'Am I hitting protein?' },
                          { key: 'workout', label: "Today's lift target?" },
                        ] as { key: CoachPromptKey; label: string }[]
                      ).map((p) => {
                        const isSelected = activePrompt === p.key;
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => setActivePrompt(p.key)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                              isSelected
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm'
                                : 'bg-[#0B122F]/80 text-slate-300 border border-white/[0.07] hover:border-white/20 hover:text-white'
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Conversation Bubbles */}
                  <div className="space-y-3 pt-1">
                    {/* User Bubble */}
                    <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-sm bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-400/30 px-3.5 py-2.5 text-xs text-slate-100">
                      {activeCoach.question}
                    </div>

                    {/* Coach Reply Bubble */}
                    <div className="rounded-2xl rounded-bl-sm bg-[#0B122F]/90 border border-white/[0.08] p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          FITMIND COACH
                        </span>
                        <span className="text-slate-400">Verified Context</span>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed">
                        {activeCoach.answer}
                      </p>

                      {/* Grounded Fact Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {activeCoach.facts.map((fact) => (
                          <span
                            key={fact}
                            className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-cyan-300"
                          >
                            {fact}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actionable Next Step Footer */}
                <div className="mt-4 pt-3 border-t border-white/[0.07] flex items-start gap-2 text-[11px] text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{activeCoach.recommendation}</span>
                </div>
              </div>

              {/* -------------------------------------------------------------
                  PANEL 2: 30-Day Outlook & Daily Targets (Centerpiece Card)
              ------------------------------------------------------------- */}
              <div className="lg:col-span-4 rounded-2xl bg-gradient-to-b from-[#132042]/95 to-[#111C35]/90 backdrop-blur-xl border border-emerald-400/30 hover:border-emerald-400/50 transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between shadow-[0_24px_60px_rgba(16,185,129,0.12)] min-w-0 overflow-hidden">
                <div className="space-y-4 min-w-0">
                  {/* Top Header */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-semibold block">
                        GOAL FORECAST
                      </span>
                      <h2 className="text-sm font-semibold text-white truncate">
                        30-Day Outlook • 80.8 kg → 84.0 kg
                      </h2>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
                      On Track
                    </span>
                  </div>

                  {/* Interactive SVG Curve Preview */}
                  <div className="rounded-xl bg-[#080C1E]/80 border border-white/[0.07] p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-300">
                        Today: <strong className="text-white">80.8 kg</strong>
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        Day 28: {activePace.day28Weight.toFixed(1)} kg
                      </span>
                    </div>

                    <svg
                      viewBox="0 0 320 120"
                      className="w-full h-28 select-none overflow-visible"
                      role="img"
                      aria-label="Interactive 30-day weight projection curve"
                    >
                      <defs>
                        <linearGradient id="heroCurveFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Subtle horizontal grid lines */}
                      <line
                        x1="12"
                        y1="24"
                        x2="308"
                        y2="24"
                        stroke="rgba(255,255,255,0.08)"
                        strokeDasharray="4 4"
                      />
                      <text
                        x="306"
                        y="19"
                        textAnchor="end"
                        className="text-[9px] fill-slate-400 font-mono"
                      >
                        Goal: 84.0 kg
                      </text>

                      <line
                        x1="12"
                        y1="96"
                        x2="308"
                        y2="96"
                        stroke="rgba(255,255,255,0.06)"
                      />

                      {/* Area under curve */}
                      <path
                        d={`M 16 86 Q 160 ${activePace.curveEndY + 14} 304 ${activePace.curveEndY} L 304 104 L 16 104 Z`}
                        fill="url(#heroCurveFill)"
                      />

                      {/* Glowing Trajectory Curve */}
                      <path
                        d={`M 16 86 Q 160 ${activePace.curveEndY + 14} 304 ${activePace.curveEndY}`}
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />

                      {/* Start Point (Today: 80.8 kg) with pulsing ring */}
                      <circle cx="16" cy="86" r="8" fill="#10B981" fillOpacity="0.22" />
                      <circle
                        cx="16"
                        cy="86"
                        r="4.5"
                        fill="#10B981"
                        stroke="#080C1E"
                        strokeWidth="2"
                      />

                      {/* End Point (Day 28) */}
                      <circle
                        cx="304"
                        cy={activePace.curveEndY}
                        r="5"
                        fill="#06B6D4"
                        stroke="#080C1E"
                        strokeWidth="2"
                      />
                    </svg>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-white/[0.06]">
                      <span>Pace: {activePace.rateLabel}</span>
                      <span>Projected Goal ETA: {activePace.etaLabel}</span>
                    </div>
                  </div>

                  {/* Live Daily Target Stat Tiles */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-[#0B122F]/90 border border-white/[0.07]">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-emerald-400" />
                          Daily Calories
                        </span>
                      </div>
                      <div className="text-lg font-bold font-mono text-white">
                        {activePace.calories.toLocaleString()} kcal
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400">
                        {activePace.surplusLabel}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#0B122F]/90 border border-white/[0.07]">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="flex items-center gap-1">
                          <Beef className="w-3 h-3 text-cyan-400" />
                          Daily Protein
                        </span>
                      </div>
                      <div className="text-lg font-bold font-mono text-white">
                        {activePace.protein} g
                      </div>
                      <span className="text-[10px] font-mono text-cyan-300">
                        Optimal hypertrophy
                      </span>
                    </div>
                  </div>
                </div>

                {/* Interactive Pace Selector Chips */}
                <div className="mt-4 pt-3 border-t border-white/[0.07] space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                    Adjust Goal Pace:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['conservative', 'optimal', 'aggressive'] as LandingPaceKey[]).map(
                      (key) => {
                        const cfg = PACE_CONFIG[key];
                        const isSelected = selectedPace === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedPace(key)}
                            className={`px-2 py-1.5 rounded-lg text-center transition-all border ${
                              isSelected
                                ? 'bg-emerald-500/20 border-emerald-400 text-white font-semibold'
                                : 'bg-[#0B122F]/70 border-white/[0.07] text-slate-300 hover:text-white'
                            }`}
                          >
                            <span className="block text-[10px] truncate">{cfg.label}</span>
                            <span className="block text-[9px] font-mono text-emerald-300">
                              {cfg.rateLabel}
                            </span>
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              </div>

              {/* -------------------------------------------------------------
                  PANEL 3: Nutrition & Workouts Live Tracker
              ------------------------------------------------------------- */}
              <div className="lg:col-span-4 rounded-2xl bg-[#111C35]/85 backdrop-blur-xl border border-white/[0.09] hover:border-cyan-400/35 transition-all duration-300 p-5 sm:p-6 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.45)] min-w-0 overflow-hidden">
                <div className="space-y-4 min-w-0">
                  {/* Panel Header */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center shrink-0">
                        <Dumbbell className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-white truncate">
                          Nutrition &amp; Workouts
                        </h2>
                        <p className="text-[11px] text-slate-400 truncate">
                          Click sets below to test live adherence
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-400/25 shrink-0">
                      {workoutPct}% Done
                    </span>
                  </div>

                  {/* Live Macro Progress Bars */}
                  <div className="p-3.5 rounded-xl bg-[#0B122F]/90 border border-white/[0.07] space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">Calories Logged</span>
                        <span className="font-mono text-white font-semibold">
                          2,976 / {activePace.calories.toLocaleString()} kcal
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.round((2976 / activePace.calories) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium">Protein Target</span>
                        <span className="font-mono text-cyan-300 font-semibold">
                          198 / {activePace.protein} g
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.round((198 / activePace.protein) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interactive Workout Checklist */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      <span>Today’s Upper Hypertrophy</span>
                      <span>
                        {completedCount}/{workoutItems.length} Exercises
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {workoutItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleWorkoutItem(item.id)}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 min-w-0 ${
                            item.done
                              ? 'bg-emerald-500/10 border-emerald-400/30 text-slate-100'
                              : 'bg-[#0B122F]/70 border-white/[0.07] text-slate-300 hover:border-white/20'
                          }`}
                        >
                          <div className="min-w-0">
                            <p
                              className={`text-xs font-semibold truncate ${
                                item.done ? 'text-white' : 'text-slate-200'
                              }`}
                            >
                              {item.name}
                            </p>
                            <p className="text-[11px] font-mono text-slate-400 truncate">
                              {item.detail}
                            </p>
                          </div>
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                              item.done
                                ? 'bg-emerald-500 text-slate-950'
                                : 'border border-white/20 bg-white/[0.03]'
                            }`}
                          >
                            {item.done && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.07] flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">
                    Fitness Score: <strong className="text-emerald-400">84 / 100</strong>
                  </span>
                  <Link
                    to="/signup"
                    className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
                  >
                    <span>Log yours</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: HOW THE CLOSED-LOOP SYSTEM WORKS (#features)
      ===================================================================== */}
      <section
        id="features"
        className="py-20 md:py-24 border-b border-white/[0.07] bg-[#0B122F]/40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold">
              CLOSED-LOOP ARCHITECTURE
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              Deterministic physiology first.{' '}
              <span className="text-slate-400">AI reasoning second.</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Most fitness apps either dump raw charts on you or let an LLM guess your
              calories. FitMind computes every metabolic number deterministically in Python,
              then grounds your AI Coach in those exact facts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Activity,
                badge: '01 • CAPTURE',
                title: 'Frictionless Daily Logging',
                description:
                  'Log sets, reps, and RPE with a built-in rest timer, or track meals from a verified 174-food nutrition catalog with instant macro totals.',
                metric: '30-second daily check-in',
              },
              {
                icon: Target,
                badge: '02 • COMPUTE',
                title: '30-Day Energy-Balance Outlook',
                description:
                  'Your weigh-ins and calorie balance feed a physiological trajectory engine that projects your 4-week weight trend and goal ETA.',
                metric: '1-decimal precision forecasts',
              },
              {
                icon: Sparkles,
                badge: '03 • ADAPT',
                title: 'Context-Grounded AI Coach',
                description:
                  'Ask anything about your training plateau, protein targets, or weekly review. The Coach cites your real 7-day and 28-day averages.',
                metric: 'Zero hallucinated calculations',
              },
            ].map((card) => {
              const IconComponent = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-2xl bg-[#111C35]/75 border border-white/[0.08] hover:border-emerald-400/30 transition-all duration-300 p-6 flex flex-col justify-between gap-6"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                        {card.badge}
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                        <IconComponent className="w-4 h-4 text-cyan-400" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white">{card.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {card.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/[0.06] text-xs font-mono text-slate-400">
                    {card.metric}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: FINAL CONVERSION CALL TO ACTION
      ===================================================================== */}
      <section className="py-20 md:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-[#111C35] via-[#172554]/80 to-[#0B122F] border border-emerald-400/30 p-8 sm:p-12 md:p-14 text-center space-y-6 shadow-[0_24px_80px_rgba(16,185,129,0.12)]">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[11px] font-mono uppercase tracking-widest text-emerald-300">
              READY WHEN YOU ARE
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Stop guessing your macros.{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Start training with clarity.
              </span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed">
              Create your profile in 60 seconds or explore our pre-populated demo accounts to
              experience 30-day progress forecasts and grounded AI coaching immediately.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                to="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 font-semibold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-[0_0_28px_rgba(16,185,129,0.38)]"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
              >
                <span>Sign In to Demo</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MarketingPage;
