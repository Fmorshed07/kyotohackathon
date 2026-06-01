import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const UpdatedBannerSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.15 });

  return (
    <section className="relative overflow-hidden px-4 py-20 md:px-6 md:py-28" id="event-banner">
      <div className="mx-auto max-w-6xl">
        <motion.div
          ref={ref}
          className="relative overflow-hidden rounded-3xl border border-white/20 shadow-2xl shadow-black/50"
          initial={{ opacity: 0, y: 36 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <img
            src="/banner.png"
            alt="Impact Kyoto 2026 event banner"
            className="h-auto w-full object-cover"
            loading="lazy"
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_55%)]" />
        </motion.div>
      </div>
    </section>
  );
};

export default UpdatedBannerSection;
