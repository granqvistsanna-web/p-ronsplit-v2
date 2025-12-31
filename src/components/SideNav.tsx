import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, BarChart3, List, Settings, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { to: "/dashboard", label: "Hem", icon: Home },
  { to: "/analys", label: "Analys", icon: BarChart3 },
  { to: "/aktivitet", label: "Aktivitet", icon: List },
  { to: "/installningar", label: "Inställningar", icon: Settings },
];

export function SideNav() {
  const location = useLocation();
  const { profile } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="flex items-center h-20 px-4 py-2 border-b border-sidebar-border/50">
            <Link to="/dashboard" className="flex items-center hover:opacity-70 transition-opacity">
              <img src={logo} alt="Päronsplit" className="h-14 w-auto object-contain" />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-all relative",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                  )}
                  <Icon
                    size={18} 
                    className={cn(
                      "shrink-0 transition-transform",
                      !isActive && "group-hover:translate-x-0.5"
                    )} 
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
