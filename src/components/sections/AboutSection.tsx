import { useScrollReveal } from "@/hooks/useScrollReveal";

const AboutSection = () => {
  const { ref: ref1, isVisible: vis1 } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });
  const { ref: ref2, isVisible: vis2 } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });
  const { ref: ref3, isVisible: vis3 } = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });

  return (
    <section className="relative min-h-screen px-6 py-32" id="about">
      <div className="mx-auto max-w-5xl">
        {/* Section Header */}
        <div
          ref={ref1}
          className={`mb-20 transition-all duration-1000 ${
            vis1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <span className="font-display text-sm tracking-gta text-primary">ABOUT</span>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Impact {">"} Hype
          </h2>
        </div>

        {/* Philosophy Blocks */}
        <div className="space-y-24">
          <div
            ref={ref2}
            className={`transition-all duration-1000 delay-200 ${
              vis2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
          >
            <p className="font-body text-2xl leading-relaxed text-muted-foreground md:text-3xl lg:text-4xl">
              We believe the future of AI isn't just about{" "}
              <span className="text-foreground">what's possible</span>—it's about{" "}
              <span className="text-gradient-cyan">what's meaningful</span>.
            </p>
          </div>

          <div
            ref={ref3}
            className={`transition-all duration-1000 delay-400 ${
              vis3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            }`}
          >
            <p className="font-body text-xl leading-relaxed text-muted-foreground md:text-2xl">
              Impact Tokyo brings together the world's most ambitious builders to solve
              real problems. No pitch decks. No vanity metrics. Just{" "}
              <span className="text-secondary">working solutions</span> that make a
              difference.
            </p>
          </div>
        </div>

        {/* Stats or Key Points */}
        <div className="mt-32 grid gap-8 md:grid-cols-3">
          {[
            { label: "Problem-First", desc: "Start with impact, not technology" },
            { label: "Global Scale", desc: "Solutions for worldwide challenges" },
            { label: "Built in Tokyo", desc: "For the world" },
          ].map((item, i) => {
            const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
              threshold: 0.3,
            });
            return (
              <div
                key={item.label}
                ref={ref}
                className={`border-l border-border pl-6 transition-all duration-700 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <h3 className="font-display text-lg tracking-wide text-primary">
                  {item.label}
                </h3>
                <p className="mt-2 font-body text-sm text-muted-foreground">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
