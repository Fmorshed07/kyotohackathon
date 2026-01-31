import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingExperience from "@/components/LoadingExperience";
import AnimatedBackground from "@/components/AnimatedBackground";
import HeroSection from "@/components/sections/HeroSection";
import AboutSection from "@/components/sections/AboutSection";
import ThemeSection from "@/components/sections/ThemeSection";
import TimelineSection from "@/components/sections/TimelineSection";
import ParticipantsSection from "@/components/sections/ParticipantsSection";
import DeliverablesSection from "@/components/sections/DeliverablesSection";
import JudgingSection from "@/components/sections/JudgingSection";
import SponsorsSection from "@/components/sections/SponsorsSection";
import CognisorSection from "@/components/sections/CognisorSection";
import FinalCTASection from "@/components/sections/FinalCTASection";

const Index = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && (
          <LoadingExperience onComplete={() => setIsLoading(false)} />
        )}
      </AnimatePresence>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 1, delay: 0.3 }}
      >
        <AnimatedBackground />
        
        <main className="relative">
          <HeroSection />
          <AboutSection />
          <ThemeSection />
          <TimelineSection />
          <ParticipantsSection />
          <DeliverablesSection />
          <JudgingSection />
          <SponsorsSection />
          <CognisorSection />
          <FinalCTASection />
        </main>
      </motion.div>
    </>
  );
};

export default Index;
