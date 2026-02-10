import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const sponsors = [
  {
    name: "Lovable",
    src: "/partners/lovable.png",
    alt: "Lovable logo",
    logoClassName: "max-h-16 md:max-h-20",
  },
  {
    name: "Cognisor",
    src: "/partners/cognisor.png",
    alt: "Cognisor logo",
    logoClassName: "max-h-16 md:max-h-20",
  },
];

const SponsorLogosSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative overflow-hidden px-6 py-24" id="sponsors">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-16 h-52 w-52 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl">
        <motion.div
          ref={headerRef}
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 40 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="font-display text-sm tracking-[0.3em] text-primary">
            SPONSORS
          </span>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Sponsored by visionary partners
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {sponsors.map((sponsor) => (
            <motion.div
              key={sponsor.name}
              className="flex h-28 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent px-6 py-4 shadow-lg shadow-black/30"
              initial={{ opacity: 0, y: 20 }}
              animate={headerVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <img
                src={sponsor.src}
                alt={sponsor.alt}
                className={`h-full w-full object-contain ${sponsor.logoClassName}`}
                loading="lazy"
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SponsorLogosSection;
