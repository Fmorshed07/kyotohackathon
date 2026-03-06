import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import tokyoAbstract from "@/assets/tokyo-abstract.jpg";

const prizePool = [
  {
    title: "🥇 Champion Team",
    rewards: ["¥15,000 Amazon Gift Card", "$300 Alibaba Cloud credits"],
  },
  {
    title: "🥈 1st runner-up Team",
    rewards: ["¥10,000 Amazon Gift Card", "$200 Alibaba Cloud credits"],
  },
  {
    title: "🥉 2nd runner-up Team",
    rewards: ["¥5,000 Amazon Gift Card", "$200 Alibaba Cloud credits"],
  },
];

const participantBenefits = [
  "$10 AI Coding Plan Lite on Alibaba",
  "$10 Alibaba Cloud - Model Studio API & Cloud Services",
  "1-Month Lovable Pro",
  "1-Month n8n Cloud Pro",
];

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
      {/* Background */}
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={isVisible ? { opacity: 1 } : {}}
        transition={{ duration: 1.5 }}
      >
        <img
          src={tokyoAbstract}
          alt=""
          className="h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/60" />
        
        {/* Animated gradient overlay */}
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "radial-gradient(circle at 30% 50%, hsl(185 100% 50% / 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 70% 50%, hsl(270 70% 60% / 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 30% 50%, hsl(185 100% 50% / 0.1) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
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
            className="text-gradient-cyan"
            animate={isVisible ? {
              textShadow: [
                "0 0 20px hsl(185 100% 50% / 0.3)",
                "0 0 40px hsl(185 100% 50% / 0.5)",
                "0 0 20px hsl(185 100% 50% / 0.3)",
              ],
            } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            in Tokyo.
          </motion.span>
        </motion.h2>

        {/* Subtext */}
        <motion.p
          className="mx-auto mt-8 max-w-xl font-body text-lg text-muted-foreground md:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          February 2026. Tokyo, Japan. Be part of a global movement to create AI
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
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {prizePool.map((tier) => (
                <div key={tier.title} className="rounded-xl border border-border/80 bg-background/40 p-4">
                  <p className="font-display text-sm tracking-wide text-foreground">{tier.title}</p>
                  <ul className="mt-3 space-y-2">
                    {tier.rewards.map((reward) => (
                      <li key={reward} className="font-body text-sm text-muted-foreground">
                        {reward}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-secondary/30 bg-card/40 p-6 backdrop-blur-sm">
            <h3 className="font-display text-xl tracking-wide text-secondary">Participant Benefits</h3>
            <ul className="mt-4 space-y-2">
              {participantBenefits.map((benefit) => (
                <li key={benefit} className="font-body text-sm text-muted-foreground">
                  {benefit}
                </li>
              ))}
            </ul>
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
            href="https://luma.com/2f3omvqa"
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg border border-secondary/50 bg-secondary/10 px-10 py-5 font-display text-base tracking-wider text-secondary backdrop-blur-sm transition-all duration-300 hover:bg-secondary/20"
            whileHover={{ scale: 1.02, boxShadow: "0 0 40px hsl(270 70% 60% / 0.4)" }}
            whileTap={{ scale: 0.98 }}
            target="_blank"
            rel="noreferrer"
          >
            <span className="relative z-10">GET INVOLVED</span>
          </motion.a>
        </motion.div>


        {/* Footer Note */}
        <motion.p
          className="mt-16 font-body text-xs tracking-[0.2em] text-muted-foreground/50"
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          IMPACT TOKYO 2026 • AI FOR GLOBAL GOOD • ORGANIZED BY COGNISOR AI
        </motion.p>
      </div>
    </section>
  );
};

export default FinalCTASection;
