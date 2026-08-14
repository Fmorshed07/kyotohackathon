import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { STAR_MAX } from "@/lib/projectStars";

export function ProjectStarRating({
  fill,
  myRating = 0,
  disabled = false,
  onRate,
}: {
  fill: number;
  myRating?: number;
  disabled?: boolean;
  onRate: (stars: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const display = hover || myRating || fill;
  const values = Array.from({ length: STAR_MAX }, (_, index) => index + 1);

  return (
    <div
      role="radiogroup"
      aria-label={
        myRating
          ? `Your rating, ${myRating} of ${STAR_MAX} stars`
          : fill
            ? `Community rating, ${fill} of ${STAR_MAX} stars`
            : "Star this project"
      }
      className="inline-flex items-center gap-0.5"
      onMouseLeave={() => setHover(0)}
    >
      {values.map((value) => {
        const active = display >= value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={myRating === value}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            title={disabled && myRating > 0 ? "You already starred this project" : undefined}
            disabled={disabled}
            onMouseEnter={() => setHover(value)}
            onFocus={() => setHover(value)}
            onBlur={() => setHover(0)}
            onClick={() => onRate(value)}
            className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-primary disabled:opacity-60"
          >
            <Star
              className={cn("h-4 w-4", active && "fill-primary text-primary")}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
