import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import GoogleTranslate from "@/components/GoogleTranslate";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { getDashboardPathForUser } from "@/lib/portalRoutes";
import { cn } from "@/lib/utils";

type NavLink = { label: string; href: string };

const navLinks: NavLink[] = [
  { label: "Hackathons", href: "/hackathons" },
  { label: "Projects & demos", href: "/projects" },
  { label: "Resources", href: "/resources" },
  { label: "Get Hired", href: "#get-hired" },
  { label: "Host", href: "#host" },
  { label: "About", href: "#about" },
];

const authButtonClass =
  "font-nav inline-flex h-9 items-center whitespace-nowrap rounded-lg px-3.5 text-[13px] font-medium tracking-wide transition-colors";

const SiteHeader = () => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionUser, signOut } = usePortalAuth();
  const openMobileNav = useCallback(() => setIsMobileNavOpen(true), []);
  const closeMobileNav = useCallback(() => setIsMobileNavOpen(false), []);

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

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileNavOpen]);

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
      <header className="fixed top-0 z-40 w-full border-b border-white/[0.06] bg-black/55 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6 lg:gap-3 lg:px-8">
          <div className="flex min-w-0 shrink-0 items-center">
            <BrandLogo size="sm" showWordmark priority className="-ml-0.5" />
          </div>

          <nav
            className="hidden min-w-0 flex-1 items-center justify-center overflow-x-auto md:flex [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Primary"
          >
            <div className="flex items-center gap-0.5">
              {navLinks.map((link) => {
                const isRoute = !link.href.startsWith("#");
                const isActive = isRoute && location.pathname === link.href;
                const className = cn(
                  "font-nav inline-flex items-center whitespace-nowrap rounded-md px-3 py-2 text-[13px] font-medium",
                  "transition-colors hover:bg-white/5 hover:text-white",
                  isActive ? "bg-white/5 text-white" : "text-white/55",
                );

                if (isRoute) {
                  return (
                    <Link key={link.href} to={link.href} className={className}>
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

          <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2 md:gap-3">
            {sessionUser ? (
              <>
                <Link
                  to={profilePath}
                  className={cn(
                    authButtonClass,
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
                  "bg-primary text-primary-foreground shadow-[0_0_24px_hsl(199_100%_50%/0.35)] hover:brightness-110",
                )}
              >
                Log in
              </Link>
            )}
            <div className="hidden sm:flex">
              <GoogleTranslate />
            </div>
            <div className="md:hidden">
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
            className="absolute inset-0 bg-background/70"
            onClick={closeMobileNav}
          />

          <aside
            id="mobile-nav-drawer"
            className="absolute right-0 top-0 h-full w-[82vw] max-w-sm overflow-hidden border-l border-border bg-background p-6"
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

            <div className="relative flex flex-col gap-6 pt-6 pb-6" aria-label="Mobile navigation">
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

              <nav className="flex flex-col gap-0.5" aria-label="Sections">
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
