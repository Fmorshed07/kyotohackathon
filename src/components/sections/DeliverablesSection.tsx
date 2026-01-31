import { useScrollReveal } from "@/hooks/useScrollReveal";

const deliverables = [
  "Working Prototype",
  "Problem Statement",
  "Impact Explanation",
  "AI Architecture",
  "Vision for Scale",
];

const DeliverablesSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative min-h-screen px-6 py-32" id="deliverables">
      <div className="mx-auto max-w-5xl">
        {/* Section Header */}
        <div
          ref={headerRef}
          className={`mb-20 transition-all duration-1000 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <span className="font-display text-sm tracking-gta text-primary">DELIVERABLES</span>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            What You Ship
          </h2>
        </div>

        {/* Deliverables List */}
        <div className="space-y-4">
          {deliverables.map((item, index) => {
            const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
              threshold: 0.5,
            });

            return (
              <div
                key={item}
                ref={ref}
                className={`flex items-center gap-6 border-l-2 border-primary/30 py-4 pl-6 transition-all duration-500 hover:border-primary hover:bg-primary/5 ${
                  isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8"
                }`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <span className="font-display text-sm text-primary/60">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-xl tracking-wide text-foreground md:text-2xl">
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DeliverablesSection;
