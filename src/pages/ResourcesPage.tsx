import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import AnimatedBackground from "@/components/AnimatedBackground";
import SiteHeader from "@/components/SiteHeader";
import ResourcesGuideSection from "@/components/sections/ResourcesGuideSection";

const ResourcesPage = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace(/^#/, "");
    const timer = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      const header = document.querySelector("header");
      const headerHeight = header?.getBoundingClientRect().height ?? 56;
      const top = el.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
      window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [hash]);

  return (
    <div className="relative min-h-svh bg-background">
      <AnimatedBackground />
      <SiteHeader />
      <main className="relative pt-14">
        <ResourcesGuideSection />
      </main>
    </div>
  );
};

export default ResourcesPage;
