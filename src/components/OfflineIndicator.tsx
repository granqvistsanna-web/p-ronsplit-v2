import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-warning text-warning-foreground px-4 py-2 rounded-md shadow-lg flex items-center gap-2"
        >
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline - ändringar synkas när du är online igen</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
