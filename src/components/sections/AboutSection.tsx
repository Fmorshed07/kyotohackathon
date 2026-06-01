import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import kyotoSkyline from "@/assets/kyoto-skyline.jpg";

const AboutSection = () => {
  const { ref: sectionRef, isVisible: sectionVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });

  return (
    <section className="relative min-h-screen overflow-hidden px-6 py-32" id="about">
      {/* Scroll trigger */}
      <div ref={sectionRef} className="absolute inset-0" />
      {/* Background Image */}
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={sectionVisible ? { opacity: 1 } : {}}
        transition={{ duration: 1.5 }}
      >
        <img
          src={kyotoSkyline}
          alt=""
          className="h-full w-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background" />
      </motion.div>

      <div className="mx-auto max-w-5xl">
        {/* Section Header */}
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 50 }}
          animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            className="font-display text-sm tracking-[0.3em] text-primary"
            initial={{ opacity: 0, x: -20 }}
            animate={sectionVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            ABOUT
          </motion.span>
          <motion.h2
            className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Impact {">"} Hype
          </motion.h2>
        </motion.div>

        {/* Philosophy Blocks */}
        <div className="space-y-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <p className="font-body text-2xl leading-relaxed text-muted-foreground md:text-3xl lg:text-4xl">
              We believe the future of AI isn't just about{" "}
              <span className="text-foreground">what's possible</span>—it's about{" "}
              <motion.span
                className="text-gradient-cyan"
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                what's meaningful
              </motion.span>.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <p className="font-body text-xl leading-relaxed text-muted-foreground md:text-2xl">
              Impact Kyoto brings together the world's most ambitious builders to solve
              real problems. No pitch decks. No vanity metrics. Just{" "}
              <span className="text-secondary">working solutions</span> that make a
              difference.
            </p>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="mt-32 grid gap-8 md:grid-cols-3">
          {[
            { label: "Problem-First", desc: "Start with impact, not technology", icon: "◆" },
            { label: "Global Scale", desc: "Solutions for worldwide challenges", icon: "◇" },
            { label: "Built in Kyoto", desc: "For the world", icon: "○" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              className="group relative border-l-2 border-primary/30 pl-6 transition-colors hover:border-primary"
              initial={{ opacity: 0, x: -30 }}
              animate={sectionVisible ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.7 + i * 0.1 }}
            >
              <motion.span
                className="mb-2 block text-2xl text-primary/40 group-hover:text-primary"
                whileHover={{ scale: 1.2, rotate: 90 }}
                transition={{ duration: 0.3 }}
              >
                {item.icon}
              </motion.span>
              <h3 className="font-display text-lg tracking-wide text-foreground group-hover:text-primary transition-colors">
                {item.label}
              </h3>
              <p className="mt-2 font-body text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
