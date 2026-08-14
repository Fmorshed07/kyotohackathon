import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function ProjectStarEmailDialog({
  open,
  pending,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (email: string) => void;
}) {
  const [email, setEmail] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(email);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !pending) onCancel(); }}>
      <DialogContent className="max-w-md border-white/10 bg-background">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Star this project</DialogTitle>
            <DialogDescription>
              Enter your email to star once. We’ll use it for hackathon newsletters — no account needed.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <label htmlFor="star-email" className="sr-only">Email</label>
            <Input
              id="star-email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@email.com"
              className="h-11"
              disabled={pending}
            />
          </div>
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !email.trim()}>
              {pending ? "Saving…" : "Star project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
