import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingExperience from "@/components/LoadingExperience";
import AnimatedBackground from "@/components/AnimatedBackground";
import SiteHeader from "@/components/SiteHeader";
import HeroSection from "@/components/sections/HeroSection";
import UpdatedBannerSection from "@/components/sections/UpdatedBannerSection";
import AboutSection from "@/components/sections/AboutSection";
import ThemeSection from "@/components/sections/ThemeSection";
import TimelineSection from "@/components/sections/TimelineSection";
import DeliverablesSection from "@/components/sections/DeliverablesSection";
import JudgingSection from "@/components/sections/JudgingSection";
import HostSection from "@/components/sections/HostSection";
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
        initial={false}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.6, delay: 0 }}
      >
        <AnimatedBackground />

        <SiteHeader />

        <main className="relative pt-16">
          <HeroSection />
          <UpdatedBannerSection />
          <AboutSection />
          <ThemeSection />
          <TimelineSection />
          <DeliverablesSection />
          <JudgingSection />
          <HostSection />
          <CognisorSection />
          <FinalCTASection />
        </main>
      </motion.div>
    </>
  );
};

export default Index;
