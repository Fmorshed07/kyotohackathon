import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const LUMA_URL = "https://luma.com/2f3omvqa";

const moreBenefits = [
  "Direct Mentorship from investors & startup founders",
  "Opportunity to Pitch in front of VCs",
  "Official Certificate of Participation",
  "Featured Project Spotlight (selected teams)",
  "Internship & Collaboration Consideration",
  "Access to Cognisor AI Builder Community (post-event networking)",
];

const FinalCTASection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-32"
      id="cta"
    >
      {/* Scroll trigger */}
      <div ref={ref} className="absolute inset-0" />
      {/* Background — subtle banner tint (same palette as hero, not a second full banner) */}
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={isVisible ? { opacity: 1 } : {}}
        transition={{ duration: 1.5 }}
      >
        <img
          src="/banner.png"
          alt=""
          className="h-full w-full object-cover object-center opacity-[0.12]"
        />
        <div className="absolute inset-0 poster-section-bg opacity-95" />
        <div className="absolute inset-0 section-glow-top" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 40% at 50% 100%, hsl(18 95% 58% / 0.1), transparent)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/70" />
      </motion.div>

      <div className="max-w-4xl text-center">
        {/* Japanese text */}
        <motion.span
          className="mb-6 inline-block font-display text-sm tracking-[0.4em] text-primary/60"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          未来を創る
        </motion.span>

        {/* Main Headline */}
        <motion.h2
          className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl xl:text-7xl"
          initial={{ opacity: 0, y: 40 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          Build the future of AI
          <br />
          <motion.span
            className="text-gradient-sunset"
            animate={isVisible ? {
              textShadow: [
                "0 0 20px hsl(18 95% 58% / 0.3)",
                "0 0 40px hsl(270 55% 72% / 0.35)",
                "0 0 20px hsl(18 95% 58% / 0.3)",
              ],
            } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            in Kyoto.
          </motion.span>
        </motion.h2>

        {/* Subtext */}
        <motion.p
          className="mx-auto mt-8 max-w-xl font-body text-lg text-muted-foreground md:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          28th June 2026. Kyoto, Japan. Be part of a global movement to create AI
          that matters.
        </motion.p>

        <motion.div
          className="mx-auto mt-12 grid max-w-5xl gap-6 text-left md:grid-cols-2"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.6 }}
        >
          <div className="rounded-2xl border border-primary/30 bg-card/40 p-6 backdrop-blur-sm md:col-span-2">
            <h3 className="font-display text-xl tracking-wide text-primary">Prizepool</h3>
            <p className="mt-4 font-body text-lg text-muted-foreground">Coming soon</p>
          </div>

          <div className="rounded-2xl border border-secondary/30 bg-card/40 p-6 backdrop-blur-sm">
            <h3 className="font-display text-xl tracking-wide text-secondary">Participant Benefits</h3>
            <p className="mt-4 font-body text-lg text-muted-foreground">Coming soon</p>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-card/40 p-6 backdrop-blur-sm">
            <h3 className="font-display text-xl tracking-wide text-primary">More Benefits</h3>
            <ul className="mt-4 space-y-2">
              {moreBenefits.map((benefit) => (
                <li key={benefit} className="font-body text-sm text-muted-foreground">
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <motion.a
            href={LUMA_URL}
            className="btn-poster-cta"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            target="_blank"
            rel="noreferrer"
          >
            <span className="relative z-10">REGISTER</span>
          </motion.a>
        </motion.div>


        {/* Footer Note */}
        <motion.p
          className="mt-16 font-body text-xs tracking-[0.2em] text-muted-foreground/50"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          IMPACT KYOTO 2026 • AI FOR GLOBAL GOOD • ORGANIZED BY COGNISOR AI
        </motion.p>
      </div>
    </section>
  );
};

export default FinalCTASection;
