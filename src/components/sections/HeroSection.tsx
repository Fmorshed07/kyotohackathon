import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import tokyoHero from "@/assets/tokyo-hero.jpg";

const HeroSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.2 });

  return (
    <section
      ref={ref}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-20"
    >
      {/* Background Image with Parallax */}
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      >
        <img
          src={tokyoHero}
          alt="Tokyo cityscape"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background" />
      </motion.div>

      {/* Animated grain overlay */}
      <div
        className="absolute inset-0 -z-5 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="max-w-5xl text-center">
        {/* Japanese subtitle */}
        <motion.span
          className="mb-4 inline-block font-display text-sm tracking-[0.4em] text-primary/70"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          インパクト東京 2026
        </motion.span>

        {/* Main Title */}
        <motion.h1
          className="font-display text-5xl font-bold tracking-[0.1em] md:text-7xl lg:text-8xl"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            className="text-gradient-cyan inline-block"
            animate={{ 
              textShadow: [
                "0 0 20px hsl(185 100% 50% / 0.3)",
                "0 0 40px hsl(185 100% 50% / 0.5)",
                "0 0 20px hsl(185 100% 50% / 0.3)",
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            IMPACT
          </motion.span>{" "}
          <span className="text-foreground">TOKYO</span>{" "}
          <span className="text-foreground/80">2026</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mt-6 font-display text-xl tracking-[0.2em] text-secondary md:text-2xl lg:text-3xl"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{
            textShadow: "0 0 30px hsl(270 70% 60% / 0.4)",
          }}
        >
          AI FOR GLOBAL GOOD
        </motion.p>

        {/* Tagline */}
        <motion.p
          className="mt-8 font-body text-lg text-foreground/80 md:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          Build With Purpose. Code With Vision. Impact the World.
        </motion.p>

        {/* Organizer */}
        <motion.p
          className="mt-4 font-body text-sm tracking-wide text-muted-foreground/70"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          Organized by Cognisor AI
        </motion.p>

        {/* Event Info Pills */}
        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <span className="rounded-full border border-primary/40 bg-primary/10 px-5 py-2 font-display text-sm tracking-wider text-primary backdrop-blur-sm">
            FEBRUARY 2026
          </span>
          <span className="rounded-full border border-border/50 bg-card/30 px-5 py-2 font-display text-sm tracking-wider text-foreground/80 backdrop-blur-sm">
            TOKYO, JAPAN
          </span>
          <span className="rounded-full border border-secondary/40 bg-secondary/10 px-5 py-2 font-display text-sm tracking-wider text-secondary backdrop-blur-sm">
            IN-PERSON
          </span>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          <motion.a
            href="#sponsors"
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg border border-primary/50 bg-primary/10 px-8 py-4 font-display text-sm tracking-wider text-primary backdrop-blur-sm transition-all duration-300 hover:bg-primary/20"
            whileHover={{ scale: 1.02, boxShadow: "0 0 30px hsl(185 100% 50% / 0.4)" }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="relative z-10">BECOME A SPONSOR</span>
          </motion.a>
          <motion.a
            href="#"
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg border border-secondary/50 bg-secondary/10 px-8 py-4 font-display text-sm tracking-wider text-secondary backdrop-blur-sm transition-all duration-300 hover:bg-secondary/20"
            whileHover={{ scale: 1.02, boxShadow: "0 0 30px hsl(270 70% 60% / 0.4)" }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="relative z-10">JOIN THE HACKATHON</span>
          </motion.a>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: -20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 1.2 }}
      >
        <motion.div
          className="flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <span className="text-xs tracking-widest text-muted-foreground/50">SCROLL</span>
          <div className="h-12 w-[1px] bg-gradient-to-b from-primary/50 to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
