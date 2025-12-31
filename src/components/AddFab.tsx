import { useState } from "react";
import { Plus, Upload, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface AddFabProps {
  onClick: () => void;
  onImportClick?: () => void;
  onSwishClick?: () => void;
}

export function AddFab({ onClick, onImportClick, onSwishClick }: AddFabProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Check if there are multiple options
  const hasMultipleOptions = !!(onImportClick || onSwishClick);

  const handleAddClick = () => {
    setIsOpen(false);
    onClick();
  };

  const handleImportClick = () => {
    setIsOpen(false);
    onImportClick?.();
  };

  const handleSwishClick = () => {
    setIsOpen(false);
    onSwishClick?.();
  };

  const handleFabClick = () => {
    if (hasMultipleOptions) {
      setIsOpen(!isOpen);
    } else {
      onClick();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-30 bg-foreground/10 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Menu options */}
      <AnimatePresence>
        {isOpen && (
          <div 
            className="fixed bottom-24 right-4 lg:bottom-28 lg:right-8 z-50 flex flex-col-reverse gap-3 items-end"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {onImportClick && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ duration: 0.15, delay: 0.1 }}
              >
                <Button
                  onClick={handleImportClick}
                  variant="outline"
                  size="sm"
                  className="gap-2 shadow-lg hover:shadow-xl bg-background border-border"
                >
                  <Upload size={16} />
                  <span>Importera</span>
                </Button>
              </motion.div>
            )}

            {onSwishClick && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ duration: 0.15, delay: 0.05 }}
              >
                <Button
                  onClick={handleSwishClick}
                  variant="outline"
                  size="sm"
                  className="gap-2 shadow-lg hover:shadow-xl bg-background border-border"
                >
                  <Smartphone size={16} />
                  <span>Swish</span>
                </Button>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                onClick={handleAddClick}
                variant="outline"
                size="sm"
                className="gap-2 shadow-lg hover:shadow-xl bg-background border-border"
              >
                <Plus size={16} />
                <span>Lägg till</span>
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main FAB - positioned with safe area consideration */}
      <Button
        onClick={handleFabClick}
        size="lg"
        className="fixed bottom-6 right-4 lg:bottom-8 lg:right-8 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 z-40"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? <X size={22} /> : <Plus size={22} />}
        </motion.div>
        <span className="sr-only">Lägg till transaktion</span>
      </Button>
    </>
  );
}
