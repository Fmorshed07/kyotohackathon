const AnimatedBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-navy-800 to-background" />

      {/* Animated gradient orbs */}
      <div
        className="absolute -left-1/4 -top-1/4 h-[800px] w-[800px] rounded-full opacity-20 blur-3xl animate-gradient"
        style={{
          background:
            "radial-gradient(circle, hsl(185 100% 50% / 0.3) 0%, transparent 70%)",
          animation: "float 20s ease-in-out infinite",
        }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full opacity-15 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, hsl(270 70% 60% / 0.3) 0%, transparent 70%)",
          animation: "float 25s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-10 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, hsl(200 100% 50% / 0.2) 0%, transparent 70%)",
          animation: "float 30s ease-in-out infinite",
        }}
      />

      {/* Subtle noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
