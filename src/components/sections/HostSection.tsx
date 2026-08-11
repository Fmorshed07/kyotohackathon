import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Globe2,
  Mail,
  MapPin,
  Radio,
  Send,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

type GlobalHackathon = {
  id: string;
  name: string;
  organizer: string;
  location: string;
  dates: string;
  format: "online" | "hybrid" | "in-person";
  focus: string;
  contact: string;
  source: "featured" | "submitted";
};

type HostFormState = Omit<GlobalHackathon, "id" | "source">;

const HOSTED_HACKATHONS_STORAGE_KEY = "cognisor_global_hosted_hackathons";

const featuredHackathons: GlobalHackathon[] = [
  {
    id: "featured-kyoto",
    name: "Impact Kyoto 2026",
    organizer: "Cognisor AI",
    location: "Kyoto, Japan",
    dates: "4 July 2026",
    format: "hybrid",
    focus: "Agentic AI for Japan's future",
    contact: "Portal open",
    source: "featured",
  },
  {
    id: "featured-dhaka",
    name: "Impact Dhaka 2026",
    organizer: "Cognisor AI",
    location: "Dhaka, Bangladesh",
    dates: "Date TBA",
    format: "in-person",
    focus: "AI for urban transformation",
    contact: "Coming soon",
    source: "featured",
  },
  {
    id: "featured-global",
    name: "Global Builder Sprint",
    organizer: "Community hosts",
    location: "Remote",
    dates: "Rolling",
    format: "online",
    focus: "AI prototypes with measurable social impact",
    contact: "Accepting hosts",
    source: "featured",
  },
];

const emptyFormState: HostFormState = {
  name: "",
  organizer: "",
  location: "",
  dates: "",
  format: "hybrid",
  focus: "",
  contact: "",
};

const formatLabels: Record<GlobalHackathon["format"], string> = {
  online: "Online",
  hybrid: "Hybrid",
  "in-person": "In person",
};

const readSubmittedHackathons = (): GlobalHackathon[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(HOSTED_HACKATHONS_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((event): event is GlobalHackathon => {
      return (
        typeof event?.id === "string" &&
        typeof event?.name === "string" &&
        typeof event?.organizer === "string" &&
        typeof event?.location === "string" &&
        typeof event?.dates === "string" &&
        typeof event?.focus === "string" &&
        typeof event?.contact === "string" &&
        ["online", "hybrid", "in-person"].includes(event?.format) &&
        event?.source === "submitted"
      );
    });
  } catch {
    return [];
  }
};

const HostSection = () => {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>({ threshold: 0.12 });
  const [formState, setFormState] = useState<HostFormState>(emptyFormState);
  const [submittedHackathons, setSubmittedHackathons] = useState<GlobalHackathon[]>([]);
  const [submissionMessage, setSubmissionMessage] = useState("");

  useEffect(() => {
    setSubmittedHackathons(readSubmittedHackathons());
  }, []);

  const globalHackathons = useMemo(
    () => [...submittedHackathons, ...featuredHackathons],
    [submittedHackathons],
  );

  const updateField = (field: keyof HostFormState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextHackathon: GlobalHackathon = {
      id: `submitted-${Date.now()}`,
      name: formState.name.trim(),
      organizer: formState.organizer.trim(),
      location: formState.location.trim(),
      dates: formState.dates.trim(),
      format: formState.format,
      focus: formState.focus.trim(),
      contact: formState.contact.trim(),
      source: "submitted",
    };

    const nextSubmitted = [nextHackathon, ...submittedHackathons].slice(0, 8);
    setSubmittedHackathons(nextSubmitted);
    window.localStorage.setItem(HOSTED_HACKATHONS_STORAGE_KEY, JSON.stringify(nextSubmitted));
    setFormState(emptyFormState);
    setSubmissionMessage(`${nextHackathon.name} is saved as a local preview. Request host access to run it in the portal.`);
  };

  return (
    <section className="relative overflow-hidden px-6 py-24 md:py-32" id="host">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card/80 to-background" />
        <div className="cognisor-grid absolute inset-0 opacity-50" />
      </div>

      <div ref={ref} className="mx-auto max-w-6xl">
        <motion.div
          className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start"
          initial={{ opacity: 0, y: 24 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.32em] text-primary">
              Host globally
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Bring your community to Cognisor.
            </h2>
            <p className="mt-4 max-w-xl font-body text-base leading-relaxed text-muted-foreground sm:text-lg">
              Request host access, then manage event details, judges, QR tickets, and door check-in
              from a dedicated operations workspace after admin approval.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { icon: UsersRound, label: "Host access", value: "Approved" },
                { icon: Globe2, label: "Reach", value: "Global" },
                { icon: Radio, label: "Board", value: "Live" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-white/[0.08] bg-black/35 p-4 backdrop-blur-md"
                >
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-foreground">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <Button asChild className="mt-6">
              <Link to="/host/signin">Request host access</Link>
            </Button>

            <div className="mt-10">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
                  Global live hackathons
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {globalHackathons.length} live
                </span>
              </div>

              <div className="grid gap-3">
                {globalHackathons.map((hackathon, index) => (
                  <motion.article
                    key={hackathon.id}
                    className={cn(
                      "rounded-lg border bg-card/60 p-4 backdrop-blur-md",
                      hackathon.source === "submitted"
                        ? "border-primary/35"
                        : "border-white/[0.08]",
                    )}
                    initial={{ opacity: 0, y: 16 }}
                    animate={isVisible ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.45, delay: 0.08 + index * 0.05 }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-display text-lg font-semibold tracking-tight text-foreground">
                          {hackathon.name}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Hosted by {hackathon.organizer}
                        </p>
                      </div>
                      <span className="w-fit rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-muted-foreground">
                        {hackathon.source === "submitted" ? "Submitted live" : "Featured"}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-foreground/80">
                      {hackathon.focus}
                    </p>

                    <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary/80" />
                        {hackathon.location}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-primary/80" />
                        {hackathon.dates}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Globe2 className="h-3.5 w-3.5 text-primary/80" />
                        {formatLabels[hackathon.format]}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-primary/80" />
                        {hackathon.contact}
                      </span>
                    </div>
                  </motion.article>
                ))}
              </div>
            </div>
          </div>

          <motion.form
            onSubmit={handleSubmit}
            className="rounded-xl border border-white/[0.08] bg-black/45 p-5 backdrop-blur-xl sm:p-6"
            initial={{ opacity: 0, y: 24 }}
            animate={isVisible ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.12 }}
          >
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.26em] text-primary">
                Preview an event
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
                Shape your event brief
              </h3>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="host-event-name">Event name</Label>
                <Input
                  id="host-event-name"
                  value={formState.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder="AI Climate Sprint"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host-organizer">Organizer</Label>
                <Input
                  id="host-organizer"
                  value={formState.organizer}
                  onChange={(event) => updateField("organizer", event.target.value)}
                  placeholder="Your community"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host-location">Location</Label>
                <Input
                  id="host-location"
                  value={formState.location}
                  onChange={(event) => updateField("location", event.target.value)}
                  placeholder="Seoul, Korea or Remote"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host-dates">Dates</Label>
                <Input
                  id="host-dates"
                  value={formState.dates}
                  onChange={(event) => updateField("dates", event.target.value)}
                  placeholder="12-14 September 2026"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host-format">Format</Label>
                <select
                  id="host-format"
                  value={formState.format}
                  onChange={(event) =>
                    updateField("format", event.target.value as HostFormState["format"])
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
                >
                  <option value="hybrid">Hybrid</option>
                  <option value="online">Online</option>
                  <option value="in-person">In person</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="host-contact">Contact or website</Label>
                <Input
                  id="host-contact"
                  value={formState.contact}
                  onChange={(event) => updateField("contact", event.target.value)}
                  placeholder="team@example.com"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="host-focus">Theme or focus</Label>
                <Textarea
                  id="host-focus"
                  value={formState.focus}
                  onChange={(event) => updateField("focus", event.target.value)}
                  placeholder="What builders will work on, who should join, and what impact the event targets."
                  className="min-h-28"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="mt-6 w-full">
              <Send className="h-4 w-4" />
              Save local preview
            </Button>

            {submissionMessage ? (
              <p className="mt-4 rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
                {submissionMessage}
              </p>
            ) : (
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                This is a private browser preview only. Request host access to publish an event,
                issue tickets, and run event operations.
              </p>
            )}
          </motion.form>
        </motion.div>
      </div>
    </section>
  );
};

export default HostSection;
