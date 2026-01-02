import { useState, useEffect } from "react";

/**
 * Hook to track sidebar collapsed state across pages
 * Listens to sidebar toggle events and returns current state
 */
export function useSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved === "true";
  });

  useEffect(() => {
    const handleSidebarToggle = (event: CustomEvent<{ isCollapsed: boolean }>) => {
      setIsCollapsed(event.detail.isCollapsed);
    };

    window.addEventListener("sidebar-toggle", handleSidebarToggle as EventListener);

    return () => {
      window.removeEventListener("sidebar-toggle", handleSidebarToggle as EventListener);
    };
  }, []);

  return { isCollapsed, sidebarWidth: isCollapsed ? "lg:pl-20" : "lg:pl-64" };
}
