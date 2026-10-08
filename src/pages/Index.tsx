import AnimatedBackground from "@/components/AnimatedBackground";
import SiteHeader from "@/components/SiteHeader";
import HeroSection from "@/components/sections/HeroSection";
import JapanHeroSection from "@/components/ecosystem/JapanHeroSection";
import PartnersSection from "@/components/ecosystem/PartnersSection";
import EventShowcase from "@/components/ecosystem/EventShowcase";
import CommunityFooter from "@/components/ecosystem/CommunityFooter";
import LiveEventsSection from "@/components/sections/LiveEventsSection";
import HostSection from "@/components/sections/HostSection";
import AboutSection from "@/components/sections/AboutSection";
import PlatformSection from "@/components/sections/PlatformSection";
import FeaturePreviewSection from "@/components/sections/FeaturePreviewSection";
import CommunitySection from "@/components/sections/CommunitySection";
import LookingForJobsSection from "@/components/sections/LookingForJobsSection";
import FinalCTASection from "@/components/sections/FinalCTASection";
import { useHomeSectionAnchor } from "@/hooks/useHomeSectionAnchor";

const Index = () => {
  useHomeSectionAnchor();
  return (
  <>
    <AnimatedBackground />
    <SiteHeader />
    <main className="relative minimal-home">
      <HeroSection />
      <JapanHeroSection asSection />
      <PartnersSection />
      <LiveEventsSection showPastEvents={false} />
      <EventShowcase />
      <FeaturePreviewSection />
      <HostSection />
      <AboutSection />
      <PlatformSection />
      <CommunitySection />
      <LookingForJobsSection />
      <FinalCTASection />
    </main>
    <CommunityFooter />
  </>
);
};

export default Index;
