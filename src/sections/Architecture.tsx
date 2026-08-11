import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const Architecture: React.FC = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const architectureNodes = [
    { label: 'USER', indent: 0, desc: '' },
    { label: '│', indent: 0, isLine: true },
    { label: '├── PROFILE', indent: 0, desc: '' },
    { label: '├── WORKOUT', indent: 0, desc: '' },
    { label: '├── NUTRITION', indent: 0, desc: '' },
    { label: '├── PROGRESS', indent: 0, desc: '' },
    { label: '└── CONVERSATION', indent: 0, desc: '' },
    { label: '        │', indent: 0, isLine: true },
    { label: '        ↓', indent: 0, isLine: true },
    { label: '   MEMORY LAYER', indent: 0, highlight: true, desc: 'Retrieves relevant long-term context' },
    { label: '        │', indent: 0, isLine: true },
    { label: '        ↓', indent: 0, isLine: true },
    { label: '   CONTEXT BUILDER', indent: 0, highlight: true, desc: 'Combines deterministic data with history' },
    { label: '        │', indent: 0, isLine: true },
    { label: '        ↓', indent: 0, isLine: true },
    { label: '      LLM', indent: 0, highlight: true, desc: 'Reasons over structured context' },
    { label: '        │', indent: 0, isLine: true },
    { label: '        ↓', indent: 0, isLine: true },
    { label: ' PERSONALIZED RESPONSE', indent: 0, highlight: true, desc: 'Delivers adaptive guidance' },
  ];

  return (
    <section className="py-32 relative border-b border-borderLine bg-bone" id="architecture" ref={ref}>
      <div className="absolute top-12 left-12">
        <span className="text-xs font-mono tracking-widest text-olive uppercase">07 / Engineering</span>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 md:px-12 flex flex-col lg:flex-row gap-16 lg:gap-32">
        
        {/* Left Side: Editorial Context */}
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase mb-6 leading-none">
              Technical<br />
              <span className="text-faded">Architecture.</span>
            </h2>
            <div className="h-px w-24 bg-graphite mb-8"></div>
            <p className="text-lg text-charcoal font-medium leading-relaxed mb-12">
              FitMind AI employs a structured pipeline to separate deterministic calculations from AI reasoning. 
            </p>
            
            <div className="border border-graphite p-8 bg-bone">
              <h4 className="text-xs font-mono tracking-widest text-graphite uppercase font-bold mb-4">Core Principle</h4>
              <p className="text-2xl font-bold tracking-tighter uppercase leading-tight italic text-olive">
                "Deterministic calculations stay in the backend. AI is used strictly for reasoning."
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Technical ASCII Diagram */}
        <div className="flex-1 bg-graphite text-bone p-8 md:p-12 font-mono text-sm tracking-widest whitespace-pre overflow-x-auto border border-graphite shadow-2xl relative">
          <div className="absolute top-0 right-0 p-4 opacity-30">
            <span className="text-xs font-mono tracking-widest uppercase">System Flow</span>
          </div>

          <motion.div 
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
            }}
          >
            {architectureNodes.map((node, i) => (
              <motion.div 
                key={i}
                variants={{
                  hidden: { opacity: 0, x: -10 },
                  visible: { opacity: 1, x: 0 }
                }}
                className={`py-1 ${node.isLine ? 'text-charcoal' : ''} ${node.highlight ? 'text-olive font-bold' : ''}`}
              >
                <span className="inline-block min-w-[250px]">{node.label}</span>
                {node.desc && (
                  <span className="text-xs text-faded tracking-widest uppercase hidden md:inline-block ml-8 border-l border-charcoal pl-4">
                    {node.desc}
                  </span>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>

      </div>
    </section>
  );
};

export default Architecture;
