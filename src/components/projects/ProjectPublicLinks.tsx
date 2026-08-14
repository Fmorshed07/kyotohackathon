import { ArrowUpRight } from "lucide-react";
import type { PublicProjectLink } from "@/lib/projectSocial";
import { cn } from "@/lib/utils";

export function ProjectPublicLinks({
  links,
  className,
}: {
  links: PublicProjectLink[];
  className?: string;
}) {
  if (links.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-x-3 gap-y-1", className)}>
      {links.map((link) => (
        <a
          key={link.id}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-opacity hover:opacity-80"
        >
          {link.label}
          <ArrowUpRight className="h-3 w-3" />
        </a>
      ))}
    </div>
  );
}
