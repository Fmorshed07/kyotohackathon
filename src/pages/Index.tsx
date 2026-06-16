import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoadingExperience from "@/components/LoadingExperience";
import AnimatedBackground from "@/components/AnimatedBackground";
import SiteHeader from "@/components/SiteHeader";
import HeroSection from "@/components/sections/HeroSection";
import AboutSection from "@/components/sections/AboutSection";
import JudgingSection from "@/components/sections/JudgingSection";
import ThemeSection from "@/components/sections/ThemeSection";
import ParticipantsSection from "@/components/sections/ParticipantsSection";
import DeliverablesSection from "@/components/sections/DeliverablesSection";
import WhyKyotoSection from "@/components/sections/WhyKyotoSection";
import TimelineSection from "@/components/sections/TimelineSection";
import VolunteerSection from "@/components/sections/VolunteerSection";
import PartnerWithSection from "@/components/sections/PartnerWithSection";
import OrganizersPartnersSection from "@/components/sections/OrganizersPartnersSection";
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

        <main className="relative">
          <HeroSection />
          <AboutSection />
          <JudgingSection />
          <ThemeSection />
          <ParticipantsSection />
          <DeliverablesSection />
          <WhyKyotoSection />
          <TimelineSection />
          <VolunteerSection />
          <PartnerWithSection />
          <OrganizersPartnersSection />
          <FinalCTASection />
        </main>
      </motion.div>
    </>
  );
};

export default Index;
