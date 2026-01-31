import { useScrollReveal } from "@/hooks/useScrollReveal";

const CognisorSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.2 });

  return (
    <section ref={ref} className="relative min-h-screen px-6 py-32" id="cognisor">
      <div className="mx-auto max-w-4xl text-center">
        {/* Organized By */}
        <span
          className={`font-display text-sm tracking-gta text-muted-foreground transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          ORGANIZED BY
        </span>

        {/* Logo / Brand */}
        <h2
          className={`mt-6 font-display text-5xl font-bold tracking-wide text-gradient-cyan transition-all duration-1000 delay-200 md:text-6xl lg:text-7xl ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          Cognisor AI
        </h2>

        {/* Description */}
        <div
          className={`mt-12 space-y-6 transition-all duration-1000 delay-400 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="font-body text-xl leading-relaxed text-muted-foreground md:text-2xl">
            Cognisor AI is at the forefront of developing artificial intelligence
            solutions that prioritize human impact over technological novelty.
          </p>
          <p className="font-body text-lg text-muted-foreground/80">
            Based in Tokyo, we believe in building AI that serves humanity's most
            pressing needs—from healthcare accessibility to sustainable urban living.
            Impact Tokyo is our flagship initiative to empower the next generation of
            purpose-driven AI builders.
          </p>
        </div>

        {/* Mission Statement */}
        <div
          className={`mt-16 rounded-xl border border-border bg-card/30 p-8 transition-all duration-1000 delay-600 md:p-12 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <blockquote className="font-display text-xl italic tracking-wide text-foreground md:text-2xl">
            "Technology should solve problems that matter, not create problems to
            solve."
          </blockquote>
          <p className="mt-4 font-body text-sm text-muted-foreground">
            — The Cognisor AI Philosophy
          </p>
        </div>
      </div>
    </section>
  );
};

export default CognisorSection;
