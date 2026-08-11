import React from 'react';
import MarketingHero from '../sections/marketing/MarketingHero';
import ValueProp from '../sections/marketing/ValueProp';
import KnowsYou from '../sections/marketing/KnowsYou';
import MemoryDifference from '../sections/marketing/MemoryDifference';
import AICoachDemo from '../sections/marketing/AICoachDemo';
import WorkoutPreview from '../sections/marketing/WorkoutPreview';
import NutritionPreview from '../sections/marketing/NutritionPreview';
import ProgressSection from '../sections/marketing/ProgressSection';
import FeaturesGrid from '../sections/marketing/FeaturesGrid';
import HowItWorksSimple from '../sections/marketing/HowItWorksSimple';
import MarketingCTA from '../sections/marketing/MarketingCTA';

const MarketingPage: React.FC = () => {
  return (
    <>
      <MarketingHero />
      <ValueProp />
      <KnowsYou />
      <MemoryDifference />
      <AICoachDemo />
      <WorkoutPreview />
      <NutritionPreview />
      <ProgressSection />
      <FeaturesGrid />
      <HowItWorksSimple />
      <MarketingCTA />
    </>
  );
};

export default MarketingPage;
