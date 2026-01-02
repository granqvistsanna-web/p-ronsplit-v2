import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, BarChart3, List, Settings, Menu, X, PiggyBank, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { to: "/dashboard", label: "Hem", icon: Home },
  { to: "/analys", label: "Analys", icon: BarChart3 },
  { to: "/sparande", label: "Sparande", icon: PiggyBank },
  { to: "/aktivitet", label: "Aktivitet", icon: List },
  { to: "/installningar", label: "Inställningar", icon: Settings },
];

export function SideNav() {
  const location = useLocation();
  const { profile } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved === "true";
  });

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(isCollapsed));
    // Dispatch event for pages to adjust their layout
    window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: { isCollapsed } }));
  }, [isCollapsed]);

  return (
    <>
      {/* Mobile header with logo and hamburger */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-50 border-b border-border bg-background/98 backdrop-blur-md h-14">
        <div className="flex items-center justify-between h-full px-4">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center hover:opacity-70 transition-opacity">
            <img src={logo} alt="Päronsplit" className="h-10 w-auto" />
          </Link>

          {/* Hamburger button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            <span className="sr-only">Meny</span>
          </Button>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-foreground/10 backdrop-blur-sm"
              style={{ top: "3.5rem" }}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu panel */}
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="lg:hidden fixed top-14 inset-x-0 z-50 bg-background border-b border-border shadow-notion-lg"
            >
              <div className="px-4 py-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-all relative active:scale-[0.98]",
                        isActive
                          ? "bg-secondary text-foreground"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                      )}
                      <Icon size={20} className="shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                {/* User info */}
                {profile && (
                  <div className="pt-4 mt-2 border-t border-border">
                    <Link
                      to="/installningar"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-base font-semibold text-primary shrink-0">
                        {profile.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Inloggad som</p>
                        <p className="text-sm font-medium text-foreground truncate">{profile.name}</p>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out z-40",
          isCollapsed ? "lg:w-20" : "lg:w-64"
        )}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className={cn(
            "flex items-center h-20 py-2 border-b border-sidebar-border/50 transition-all duration-300",
            isCollapsed ? "px-2 justify-center" : "px-4"
          )}>
            <Link to="/dashboard" className="flex items-center hover:opacity-70 transition-opacity">
              {isCollapsed ? (
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">P</span>
                </div>
              ) : (
                <img src={logo} alt="Päronsplit" className="h-14 w-auto object-contain" />
              )}
            </Link>
          </div>

          {/* Navigation */}
          <TooltipProvider delayDuration={0}>
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;

                const navLink = (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "group flex items-center gap-3 text-sm font-medium rounded-md transition-all relative",
                      isCollapsed ? "justify-center px-3 py-3" : "px-3 py-2.5",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary"
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                    )}
                    <Icon
                      size={20}
                      className={cn(
                        "shrink-0 transition-transform",
                        !isActive && "group-hover:translate-x-0.5"
                      )}
                    />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                );

                return isCollapsed ? (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>
                      {navLink}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ) : navLink;
              })}
            </nav>
          </TooltipProvider>

          {/* Collapse toggle button */}
          <div className={cn(
            "p-2 border-t border-sidebar-border/50",
            isCollapsed && "flex justify-center"
          )}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "w-full transition-all",
                isCollapsed ? "w-auto px-3" : "justify-start gap-3"
              )}
            >
              {isCollapsed ? (
                <ChevronRight size={18} />
              ) : (
                <>
                  <ChevronLeft size={18} />
                  <span className="text-xs">Dölj meny</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
