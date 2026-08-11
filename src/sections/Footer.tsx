import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="py-32 bg-graphite text-bone relative overflow-hidden">
      
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-end gap-16">
        
        <div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase leading-none mb-8">
            Fitness tracking<br />
            <span className="text-charcoal italic">tells you where you are.</span><br />
            FitMind AI helps you<br />
            <span className="text-olive italic">decide what to do next.</span>
          </h2>
          
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <a
              href="#architecture"
              className="px-8 py-4 border border-bone text-bone font-bold tracking-widest uppercase text-xs hover:bg-bone hover:text-graphite transition-colors"
            >
              Explore Architecture
            </a>
            <a
              href="#scope"
              className="px-8 py-4 border border-charcoal text-faded font-bold tracking-widest uppercase text-xs hover:border-faded transition-colors"
            >
              View Project Scope
            </a>
          </div>
        </div>

        <div className="text-right">
          <span className="block text-xl font-bold tracking-tighter uppercase mb-2 text-bone">
            FitMind AI
          </span>
          <span className="block text-xs font-mono tracking-widest uppercase text-faded">
            Final Year Engineering Project<br />
            Experimental Tech Showcase
          </span>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
