import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const partners = [
  {
    name: "Tokyo International University Impact Next",
    src: "/partners/impact-next.png",
    alt: "Tokyo International University Impact Next logo",
    logoClassName: "max-h-16 md:max-h-20",
  },
  {
    name: "TEDx InnovationU",
    src: "/partners/tedx-innovationu.png",
    alt: "TEDx InnovationU logo",
    logoClassName: "max-h-12 md:max-h-14",
  },
  {
    name: "Netlink AI",
    src: "/partners/netlink-ai.png",
    alt: "Netlink AI logo",
    logoClassName: "h-[140%] w-[170%] max-w-none max-h-none",
  },
  {
    name: "Cognisor",
    src: "/partners/cognisor.png",
    alt: "Cognisor logo",
    logoClassName: "max-h-16 md:max-h-20",
  },
  {
    name: "CreatorLabo",
    src: "/partners/creatorlabo-log.png",
    alt: "CreatorLabo logo",
    logoClassName: "max-h-16 md:max-h-20",
  },
  {
    name: "Orange Partner",
    src: "/partners/orange-partner.png",
    alt: "Orange partner logo",
    logoClassName: "max-h-14 md:max-h-16",
  },
];

const marqueePartners = partners.concat(partners);

const SponsorsSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative min-h-screen overflow-hidden px-6 py-32" id="sponsors">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute left-1/2 top-8 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
          animate={{ y: [0, 18, 0], opacity: [0.25, 0.4, 0.25] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-12 left-10 h-56 w-56 rounded-full bg-secondary/10 blur-3xl"
          animate={{ x: [0, 28, 0], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      </div>

      <div className="mx-auto max-w-5xl">
        {/* Section Header */}
        <motion.div
          ref={headerRef}
          className="mb-20 text-center"
          initial={{ opacity: 0, y: 50 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            className="font-display text-sm tracking-[0.3em] text-primary"
            initial={{ opacity: 0 }}
            animate={headerVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            PARTNERS
          </motion.span>
          <motion.h2
            className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Partner with Impact Tokyo
          </motion.h2>
          <motion.p
            className="mx-auto mt-6 max-w-2xl font-body text-lg text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={headerVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Interested in partnering or supporting? Reach out and we will connect.
          </motion.p>
        </motion.div>

        {/* Partners Marquee */}
        <div className="relative overflow-hidden">
          <div className="flex min-w-max gap-6 animate-scroll-left">
            {marqueePartners.map((partner, index) => (
              <div
                key={`${partner.name}-${index}`}
                className="flex h-20 w-40 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent px-4 py-3 shadow-lg shadow-black/30 transition-all duration-300 hover:border-primary/40 hover:from-primary/15 hover:via-primary/5 hover:to-transparent hover:shadow-xl md:h-24 md:w-48"
              >
                <img
                  src={partner.src}
                  alt={partner.alt}
                  className={`h-full w-full object-contain ${partner.logoClassName}`}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <motion.a
              href="mailto:cognisorai@gmail.com"
              className="inline-flex items-center justify-center rounded-lg border border-primary/50 bg-primary/10 px-10 py-4 font-display text-sm tracking-wider text-primary backdrop-blur-sm transition-all duration-300 hover:bg-primary/20"
              whileHover={{ scale: 1.02, boxShadow: "0 0 30px hsl(185 100% 50% / 0.4)" }}
              whileTap={{ scale: 0.98 }}
            >
              contact : cognisorai@gmail.com
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SponsorsSection;
