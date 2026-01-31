import { useScrollReveal } from "@/hooks/useScrollReveal";

const HeroSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLElement>({ threshold: 0.2 });

  return (
    <section
      ref={ref}
      className="relative flex min-h-screen flex-col items-center justify-center px-6 py-20"
    >
      <div className="max-w-4xl text-center">
        {/* Main Title */}
        <h1
          className={`font-display text-5xl font-bold tracking-gta-wide text-gradient-cyan animate-breathe transition-all duration-1000 md:text-7xl lg:text-8xl ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          IMPACT TOKYO
        </h1>

        {/* Subtitle */}
        <p
          className={`mt-6 font-display text-xl tracking-gta text-secondary glow-violet transition-all duration-1000 delay-200 md:text-2xl lg:text-3xl ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          AI FOR GLOBAL GOOD
        </p>

        {/* Tagline */}
        <p
          className={`mt-8 font-body text-lg text-muted-foreground transition-all duration-1000 delay-300 md:text-xl ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          Build With Purpose. Code With Vision. Impact the World.
        </p>

        {/* Organizer */}
        <p
          className={`mt-4 font-body text-sm tracking-wide text-muted-foreground/70 transition-all duration-1000 delay-400 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          Organized by Cognisor AI
        </p>

        {/* Event Info */}
        <div
          className={`mt-6 flex items-center justify-center gap-4 text-sm text-muted-foreground transition-all duration-1000 delay-500 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="font-display tracking-wide text-primary">FEBRUARY 2026</span>
          <span className="text-border">•</span>
          <span className="font-display tracking-wide">TOKYO, JAPAN</span>
        </div>

        {/* CTA Buttons */}
        <div
          className={`mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center transition-all duration-1000 delay-500 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <a
            href="#sponsors"
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg border border-primary/50 bg-primary/10 px-8 py-4 font-display text-sm tracking-wider text-primary transition-all duration-300 hover:bg-primary/20 btn-glow-cyan"
          >
            <span className="relative z-10">BECOME A SPONSOR</span>
          </a>
          <a
            href="#"
            className="group relative inline-flex items-center justify-center overflow-hidden rounded-lg border border-secondary/50 bg-secondary/10 px-8 py-4 font-display text-sm tracking-wider text-secondary transition-all duration-300 hover:bg-secondary/20 btn-glow-violet"
          >
            <span className="relative z-10">JOIN THE HACKATHON</span>
          </a>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div
        className={`absolute bottom-10 left-1/2 -translate-x-1/2 transition-all duration-1000 delay-700 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs tracking-widest text-muted-foreground/50">SCROLL</span>
          <div className="h-12 w-[1px] bg-gradient-to-b from-primary/50 to-transparent animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
