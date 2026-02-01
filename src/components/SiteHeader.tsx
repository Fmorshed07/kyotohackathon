import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import tokyoNeonAlley from "@/assets/tokyo-neon-alley.jpg";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "Theme", href: "#theme" },
  { label: "Timeline", href: "#timeline" },
  { label: "Participants", href: "#participants" },
  { label: "Deliverables", href: "#deliverables" },
  { label: "Judging", href: "#judging" },
  { label: "Sponsors", href: "#sponsors" },
  { label: "Cognisor", href: "#cognisor" },
  { label: "Get Involved", href: "#cta" },
];

const SiteHeader = () => {
  return (
    <header className="fixed top-0 z-40 w-full border-b border-border/40 bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <a
          href="#"
          className="font-display text-sm tracking-[0.35em] text-foreground/80 transition-colors hover:text-primary"
        >
          IMPACT TOKYO
        </a>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          {navLinks.slice(0, 7).map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs uppercase tracking-[0.3em] text-foreground/60 transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center md:flex">
          <a
            href="#cta"
            className={cn(
              "rounded-md border border-primary/40 px-4 py-2 text-xs uppercase tracking-[0.3em]",
              "text-primary transition-colors hover:border-primary hover:text-primary/90",
            )}
          >
            Join
          </a>
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="relative overflow-hidden border-border/40 bg-background">
              <div className="absolute inset-0">
                <img
                  src={tokyoNeonAlley}
                  alt=""
                  className="h-full w-full object-cover opacity-35"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background/90" />
              </div>

              <div className="relative flex flex-col gap-6 pt-8">
                <span className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                  Navigation
                </span>
                <nav className="flex flex-col gap-4" aria-label="Mobile">
                  {navLinks.map((link) => (
                    <SheetClose key={link.href} asChild>
                      <a
                        href={link.href}
                        className="text-sm uppercase tracking-[0.35em] text-foreground/80 transition-colors hover:text-primary"
                      >
                        {link.label}
                      </a>
                    </SheetClose>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
