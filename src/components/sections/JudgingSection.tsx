import { useScrollReveal } from "@/hooks/useScrollReveal";

const criteria = [
  {
    title: "Problem Relevance & Social Impact",
    weight: "25%",
  },
  {
    title: "Effectiveness of AI Usage",
    weight: "25%",
  },
  {
    title: "Human-Centered Design",
    weight: "20%",
  },
  {
    title: "Clarity of Vision & Storytelling",
    weight: "15%",
  },
  {
    title: "Technical Feasibility & Scalability",
    weight: "15%",
  },
];

const JudgingSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative min-h-screen px-6 py-32" id="judging">
      <div className="mx-auto max-w-5xl">
        {/* Section Header */}
        <div
          ref={headerRef}
          className={`mb-20 transition-all duration-1000 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <span className="font-display text-sm tracking-gta text-secondary">EVALUATION</span>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            How It's Judged
          </h2>
        </div>

        {/* Criteria Grid */}
        <div className="grid gap-4">
          {criteria.map((item, index) => {
            const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
              threshold: 0.4,
            });

            return (
              <div
                key={item.title}
                ref={ref}
                className={`group flex items-center justify-between rounded-lg border border-border bg-card/30 p-6 transition-all duration-500 hover:border-secondary/30 hover:bg-card/50 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <span className="font-display text-lg tracking-wide text-foreground md:text-xl">
                  {item.title}
                </span>
                <span className="font-display text-2xl text-secondary/80 md:text-3xl">
                  {item.weight}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default JudgingSection;
