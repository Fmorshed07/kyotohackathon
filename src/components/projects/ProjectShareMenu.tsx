import { useState } from "react";
import { Check, Copy, Link2, Send, Share2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  buildProjectPermalink,
  buildProjectShareText,
  buildSocialShareTargets,
  normalizeHttpUrl,
  youtubeVideoId,
} from "@/lib/projectSocial";
import { cn } from "@/lib/utils";

type CopiedValue = "link" | "message" | null;

const targetMarks = {
  x: "X",
  linkedin: "in",
  facebook: "f",
  whatsapp: "WA",
  email: "@",
} as const;

async function writeClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy failed");
}

export function ProjectShareMenu({
  projectId,
  title,
  teamName,
  description,
  imageUrl,
  demoVideoUrl,
  eventName,
  onShare,
}: {
  projectId: string;
  title: string;
  teamName?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  demoVideoUrl?: string | null;
  eventName?: string | null;
  onShare?: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<CopiedValue>(null);
  const url = buildProjectPermalink(projectId);
  const shareTitle = title.trim() || "Hackathon project";
  const team = teamName?.trim();
  const summary = description?.replace(/\s+/g, " ").trim();
  const videoId = youtubeVideoId(demoVideoUrl);
  const customImage = normalizeHttpUrl(imageUrl) || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "");
  const previewImage = customImage || "/app.png";
  const text = buildProjectShareText({ title: shareTitle, teamName: team, description: summary });
  const message = `${text}\n${url}`;
  const targets = buildSocialShareTargets({
    url,
    title: `${shareTitle} | Global Impact Hackathons`,
    text,
  });
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const recordShare = () => void onShare?.();

  const copyValue = async (kind: Exclude<CopiedValue, null>, value: string) => {
    try {
      await writeClipboard(value);
      setCopied(kind);
      recordShare();
      toast.success(kind === "link" ? "Project link copied" : "Project post copied");
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error("Could not copy. Please try again.");
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: shareTitle, text, url });
      recordShare();
      setOpen(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copyValue("link", url);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) setCopied(null);
    }}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5 px-2.5">
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[calc(100svh-1rem)] w-[calc(100vw-1rem)] max-w-5xl flex-col gap-0 overflow-y-auto border-white/10 bg-background p-0 lg:h-[min(88svh,780px)] lg:overflow-hidden">
        <div className="shrink-0 border-b border-white/10 px-5 py-5 sm:px-7 sm:py-6">
          <DialogHeader>
            <p className="dash-eyebrow">Share project</p>
            <DialogTitle className="font-display text-2xl text-foreground sm:text-3xl">Help this project travel</DialogTitle>
            <DialogDescription className="max-w-3xl">
              Preview the post, then share it with your network or copy a ready-to-paste message.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.8fr)]">
          <section className="min-w-0 border-b border-white/10 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.09),transparent_40%)] p-4 sm:p-6 lg:min-h-0 lg:border-b-0 lg:border-r">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[var(--surface-elevated)] lg:flex lg:h-full lg:min-h-0 lg:flex-col">
              <div className="relative aspect-[16/10] overflow-hidden bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.35),transparent_42%),#05070d] lg:min-h-0 lg:flex-1 lg:aspect-auto">
                <img
                  src={previewImage}
                  alt=""
                  className={cn(
                    "absolute inset-0 h-full w-full",
                    customImage ? "object-cover opacity-80" : "object-contain p-12 opacity-90",
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
                <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3 sm:inset-x-5 sm:top-5">
                  <span className="max-w-[70%] truncate rounded-full border border-white/15 bg-black/65 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
                    {eventName?.trim() || "Global Impact Hackathons"}
                  </span>
                  <span className="rounded-full border border-primary/30 bg-primary/15 px-3 py-1.5 text-[10px] font-semibold text-primary backdrop-blur">
                    Project
                  </span>
                </div>
                <div className="absolute inset-x-5 bottom-5 sm:inset-x-6 sm:bottom-6">
                  <p className="line-clamp-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {shareTitle}
                  </p>
                  {team ? <p className="mt-2 text-sm text-white/75 sm:text-base">By {team}</p> : null}
                </div>
              </div>
              {summary ? (
                <p className="line-clamp-4 shrink-0 border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-white/65 sm:px-6 sm:text-base">
                  {summary}
                </p>
              ) : null}
            </div>
          </section>

          <section className="min-w-0 p-5 sm:p-6 lg:min-h-0 lg:overflow-y-auto">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Project link</p>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] p-2">
                <Link2 className="ml-1 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{url}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 shrink-0 px-2.5 text-xs"
                  onClick={() => void copyValue("link", url)}
                >
                  {copied === "link" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === "link" ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 xl:grid-cols-2">
              {canNativeShare ? (
                <Button type="button" className="gap-2" onClick={() => void nativeShare()}>
                  <Share2 className="h-4 w-4" /> Share with apps
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className={cn("gap-2", !canNativeShare && "xl:col-span-2")}
                onClick={() => void copyValue("message", message)}
              >
                {copied === "message" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied === "message" ? "Post copied" : "Copy full post"}
              </Button>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Share directly</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {targets.map((target) => (
                  <a
                    key={target.id}
                    href={target.href}
                    target={target.id === "email" ? undefined : "_blank"}
                    rel={target.id === "email" ? undefined : "noreferrer"}
                    onClick={() => {
                      recordShare();
                      setOpen(false);
                    }}
                    className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-2 py-3 text-center text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                  >
                    <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-white/10 px-1.5 font-display text-xs font-bold">
                      {targetMarks[target.id]}
                    </span>
                    {target.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/[0.06] p-4">
              <p className="inline-flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <Send className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                The shared link opens this project directly in the public gallery. Friends can preview it and give their stars without creating an account.
              </p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
