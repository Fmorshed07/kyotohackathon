import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const PartnerWithSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-0 sm:px-6" id="partner-with">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]"
          animate={{ y: [0, 20, 0], opacity: [0.25, 0.5, 0.25] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-10 right-10 h-64 w-64 rounded-full bg-secondary/15 blur-[120px]"
          animate={{ x: [0, -20, 0], opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        <motion.span
          ref={ref}
          className="font-display text-xs tracking-[0.3em] text-primary sm:text-sm sm:tracking-[0.4em]"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
        >
          PARTNER WITH US
        </motion.span>
        <motion.h2
          className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:mt-5 sm:text-4xl md:text-5xl lg:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <span className="text-gradient-cyan">Partner</span> with Impact Kyoto
        </motion.h2>
        <motion.p
          className="mx-auto mt-6 max-w-2xl font-body text-base text-muted-foreground sm:mt-8 sm:text-lg lg:text-xl"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Interested in partnering or supporting? Reach out and we will connect.
        </motion.p>

        <motion.div
          className="mt-8 flex justify-center sm:mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <motion.a
            href="mailto:cognisorai@gmail.com"
            className="inline-flex w-full max-w-md items-center justify-center rounded-xl border border-primary/60 bg-primary/20 px-6 py-4 font-display text-xs tracking-[0.2em] text-primary shadow-[0_0_35px_hsl(185_100%_50%_/_0.35)] backdrop-blur-sm transition-all duration-300 hover:bg-primary/30 sm:w-auto sm:px-12 sm:py-5 sm:text-base sm:tracking-[0.3em]"
            whileHover={{ scale: 1.03, boxShadow: "0 0 50px hsl(185 100% 50% / 0.5)" }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="break-all">contact : cognisorai@gmail.com</span>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default PartnerWithSection;
