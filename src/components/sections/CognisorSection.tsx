import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const CognisorSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section className="relative min-h-screen px-6 py-32" id="cognisor">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-24 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute right-0 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-navy-500/10 blur-[120px]" />
      </div>
      <div ref={ref} className="mx-auto max-w-5xl text-center">
        {/* Organized By */}
        <motion.span
          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-2 font-display text-xs tracking-[0.3em] text-muted-foreground shadow-sm backdrop-blur"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_hsl(185_100%_50%/0.8)]" />
          ORGANIZED BY
        </motion.span>

        {/* Logo / Brand */}
        <motion.h2
          className="mt-6 font-display text-5xl font-bold tracking-wide md:text-6xl lg:text-7xl"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.a
            href="https://cognisorai.com"
            target="_blank"
            rel="noreferrer"
            className="text-gradient-cyan transition-colors hover:text-primary"
            animate={isVisible ? {
              textShadow: [
                "0 0 20px hsl(185 100% 50% / 0.3)",
                "0 0 40px hsl(185 100% 50% / 0.5)",
                "0 0 20px hsl(185 100% 50% / 0.3)",
              ],
            } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            Cognisor AI
          </motion.a>
        </motion.h2>
        <motion.p
          className="mt-3 font-body text-sm text-muted-foreground"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <a
            href="https://www.cognisorai.com"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-primary"
          >
            www.cognisorai.com
          </a>
        </motion.p>

        {/* Description */}
        <motion.div
          className="mt-12 space-y-6"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <p className="font-body text-xl leading-relaxed text-muted-foreground md:text-2xl">
            Cognisor AI builds AI development and business automation solutions that
            help teams build smarter and scale faster with AI at the core.
          </p>
          <p className="font-body text-lg text-muted-foreground/80">
            The company delivers intelligent systems, scalable digital products, and
            automation workflows tailored to business needs, supported by consultations
            and a growing catalog of AI tools.
          </p>
          <div className="relative overflow-hidden rounded-3xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500/10 via-navy-500/10 to-transparent p-8 text-left shadow-[0_25px_80px_-50px_hsl(185_100%_50%/0.6)] backdrop-blur">
            <div className="pointer-events-none absolute -top-20 right-0 h-40 w-40 rounded-full bg-cyan-400/20 blur-[60px]" />
            <div className="pointer-events-none absolute -bottom-16 left-0 h-40 w-40 rounded-full bg-navy-400/20 blur-[60px]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-100">
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_hsl(185_100%_50%/0.9)]" />
                Sushi Tech Tokyo 2026
              </div>
              <h3 className="mt-5 font-display text-2xl font-semibold tracking-wide text-foreground md:text-3xl">
                TIU Impact Next & Cognisor AI are the event ambassadors
              </h3>
              <p className="mt-4 font-body text-lg text-muted-foreground/90">
                As we connect with Sushi Tech Tokyo 2026, we are offering{" "}
                <span className="text-foreground">discounted tickets</span> to our
                community through this partnership.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {["TIU Impact Next", "Cognisor AI", "Sushi Tech Tokyo 2026"].map(
                  (label) => (
                    <span
                      key={label}
                      className="rounded-full border border-border/60 bg-card/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground"
                    >
                      {label}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
          <div className="mt-8 grid gap-4 text-left md:grid-cols-2">
            {[
              {
                title: "AI Systems",
                description:
                  "Intelligent systems for complex business problems with speed and accuracy.",
              },
              {
                title: "Web & App Development",
                description:
                  "Scalable digital products built for performance, reliability, and growth.",
              },
              {
                title: "Business Automation",
                description:
                  "Replace repetitive tasks with intelligent, measurable workflows.",
              },
              {
                title: "AI Tools Catalog",
                description:
                  "Tools across productivity, marketing, content, and operations.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-border/70 bg-card/40 p-5 shadow-sm backdrop-blur transition hover:border-cyan-400/40 hover:bg-card/60"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg tracking-wide text-foreground">
                    {item.title}
                  </h3>
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400/80 opacity-60 transition group-hover:opacity-100" />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground/80">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Mission Statement */}
        <motion.div
          className="mt-16 overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card/40 via-card/20 to-transparent p-8 text-left shadow-lg backdrop-blur md:p-12"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isVisible ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ borderColor: "hsl(185 100% 50% / 0.3)" }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Cognisor AI Philosophy
          </p>
          <motion.blockquote
            className="mt-4 font-display text-xl italic tracking-wide text-foreground md:text-2xl"
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            "Build and deploy intelligent systems that solve complex business problems
            with speed and accuracy."
          </motion.blockquote>
          <motion.p
            className="mt-4 font-body text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 1 }}
          >
            — Cognisor AI
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};

export default CognisorSection;
