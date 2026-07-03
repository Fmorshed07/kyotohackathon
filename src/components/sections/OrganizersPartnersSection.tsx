import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const OrganizersPartnersSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.15 });

  return (
    <section className="relative overflow-hidden py-24 md:py-32" id="organizers">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-24 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute right-0 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-secondary/10 blur-[120px]" />
      </div>

      <div ref={ref} className="mx-auto max-w-5xl px-6">
        <motion.div
          className="mb-10 text-center md:mb-12"
          initial={{ opacity: 0, y: 40 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <span className="font-display text-sm tracking-[0.3em] text-primary">
            ORGANIZERS &amp; PARTNERS
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Organizers &amp; Partners
          </h2>
        </motion.div>
      </div>

      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0, y: 30 }}
        animate={isVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.15 }}
      >
        <img
          src="/h1.png"
          alt="Impact Kyoto 2026 — Agentic AI Hackathon for Japan's Future"
          width={1024}
          height={457}
          className="block h-auto w-[1024px] max-w-full"
          loading="lazy"
        />
      </motion.div>
    </section>
  );
};

export default OrganizersPartnersSection;
