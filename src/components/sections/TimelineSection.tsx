import { useScrollReveal } from "@/hooks/useScrollReveal";

const milestones = [
  { phase: "Phase 1", title: "Registration Opens", time: "Early 2026" },
  { phase: "Phase 2", title: "Team Formation", time: "January 2026" },
  { phase: "Phase 3", title: "Build Week", time: "February 2026" },
  { phase: "Phase 4", title: "Final Presentations", time: "February 2026" },
];

const TimelineSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });
  const { ref: lineRef, isVisible: lineVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.1,
  });

  return (
    <section className="relative min-h-screen px-6 py-32" id="timeline">
      <div className="mx-auto max-w-5xl">
        {/* Section Header */}
        <div
          ref={headerRef}
          className={`mb-20 transition-all duration-1000 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <span className="font-display text-sm tracking-gta text-primary">EVENT FORMAT</span>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            The Journey
          </h2>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-muted-foreground">
            <span className="rounded-full border border-primary/30 bg-primary/5 px-4 py-1 font-display text-sm text-primary">
              February 2026
            </span>
            <span className="rounded-full border border-border px-4 py-1 font-display text-sm">
              Tokyo, Japan
            </span>
            <span className="rounded-full border border-border px-4 py-1 font-display text-sm">
              In-Person
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div ref={lineRef} className="relative">
          {/* Vertical Line */}
          <div className="absolute left-4 top-0 h-full w-[2px] overflow-hidden md:left-1/2 md:-translate-x-1/2">
            <div
              className={`h-full w-full bg-gradient-to-b from-primary via-secondary to-primary/20 transition-all duration-1500 ease-out ${
                lineVisible ? "translate-y-0" : "-translate-y-full"
              }`}
              style={{ transitionDuration: "1.5s" }}
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
                <div
                  key={milestone.phase}
                  ref={ref}
                  className={`relative flex items-center transition-all duration-700 ${
                    isVisible ? "opacity-100" : "opacity-0"
                  } ${isVisible ? (isEven ? "translate-x-0" : "translate-x-0") : isEven ? "-translate-x-8" : "translate-x-8"}`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  {/* Dot */}
                  <div
                    className={`absolute left-4 z-10 h-4 w-4 rounded-full border-2 border-primary bg-background md:left-1/2 md:-translate-x-1/2 ${
                      isVisible ? "scale-100" : "scale-0"
                    } transition-transform duration-500`}
                    style={{
                      boxShadow: isVisible
                        ? "0 0 20px hsl(185 100% 50% / 0.5)"
                        : "none",
                      transitionDelay: `${index * 150 + 200}ms`,
                    }}
                  />

                  {/* Content */}
                  <div
                    className={`ml-12 md:ml-0 ${
                      isEven
                        ? "md:mr-auto md:pr-20 md:text-right md:w-1/2"
                        : "md:ml-auto md:pl-20 md:text-left md:w-1/2"
                    }`}
                  >
                    <span className="font-display text-xs tracking-gta text-primary/60">
                      {milestone.phase}
                    </span>
                    <h3 className="mt-1 font-display text-xl tracking-wide text-foreground md:text-2xl">
                      {milestone.title}
                    </h3>
                    <p className="mt-1 font-body text-sm text-muted-foreground">
                      {milestone.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TimelineSection;
