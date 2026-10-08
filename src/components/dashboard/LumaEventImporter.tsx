import { useEffect, useId, useRef, useState } from "react";
import { ArrowDownToLine, ArrowRight, CalendarDays, Check, ExternalLink, Link2, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importLumaEvent, lumaImportToForm } from "@/lib/lumaEventImport";
import type { LumaEventImport } from "@/lib/lumaEventImportTypes";
import type { HostEventBriefForm } from "@/lib/hostEventBriefForm";
import { formatDateTime } from "@/lib/hostEvents";

type LumaEventImporterProps = {
  disabled?: boolean;
  onImport: (draft: HostEventBriefForm) => boolean;
};

export function LumaEventImporter({ disabled, onImport }: LumaEventImporterProps) {
  const inputId = useId();
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<LumaEventImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [applied, setApplied] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  const extract = async () => {
    if (isLoading || disabled) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setApplied(false);
    try {
      const event = await importLumaEvent(url, controller.signal);
      if (!controller.signal.aborted) setResult(event);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not import this event.");
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  };

  const availableFields = result ? [
    ["Description", Boolean(result.details.description)],
    ["Dates", Boolean(result.details.startAt)],
    ["Location", Boolean(result.details.location)],
    ["Cover image", Boolean(result.details.coverImageUrl)],
    ["Organizer", Boolean(result.details.organizerName)],
    ["Theme", Boolean(result.details.theme)],
    ["Programme", result.details.schedule.length > 0],
    ["Gallery", result.details.galleryUrls.length > 0],
    ["Guests", result.details.guests.length > 0],
    ["Participation", Boolean(result.details.eligibility || result.details.teamSize)],
    ["Prizes", Boolean(result.details.prize)],
    ["Rulebook", Boolean(result.details.rulebookUrl)],
  ].filter(([, present]) => present).map(([label]) => label as string) : [];

  return (
    <section id="luma-import" aria-labelledby={`${inputId}-title`} className="scroll-mt-24 space-y-5 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
          <Link2 className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="dash-eyebrow">Already on Luma?</p>
          <h2 id={`${inputId}-title`} className="font-display text-xl font-semibold">Host an event from a Luma link</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Paste your event link to bring its public details, images, and programme into a new draft.
            Registration stays linked to Luma.
          </p>
        </div>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); void extract(); }} className="space-y-2">
        <label htmlFor={inputId} className="text-xs font-semibold text-foreground">Luma event link</label>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row">
          <Input id={inputId} type="text" inputMode="url" autoComplete="url" placeholder="https://luma.com/your-event" value={url} maxLength={2048}
            className="min-w-0 flex-1" disabled={disabled || isLoading} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined}
            onChange={(event) => { setUrl(event.target.value); setResult(null); setError(null); setApplied(false); }} />
          <Button type="submit" className="shrink-0 gap-2" disabled={disabled || isLoading || !url.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ArrowDownToLine className="h-4 w-4" aria-hidden />}
            {isLoading ? "Extracting details…" : "Extract details"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Supports luma.com and lu.ma event links. Review the imported details before publishing.</p>
      </form>
      {error ? <p id={`${inputId}-error`} role="alert" className="text-sm text-destructive">{error}</p> : null}
      {result ? (
        <div className="space-y-4 rounded-lg border border-primary/20 bg-background/60 p-4" aria-live="polite">
          <div className="flex flex-col gap-4 sm:flex-row">
            {result.details.coverImageUrl ? <img src={result.details.coverImageUrl} alt="Imported event cover" className="h-24 w-24 shrink-0 rounded-lg object-cover" /> : null}
            <div className="min-w-0 space-y-2">
              <h3 className="break-words font-display text-lg font-semibold">{result.details.name}</h3>
              {result.details.organizerName ? <p className="text-sm text-muted-foreground">Hosted by {result.details.organizerName}</p> : null}
              {result.details.startAt ? <p className="flex items-start gap-2 text-sm text-muted-foreground"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /><span>{formatDateTime(result.details.startAt)}{result.details.endAt ? ` – ${formatDateTime(result.details.endAt)}` : ""}</span></p> : null}
              {result.details.location ? <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden /><span className="break-words">{result.details.location}</span></p> : null}
              <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">View on Luma <ExternalLink className="h-3 w-3" aria-hidden /></a>
            </div>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Imported fields">
            {availableFields.map((field) => <span key={field} className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs text-primary"><Check className="h-3 w-3" aria-hidden />{field}</span>)}
          </div>
          {result.details.description ? <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{result.details.description}</p> : null}
          <div className="space-y-1 text-xs leading-5 text-muted-foreground">
            {result.warnings.map((warning) => <p key={warning}>{warning}</p>)}
            <p>Only details visible on the event page are imported. Add any missing rules, dates, or guest information in the editor.</p>
            {result.timezone ? <p>Event timezone: {result.timezone}. Dates in the editor use your local time.</p> : null}
          </div>
          <Button type="button" className="gap-2" disabled={disabled || applied} onClick={() => { if (onImport(lumaImportToForm(result))) setApplied(true); }}>
            {applied ? <Check className="h-4 w-4" aria-hidden /> : <ArrowRight className="h-4 w-4" aria-hidden />}
            {applied ? "Added to new draft" : "Use details in new draft"}
          </Button>
          {applied ? <p role="status" className="text-sm text-primary">Your imported brief is ready below. Review it, create the draft, then publish when ready.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
