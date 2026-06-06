import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const PARTNER_EMAIL = "mailto:cognisorai@gmail.com?subject=Impact%20Kyoto%202026%20Partnership";

const partnershipTypes = [
  {
    title: "Venue Partners",
    description: "Support the event by providing world class spaces for collaboration.",
  },
  {
    title: "Technology Partners",
    description: "Provide AI platforms, APIs, cloud credits, developer tools, and technical resources.",
  },
  {
    title: "Community Partners",
    description: "Help connect students, developers, founders, and innovators.",
  },
  {
    title: "University Partners",
    description: "Encourage student participation and academic collaboration.",
  },
  {
    title: "Ecosystem Partners",
    description: "Support networking, mentorship, startup growth, and innovation initiatives.",
  },
  {
    title: "Sponsors",
    description: "Invest in talent development, innovation, and the future of AI.",
  },
];

const PartnerWithSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-24 sm:px-6 md:min-h-screen md:pb-32" id="partnerships">
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

      <div className="mx-auto max-w-5xl">
        <motion.div
          ref={ref}
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <span className="font-display text-xs tracking-[0.3em] text-primary sm:text-sm sm:tracking-[0.4em]">
            PARTNERSHIP OPPORTUNITIES
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:mt-5 sm:text-4xl md:text-5xl lg:text-6xl">
            Join the Ecosystem
          </h2>
          <p className="mx-auto mt-6 max-w-2xl font-body text-base text-muted-foreground sm:mt-8 sm:text-lg lg:text-xl">
            We are actively seeking organizations that share our vision of empowering the
            next generation of innovators.
          </p>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          {partnershipTypes.map((type, index) => {
            const { ref: cardRef, isVisible: cardVisible } = useScrollReveal<HTMLDivElement>({
              threshold: 0.3,
            });

            return (
              <motion.div
                key={type.title}
                ref={cardRef}
                className="rounded-xl border border-border bg-card/30 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/30"
                initial={{ opacity: 0, y: 30 }}
                animate={cardVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <h3 className="font-display text-lg tracking-wide text-foreground md:text-xl">
                  {type.title}
                </h3>
                <p className="mt-3 font-body text-sm text-muted-foreground md:text-base">
                  {type.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="mt-12 flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <motion.a
            href={PARTNER_EMAIL}
            className="inline-flex w-full max-w-md items-center justify-center rounded-xl border border-primary/60 bg-primary/20 px-6 py-4 font-display text-xs tracking-[0.2em] text-primary shadow-[0_0_35px_hsl(185_100%_50%_/_0.35)] backdrop-blur-sm transition-all duration-300 hover:bg-primary/30 sm:w-auto sm:px-12 sm:py-5 sm:text-base sm:tracking-[0.3em]"
            whileHover={{ scale: 1.03, boxShadow: "0 0 50px hsl(185 100% 50% / 0.5)" }}
            whileTap={{ scale: 0.98 }}
          >
            Become a Partner
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default PartnerWithSection;
