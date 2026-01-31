import { useScrollReveal } from "@/hooks/useScrollReveal";

const participants = [
  {
    title: "Students & Researchers",
    description: "From universities and labs worldwide",
  },
  {
    title: "Founders & Builders",
    description: "Turning ideas into impactful products",
  },
  {
    title: "Designers & Product Thinkers",
    description: "Crafting human-centered experiences",
  },
  {
    title: "AI Engineers & Specialists",
    description: "Pushing the boundaries of what's possible",
  },
];

const ParticipantsSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative min-h-screen px-6 py-32" id="participants">
      <div className="mx-auto max-w-5xl">
        {/* Section Header */}
        <div
          ref={headerRef}
          className={`mb-20 transition-all duration-1000 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <span className="font-display text-sm tracking-gta text-secondary">WHO</span>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Who Should Join
          </h2>
        </div>

        {/* Participants Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {participants.map((participant, index) => {
            const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
              threshold: 0.3,
            });

            return (
              <div
                key={participant.title}
                ref={ref}
                className={`group relative overflow-hidden rounded-lg border border-border bg-card/50 p-8 transition-all duration-700 hover:border-primary/30 hover:bg-card ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <h3 className="font-display text-xl tracking-wide text-foreground transition-colors group-hover:text-primary">
                  {participant.title}
                </h3>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  {participant.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ParticipantsSection;
