import { Share2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProjectEngagementStats({
  starCount,
  shareCount,
  className,
}: {
  starCount: number;
  shareCount: number;
  className?: string;
}) {
  const stars = Math.max(0, Math.floor(starCount));
  const shares = Math.max(0, Math.floor(shareCount));

  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground", className)}
      aria-label={`${stars} ${stars === 1 ? "person starred" : "people starred"}; ${shares} ${shares === 1 ? "person shared" : "people shared"}`}
    >
      <span className="inline-flex items-center gap-1">
        <Star className="h-3.5 w-3.5 text-primary" aria-hidden />
        {stars} {stars === 1 ? "person starred" : "people starred"}
      </span>
      <span className="inline-flex items-center gap-1">
        <Share2 className="h-3.5 w-3.5 text-primary" aria-hidden />
        {shares} {shares === 1 ? "person shared" : "people shared"}
      </span>
    </div>
  );
}
