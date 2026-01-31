import { useScrollReveal } from "@/hooks/useScrollReveal";

const tracks = [
  {
    number: "01",
    title: "Aging Society & Care Tech",
    description: "AI solutions for elder care, accessibility, and intergenerational connection",
  },
  {
    number: "02",
    title: "Smart Cities & Urban Resilience",
    description: "Building sustainable, intelligent infrastructure for tomorrow's cities",
  },
  {
    number: "03",
    title: "Education, Skills & Workforce",
    description: "Reimagining learning and work for the AI age",
  },
  {
    number: "04",
    title: "Human-Centered AI & Ethics",
    description: "Ensuring AI serves humanity with fairness and transparency",
  },
  {
    number: "05",
    title: "Open Impact",
    description: "Your wildcard—solve any global challenge with AI",
  },
];

const ThemeSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative min-h-screen px-6 py-32" id="theme">
      <div className="mx-auto max-w-5xl">
        {/* Section Header */}
        <div
          ref={headerRef}
          className={`mb-20 transition-all duration-1000 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <span className="font-display text-sm tracking-gta text-secondary">THEME</span>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            AI for Global Good
          </h2>
          <p className="mt-6 max-w-2xl font-body text-lg text-muted-foreground">
            Five tracks. One mission. Build AI that creates lasting positive impact.
          </p>
        </div>

        {/* Tracks List */}
        <div className="space-y-1">
          {tracks.map((track, index) => {
            const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
              threshold: 0.3,
            });

            return (
              <div
                key={track.number}
                ref={ref}
                className={`group relative border-t border-border py-8 transition-all duration-700 hover:bg-muted/5 ${
                  isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-6">
                  <span className="font-display text-sm text-primary/60">{track.number}</span>
                  <div className="flex-1">
                    <h3 className="font-display text-xl tracking-wide text-foreground transition-colors group-hover:text-primary md:text-2xl">
                      {track.title}
                    </h3>
                    <p className="mt-2 font-body text-sm text-muted-foreground md:text-base">
                      {track.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="border-t border-border" />
        </div>
      </div>
    </section>
  );
};

export default ThemeSection;
