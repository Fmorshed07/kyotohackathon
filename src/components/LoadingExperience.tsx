import { useEffect, useState } from "react";

interface LoadingExperienceProps {
  onComplete: () => void;
}

const LoadingExperience = ({ onComplete }: LoadingExperienceProps) => {
  const [stage, setStage] = useState<"line" | "title" | "subtitle" | "reveal">("line");

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Stage 1: Line draws (0 - 800ms)
    timers.push(setTimeout(() => setStage("title"), 800));

    // Stage 2: Title fades in (800 - 1600ms)
    timers.push(setTimeout(() => setStage("subtitle"), 1600));

    // Stage 3: Subtitle appears (1600 - 2400ms)
    timers.push(setTimeout(() => setStage("reveal"), 2400));

    // Stage 4: Reveal completes (2400 - 3200ms)
    timers.push(setTimeout(() => onComplete(), 3200));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-all duration-700 ${
        stage === "reveal" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Cyan Line */}
      <div className="relative mb-8 h-[2px] w-64 overflow-hidden md:w-96">
        <div
          className={`absolute left-0 top-0 h-full bg-primary transition-all duration-700 ease-out ${
            stage === "line" ? "w-full" : "w-full"
          }`}
          style={{
            boxShadow: "0 0 20px hsl(185 100% 50% / 0.8), 0 0 40px hsl(185 100% 50% / 0.4)",
            animation: stage === "line" ? "none" : undefined,
            width: stage === "line" ? "0%" : "100%",
            transition: "width 0.8s ease-out",
          }}
        />
      </div>

      {/* Title */}
      <h1
        className={`font-display text-4xl font-bold tracking-gta-wide text-gradient-cyan transition-all duration-700 md:text-6xl ${
          stage === "line" ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
        }`}
      >
        IMPACT TOKYO
      </h1>

      {/* Subtitle */}
      <p
        className={`mt-4 font-display text-lg tracking-gta text-secondary transition-all duration-700 md:text-xl ${
          stage === "line" || stage === "title"
            ? "opacity-0 translate-y-4"
            : "opacity-100 translate-y-0"
        }`}
      >
        AI FOR GLOBAL GOOD
      </p>
    </div>
  );
};

export default LoadingExperience;
