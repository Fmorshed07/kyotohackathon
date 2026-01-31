import { useScrollReveal } from "@/hooks/useScrollReveal";

const FinalCTASection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.2 });

  return (
    <section
      ref={ref}
      className="relative flex min-h-screen flex-col items-center justify-center px-6 py-32"
      id="cta"
    >
      {/* Background gradient animation */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 animate-gradient"
          style={{
            background:
              "linear-gradient(135deg, hsl(222 47% 5%) 0%, hsl(240 40% 8%) 25%, hsl(270 30% 10%) 50%, hsl(222 47% 8%) 75%, hsl(222 47% 5%) 100%)",
            backgroundSize: "400% 400%",
          }}
        />
      </div>

      <div className="max-w-4xl text-center">
        {/* Main Headline */}
        <h2
          className={`font-display text-4xl font-bold tracking-tight text-foreground transition-all duration-1000 md:text-5xl lg:text-6xl xl:text-7xl ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
          }`}
        >
          Build the future of AI
          <br />
          <span className="text-gradient-cyan">in Tokyo.</span>
        </h2>

        {/* Subtext */}
        <p
          className={`mx-auto mt-8 max-w-xl font-body text-lg text-muted-foreground transition-all duration-1000 delay-200 md:text-xl ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          February 2026. Tokyo, Japan. Be part of a global movement to create AI
          that matters.
        </p>

        {/* CTA Buttons */}
        <div
          className={`mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center transition-all duration-1000 delay-400 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <a
            href="#sponsors"
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg border border-primary/50 bg-primary/10 px-10 py-5 font-display text-base tracking-wider text-primary transition-all duration-300 hover:bg-primary/20 btn-glow-cyan"
          >
            <span className="relative z-10">SPONSOR IMPACT TOKYO</span>
          </a>
          <a
            href="#"
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg border border-secondary/50 bg-secondary/10 px-10 py-5 font-display text-base tracking-wider text-secondary transition-all duration-300 hover:bg-secondary/20 btn-glow-violet"
          >
            <span className="relative z-10">GET INVOLVED</span>
          </a>
        </div>

        {/* Footer Note */}
        <p
          className={`mt-16 font-body text-xs tracking-wide text-muted-foreground/50 transition-all duration-1000 delay-600 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          IMPACT TOKYO 2026 • AI FOR GLOBAL GOOD • ORGANIZED BY COGNISOR AI
        </p>
      </div>
    </section>
  );
};

export default FinalCTASection;
