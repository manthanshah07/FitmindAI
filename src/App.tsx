import Navbar from './components/Navbar';
import Hero from './sections/Hero';
import Problem from './sections/Problem';
import MeetFitMind from './sections/MeetFitMind';
import Memory from './sections/Memory';
import Timeline from './sections/Timeline';
import Features from './sections/Features';
import Architecture from './sections/Architecture';
import AdaptiveCoaching from './sections/AdaptiveCoaching';
import Scope from './sections/Scope';
import Footer from './sections/Footer';

function App() {
  return (
    <div className="bg-bone text-graphite min-h-screen font-sans selection:bg-graphite selection:text-bone">
      <div className="noise-bg"></div>
      <Navbar />
      <main className="pt-24 border-x border-borderLine max-w-[1600px] mx-auto">
        <Hero />
        <Problem />
        <MeetFitMind />
        <Memory />
        <Timeline />
        <Features />
        <Architecture />
        <AdaptiveCoaching />
        <Scope />
      </main>
      <Footer />
    </div>
  );
}

export default App;
