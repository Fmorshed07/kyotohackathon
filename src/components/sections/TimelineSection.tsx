import { motion } from "framer-motion";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import tokyoStation from "@/assets/tokyo-station.jpg";
import tokyoHero from "@/assets/tokyo-hero.jpg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const milestones = [
  { title: "Gate Opens", time: "2:00 PM", kanji: "開場" },
  { title: "Team Formation", time: "3:00 PM", kanji: "チーム結成" },
  { title: "Build Session", time: "4:30 PM", kanji: "開発セッション" },
  { title: "Pitch Session", time: "5:00 - 6:30 PM", kanji: "ピッチセッション" },
  { title: "Networking & Closing", time: "8:00 PM", kanji: "交流・閉会" },
];

const TimelineSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });
  const { ref: lineRef, isVisible: lineVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.1,
  });

  return (
    <section className="relative min-h-screen overflow-hidden px-6 py-32" id="timeline">
      {/* Background Image */}
      <motion.div
        className="absolute inset-0 -z-10"
        initial={{ opacity: 0 }}
        animate={headerVisible ? { opacity: 1 } : {}}
        transition={{ duration: 1.5 }}
      >
        <img
          src={tokyoStation}
          alt=""
          className="h-full w-full object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
      </motion.div>

      <div className="mx-auto max-w-5xl">
        {/* Luma preview */}
        <motion.div
          className="mb-16 flex justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <Card className="w-full max-w-5xl border border-primary/50 bg-background/80 shadow-[0_0_40px_hsl(185_100%_50%_/_0.2)] backdrop-blur-md">
            <CardContent className="grid gap-6 p-6 md:grid-cols-[1.1fr_1fr] md:items-stretch">
              <div className="relative overflow-hidden rounded-md border border-border/60 bg-black/20">
                <img
                  src={tokyoHero}
                  alt="Impact Tokyo Hackathon 2026"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent" />
                <div className="absolute left-4 top-4 inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs tracking-[0.2em] text-primary">
                  LIVE ON LUMA
                </div>
              </div>
              <div className="flex flex-col justify-between gap-6">
                <div className="space-y-3">
                  <CardTitle className="text-2xl tracking-wide text-foreground">
                    Impact Tokyo Hackathon 2026: AI for Global Good
                  </CardTitle>
                  <p className="text-sm text-foreground/90">
                    Hosted by Cognisor AI • Antler in Japan, Tokyo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Approval required • Request to join on Luma
                  </p>
                </div>
                <a
                  href="https://luma.com/2f3omvqa"
                  className="inline-flex items-center justify-center rounded-md border border-secondary/70 bg-secondary/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-secondary transition-colors hover:bg-secondary/30"
                  target="_blank"
                  rel="noreferrer"
                >
                  Request to join
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Section Header */}
        <motion.div
          ref={headerRef}
          className="mb-20"
          initial={{ opacity: 0, y: 50 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            className="font-display text-sm tracking-[0.3em] text-primary"
            initial={{ opacity: 0, x: -20 }}
            animate={headerVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            EVENT FORMAT
          </motion.span>
          <motion.h2
            className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 30 }}
            animate={headerVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            The Journey
          </motion.h2>
          <motion.div
            className="mt-6 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0 }}
            animate={headerVisible ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <motion.span
              className="rounded-full border border-primary/30 bg-primary/5 px-4 py-1 font-display text-sm text-primary"
              whileHover={{ scale: 1.05, borderColor: "hsl(185 100% 50% / 0.6)" }}
            >
              Event Day Schedule
            </motion.span>
            <span className="rounded-full border border-border px-4 py-1 font-display text-sm text-muted-foreground">
              Tokyo, Japan
            </span>
            <span className="rounded-full border border-border px-4 py-1 font-display text-sm text-muted-foreground">
              In-Person
            </span>
          </motion.div>
        </motion.div>

        {/* Timeline */}
        <div ref={lineRef} className="relative">
          {/* Vertical Line */}
          <div className="absolute left-4 top-0 h-full w-[2px] overflow-hidden md:left-1/2 md:-translate-x-1/2">
            <motion.div
              className="h-full w-full bg-gradient-to-b from-primary via-secondary to-primary/20"
              initial={{ scaleY: 0 }}
              animate={lineVisible ? { scaleY: 1 } : {}}
              transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: "top" }}
            />
          </div>

          {/* Milestones */}
          <div className="space-y-16">
            {milestones.map((milestone, index) => {
              const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
                threshold: 0.5,
              });
              const isEven = index % 2 === 0;

              return (
                <motion.div
                  key={`${milestone.title}-${milestone.time}`}
                  ref={ref}
                  className="relative flex items-center"
                  initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                  animate={isVisible ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* Dot */}
                  <motion.div
                    className="absolute left-4 z-10 md:left-1/2 md:-translate-x-1/2"
                    initial={{ scale: 0 }}
                    animate={isVisible ? { scale: 1 } : {}}
                    transition={{ duration: 0.4, delay: index * 0.15 + 0.2 }}
                  >
                    <motion.div
                      className="h-4 w-4 rounded-full border-2 border-primary bg-background"
                      animate={isVisible ? {
                        boxShadow: [
                          "0 0 0px hsl(185 100% 50% / 0)",
                          "0 0 20px hsl(185 100% 50% / 0.5)",
                          "0 0 0px hsl(185 100% 50% / 0)",
                        ],
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                    />
                  </motion.div>

                  {/* Content */}
                  <div
                    className={`ml-12 md:ml-0 ${
                      isEven
                        ? "md:mr-auto md:pr-20 md:text-right md:w-1/2"
                        : "md:ml-auto md:pl-20 md:text-left md:w-1/2"
                    }`}
                  >
                    <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-display text-xs tracking-[0.2em] text-primary">
                      {milestone.time}
                    </span>
                    <h3 className="mt-3 font-display text-xl tracking-wide text-foreground md:text-2xl">
                      {milestone.title}
                    </h3>
                    <div className="mt-2 flex items-center gap-3 md:justify-end">
                      <span className="text-xs text-muted-foreground/60">
                        {milestone.kanji}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TimelineSection;
