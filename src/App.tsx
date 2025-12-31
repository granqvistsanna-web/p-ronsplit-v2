import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { MonthSelectionProvider } from "@/hooks/useMonthSelection";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicRoute } from "@/components/PublicRoute";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { SideNav } from "@/components/SideNav";
import Index from "./pages/Index";
import Analys from "./pages/Analys";
import Aktivitet from "./pages/Aktivitet";

import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Use cached data when offline
      networkMode: "offlineFirst",
      // Refetch on window focus when online
      refetchOnWindowFocus: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations when back online
      networkMode: "offlineFirst",
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

const AppContent = () => {
  const { user } = useAuth();
  const queryClientInstance = useQueryClient();

  // Clear React Query cache when user logs out to prevent stale data
  useEffect(() => {
    if (!user) {
      // User logged out - clear all cached queries
      queryClientInstance.clear();
    }
  }, [user, queryClientInstance]);

  return (
    <>
      <Toaster />
      <OfflineIndicator />
      <BrowserRouter>
        {user && <SideNav />}
        <Routes>
          <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/analys" element={<ProtectedRoute><Analys /></ProtectedRoute>} />
          <Route path="/aktivitet" element={<ProtectedRoute><Aktivitet /></ProtectedRoute>} />
          
          <Route path="/installningar" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
    <AuthProvider>
      <ThemeProvider>
        <TooltipProvider>
          <MonthSelectionProvider>
            <AppContent />
          </MonthSelectionProvider>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;
