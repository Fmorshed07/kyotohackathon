import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildProjectPermalink,
  buildProjectShareText,
  buildSocialShareTargets,
} from "@/lib/projectSocial";

export function ProjectShareMenu({
  projectId,
  title,
  teamName,
}: {
  projectId: string;
  title: string;
  teamName?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const url = buildProjectPermalink(projectId);
  const shareTitle = title.trim() || "Hackathon project";
  const text = buildProjectShareText({ title: shareTitle, teamName });
  const targets = buildSocialShareTargets({ url, title: shareTitle, text });
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied — share it with friends");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy the project link.");
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: shareTitle, text, url });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyLink();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 px-2.5">
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {canNativeShare ? (
          <DropdownMenuItem onSelect={() => void nativeShare()}>Share with friends</DropdownMenuItem>
        ) : null}
        <DropdownMenuItem className="gap-2" onSelect={() => void copyLink()}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Link copied" : "Copy link"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {targets.map((target) => (
          <DropdownMenuItem key={target.id} asChild>
            <a href={target.href} target="_blank" rel="noreferrer">
              {target.label}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
