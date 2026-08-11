import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export const BRAND_LOGO_SRC = "/app.png";
export const BRAND_LOGO_ALT = "Cognisor";

type BrandLogoSize = "xs" | "sm" | "md" | "lg" | "xl" | "hero";

const sizeClasses: Record<BrandLogoSize, string> = {
  xs: "h-7 w-7",
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
  hero: "h-28 w-28 sm:h-36 sm:w-36 md:h-44 md:w-44",
};

type BrandLogoProps = {
  size?: BrandLogoSize;
  className?: string;
  imgClassName?: string;
  showWordmark?: boolean;
  wordmark?: string;
  sublabel?: string;
  wordmarkClassName?: string;
  sublabelClassName?: string;
  href?: string | null;
  priority?: boolean;
};

const BrandLogo = ({
  size = "sm",
  className,
  imgClassName,
  showWordmark = false,
  wordmark = "COGNISOR",
  sublabel,
  wordmarkClassName,
  sublabelClassName,
  href = "/",
  priority = false,
}: BrandLogoProps) => {
  const mark = (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        sizeClasses[size],
        imgClassName,
      )}
    >
      <span
        className="pointer-events-none absolute inset-[-18%] rounded-[28%] bg-[radial-gradient(circle_at_50%_40%,hsl(199_100%_50%/0.35),transparent_68%)] opacity-80"
        aria-hidden
      />
      <img
        src={BRAND_LOGO_SRC}
        alt={showWordmark ? "" : BRAND_LOGO_ALT}
        width={1024}
        height={1024}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        className="relative z-[1] h-full w-full object-contain drop-shadow-[0_0_28px_hsl(199_100%_50%/0.35)]"
      />
    </span>
  );

  const content = (
    <span
      className={cn(
        "group inline-flex items-center gap-2.5 transition-opacity hover:opacity-95",
        className,
      )}
    >
      {mark}
      {showWordmark ? (
        <span className="flex min-w-0 flex-col leading-none">
          <span
            className={cn(
              "font-display text-[13px] font-semibold tracking-[0.26em] text-white transition-colors group-hover:text-primary",
              wordmarkClassName,
            )}
          >
            {wordmark}
          </span>
          {sublabel ? (
            <span
              className={cn(
                "mt-1 font-display text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/45",
                sublabelClassName,
              )}
            >
              {sublabel}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );

  if (href === null) {
    return content;
  }

  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="inline-flex" aria-label={BRAND_LOGO_ALT}>
        {content}
      </a>
    );
  }

  return (
    <Link to={href} className="inline-flex" aria-label={BRAND_LOGO_ALT}>
      {content}
    </Link>
  );
};

export default BrandLogo;
