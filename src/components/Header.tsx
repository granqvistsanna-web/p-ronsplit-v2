import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export function Header() {
  const location = useLocation();
  const { profile } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm shadow-sm">
      <div className="container flex h-16 items-center justify-between max-w-4xl mx-auto px-4">
        <Link to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src={logo} alt="Päronsplit" className="h-24 sm:h-28 w-auto" />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <Link
            to="/dashboard"
            className={cn(
              "relative px-3 py-2 text-sm font-medium transition-all rounded-md",
              location.pathname === "/dashboard"
                ? "text-foreground bg-secondary/50"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            )}
          >
            Hem
            {location.pathname === "/dashboard" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </Link>
          <Link
            to="/installningar"
            className={cn(
              "relative px-3 py-2 text-sm font-medium transition-all rounded-md",
              location.pathname === "/installningar"
                ? "text-foreground bg-secondary/50"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
            )}
          >
            Inställningar
            {location.pathname === "/installningar" && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
            )}
          </Link>

          {profile && (
            <Link
              to="/installningar"
              className="flex items-center gap-2 ml-2 pl-2 hover:opacity-80 transition-opacity"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                {profile.name?.charAt(0).toUpperCase() || "?"}
              </div>
              <span className="text-sm text-foreground font-medium max-w-[120px] truncate">
                {profile.name}
              </span>
            </Link>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-12 w-12 hover:bg-secondary/50 transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
          <span className="sr-only">Meny</span>
        </Button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-sm">
          <nav className="container max-w-4xl mx-auto px-4 py-6 flex flex-col gap-2">
            <Link
              to="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "relative flex items-center px-4 py-3 text-base font-medium transition-all rounded-lg active:scale-[0.98]",
                location.pathname === "/dashboard"
                  ? "text-foreground bg-secondary/70"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 active:bg-secondary/60"
              )}
            >
              Hem
              {location.pathname === "/dashboard" && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
              )}
            </Link>
            <Link
              to="/installningar"
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "relative flex items-center px-4 py-3 text-base font-medium transition-all rounded-lg active:scale-[0.98]",
                location.pathname === "/installningar"
                  ? "text-foreground bg-secondary/70"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 active:bg-secondary/60"
              )}
            >
              Inställningar
              {location.pathname === "/installningar" && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
              )}
            </Link>

            {profile && (
              <Link
                to="/installningar"
                onClick={() => setIsMobileMenuOpen(false)}
                className="pt-4 mt-2"
              >
                <div className="flex items-center gap-3 px-4 py-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-base font-semibold text-primary shrink-0">
                    {profile.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Inloggad som</p>
                    <p className="text-sm font-medium text-foreground truncate">{profile.name}</p>
                  </div>
                </div>
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
