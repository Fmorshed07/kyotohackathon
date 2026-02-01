import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const tiers = [
  {
    name: "Platinum",
    kanji: "プラチナ",
    color: "primary",
    benefits: ["Premier logo placement", "Speaking opportunity", "VIP access", "Recruiting booth"],
  },
  {
    name: "Gold",
    kanji: "ゴールド",
    color: "secondary",
    benefits: ["Logo on materials", "Booth space", "Attendee access", "Social mentions"],
  },
  {
    name: "Silver",
    kanji: "シルバー",
    color: "muted",
    benefits: ["Logo on website", "Social mentions", "Event tickets", "Brand visibility"],
  },
];

const additionalTiers = [
  {
    name: "Partners",
    kanji: "パートナー",
    color: "accent",
    description: "Strategic collaborators who share our vision for AI-driven global impact.",
    benefits: ["Co-branding opportunities", "Joint content creation", "Network access", "Mentorship roles"],
  },
  {
    name: "Community Supporters",
    kanji: "コミュニティ",
    color: "community",
    description: "Individuals and organizations championing the AI for Good movement.",
    benefits: ["Recognition on website", "Community badge", "Early access updates", "Networking events"],
  },
];

const SponsorsSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative min-h-screen px-6 py-32" id="sponsors">
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
            Join us in building the future of AI. Your support enables the next generation
            of impactful technology.
          </motion.p>
        </motion.div>

        {/* Sponsor Tiers */}
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier, index) => {
            const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
              threshold: 0.3,
            });

            const borderClass =
              tier.color === "primary"
                ? "border-primary/50 hover:border-primary"
                : tier.color === "secondary"
                ? "border-secondary/50 hover:border-secondary"
                : "border-border hover:border-muted-foreground";

            const textClass =
              tier.color === "primary"
                ? "text-primary"
                : tier.color === "secondary"
                ? "text-secondary"
                : "text-muted-foreground";

            const glowClass =
              tier.color === "primary"
                ? "0 0 30px hsl(185 100% 50% / 0.3)"
                : tier.color === "secondary"
                ? "0 0 30px hsl(270 70% 60% / 0.3)"
                : "none";

            return (
              <motion.div
                key={tier.name}
                ref={ref}
                className={`group relative overflow-hidden rounded-xl border bg-card/30 p-8 backdrop-blur-sm transition-all duration-500 ${borderClass}`}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={isVisible ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: glowClass,
                }}
              >
                {/* Tier name */}
                <div className="mb-6 flex items-center justify-between">
                  <motion.h3
                    className={`font-display text-2xl tracking-wide ${textClass}`}
                    whileHover={{ x: 5 }}
                  >
                    {tier.name}
                  </motion.h3>
                  <span className="text-xs text-muted-foreground/40">{tier.kanji}</span>
                </div>

                {/* Benefits */}
                <ul className="space-y-3">
                  {tier.benefits.map((benefit, i) => (
                    <motion.li
                      key={benefit}
                      className="flex items-center gap-3 font-body text-sm text-muted-foreground"
                      initial={{ opacity: 0, x: -10 }}
                      animate={isVisible ? { opacity: 1, x: 0 } : {}}
                      transition={{ duration: 0.4, delay: index * 0.15 + i * 0.05 + 0.3 }}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        tier.color === "primary" ? "bg-primary" : 
                        tier.color === "secondary" ? "bg-secondary" : "bg-muted-foreground"
                      }`} />
                      {benefit}
                    </motion.li>
                  ))}
                </ul>

                {/* Decorative corner */}
                <div className={`absolute -right-8 -top-8 h-16 w-16 rounded-full opacity-10 blur-2xl ${
                  tier.color === "primary" ? "bg-primary" : 
                  tier.color === "secondary" ? "bg-secondary" : "bg-muted-foreground"
                }`} />
              </motion.div>
            );
          })}
        </div>

        {/* Partners & Community Section */}
        <motion.div
          className="mt-16 grid gap-6 md:grid-cols-2"
          initial={{ opacity: 0, y: 30 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          {additionalTiers.map((tier, index) => {
            const isPartner = tier.color === "accent";
            
            return (
              <motion.div
                key={tier.name}
                className={`group relative overflow-hidden rounded-xl border p-8 backdrop-blur-sm transition-all duration-500 ${
                  isPartner 
                    ? "border-accent/50 hover:border-accent bg-accent/5" 
                    : "border-community/50 hover:border-community bg-community/5"
                }`}
                initial={{ opacity: 0, x: index === 0 ? -30 : 30 }}
                animate={headerVisible ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.7 + index * 0.15 }}
                whileHover={{ 
                  scale: 1.02,
                  boxShadow: isPartner 
                    ? "0 0 30px hsl(270 50% 40% / 0.3)" 
                    : "0 0 30px hsl(160 70% 45% / 0.3)",
                }}
              >
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                  <motion.h3
                    className={`font-display text-2xl tracking-wide ${
                      isPartner ? "text-accent" : "text-community"
                    }`}
                    whileHover={{ x: 5 }}
                  >
                    {tier.name}
                  </motion.h3>
                  <span className="text-xs text-muted-foreground/40">{tier.kanji}</span>
                </div>
                
                {/* Description */}
                <p className="mb-6 font-body text-sm text-muted-foreground">
                  {tier.description}
                </p>

                {/* Benefits */}
                <ul className="space-y-2">
                  {tier.benefits.map((benefit, i) => (
                    <motion.li
                      key={benefit}
                      className="flex items-center gap-3 font-body text-sm text-muted-foreground"
                      initial={{ opacity: 0, x: -10 }}
                      animate={headerVisible ? { opacity: 1, x: 0 } : {}}
                      transition={{ duration: 0.4, delay: 0.8 + index * 0.15 + i * 0.05 }}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        isPartner ? "bg-accent" : "bg-community"
                      }`} />
                      {benefit}
                    </motion.li>
                  ))}
                </ul>

                {/* Decorative corner */}
                <div className={`absolute -right-8 -top-8 h-16 w-16 rounded-full opacity-10 blur-2xl ${
                  isPartner ? "bg-accent" : "bg-community"
                }`} />
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <motion.a
              href="#"
              className="inline-flex items-center justify-center rounded-lg border border-primary/50 bg-primary/10 px-10 py-4 font-display text-sm tracking-wider text-primary backdrop-blur-sm transition-all duration-300 hover:bg-primary/20"
              whileHover={{ scale: 1.02, boxShadow: "0 0 30px hsl(185 100% 50% / 0.4)" }}
              whileTap={{ scale: 0.98 }}
            >
              BECOME A SPONSOR
            </motion.a>
            <motion.a
              href="#"
              className="inline-flex items-center justify-center rounded-lg border border-community/50 bg-community/10 px-10 py-4 font-display text-sm tracking-wider text-community backdrop-blur-sm transition-all duration-300 hover:bg-community/20"
              whileHover={{ scale: 1.02, boxShadow: "0 0 30px hsl(160 70% 45% / 0.4)" }}
              whileTap={{ scale: 0.98 }}
            >
              JOIN AS SUPPORTER
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SponsorsSection;
