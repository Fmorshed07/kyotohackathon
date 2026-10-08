import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import GoogleTranslate from "@/components/GoogleTranslate";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { getDashboardPathForUser } from "@/lib/portalRoutes";
import { cn } from "@/lib/utils";
import "./immersive-header.css";

type NavLink = { label: string; href: string };

const navLinks: NavLink[] = [
  { label: "Hackathons", href: "/hackathons" },
  { label: "Projects & demos", href: "/projects" },
  { label: "Feed", href: "/feed" },
  { label: "Videos", href: "/videos" },
  { label: "Resources", href: "/resources" },
  { label: "Get Hired", href: "#get-hired" },
  { label: "Host", href: "#host" },
  { label: "Our work", href: "/work" },
];

const authButtonClass =
  "font-nav inline-flex min-h-10 items-center whitespace-nowrap rounded-lg px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const SiteHeader = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const navigate = useNavigate();
  const { sessionUser, signOut } = usePortalAuth();
  const openMobileNav = useCallback(() => setIsMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);

  useEffect(() => {
    const updateScroll = () => setHasScrolled(window.scrollY > 24);
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => window.removeEventListener("scroll", updateScroll);
  }, []);

  useEffect(() => {
    closeMobileNav();
  }, [location.pathname, location.hash, closeMobileNav]);

  const handleLogout = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      closeMobileNav();
      navigate("/");
    } finally {
      setIsSigningOut(false);
    }
  }, [closeMobileNav, navigate, signOut]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const trigger = menuButtonRef.current;
    const panel = mobilePanelRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), select:not([disabled]), [tabindex="0"]';
    panel?.querySelector<HTMLElement>(focusableSelector)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileNav();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const controls = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => element.getClientRects().length > 0 && !element.closest('[aria-hidden="true"]'));
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const desktopQuery = window.matchMedia("(min-width: 1161px)");
    const closeOnDesktop = () => {
      if (desktopQuery.matches) closeMobileNav();
    };
    document.addEventListener("keydown", handleKeyDown);
    desktopQuery.addEventListener("change", closeOnDesktop);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      desktopQuery.removeEventListener("change", closeOnDesktop);
      trigger?.focus();
    };
  }, [isMobileNavOpen, closeMobileNav]);

  const handleMobileNavClick = useCallback(
    (href: string) => {
      if (!href.startsWith("#")) {
        closeMobileNav();
        if (href === "/" && location.pathname === "/") {
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        navigate(href);
        return;
      }

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

  const profilePath = sessionUser
    ? getDashboardPathForUser(sessionUser.role, sessionUser.judgeApprovalStatus)
    : "/signin";

  return (
    <>
      <header className={cn(
        "fixed top-0 z-40 w-full border-b border-border/70 bg-background/90 backdrop-blur-md",
        "immersive-header",
        (hasScrolled || !isHome) && "immersive-header--scrolled",
      )}>
        <div className="immersive-header__inner mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-2 px-4 sm:px-6 lg:gap-3 lg:px-10">
          <div className="immersive-header__brand flex min-w-0 shrink-0 items-center">
            <BrandLogo size="sm" showWordmark priority className="-ml-0.5" />
          </div>

          <nav
            className="immersive-header__nav hidden min-w-0 flex-1 items-center overflow-x-auto min-[1161px]:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Primary"
          >
            <div className="mx-auto flex min-w-max items-center gap-0.5">
              {navLinks.map((link) => {
                const isRoute = !link.href.startsWith("#");
                const isActive = isRoute && location.pathname === link.href;
                const className = cn(
                  "font-nav inline-flex items-center whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-medium",
                  "transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "bg-secondary text-foreground" : "text-muted-foreground",
                );

                if (isRoute) {
                  return (
                    <Link key={link.href} to={link.href} className={className} aria-current={isActive ? "page" : undefined}>
                      {link.label}
                    </Link>
                  );
                }

                const hashHref = location.pathname === "/" ? link.href : `/${link.href}`;

                return (
                  <a key={link.href} href={hashHref} className={className}>
                    {link.label}
                  </a>
                );
              })}
            </div>
          </nav>

          <div className="immersive-header__actions flex shrink-0 items-center justify-end gap-1.5 sm:gap-2 md:gap-3">
            {sessionUser ? (
              <>
                <Link
                  to={profilePath}
                  className={cn(
                    authButtonClass,
                    "immersive-header__auth",
                    "border border-white/15 text-white hover:bg-white/5",
                  )}
                >
                  Portal
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isSigningOut}
                  className={cn(
                    authButtonClass,
                    "immersive-header__auth",
                    "border border-white/15 text-white hover:bg-white/5 disabled:opacity-60",
                  )}
                >
                  {isSigningOut ? "…" : "Log out"}
                </button>
              </>
            ) : (
              <Link
                to="/signin"
                className={cn(
                  authButtonClass,
                  "immersive-header__auth immersive-header__login",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                Log in
              </Link>
            )}
            <div className="immersive-header__language hidden sm:flex">
              <GoogleTranslate />
            </div>
            <div className="immersive-header__burger min-[1161px]:hidden">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                ref={menuButtonRef}
                className="relative z-[71]"
                aria-label="Open navigation menu"
                aria-expanded={isMobileNavOpen}
                aria-controls="mobile-nav-drawer"
                onClick={openMobileNav}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {isMobileNavOpen ? (
        <div
          className="immersive-menu fixed inset-0 z-[80] min-[1161px]:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <button
            type="button"
            aria-label="Close navigation menu"
            className="immersive-menu__backdrop absolute inset-0 bg-background/70"
            tabIndex={-1}
            onClick={closeMobileNav}
          />

          <aside
            ref={mobilePanelRef}
            id="mobile-nav-drawer"
            className="immersive-menu__panel absolute right-0 top-0 h-full w-[82vw] max-w-sm overflow-y-auto border-l border-border bg-background p-6"
          >
            <div className="relative flex items-center justify-between">
              <BrandLogo size="xs" showWordmark href={null} className="pointer-events-none" />
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

            <div className="immersive-menu__content relative flex flex-col gap-6 pt-6 pb-6" aria-label="Mobile navigation">
              <button
                type="button"
                onClick={() => handleMobileNavClick("/")}
                className={cn(
                  "font-nav inline-flex items-center rounded-md py-2.5 pl-3 pr-4 text-left text-[13px] font-medium",
                  "text-foreground/85 transition-colors hover:bg-muted hover:text-foreground",
                )}
              >
                Home
              </button>

              <nav className="immersive-menu__links flex flex-col gap-0.5" aria-label="Sections">
                {navLinks.map((link) => (
                  <button
                    key={link.href}
                    type="button"
                    onClick={() => handleMobileNavClick(link.href)}
                    className={cn(
                      "font-nav inline-flex items-center rounded-md py-2.5 pl-3 pr-4 text-left text-[13px] font-medium",
                      "text-foreground/85 transition-colors hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </button>
                ))}
              </nav>

              <div className="border-t border-border pt-4">
                <span className="font-nav mb-2 block text-[11px] font-medium tracking-[0.18em] text-muted-foreground">
                  Language
                </span>
                <GoogleTranslate />
              </div>

              <div className="pt-2">
                {sessionUser ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleMobileNavClick(profilePath)}
                      className={cn(
                        "font-nav inline-flex h-10 w-full items-center justify-center rounded-lg border border-border px-4 text-[13px] font-medium text-foreground",
                        "transition-colors hover:bg-muted",
                      )}
                    >
                      Portal
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isSigningOut}
                      className={cn(
                        "font-nav inline-flex h-10 w-full items-center justify-center rounded-lg border border-border px-4 text-[13px] font-medium text-foreground",
                        "transition-colors hover:bg-muted disabled:opacity-60",
                      )}
                    >
                      {isSigningOut ? "Signing out…" : "Log out"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleMobileNavClick("/signin")}
                    className={cn(
                      "font-nav inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground",
                      "transition-opacity hover:opacity-90",
                    )}
                  >
                    Log in
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
};

export default SiteHeader;
