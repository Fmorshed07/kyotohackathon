import { useCallback, useEffect, useState } from "react";
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
  const [showLoader, setShowLoader] = useState(true);
  const [contentReady, setContentReady] = useState(false);

  const finishLoader = useCallback(() => {
    setShowLoader(false);
  }, []);

  const revealContent = useCallback(() => {
    setContentReady(true);
  }, []);

  // Safety: if exit callback is skipped, still reveal the page
  useEffect(() => {
    if (showLoader || contentReady) return;
    const fallback = window.setTimeout(revealContent, 700);
    return () => clearTimeout(fallback);
  }, [showLoader, contentReady, revealContent]);

  return (
    <>
      <AnimatePresence mode="wait" onExitComplete={revealContent}>
        {showLoader ? <LoadingExperience key="boot" onComplete={finishLoader} /> : null}
      </AnimatePresence>

      {contentReady ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
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
      ) : null}
    </>
  );
};

export default Index;
