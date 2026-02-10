import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingExperience from "@/components/LoadingExperience";
import AnimatedBackground from "@/components/AnimatedBackground";
import SiteHeader from "@/components/SiteHeader";
import HeroSection from "@/components/sections/HeroSection";
import AboutSection from "@/components/sections/AboutSection";
import ThemeSection from "@/components/sections/ThemeSection";
import TimelineSection from "@/components/sections/TimelineSection";
import ParticipantsSection from "@/components/sections/ParticipantsSection";
import DeliverablesSection from "@/components/sections/DeliverablesSection";
import JudgingSection from "@/components/sections/JudgingSection";
import SponsorLogosSection from "@/components/sections/SponsorLogosSection";
import HostSection from "@/components/sections/HostSection";
import CoHostsSection from "@/components/sections/CoHostsSection";
import SponsorsSection from "@/components/sections/SponsorsSection";
import PartnerWithSection from "@/components/sections/PartnerWithSection";
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
          <AboutSection />
          <ThemeSection />
          <TimelineSection />
          <ParticipantsSection />
          <DeliverablesSection />
          <JudgingSection />
          <HostSection />
          <CoHostsSection />
          <SponsorLogosSection />
          <SponsorsSection />
          <PartnerWithSection />
          <CognisorSection />
          <FinalCTASection />
        </main>
      </motion.div>
    </>
  );
};

export default Index;
