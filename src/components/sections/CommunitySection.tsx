import { motion } from "framer-motion";
import { ExternalLink, MessageCircle, Users } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const DISCORD_URL = "https://discord.gg/cQEFjQDFm";
const CREATORS_CIRCUIT_URL = "https://www.creatorscircuit.tech";

const CommunitySection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section className="relative overflow-hidden px-6 py-24 md:py-32" id="community">

      <div ref={ref} className="mx-auto max-w-5xl">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="font-display text-xs tracking-[0.3em] text-primary sm:text-sm sm:tracking-[0.4em]">
            Stay connected
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground md:text-5xl">
            Join the Community
          </h2>
          <p className="mx-auto mt-6 max-w-2xl font-body text-base text-muted-foreground md:text-lg">
            Connect with fellow builders, get event updates, and be part of Japan&apos;s growing
            AI innovation network.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            className="flex flex-col rounded-lg border border-border bg-card p-6 md:p-10"
            initial={{ opacity: 0, y: 24 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/40 bg-primary/10">
              <MessageCircle className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <h3 className="font-display text-2xl font-bold text-foreground">Discord</h3>
            <p className="mt-3 flex-1 font-body text-sm text-muted-foreground md:text-base">
              Chat with participants, share ideas, and get real-time updates for Impact Kyoto and
              upcoming hackathons.
            </p>
            <motion.a
              href={DISCORD_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-poster-cta mt-8 inline-flex min-w-[200px] items-center justify-center gap-2 self-start"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10">Join Discord</span>
              <ExternalLink className="relative z-10 h-4 w-4" aria-hidden />
            </motion.a>
          </motion.div>

          <motion.div
            className="flex flex-col rounded-lg border border-border bg-card p-6 md:p-10"
            initial={{ opacity: 0, y: 24 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.25 }}
          >
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/40 bg-primary/10">
              <Users className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <h3 className="font-display text-2xl font-bold text-foreground">Creators Circuit</h3>
            <p className="mt-3 flex-1 font-body text-sm text-muted-foreground md:text-base">
              Join our broader creator community — builders, founders, and innovators shaping the
              future of AI across Japan and beyond.
            </p>
            <motion.a
              href={CREATORS_CIRCUIT_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg border border-input px-6 py-3 font-display text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-secondary"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Join our community
              <ExternalLink className="h-4 w-4" aria-hidden />
            </motion.a>
            <p className="mt-4 font-body text-xs tracking-wide text-muted-foreground/70">
              www.creatorscircuit.tech
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;
