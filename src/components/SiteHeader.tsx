import { Menu } from "lucide-react";
import { useCallback, useState, type MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import GoogleTranslate from "@/components/GoogleTranslate";
import { cn } from "@/lib/utils";
import tokyoNeonAlley from "@/assets/tokyo-neon-alley.jpg";

type NavLink = { label: string; href: string };

const navSections: { title: string; links: NavLink[] }[] = [
  {
    title: "Event",
    links: [
      { label: "About", href: "#about" },
      { label: "Theme", href: "#theme" },
      { label: "Timeline", href: "#timeline" },
    ],
  },
  {
    title: "Participation",
    links: [
      { label: "Deliverables", href: "#deliverables" },
      { label: "Judging", href: "#judging" },
    ],
  },
  {
    title: "Partners",
    links: [
      { label: "Cognisor", href: "#cognisor" },
    ],
  },
];

const SiteHeader = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleMobileNavClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, href: string) => {
      // Route links should navigate via React Router
      // so they work reliably on mobile and close the sheet.
      if (!href.startsWith("#")) {
        event.preventDefault();
        setIsMobileNavOpen(false);
        navigate(href);
        return;
      }

      event.preventDefault();

      // If we're not on the homepage, go there with the hash
      // so section links like "#about" work from any page.
      if (location.pathname !== "/") {
        setIsMobileNavOpen(false);
        navigate(`/${href}`);
        return;
      }

      setIsMobileNavOpen(false);

      const target = document.querySelector(href);
      if (!target) {
        return;
      }

      window.history.pushState(null, "", href);

      window.setTimeout(() => {
        const header = document.querySelector("header");
        const headerHeight = header?.getBoundingClientRect().height ?? 64;
        const targetTop = target.getBoundingClientRect().top + window.scrollY;
        const scrollTop = Math.max(targetTop - headerHeight - 8, 0);

        window.scrollTo({ top: scrollTop, behavior: "smooth" });
      }, 200);
    },
    [location.pathname, navigate],
  );

  return (
    <header className="fixed top-0 z-40 w-full border-b border-border/50 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-stretch px-4 sm:px-6 lg:px-8">
        {/* Left: logo */}
        <div className="flex min-w-0 flex-1 items-center md:flex-none">
          <a
            href="/"
            className="font-nav text-[13px] font-medium tracking-[0.2em] text-foreground/90 transition-colors hover:text-primary"
          >
            IMPACT TOKYO
          </a>
        </div>

        {/* Center: nav — centered */}
        <nav
          className="hidden items-center justify-center md:flex md:flex-1"
          aria-label="Primary"
        >
          <div className="flex items-center gap-0.5 sm:gap-1">
            {navSections.map((section, sectionIndex) => (
              <div key={section.title} className="flex items-center">
                {sectionIndex > 0 && (
                  <span
                    className="mx-1.5 h-0.5 w-0.5 shrink-0 rounded-full bg-muted-foreground/50 sm:mx-2"
                    aria-hidden
                  />
                )}
                {section.links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "font-nav inline-flex items-center whitespace-nowrap rounded px-2.5 py-2 text-[13px] font-medium tracking-[0.1em] sm:px-3",
                      "text-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary",
                    )}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </nav>

        {/* Right: actions */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3 md:flex-none">
          <GoogleTranslate />
          <div className="hidden items-center gap-2 md:flex">
            <Link
              to="/signin"
              className={cn(
                "font-nav inline-flex h-9 items-center whitespace-nowrap rounded-md bg-primary px-3.5 text-[13px] font-medium tracking-[0.1em] text-primary-foreground",
                "transition-colors hover:bg-primary/90",
              )}
            >
              Log in
            </Link>
          </div>
          <div className="md:hidden">
            <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="relative overflow-hidden border-l border-border/50 bg-background/95 backdrop-blur-md"
              >
                <div className="absolute inset-0">
                  <img
                    src={tokyoNeonAlley}
                    alt=""
                    className="h-full w-full object-cover opacity-25"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/90 to-background/95" />
                </div>

                <div className="relative flex flex-col gap-6 pt-10 pb-6" aria-label="Mobile navigation">
                  {navSections.map((section) => (
                    <nav key={section.title} className="flex flex-col gap-2.5" aria-label={section.title}>
                      <span className="font-nav text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
                        {section.title}
                      </span>
                      <div className="flex flex-col gap-0.5">
                        {section.links.map((link) => (
                          <SheetClose key={link.href} asChild>
                            <a
                              href={link.href}
                              onClick={(event) => handleMobileNavClick(event, link.href)}
                              className={cn(
                                "font-nav inline-flex items-center rounded-md py-2.5 pl-3 pr-4 text-[13px] font-medium tracking-[0.1em]",
                                "text-foreground/85 transition-colors hover:bg-primary/10 hover:text-primary",
                              )}
                            >
                              {link.label}
                            </a>
                          </SheetClose>
                        ))}
                      </div>
                    </nav>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
