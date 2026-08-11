import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import BrandLogo from "@/components/BrandLogo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <BrandLogo size="md" href="/" />
        </div>
        <div className="horizon-flare mx-auto mb-8 w-32" />
        <h1 className="mb-4 font-display text-4xl font-bold text-white">404</h1>
        <p className="mb-4 font-body text-xl text-muted-foreground">Page not found</p>
        <a href="/" className="font-display text-sm tracking-[0.16em] text-primary underline-offset-4 hover:underline">
          Return home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
