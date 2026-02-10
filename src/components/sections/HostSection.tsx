import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const HostSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section className="relative overflow-hidden px-6 py-24" id="host">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          className="absolute right-10 top-10 h-56 w-56 rounded-full bg-secondary/10 blur-3xl"
          animate={{ y: [0, 16, 0], opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      </div>

      <div className="mx-auto max-w-5xl text-center">
        <motion.span
          ref={ref}
          className="font-display text-sm tracking-[0.3em] text-primary"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}
        >
          HOST
        </motion.span>
        <motion.h2
          className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Cognisor AI
        </motion.h2>

        <motion.div
          className="mt-10 flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex h-24 w-52 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent px-6 py-4 shadow-lg shadow-black/30">
            <img
              src="/partners/cognisor.png"
              alt="Cognisor AI logo"
              className="h-full w-full object-contain max-h-20"
              loading="lazy"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HostSection;
