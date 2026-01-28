import { useState, useCallback } from "react";

type CelebrationType = "confetti" | "success" | "sparkles" | "party" | "zap";

interface CelebrationState {
  isActive: boolean;
  type: CelebrationType;
  message?: string;
}

export function useCelebration() {
  const [celebration, setCelebration] = useState<CelebrationState>({
    isActive: false,
    type: "success",
  });

  const celebrate = useCallback((
    type: CelebrationType = "success",
    message?: string,
    duration = 1500
  ) => {
    setCelebration({ isActive: true, type, message });
    
    setTimeout(() => {
      setCelebration(prev => ({ ...prev, isActive: false }));
    }, duration);
  }, []);

  const celebrateConfetti = useCallback((duration = 2500) => {
    celebrate("confetti", undefined, duration);
  }, [celebrate]);

  const celebrateSuccess = useCallback((message?: string) => {
    celebrate("success", message, 1200);
  }, [celebrate]);

  const celebrateSparkles = useCallback((message?: string) => {
    celebrate("sparkles", message, 1500);
  }, [celebrate]);

  const celebrateParty = useCallback((message?: string) => {
    celebrate("party", message, 2000);
  }, [celebrate]);

  return {
    celebration,
    celebrate,
    celebrateConfetti,
    celebrateSuccess,
    celebrateSparkles,
    celebrateParty,
  };
}
