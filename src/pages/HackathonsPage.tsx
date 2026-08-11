import AnimatedBackground from "@/components/AnimatedBackground";
import SiteHeader from "@/components/SiteHeader";
import HackathonsSection from "@/components/sections/HackathonsSection";

const HackathonsPage = () => {
  return (
    <div className="relative min-h-svh bg-background">
      <AnimatedBackground />
      <SiteHeader />
      <main className="relative pt-14">
        <HackathonsSection />
      </main>
    </div>
  );
};

export default HackathonsPage;
