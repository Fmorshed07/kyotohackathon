import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFirestoreDb } from "@/lib/firebaseClient";
import { subscribeToHackathons } from "@/lib/hackathonSubscribe";

export function HackathonSubscribeForm({
  source,
  compact = false,
}: {
  source: string;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [message, setMessage] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const result = await subscribeToHackathons(getFirestoreDb(), email, source);
      setStatus("done");
      setMessage(
        result.alreadySubscribed
          ? "You're already on the list for upcoming hackathons."
          : "You're subscribed. We'll email you when more hackathons open.",
      );
      setEmail("");
    } catch (error) {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Could not subscribe right now.");
    }
  };

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className={
        compact
          ? "flex flex-col gap-3 sm:flex-row sm:items-center"
          : "flex flex-col gap-3"
      }
    >
      <div className={compact ? "min-w-0 flex-1" : undefined}>
        <label htmlFor={`hackathon-subscribe-${source}`} className="sr-only">
          Email for hackathon updates
        </label>
        <Input
          id={`hackathon-subscribe-${source}`}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@email.com"
          className="h-11"
          disabled={status === "saving"}
        />
      </div>
      <Button type="submit" className="h-11 shrink-0" disabled={status === "saving"}>
        {status === "saving" ? "Subscribing…" : "Subscribe"}
      </Button>
      {message ? (
        <p className="text-sm text-muted-foreground sm:basis-full">{message}</p>
      ) : null}
    </form>
  );
}
