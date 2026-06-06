import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import GoogleTranslate from "@/components/GoogleTranslate";
import { cn } from "@/lib/utils";

type NavLink = { label: string; href: string };

const navSections: { title: string; links: NavLink[] }[] = [
  {
    title: "Event",
    links: [
      { label: "About", href: "#about" },
      { label: "Agentic AI", href: "#why-agentic-ai" },
      { label: "Challenges", href: "#challenges" },
      { label: "Timeline", href: "#timeline" },
    ],
  },
  {
    title: "Participation",
    links: [
      { label: "Who Should Join", href: "#participants" },
      { label: "Experience", href: "#experience" },
      { label: "Why Kyoto", href: "#why-kyoto" },
    ],
  },
  {
    title: "Partners",
    links: [
      { label: "Partnerships", href: "#partnerships" },
      { label: "Organizers", href: "#organizers" },
    ],
  },
];

const SiteHeader = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const openMobileNav = useCallback(() => setIsMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileNavOpen]);

  const handleMobileNavClick = useCallback(
    (href: string) => {
      // Route links should navigate via React Router
      // so they work reliably on mobile and close the sheet.
      if (!href.startsWith("#")) {
        closeMobileNav();
        navigate(href);
        return;
      }

      // If we're not on the homepage, go there with the hash
      // so section links like "#about" work from any page.
      if (location.pathname !== "/") {
        closeMobileNav();
        navigate(`/${href}`);
        return;
      }

      closeMobileNav();

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
    [closeMobileNav, location.pathname, navigate],
  );

  return (
    <>
      <header className="fixed top-0 z-40 w-full border-b border-white/10 bg-[hsl(248_45%_8%_/_0.75)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-stretch px-4 sm:px-6 lg:px-8">
        {/* Left: logo */}
        <div className="flex min-w-0 flex-1 items-center md:flex-none">
          <a
            href="/"
            className="font-nav text-[13px] font-medium tracking-[0.2em] text-white/90 transition-colors hover:text-primary"
          >
            IMPACT KYOTO
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
                      "text-white/70 transition-colors hover:bg-white/10 hover:text-primary",
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
          <div className="hidden md:flex">
            <GoogleTranslate />
          </div>
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
          <div className="relative z-[70] md:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative z-[71]"
              aria-label="Open navigation menu"
              aria-expanded={isMobileNavOpen}
              aria-controls="mobile-nav-drawer"
              onClick={openMobileNav}
              onTouchStart={openMobileNav}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      </header>

      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-black/70"
            onClick={closeMobileNav}
          />

          <aside
            id="mobile-nav-drawer"
            className="absolute right-0 top-0 h-full w-[82vw] max-w-sm overflow-hidden border-l border-border/50 bg-background/95 p-6 backdrop-blur-md"
          >
            <div className="absolute inset-0">
              <img
                src="/banner.png"
                alt=""
                className="h-full w-full object-cover opacity-25"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/90 to-background/95" />
            </div>

            <div className="relative flex items-center justify-between">
              <span className="font-nav text-[11px] tracking-[0.2em] text-muted-foreground">MENU</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Close navigation menu"
                onClick={closeMobileNav}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="relative flex flex-col gap-6 pt-6 pb-6" aria-label="Mobile navigation">
              {navSections.map((section) => (
                <nav key={section.title} className="flex flex-col gap-2.5" aria-label={section.title}>
                  <span className="font-nav text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
                    {section.title}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {section.links.map((link) => (
                      <button
                        key={link.href}
                        type="button"
                        onClick={() => handleMobileNavClick(link.href)}
                        className={cn(
                          "font-nav inline-flex items-center rounded-md py-2.5 pl-3 pr-4 text-left text-[13px] font-medium tracking-[0.1em]",
                          "text-foreground/85 transition-colors hover:bg-primary/10 hover:text-primary",
                        )}
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>
                </nav>
              ))}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleMobileNavClick("/signin")}
                  className={cn(
                    "font-nav inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-[13px] font-medium tracking-[0.1em] text-primary-foreground",
                    "transition-colors hover:bg-primary/90",
                  )}
                >
                  Log in
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
};

export default SiteHeader;
