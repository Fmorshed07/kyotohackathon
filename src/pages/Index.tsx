import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingExperience from "@/components/LoadingExperience";
import AnimatedBackground from "@/components/AnimatedBackground";
import SiteHeader from "@/components/SiteHeader";
import HeroSection from "@/components/sections/HeroSection";
import HostSection from "@/components/sections/HostSection";
import AboutSection from "@/components/sections/AboutSection";
import PlatformSection from "@/components/sections/PlatformSection";
import FeaturePreviewSection from "@/components/sections/FeaturePreviewSection";
import CognisorSection from "@/components/sections/CognisorSection";
import CommunitySection from "@/components/sections/CommunitySection";
import LookingForJobsSection from "@/components/sections/LookingForJobsSection";
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
        transition={{ duration: 0.5 }}
        aria-hidden={isLoading}
      >
        <AnimatedBackground />

        <SiteHeader />

        <main className="relative">
          <HeroSection />
          <FeaturePreviewSection />
          <HostSection />
          <AboutSection />
          <PlatformSection />
          <CognisorSection />
          <CommunitySection />
          <LookingForJobsSection />
          <FinalCTASection />
        </main>
      </motion.div>
    </>
  );
};

export default Index;
