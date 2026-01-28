import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, PartyPopper, Zap } from "lucide-react";

type AnimationType = "check" | "sparkles" | "party" | "zap";

interface SuccessAnimationProps {
  isVisible: boolean;
  type?: AnimationType;
  message?: string;
  onComplete?: () => void;
}

const icons = {
  check: Check,
  sparkles: Sparkles,
  party: PartyPopper,
  zap: Zap,
};

const colors = {
  check: "from-green-500 to-emerald-600",
  sparkles: "from-violet-500 to-purple-600",
  party: "from-amber-500 to-orange-600",
  zap: "from-blue-500 to-cyan-600",
};

export function SuccessAnimation({ 
  isVisible, 
  type = "check", 
  message,
  onComplete 
}: SuccessAnimationProps) {
  const Icon = icons[type];

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
          />

          {/* Main content */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
            }}
            className="relative flex flex-col items-center gap-4"
          >
            {/* Ripple rings */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{
                  duration: 1,
                  delay: i * 0.2,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
                className={`absolute w-24 h-24 rounded-full bg-gradient-to-r ${colors[type]} opacity-20`}
              />
            ))}

            {/* Icon circle */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5, times: [0, 0.6, 1] }}
              className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${colors[type]} shadow-2xl flex items-center justify-center`}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
              >
                <Icon className="w-12 h-12 text-white" strokeWidth={2.5} />
              </motion.div>

              {/* Sparkle particles */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, x: 0, y: 0 }}
                  animate={{
                    scale: [0, 1, 0],
                    x: Math.cos((i * Math.PI * 2) / 8) * 60,
                    y: Math.sin((i * Math.PI * 2) / 8) * 60,
                  }}
                  transition={{
                    duration: 0.6,
                    delay: 0.3 + i * 0.05,
                    ease: "easeOut",
                  }}
                  className="absolute w-2 h-2 rounded-full bg-white shadow-lg"
                />
              ))}
            </motion.div>

            {/* Message */}
            {message && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg font-semibold text-foreground"
              >
                {message}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
