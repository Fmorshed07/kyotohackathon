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
    name: "Creator Labo",
    src: "/partners/creatorlabo-log.png",
    alt: "Creator Labo logo",
    logoClassName: "max-h-16 md:max-h-20",
  },
  {
    name: "Orange Partner",
    src: "/partners/orange-partner.png",
    alt: "Orange partner logo",
    logoClassName: "max-h-14 md:max-h-16",
  },
  {
    name: "Tokyo Design",
    src: "/partners/Tokyo%20Design.png",
    alt: "Tokyo Design logo",
    logoClassName: "max-h-14 md:max-h-16",
  },
];

const marqueePartners = partners.concat(partners);

const SponsorsSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative overflow-hidden px-4 pb-10 pt-24 sm:px-6 md:min-h-screen md:pb-4 md:pt-32" id="partners">
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
          className="mb-12 text-center sm:mb-16 md:mb-20"
          initial={{ opacity: 0, y: 50 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            className="font-display text-xs tracking-[0.25em] text-primary sm:text-sm sm:tracking-[0.3em]"
            initial={{ opacity: 0 }}
            animate={headerVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            PARTNERS
          </motion.span>
          <motion.h2
            className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:mt-4 sm:text-4xl md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Partners
          </motion.h2>
        </motion.div>

        {/* Partners Marquee */}
        <div className="relative overflow-hidden">
          <div className="flex min-w-max gap-4 sm:gap-6 animate-scroll-left">
            {marqueePartners.map((partner, index) => (
              <div
                key={`${partner.name}-${index}`}
                className="flex h-16 w-32 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent px-3 py-2 shadow-lg shadow-black/30 transition-all duration-300 hover:border-primary/40 hover:from-primary/15 hover:via-primary/5 hover:to-transparent hover:shadow-xl sm:h-20 sm:w-40 md:h-24 md:w-48"
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

      </div>
    </section>
  );
};

export default SponsorsSection;
