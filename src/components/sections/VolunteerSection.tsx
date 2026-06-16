import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const VOLUNTEER_FORM_URL = "https://forms.gle/ZwUbvVseXgzz1u5y6";

const volunteerRoles = [
  "Registration and check-in",
  "Attendee and team support",
  "Stage and speaker support",
  "English-Japanese language support",
];

const VolunteerSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section className="relative overflow-hidden px-6 py-24 md:py-32" id="volunteer">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <motion.div
          className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[110px]"
          animate={{ opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div ref={ref} className="mx-auto max-w-5xl rounded-2xl border border-border/80 bg-card/30 p-8 backdrop-blur-md md:p-12">
        <motion.span
          className="font-display text-xs tracking-[0.3em] text-primary sm:text-sm sm:tracking-[0.4em]"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          VOLUNTEER WITH US
        </motion.span>

        <motion.h2
          className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground md:text-5xl"
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          Support Impact Kyoto 2026
        </motion.h2>

        <motion.p
          className="mt-6 max-w-3xl font-body text-base text-muted-foreground md:text-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Help us run a meaningful, inclusive, and high-energy hackathon experience.
          We are looking for volunteers across operations, participant support, and bilingual coordination.
        </motion.p>

        <motion.div
          className="mt-8 grid gap-3 sm:grid-cols-2"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {volunteerRoles.map((role) => (
            <div
              key={role}
              className="rounded-lg border border-border/80 bg-background/50 px-4 py-3 font-body text-sm text-foreground/90"
            >
              {role}
            </div>
          ))}
        </motion.div>

        <motion.div
          className="mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <a
            href={VOLUNTEER_FORM_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-primary/60 bg-primary/20 px-8 py-4 font-display text-xs tracking-[0.2em] text-primary shadow-[0_0_30px_hsl(185_100%_50%_/_0.35)] transition-all duration-300 hover:bg-primary/30 sm:text-sm"
          >
            Apply as a Volunteer
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default VolunteerSection;
