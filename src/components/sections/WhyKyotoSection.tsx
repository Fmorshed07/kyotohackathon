import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import kyotoHero from "@/assets/kyoto-hero.jpg";

const WhyKyotoSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section className="relative min-h-[70vh] overflow-hidden px-6 py-32" id="why-kyoto">
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={isVisible ? { opacity: 1 } : {}}
        transition={{ duration: 1.5 }}
      >
        <img
          src={kyotoHero}
          alt=""
          className="h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
      </motion.div>

      <div ref={ref} className="mx-auto max-w-5xl">
        <motion.span
          className="font-display text-sm tracking-[0.3em] text-primary"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
        >
          WHY KYOTO
        </motion.span>
        <motion.h2
          className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Why Kyoto?
        </motion.h2>

        <motion.div
          className="mt-12 space-y-6"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <p className="font-body text-xl leading-relaxed text-muted-foreground md:text-2xl">
            Kyoto is one of Japan&apos;s most important centers of innovation, education, and
            culture.
          </p>
          <p className="font-body text-lg leading-relaxed text-muted-foreground md:text-xl">
            Home to world renowned universities, researchers, startups, and global companies,
            Kyoto provides the perfect environment for bringing together diverse perspectives
            to solve complex challenges.
          </p>
          <p className="font-display text-xl font-medium tracking-wide text-gradient-cyan md:text-2xl">
            Impact Kyoto connects the city&apos;s innovative spirit with the future of artificial
            intelligence.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default WhyKyotoSection;
