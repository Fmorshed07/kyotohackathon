import { useScrollReveal } from "@/hooks/useScrollReveal";

const tiers = [
  {
    name: "Platinum",
    color: "primary",
    benefits: ["Premier logo placement", "Speaking opportunity", "VIP access", "Recruiting booth"],
  },
  {
    name: "Gold",
    color: "secondary",
    benefits: ["Logo on materials", "Booth space", "Attendee access", "Social mentions"],
  },
  {
    name: "Silver",
    color: "muted",
    benefits: ["Logo on website", "Social mentions", "Event tickets", "Brand visibility"],
  },
];

const SponsorsSection = () => {
  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>({
    threshold: 0.2,
  });

  return (
    <section className="relative min-h-screen px-6 py-32" id="sponsors">
      <div className="mx-auto max-w-5xl">
        {/* Section Header */}
        <div
          ref={headerRef}
          className={`mb-20 text-center transition-all duration-1000 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          <span className="font-display text-sm tracking-gta text-primary">PARTNERS</span>
          <h2 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Partner with Impact Tokyo
          </h2>
          <p className="mx-auto mt-6 max-w-2xl font-body text-lg text-muted-foreground">
            Join us in building the future of AI. Your support enables the next generation
            of impactful technology.
          </p>
        </div>

        {/* Sponsor Tiers */}
        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier, index) => {
            const { ref, isVisible } = useScrollReveal<HTMLDivElement>({
              threshold: 0.3,
            });

            const borderClass =
              tier.color === "primary"
                ? "neon-border-cyan"
                : tier.color === "secondary"
                ? "neon-border-violet"
                : "border-border";

            const textClass =
              tier.color === "primary"
                ? "text-primary"
                : tier.color === "secondary"
                ? "text-secondary"
                : "text-muted-foreground";

            return (
              <div
                key={tier.name}
                ref={ref}
                className={`group relative rounded-xl bg-card/50 p-8 transition-all duration-700 hover:bg-card ${borderClass} ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <h3 className={`font-display text-2xl tracking-wide ${textClass}`}>
                  {tier.name}
                </h3>
                <ul className="mt-6 space-y-3">
                  {tier.benefits.map((benefit) => (
                    <li
                      key={benefit}
                      className="flex items-center gap-3 font-body text-sm text-muted-foreground"
                    >
                      <span className={`h-1 w-1 rounded-full ${
                        tier.color === "primary" ? "bg-primary" : 
                        tier.color === "secondary" ? "bg-secondary" : "bg-muted-foreground"
                      }`} />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div
          className={`mt-16 text-center transition-all duration-1000 delay-500 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <a
            href="#"
            className="inline-flex items-center justify-center rounded-lg border border-primary/50 bg-primary/10 px-10 py-4 font-display text-sm tracking-wider text-primary transition-all duration-300 hover:bg-primary/20 btn-glow-cyan"
          >
            BECOME A SPONSOR
          </a>
        </div>
      </div>
    </section>
  );
};

export default SponsorsSection;
